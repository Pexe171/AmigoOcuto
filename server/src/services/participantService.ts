import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendVerificationEmail, ParticipantContact, buildGuardianList } from './emailService';
import { generateVerificationCode } from '../utils/codeGenerator';
import { ensureNames } from '../utils/nameUtils';
import {
  findParticipantById,
  findParticipantByEmail,
  insertParticipant,
  countParticipants,
  findAllParticipants,
  searchParticipantsByNameAndEmail,
  findPendingParticipantById,
  insertPendingParticipant,
  updatePendingParticipant,
  deletePendingParticipant,
  deletePendingParticipantsByEmail,
  countPendingParticipants,
  findPendingParticipantByEmailOrGuardianEmail,
} from '../database/participantRepository';

// Define interfaces for SQLite data structures
export interface Participant {
  id: string;
  firstName: string;
  secondName: string;
  email?: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  emailVerified: boolean;
  verificationCodeHash?: string;
  verificationExpiresAt?: string; // DATETIME string
  attendingInPerson?: boolean;
  createdAt: string; // DATETIME string
  updatedAt: string; // DATETIME string
}

export interface PendingParticipant {
  id: string;
  email?: string; // Made optional
  firstName: string;
  secondName: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  attendingInPerson?: boolean;
  verificationCodeHash: string;
  expiresAt: string; // DATETIME string
  createdAt: string; // DATETIME string
  updatedAt: string; // DATETIME string
}

const verificationTTLMinutes = 30;

const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Informe o nome completo.')
    .max(120, 'O nome completo pode ter até 120 caracteres.')
    .optional(),
  firstName: z
    .string()
    .trim()
    .min(2, 'Informe pelo menos duas letras para o primeiro nome.')
    .max(60, 'O primeiro nome pode ter até 60 caracteres.')
    .optional(),
  secondName: z
    .string()
    .trim()
    .min(2, 'Informe o segundo nome.')
    .max(120, 'O segundo nome pode ter até 120 caracteres.')
    .optional(),
  email: z.string().email().optional(),
  isChild: z.boolean().default(false),
  primaryGuardianEmail: z.string().email().optional(),
  guardianEmails: z.array(z.string().email()).optional(),
  attendingInPerson: z.boolean().optional()
}).superRefine((data, ctx) => {
  if (!data.fullName && (!data.firstName || !data.secondName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o nome completo.',
      path: ['fullName']
    });
  }
});

const verificationSchema = z.object({
  participantId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
  attendingInPerson: z.boolean().optional()
});

const searchSchema = z.string().trim().min(2, 'Informe pelo menos duas letras para pesquisar.').max(80);

export type RegistrationInput = z.infer<typeof registrationSchema>;

const normalizeEmail = (email?: string | null): string | undefined =>
  email ? email.toLowerCase().trim() : undefined;

