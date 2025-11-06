import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ParticipantModel, ParticipantDocument } from '../models/Participant';
import { PendingParticipantModel, PendingParticipantDocument } from '../models/PendingParticipant';
import { sendVerificationEmail, ParticipantContact } from './emailService';
import { generateVerificationCode } from '../utils/codeGenerator';
import { ensureNames } from '../utils/nameUtils';

/**
 * Serviço que conduz toda a jornada do participante: inscrição, verificação,
 * atualização de e-mail e pesquisas. A maior parte das validações vive aqui.
 */

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
  nickname: z.string().optional(),
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type RegistrationInput = z.infer<typeof registrationSchema>;

const buildGuardianList = (primary?: string | null, extras: string[] = []): string[] => {
  const set = new Set<string>();
  if (primary) {
    set.add(primary);
  }
  extras.forEach((email) => {
    if (email) {
      set.add(email);
    }
  });
  return Array.from(set);
};

export const registerParticipant = async (input: RegistrationInput): Promise<PendingParticipantDocument> => {
  const data = registrationSchema.parse(input);
  const { firstName, secondName } = ensureNames({
    fullName: data.fullName ?? null,
    firstName: data.firstName ?? null,
    secondName: data.secondName ?? null
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
    const existing = await ParticipantModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new Error('Este e-mail já está inscrito e confirmado.');
    }
    await PendingParticipantModel.deleteMany({ email: normalizedEmail });
  }

  const verificationCode = generateVerificationCode();
  const verification = {
    codeHash: await bcrypt.hash(verificationCode, 10),
    expiresAt: new Date(Date.now() + verificationTTLMinutes * 60 * 1000)
  };

  const primaryGuardianEmail = data.primaryGuardianEmail?.toLowerCase();
  const normalizedGuardianEmails = data.guardianEmails?.map((email) => email.toLowerCase()) ?? [];
  const guardianEmails = data.isChild
    ? buildGuardianList(primaryGuardianEmail, normalizedGuardianEmails)
    : [];

  const participant = new PendingParticipantModel({
    firstName,
    secondName,
    nickname: data.nickname,
    email: data.email?.toLowerCase(),
    isChild: data.isChild,
    primaryGuardianEmail,
    guardianEmails,
    verification,
    attendingInPerson: data.attendingInPerson
  });

  await participant.save();
  const contact: ParticipantContact = {
    firstName: participant.firstName,
    isChild: participant.isChild,
    guardianEmails: participant.guardianEmails
  };

  if (participant.primaryGuardianEmail) {
    contact.primaryGuardianEmail = participant.primaryGuardianEmail;
  }

  if (participant.email) {
    contact.email = participant.email;
  }

  await sendVerificationEmail(contact, verificationCode);

  return participant;
};

export const verifyParticipant = async (
  input: z.infer<typeof verificationSchema>
): Promise<ParticipantDocument> => {
  const data = verificationSchema.parse(input);

  const pending = await PendingParticipantModel.findById(data.participantId);
  if (!pending) {
    const already = await ParticipantModel.findById(data.participantId);
    if (already && already.emailVerified) {
      throw new Error('Esta inscrição já foi confirmada anteriormente.');
    }
    throw new Error('Inscrição não encontrada ou já verificada.');
  }

  if (pending.verification.expiresAt.getTime() < Date.now()) {
    throw new Error('O código de verificação expirou. Solicite um novo.');
  }

  const isValidCode = await bcrypt.compare(data.code, pending.verification.codeHash);
  if (!isValidCode) {
    throw new Error('Código inválido. Confira o e-mail enviado.');
  }

  const participant = new ParticipantModel({
    _id: pending._id,
    firstName: pending.firstName,
    secondName: pending.secondName,
    nickname: pending.nickname,
    email: pending.email,
    isChild: pending.isChild,
    primaryGuardianEmail: pending.primaryGuardianEmail,
    guardianEmails: pending.guardianEmails,
    emailVerified: true,
    attendingInPerson:
      typeof data.attendingInPerson === 'boolean' ? data.attendingInPerson : pending.attendingInPerson
  });

  participant.set('createdAt', pending.createdAt);
  participant.set('updatedAt', new Date());

  await participant.save();
  await PendingParticipantModel.deleteOne({ _id: pending._id });

  return participant;
};

