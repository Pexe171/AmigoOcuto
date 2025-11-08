import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendVerificationEmail, ParticipantContact, buildGuardianList } from './emailService';
import { generateVerificationCode } from '../utils/codeGenerator';
import { ensureNames } from '../utils/nameUtils';
import {
  findParticipantById,
  findParticipantByEmail,
  findParticipantByPrimaryEmail,
  insertParticipant,
  countParticipants,
  findAllParticipants,
  searchParticipantsByNameAndEmail,
  findPendingParticipantById,
  findPendingParticipantByEmail,
  insertPendingParticipant,
  updatePendingParticipant,
  deletePendingParticipant,
  deletePendingParticipantsByEmail,
  countPendingParticipants,
  findPendingParticipantByEmailOrGuardianEmail,
} from '../database/participantRepository';

export interface Participant {
  id: string;
  firstName: string;
  secondName: string;
  email?: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails?: string[];
  emailVerified: boolean;
  verificationCodeHash?: string;
  verificationExpiresAt?: string;
  attendingInPerson?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingParticipant {
  id: string;
  email?: string;
  firstName: string;
  secondName: string;
  isChild?: boolean;
  primaryGuardianEmail?: string;
  guardianEmails?: string[];
  attendingInPerson?: boolean;
  verificationCodeHash: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const verificationTTLMinutes = 30;

const registrationSchema = z
  .object({
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
    attendingInPerson: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.fullName && (!data.firstName || !data.secondName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o nome completo.',
        path: ['fullName'],
      });
    }
  });

const verificationSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
  attendingInPerson: z.boolean().optional(),
});

const searchSchema = z
  .string()
  .trim()
  .min(2, 'Informe pelo menos duas letras para pesquisar.')
  .max(80);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeGuardianEmails = (emails?: string[] | null): string[] => {
  if (!emails) {
    return [];
  }
  return emails
    .filter((email): email is string => typeof email === 'string' && email.trim().length > 0)
    .map((email) => email.toLowerCase());
};

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const registerParticipant = async (input: RegistrationInput): Promise<PendingParticipant> => {
  const data = registrationSchema.parse(input);
  const { firstName, secondName } = ensureNames({
    fullName: data.fullName ?? null,
    firstName: data.firstName ?? null,
    secondName: data.secondName ?? null,
  });

  if (!firstName || !secondName) {
    throw new Error('Informe o nome completo.');
  }

  if (data.isChild) {
    if (!data.primaryGuardianEmail) {
      throw new Error('Crianças precisam de um e-mail principal de responsável.');
    }
  } else {
    if (!data.email) {
      throw new Error('Adultos precisam informar um e-mail para contato.');
    }
    const normalizedEmail = data.email.toLowerCase();
    const existing = findParticipantByPrimaryEmail(normalizedEmail);
    if (existing) {
      throw new Error('Este e-mail já está inscrito e confirmado.');
    }
    const pendingWithSameEmail = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);
    if (pendingWithSameEmail) {
      deletePendingParticipant(pendingWithSameEmail.id);
    }
    deletePendingParticipantsByEmail(normalizedEmail);
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
  const verificationExpiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  const primaryGuardianEmail = data.primaryGuardianEmail?.toLowerCase();
  const normalizedGuardianEmails = data.guardianEmails?.map((email) => email.toLowerCase()) ?? [];
  const guardianEmails = data.isChild
    ? buildGuardianList(primaryGuardianEmail, normalizedGuardianEmails)
    : [];

  const pendingParticipantToInsert: Omit<PendingParticipant, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName,
    secondName,
    isChild: data.isChild,
    verificationCodeHash,
    expiresAt: verificationExpiresAt,
  };

  if (typeof data.attendingInPerson === 'boolean') {
    pendingParticipantToInsert.attendingInPerson = data.attendingInPerson;
  }

  if (data.isChild) {
    if (!primaryGuardianEmail) {
      throw new Error('Crianças precisam de um e-mail principal de responsável.');
    }
    pendingParticipantToInsert.primaryGuardianEmail = primaryGuardianEmail;
    if (guardianEmails.length > 0) {
      pendingParticipantToInsert.guardianEmails = guardianEmails;
    }
  } else if (data.email) {
    pendingParticipantToInsert.email = data.email.toLowerCase();
  }

  const pendingParticipant = insertPendingParticipant(pendingParticipantToInsert);

  const contact: ParticipantContact = {
    firstName,
    isChild: data.isChild,
    guardianEmails,
  };

  if (primaryGuardianEmail) {
    contact.primaryGuardianEmail = primaryGuardianEmail;
  }

  if (data.email) {
    contact.email = data.email.toLowerCase();
  }

  await sendVerificationEmail(contact, verificationCode);

  return pendingParticipant;
};