export const registerParticipant = async (input: RegistrationInput): Promise<PendingParticipant> => {
  const data = registrationSchema.parse(input);
  const { firstName, secondName } = ensureNames({
    fullName: data.fullName ?? null,
    firstName: data.firstName ?? null,
    secondName: data.secondName ?? null
  });

  if (!firstName || !secondName) {
    throw new Error('Informe o nome completo.');
  }

  let normalizedAdultEmail: string | undefined;

  if (data.isChild) {
    if (!data.primaryGuardianEmail) {
      throw new Error('Crianças precisam de um e-mail principal de responsável.');
    }
  } else {
    if (!data.email) {
      throw new Error('Adultos precisam informar um e-mail para contato.');
    }
    normalizedAdultEmail = normalizeEmail(data.email);
    if (!normalizedAdultEmail) {
      throw new Error('Adultos precisam informar um e-mail válido.');
    }
    const existing = findParticipantByEmail(normalizedAdultEmail);
    if (existing) {
      throw new Error('Este e-mail já está inscrito e confirmado.');
    }
    const pendingWithEmail = findPendingParticipantByEmailOrGuardianEmail(normalizedAdultEmail);
    if (pendingWithEmail) {
      deletePendingParticipant(pendingWithEmail.id);
    }
    deletePendingParticipantsByEmail(normalizedAdultEmail);
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
  const verificationExpiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  const primaryGuardianEmail = normalizeEmail(data.primaryGuardianEmail);
  const normalizedGuardianEmails = (data.guardianEmails ?? [])
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));
  const guardianEmails = data.isChild
    ? buildGuardianList(primaryGuardianEmail, normalizedGuardianEmails)
    : [];

  if (data.isChild && !primaryGuardianEmail) {
    throw new Error('Informe um e-mail válido para o responsável principal.');
  }

  if (data.isChild && primaryGuardianEmail) {
    const existingGuardianParticipant = findParticipantByEmail(primaryGuardianEmail);
    if (existingGuardianParticipant) {
      throw new Error('Este e-mail de responsável já está vinculado a uma inscrição confirmada.');
    }
    const pendingGuardian = findPendingParticipantByEmailOrGuardianEmail(primaryGuardianEmail);
    if (pendingGuardian) {
      throw new Error('Este e-mail de responsável já está em uso em outra inscrição.');
    }
  }

  const pendingParticipantToInsert: Omit<PendingParticipant, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName,
    secondName,
    isChild: Boolean(data.isChild),
    guardianEmails,
    verificationCodeHash,
    expiresAt: verificationExpiresAt,
  };

  if (typeof data.attendingInPerson === 'boolean') {
    pendingParticipantToInsert.attendingInPerson = data.attendingInPerson;
  }

  if (data.isChild && primaryGuardianEmail) {
    pendingParticipantToInsert.primaryGuardianEmail = primaryGuardianEmail;
  }

  if (!data.isChild && normalizedAdultEmail) {
    pendingParticipantToInsert.email = normalizedAdultEmail;
  }

  const pendingParticipant = insertPendingParticipant(pendingParticipantToInsert);

  if (!pendingParticipant) {
    throw new Error('Erro ao registrar a inscrição. Tente novamente em instantes.');
  }

  const contact: ParticipantContact = {
    firstName: pendingParticipant.firstName,
    isChild: pendingParticipant.isChild,
    guardianEmails: pendingParticipant.guardianEmails,
  };

  if (pendingParticipant.primaryGuardianEmail) {
    contact.primaryGuardianEmail = pendingParticipant.primaryGuardianEmail;
  }

  if (pendingParticipant.email) {
    contact.email = pendingParticipant.email;
  }

  await sendVerificationEmail(contact, verificationCode);

  return pendingParticipant;
};

export const verifyParticipant = async (
  input: z.infer<typeof verificationSchema>
): Promise<Participant> => {
  const data = verificationSchema.parse(input);

  const pending = findPendingParticipantById(data.participantId);
  if (!pending) {
    const already = findParticipantById(data.participantId);
    if (already && already.emailVerified) {
      throw new Error('Esta inscrição já foi confirmada anteriormente.');
    }
    throw new Error('Inscrição não encontrada ou já verificada.');
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    throw new Error('O código de verificação expirou. Solicite um novo.');
  }

  const isValidCode = await bcrypt.compare(data.code, pending.verificationCodeHash);
  if (!isValidCode) {
    throw new Error('Código inválido. Confira o e-mail enviado.');
  }

  const participantToInsert: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName: pending.firstName,
    secondName: pending.secondName,
    isChild: pending.isChild,
    guardianEmails: pending.guardianEmails,
    emailVerified: true,
    verificationExpiresAt: pending.expiresAt,
  };

  if (pending.email) {
    participantToInsert.email = pending.email;
  }

  if (pending.primaryGuardianEmail) {
    participantToInsert.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  if (pending.verificationCodeHash) {
    participantToInsert.verificationCodeHash = pending.verificationCodeHash;
  }

  const attendingInPerson =
    typeof data.attendingInPerson === 'boolean'
      ? data.attendingInPerson
      : pending.attendingInPerson;

  if (typeof attendingInPerson === 'boolean') {
    participantToInsert.attendingInPerson = attendingInPerson;
  }

  const participant = insertParticipant(participantToInsert);
  if (!participant) {
    throw new Error('Não foi possível confirmar a inscrição. Tente novamente.');
  }

  deletePendingParticipant(pending.id);

  return participant;
};

