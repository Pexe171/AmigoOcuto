import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ParticipantModel, ParticipantDocument } from '../models/Participant';
import { sendVerificationEmail } from './emailService';
import { generateVerificationCode } from '../utils/codeGenerator';

const verificationTTLMinutes = 30;

const registrationSchema = z.object({
  firstName: z.string().min(2, 'Informe pelo menos duas letras para o primeiro nome.'),
  secondName: z.string().min(2, 'Informe o segundo nome.'),
  nickname: z.string().optional(),
  email: z.string().email().optional(),
  isChild: z.boolean().default(false),
  primaryGuardianEmail: z.string().email().optional(),
  guardianEmails: z.array(z.string().email()).optional(),
  goingToSpain: z.boolean().optional()
});

const verificationSchema = z.object({
  participantId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
  goingToSpain: z.boolean().optional()
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const registerParticipant = async (input: RegistrationInput): Promise<ParticipantDocument> => {
  const data = registrationSchema.parse(input);

  if (data.isChild) {
    if (!data.primaryGuardianEmail) {
      throw new Error('Crianças precisam de um e-mail principal de responsável.');
    }
  } else {
    if (!data.email) {
      throw new Error('Adultos precisam informar um e-mail para contato.');
    }
    const existing = await ParticipantModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new Error('Este e-mail já está inscrito.');
    }
  }

  const verificationCode = generateVerificationCode();
  const verification = {
    codeHash: await bcrypt.hash(verificationCode, 10),
    expiresAt: new Date(Date.now() + verificationTTLMinutes * 60 * 1000)
  };

  const participant = new ParticipantModel({
    firstName: data.firstName,
    secondName: data.secondName,
    nickname: data.nickname,
    email: data.email?.toLowerCase(),
    isChild: data.isChild,
    primaryGuardianEmail: data.primaryGuardianEmail?.toLowerCase(),
    guardianEmails: data.guardianEmails?.map((email) => email.toLowerCase()) ?? [],
    emailVerified: false,
    verification,
    goingToSpain: data.goingToSpain
  });

  await participant.save();
  await sendVerificationEmail(participant, verificationCode);

  return participant;
};

export const verifyParticipant = async (
  input: z.infer<typeof verificationSchema>
): Promise<ParticipantDocument> => {
  const data = verificationSchema.parse(input);

  const participant = await ParticipantModel.findById(data.participantId);
  if (!participant || !participant.verification) {
    throw new Error('Inscrição não encontrada ou já verificada.');
  }

  if (participant.verification.expiresAt.getTime() < Date.now()) {
    throw new Error('O código de verificação expirou. Solicite um novo.');
  }

  const isValidCode = await bcrypt.compare(data.code, participant.verification.codeHash);
  if (!isValidCode) {
    throw new Error('Código inválido. Confira o e-mail enviado.');
  }

  participant.emailVerified = true;
  participant.set('verification', undefined);
  if (typeof data.goingToSpain === 'boolean') {
    participant.goingToSpain = data.goingToSpain;
  }

  await participant.save();
  return participant;
};

export const resendVerificationCode = async (participantId: string): Promise<void> => {
  const participant = await ParticipantModel.findById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  if (participant.emailVerified) {
    throw new Error('Este participante já confirmou o e-mail.');
  }

  const verificationCode = generateVerificationCode();
  participant.verification = {
    codeHash: await bcrypt.hash(verificationCode, 10),
    expiresAt: new Date(Date.now() + verificationTTLMinutes * 60 * 1000)
  };

  await participant.save();
  await sendVerificationEmail(participant, verificationCode);
};

export const getParticipantOrFail = async (participantId: string): Promise<ParticipantDocument> => {
  const participant = await ParticipantModel.findById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }
  return participant;
};

export const listVerifiedParticipants = async (): Promise<ParticipantDocument[]> => {
  return ParticipantModel.find({ emailVerified: true }).sort({ createdAt: 1 }).exec();
};