export const verifyParticipant = async (
  input: z.infer<typeof verificationSchema>,
): Promise<Participant> => {
  const data = verificationSchema.parse(input);
  const normalizedEmail = data.email.toLowerCase().trim();

  const pending = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);
  if (!pending) {
    const already = findParticipantByEmail(normalizedEmail);
    if (already && already.emailVerified) {
      throw new Error('Esta inscrição já foi confirmada anteriormente.');
    }
    throw new Error('Inscrição não encontrada ou já verificada. Verifique o e-mail informado.');
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    throw new Error('O código de verificação expirou. Solicite um novo.');
  }

  const isValidCode = await bcrypt.compare(data.code, pending.verificationCodeHash);
  if (!isValidCode) {
    throw new Error('Código inválido. Confira o e-mail enviado.');
  }

  const participantToInsert: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  } = {
    id: pending.id,
    firstName: pending.firstName,
    secondName: pending.secondName,
    isChild: Boolean(pending.isChild),
    emailVerified: true,
    verificationCodeHash: pending.verificationCodeHash,
    verificationExpiresAt: pending.expiresAt,
    createdAt: pending.createdAt,
  };

  if (pending.email) {
    participantToInsert.email = pending.email;
  }

  if (pending.primaryGuardianEmail) {
    participantToInsert.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  const guardianEmailsFromPending = sanitizeGuardianEmails(pending.guardianEmails);
  if (guardianEmailsFromPending.length > 0) {
    participantToInsert.guardianEmails = guardianEmailsFromPending;
  }

  if (typeof pending.attendingInPerson === 'boolean') {
    participantToInsert.attendingInPerson = pending.attendingInPerson;
  }

  const participant = insertParticipant(participantToInsert);
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
  const verificationExpiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  const updatedPending =
    updatePendingParticipant(pending.id, {
      verificationCodeHash,
      expiresAt: verificationExpiresAt,
    }) ?? {
      ...pending,
      verificationCodeHash,
      expiresAt: verificationExpiresAt,
    };

  const contact: ParticipantContact = {
    firstName: updatedPending.firstName,
    isChild: Boolean(updatedPending.isChild),
    guardianEmails: sanitizeGuardianEmails(updatedPending.guardianEmails),
  };

  if (updatedPending.primaryGuardianEmail) {
    contact.primaryGuardianEmail = updatedPending.primaryGuardianEmail;
  }

  if (updatedPending.email) {
    contact.email = updatedPending.email;
  }

  await sendVerificationEmail(contact, verificationCode);
};

const updateEmailSchema = z.object({
  participantId: z.string().regex(/^[0-9a-fA-F\-]{36}$/),
  newEmail: z.string().email('Informe um e-mail válido.'),
});

export const updateParticipantEmail = async (
  input: z.infer<typeof updateEmailSchema>,
): Promise<void> => {
  const data = updateEmailSchema.parse(input);
  const normalizedEmail = data.newEmail.toLowerCase().trim();

  const pending = findPendingParticipantById(data.participantId);
  if (!pending) {
    const participant = findParticipantById(data.participantId);
    if (participant && participant.emailVerified) {
      throw new Error('Este participante já confirmou o e-mail. Não é possível alterar o e-mail após a confirmação.');
    }
    throw new Error('Inscrição não encontrada. Faça uma nova inscrição.');
  }

  const existingParticipant = findParticipantByPrimaryEmail(normalizedEmail);
  if (existingParticipant) {
    throw new Error('Este e-mail já está em uso por outra inscrição confirmada.');
  }

  const existingPending = findPendingParticipantByEmail(normalizedEmail);
  if (existingPending && existingPending.id !== data.participantId) {
    throw new Error('Este e-mail já está em uso por outra inscrição pendente.');
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
  const verificationExpiresAt = new Date(Date.now() + verificationTTLMinutes * 60 * 1000).toISOString();

  let guardianEmails = sanitizeGuardianEmails(pending.guardianEmails);

  if (pending.isChild) {
    if (!normalizedEmail) {
      throw new Error('É necessário informar um e-mail válido para o responsável.');
    }
    guardianEmails = guardianEmails.filter((email) => email !== normalizedEmail);
    updatePendingParticipant(pending.id, {
      primaryGuardianEmail: normalizedEmail,
      guardianEmails,
      verificationCodeHash,
      expiresAt: verificationExpiresAt,
    });
  } else {
    updatePendingParticipant(pending.id, {
      email: normalizedEmail,
      verificationCodeHash,
      expiresAt: verificationExpiresAt,
    });
  }

  const contact: ParticipantContact = {
    firstName: pending.firstName,
    isChild: Boolean(pending.isChild),
    guardianEmails,
  };

  if (pending.isChild) {
    contact.primaryGuardianEmail = normalizedEmail;
  } else {
    contact.email = normalizedEmail;
  }

  await sendVerificationEmail(contact, verificationCode);
};

const participantLoginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
});