export const resendVerificationCode = async (participantId: string): Promise<void> => {
  const pending = await PendingParticipantModel.findById(participantId);
  if (!pending) {
    const participant = await ParticipantModel.findById(participantId);
    if (participant && participant.emailVerified) {
      throw new Error('Este participante já confirmou o e-mail.');
    }
    throw new Error('Inscrição não encontrada. Faça uma nova inscrição.');
  }

  const verificationCode = generateVerificationCode();
  pending.verification = {
    codeHash: await bcrypt.hash(verificationCode, 10),
    expiresAt: new Date(Date.now() + verificationTTLMinutes * 60 * 1000)
  };

  await pending.save();
  const pendingContact: ParticipantContact = {
    firstName: pending.firstName,
    isChild: pending.isChild,
    guardianEmails: pending.guardianEmails
  };

  if (pending.primaryGuardianEmail) {
    pendingContact.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  if (pending.email) {
    pendingContact.email = pending.email;
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
  const normalizedEmail = data.newEmail.toLowerCase().trim();

  const pending = await PendingParticipantModel.findById(data.participantId);
  if (!pending) {
    const participant = await ParticipantModel.findById(data.participantId);
    if (participant && participant.emailVerified) {
      throw new Error('Este participante já confirmou o e-mail. Não é possível alterar o e-mail após a confirmação.');
    }
    throw new Error('Inscrição não encontrada. Faça uma nova inscrição.');
  }

  // Verificar se o novo email já está em uso (participantes confirmados)
  const existingParticipant = await ParticipantModel.findOne({
    $or: [
      { email: normalizedEmail },
      { primaryGuardianEmail: normalizedEmail }
    ]
  });
  if (existingParticipant) {
    throw new Error('Este e-mail já está em uso por outra inscrição confirmada.');
  }

  // Verificar se já existe um pendente com este email (exceto o próprio)
  const existingPending = await PendingParticipantModel.findOne({ 
    $or: [
      { email: normalizedEmail },
      { primaryGuardianEmail: normalizedEmail }
    ],
    _id: { $ne: data.participantId }
  });
  if (existingPending) {
    throw new Error('Este e-mail já está em uso por outra inscrição pendente.');
  }

  // Atualizar o email
  if (pending.isChild) {
    // Para crianças, atualizar o email do responsável principal
    if (!normalizedEmail) {
      throw new Error('É necessário informar um e-mail válido para o responsável.');
    }
    pending.primaryGuardianEmail = normalizedEmail;
    // Limpar emails adicionais se necessário
    pending.guardianEmails = pending.guardianEmails.filter(e => e !== normalizedEmail);
  } else {
    // Para adultos, atualizar o email principal
    pending.email = normalizedEmail;
  }

  // Gerar novo código de verificação
  const verificationCode = generateVerificationCode();
  pending.verification = {
    codeHash: await bcrypt.hash(verificationCode, 10),
    expiresAt: new Date(Date.now() + verificationTTLMinutes * 60 * 1000)
  };

  await pending.save();

  // Enviar email com novo código
  const pendingContact: ParticipantContact = {
    firstName: pending.firstName,
    isChild: pending.isChild,
    guardianEmails: pending.guardianEmails
  };

  if (pending.primaryGuardianEmail) {
    pendingContact.primaryGuardianEmail = pending.primaryGuardianEmail;
  }

  if (pending.email) {
    pendingContact.email = pending.email;
  }

  await sendVerificationEmail(pendingContact, verificationCode);
};

export const getParticipantOrFail = async (participantId: string): Promise<ParticipantDocument> => {
  try {
    const participant = await ParticipantModel.findById(participantId);
    if (!participant) {
      const pending = await PendingParticipantModel.findById(participantId);
      if (pending) {
        throw new Error('Esta inscrição ainda não foi confirmada. Valide o código enviado por e-mail.');
      }
      // Verificar se há algum participante no banco para debug
      const totalParticipants = await ParticipantModel.countDocuments();
      const totalPending = await PendingParticipantModel.countDocuments();
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

export const getParticipantByEmailOrFail = async (email: string): Promise<ParticipantDocument> => {
  if (!email || typeof email !== 'string') {
    throw new Error('E-mail inválido.');
  }
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // Buscar primeiro no modelo de participantes confirmados
    let participant = await ParticipantModel.findOne({ email: normalizedEmail });
    
    if (!participant) {
      // Se não encontrou pelo email direto, pode ser criança com email do responsável
      participant = await ParticipantModel.findOne({ primaryGuardianEmail: normalizedEmail });
    }
    
    if (!participant) {
      // Verificar se está pendente
      const pending = await PendingParticipantModel.findOne({
        $or: [
          { email: normalizedEmail },
          { primaryGuardianEmail: normalizedEmail }
        ]
      });
      
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

export const listVerifiedParticipants = async (): Promise<ParticipantDocument[]> => {
  return ParticipantModel.find({ emailVerified: true }).sort({ createdAt: 1 }).exec();
};

export const searchParticipants = async (term: string): Promise<ParticipantDocument[]> => {
  const query = searchSchema.parse(term);
  const regex = new RegExp(escapeRegExp(query), 'i');

  return ParticipantModel.find({
    emailVerified: true,
    $or: [
      { firstName: regex },
      { secondName: regex },
      { nickname: regex },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ['$firstName', ' ', '$secondName'] },
            regex
          }
        }
      }
    ]
  })
    .sort({ firstName: 1, secondName: 1 })
    .limit(15)
    .exec();
};