export const resendVerificationCode = async (participantId: string): Promise<void> => {
  const pending = findPendingParticipantById(participantId);
  if (!pending) {
    const participant = findParticipantById(participantId);
    if (participant && participant.emailVerified) {
      throw new Error('Este participante já confirmou o e-mail.');
    }
    throw new Error('Inscrição não encontrada. Faça uma nova inscrição.');
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
  const expiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  const updatedPending = updatePendingParticipant(participantId, {
    verificationCodeHash,
    expiresAt,
  }) ?? {
    ...pending,
    verificationCodeHash,
    expiresAt,
  };

  const pendingContact: ParticipantContact = {
    firstName: updatedPending.firstName,
    isChild: updatedPending.isChild,
    guardianEmails: updatedPending.guardianEmails,
  };

  if (updatedPending.primaryGuardianEmail) {
    pendingContact.primaryGuardianEmail = updatedPending.primaryGuardianEmail;
  }

  if (updatedPending.email) {
    pendingContact.email = updatedPending.email;
  }

  await sendVerificationEmail(pendingContact, verificationCode);
};

const updateEmailSchema = z.object({
  participantId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  newEmail: z.string().email('Informe um e-mail válido.')
});

export const updateParticipantEmail = async (
  input: z.infer<typeof updateEmailSchema>
): Promise<void> => {
  const data = updateEmailSchema.parse(input);
  const normalizedEmail = normalizeEmail(data.newEmail);

  if (!normalizedEmail) {
    throw new Error('Informe um e-mail válido.');
  }

  const pending = findPendingParticipantById(data.participantId);
  if (!pending) {
    const participant = findParticipantById(data.participantId);
    if (participant && participant.emailVerified) {
      throw new Error('Este participante já confirmou o e-mail. Não é possível alterar o e-mail após a confirmação.');
    }
    throw new Error('Inscrição não encontrada. Faça uma nova inscrição.');
  }

  const existingParticipant = findParticipantByEmail(normalizedEmail);
  if (existingParticipant && existingParticipant.id !== pending.id) {
    throw new Error('Este e-mail já está em uso por outra inscrição confirmada.');
  }

  const existingPending = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);
  if (existingPending && existingPending.id !== pending.id) {
    throw new Error('Este e-mail já está em uso por outra inscrição pendente.');
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
  const expiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  const updates: Partial<PendingParticipant> = pending.isChild
    ? {
        primaryGuardianEmail: normalizedEmail,
        guardianEmails: buildGuardianList(
          normalizedEmail,
          pending.guardianEmails.filter((email) => email !== normalizedEmail)
        ),
      }
    : { email: normalizedEmail };

  const updated = updatePendingParticipant(pending.id, {
    ...updates,
    verificationCodeHash,
    expiresAt,
  });

  if (!updated) {
    throw new Error('Não foi possível atualizar o e-mail. Tente novamente.');
  }

  const pendingContact: ParticipantContact = {
    firstName: updated.firstName,
    isChild: updated.isChild,
    guardianEmails: updated.guardianEmails,
  };

  if (updated.primaryGuardianEmail) {
    pendingContact.primaryGuardianEmail = updated.primaryGuardianEmail;
  }

  if (updated.email) {
    pendingContact.email = updated.email;
  }

  await sendVerificationEmail(pendingContact, verificationCode);
};

const participantLoginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
});