export const authenticateParticipantByEmailAndCode = async (
  input: z.infer<typeof participantLoginSchema>,
): Promise<Participant> => {
  const data = participantLoginSchema.parse(input);
  const normalizedEmail = data.email.toLowerCase().trim();

  const existingParticipant = findParticipantByEmail(normalizedEmail);
  if (existingParticipant) {
    if (existingParticipant.emailVerified) {
      return existingParticipant;
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

  const participantToInsert: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  } = {
    id: pending.id,
    firstName: pending.firstName,
    secondName: pending.secondName,
    isChild: Boolean(pending.isChild),
    emailVerified: true,
    verificationCodeHash: pending.verificationCodeHash,
    verificationExpiresAt: pending.expiresAt,
    createdAt: pending.createdAt,
  };

  if (pending.email) {
    participantToInsert.email = pending.email;
  }

  if (pending.primaryGuardianEmail) {
    participantToInsert.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  const guardianEmailsFromPending = sanitizeGuardianEmails(pending.guardianEmails);
  if (guardianEmailsFromPending.length > 0) {
    participantToInsert.guardianEmails = guardianEmailsFromPending;
  }

  if (typeof pending.attendingInPerson === 'boolean') {
    participantToInsert.attendingInPerson = pending.attendingInPerson;
  }

  const verifiedParticipant = insertParticipant(participantToInsert);
  deletePendingParticipant(pending.id);

  return verifiedParticipant;
};

export const getParticipantOrFail = async (participantId: string): Promise<Participant> => {
  const participant = findParticipantById(participantId);
  if (participant) {
    return participant;
  }

  const pending = findPendingParticipantById(participantId);
  if (pending) {
    throw new Error('Esta inscrição ainda não foi confirmada. Valide o código enviado por e-mail.');
  }

  const totalParticipants = countParticipants();
  const totalPending = countPendingParticipants();
  console.log(
    `[DEBUG] Participante ${participantId} não encontrado. Total de participantes verificados: ${totalParticipants}, Total pendentes: ${totalPending}`,
  );
  throw new Error('Participante não encontrado. Verifique se o ID está correto e se a inscrição foi confirmada.');
};

export const getParticipantByEmailOrFail = async (email: string): Promise<Participant> => {
  if (!email || typeof email !== 'string') {
    throw new Error('E-mail inválido.');
  }
  const normalizedEmail = email.toLowerCase().trim();

  const participant = findParticipantByEmail(normalizedEmail);
  if (participant) {
    return participant;
  }

  const pending = findPendingParticipantByEmailOrGuardianEmail(normalizedEmail);
  if (pending) {
    throw new Error('Esta inscrição ainda não foi confirmada. Valide o código enviado por e-mail.');
  }

  throw new Error('Participante não encontrado com este e-mail. Verifique se o e-mail está correto e se a inscrição foi confirmada.');
};

export const listVerifiedParticipants = async (): Promise<Participant[]> => {
  const participants = findAllParticipants();
  return participants
    .filter((participant) => participant.emailVerified)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const searchParticipants = async (term: string): Promise<Participant[]> => {
  const query = searchSchema.parse(term);
  const regex = new RegExp(escapeRegExp(query), 'i');
  const participants = searchParticipantsByNameAndEmail(query);
  return participants.filter((participant) =>
    regex.test(participant.firstName) ||
    regex.test(participant.secondName) ||
    regex.test(`${participant.firstName} ${participant.secondName}`),
  );
};