export const authenticateParticipantByEmailAndCode = async (
  input: z.infer<typeof participantLoginSchema>
): Promise<Participant> => {
  const data = participantLoginSchema.parse(input);
  const normalizedEmail = normalizeEmail(data.email);

  if (!normalizedEmail) {
    throw new Error('Informe um e-mail válido.');
  }

  const participant = findParticipantByEmail(normalizedEmail);
  if (participant) {
    if (participant.emailVerified) {
      return participant;
    }
    throw new Error('Participante não verificado. Por favor, use o código de verificação.');
  }

  const pending = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);

  if (!pending) {
    throw new Error('Participante não encontrado. Verifique o e-mail e tente novamente.');
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    throw new Error('O código de verificação expirou. Solicite um novo.');
  }

  const isValidCode = await bcrypt.compare(data.code, pending.verificationCodeHash);
  if (!isValidCode) {
    throw new Error('Código inválido. Confira o e-mail enviado.');
  }

  const participantToInsert: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName: pending.firstName,
    secondName: pending.secondName,
    isChild: pending.isChild,
    guardianEmails: pending.guardianEmails,
    emailVerified: true,
    verificationExpiresAt: pending.expiresAt,
  };

  if (pending.email) {
    participantToInsert.email = pending.email;
  }

  if (pending.primaryGuardianEmail) {
    participantToInsert.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  if (pending.verificationCodeHash) {
    participantToInsert.verificationCodeHash = pending.verificationCodeHash;
  }

  if (typeof pending.attendingInPerson === 'boolean') {
    participantToInsert.attendingInPerson = pending.attendingInPerson;
  }

  const verifiedParticipant = insertParticipant(participantToInsert);
  if (!verifiedParticipant) {
    throw new Error('Não foi possível concluir a autenticação. Tente novamente.');
  }

  deletePendingParticipant(pending.id);

  return verifiedParticipant;
};

export const getParticipantOrFail = async (participantId: string): Promise<Participant> => {
  try {
    const participant = findParticipantById(participantId);
    if (!participant) {
      const pending = findPendingParticipantById(participantId);
      if (pending) {
        throw new Error('Esta inscrição ainda não foi confirmada. Valide o código enviado por e-mail.');
      }
      // Verificar se há algum participante no banco para debug
      const totalParticipants = countParticipants();
      const totalPending = countPendingParticipants();
      console.log(`[DEBUG] Participante ${participantId} não encontrado. Total de participantes verificados: ${totalParticipants}, Total pendentes: ${totalPending}`);
      throw new Error('Participante não encontrado. Verifique se o ID está correto e se a inscrição foi confirmada.');
    }
    return participant;
  } catch (error) {
    // Se já é um erro conhecido, re-lança
    if (error instanceof Error && (error.message.includes('não encontrado') || error.message.includes('não foi confirmada'))) {
      throw error;
    }
    // Se for erro de conexão, informa
    console.error(`[DEBUG] Erro ao buscar participante ${participantId}:`, error);
    throw new Error('Erro ao buscar participante. Verifique a conexão com o banco de dados.');
  }
};

export const getParticipantByEmailOrFail = async (email: string): Promise<Participant> => {
  if (!email || typeof email !== 'string') {
    throw new Error('E-mail inválido.');
  }
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Buscar primeiro no modelo de participantes confirmados
    const participant = findParticipantByEmail(normalizedEmail);

    if (!participant) {
      // Verificar se está pendente
      const pending = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);

      if (pending) {
        throw new Error('Esta inscrição ainda não foi confirmada. Valide o código enviado por e-mail.');
      }
      
      throw new Error('Participante não encontrado com este e-mail. Verifique se o e-mail está correto e se a inscrição foi confirmada.');
    }
    
    return participant;
  } catch (error) {
    // Se já é um erro conhecido, re-lança
    if (error instanceof Error && (error.message.includes('não encontrado') || error.message.includes('não foi confirmada'))) {
      throw error;
    }
    // Se for erro de conexão, informa
    console.error(`[DEBUG] Erro ao buscar participante por e-mail ${normalizedEmail}:`, error);
    throw new Error('Erro ao buscar participante. Verifique a conexão com o banco de dados.');
  }
};

export const listVerifiedParticipants = async (): Promise<Participant[]> => {
  return findAllParticipants()
    .filter((participant) => participant.emailVerified)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const searchParticipants = async (term: string): Promise<Participant[]> => {
  const query = searchSchema.parse(term);
  return searchParticipantsByNameAndEmail(query);
};
