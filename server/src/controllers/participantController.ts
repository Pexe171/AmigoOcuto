// Este ficheiro deve estar em server/src/controllers/participantController.ts
import { Request, Response } from 'express';
import {
  registerParticipant,
  verifyParticipant,
  resendVerificationCode,
  getParticipantOrFail,
  searchParticipants,
  getParticipantByEmailOrFail,
  updateParticipantEmail,
} from '../services/participantService';
import { ensureNames } from '../utils/nameUtils';

const resolveParticipantId = (participant: { id?: string; _id?: unknown }): string => {
  if (participant.id) {
    return participant.id;
  }

  const rawId = (participant as { _id?: unknown })._id;
  if (typeof rawId === 'string') {
    return rawId;
  }

  if (rawId && typeof (rawId as { toString?: () => string }).toString === 'function') {
    return (rawId as { toString: () => string }).toString();
  }

  throw new Error('Participante sem identificador válido.');
};

const extractGuardianEmails = (participant: { guardianEmails?: unknown }): string[] => {
  const { guardianEmails } = participant as { guardianEmails?: unknown };
  if (Array.isArray(guardianEmails)) {
    return guardianEmails.filter((email): email is string => typeof email === 'string');
  }

  if (typeof guardianEmails === 'string' && guardianEmails.trim().length > 0) {
    try {
      const parsed = JSON.parse(guardianEmails);
      if (Array.isArray(parsed)) {
        return parsed.filter((email): email is string => typeof email === 'string');
      }
    } catch (error) {
      console.warn('Não foi possível converter guardianEmails armazenados como string JSON.', error);
      return [guardianEmails];
    }
    return [guardianEmails];
  }

  return [];
};

// Esta função é chamada quando fazes POST /api/participants
export const createParticipant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Tenta registar o participante (aqui é que o email é disparado)
    const participant = await registerParticipant(req.body);
    res.status(201).json({
      id: resolveParticipantId(participant),
      message:
        'Inscrição criada com sucesso. Verifique o e-mail informado para confirmar a participação.',
    });
  } catch (error) {
    if ((error as Error).message.includes('validação') || (error as Error).message.includes('inválido')) {
      res.status(400).json({ message: (error as Error).message });
    } else {
      console.error('Erro ao criar participante:', error);
      res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
  }
};

// Esta função é chamada quando fazes POST /api/participants/verify
export const confirmParticipant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const participant = await verifyParticipant(req.body);
    res.json({
      id: resolveParticipantId(participant),
      emailVerified: participant.emailVerified,
      message: 'E-mail confirmado com sucesso. Prepare a sua lista de presentes!',
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// Função para reenviar o código (não está a ser usada no frontend novo, mas existe)
export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscrição.' });
    return;
  }
  try {
    await resendVerificationCode(id);
    res.json({
      message: 'Um novo código foi enviado para o e-mail principal cadastrado.',
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// Função para buscar o status (usada na página de lista de presentes)
export const getParticipantStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscrição.' });
    return;
  }
  try {
    const participant = await getParticipantOrFail(id);
    const guardianEmails = extractGuardianEmails(participant);
    const contactEmail = participant.isChild
      ? participant.primaryGuardianEmail ?? guardianEmails[0] ?? null
      : participant.email ?? null;
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    res.json({
      id: resolveParticipantId(participant),
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      emailVerified: participant.emailVerified,
      isChild: participant.isChild,
      email: participant.email,
      primaryGuardianEmail: participant.primaryGuardianEmail,
      guardianEmails,
      attendingInPerson: participant.attendingInPerson,
      contactEmail,
      createdAt: participant.createdAt,
    });
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
};

export const searchParticipantsByName = async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ message: 'Informe um termo para pesquisar participantes.' });
    return;
  }

  try {
    const results = await searchParticipants(q);
    res.json({
      results: results.map((participant) => {
        const names = ensureNames({
          firstName: participant.firstName,
          secondName: participant.secondName,
        });

        return {
          id: resolveParticipantId(participant),
          firstName: participant.firstName,
          secondName: participant.secondName,
          fullName: names.fullName,
          emailVerified: participant.emailVerified,
          isChild: participant.isChild,
        };
      })
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getParticipantStatusByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.params;
  if (!email) {
    res.status(400).json({ message: 'Informe o e-mail do participante.' });
    return;
  }
  try {
    const participant = await getParticipantByEmailOrFail(email);
    const guardianEmails = extractGuardianEmails(participant);
    const contactEmail = participant.isChild
      ? participant.primaryGuardianEmail ?? guardianEmails[0] ?? null
      : participant.email ?? null;
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    res.json({
      id: resolveParticipantId(participant),
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      emailVerified: participant.emailVerified,
      isChild: participant.isChild,
      email: participant.email,
      primaryGuardianEmail: participant.primaryGuardianEmail,
      guardianEmails,
      attendingInPerson: participant.attendingInPerson,
      contactEmail,
      createdAt: participant.createdAt,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi confirmada')) {
      res.status(404).json({ message: errorMessage });
    } else {
      res.status(400).json({ message: errorMessage });
    }
  }
};

export const updateEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await updateParticipantEmail(req.body);
    res.json({
      message: 'E-mail atualizado com sucesso. Um novo código de verificação foi enviado para o novo endereço.',
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { authenticateParticipantByEmailAndCode } from '../services/participantService';

type ParticipantTokenPayload = {
  participantId: string;
  email?: string;
};

export const authenticateParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ message: 'Informe o e-mail e o código de verificação.' });
      return;
    }

    const participant = await authenticateParticipantByEmailAndCode({ email, code });

    const guardianEmails = extractGuardianEmails(participant);
    const participantId = resolveParticipantId(participant);

    const token = jwt.sign(
      { participantId, email: participant.email || participant.primaryGuardianEmail } as ParticipantTokenPayload,
      env.ADMIN_JWT_SECRET, // Reusing ADMIN_JWT_SECRET for now, should be a separate secret
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
      message: 'Login de participante bem-sucedido.',
      token,
      participant: {
        id: participantId,
        firstName: participant.firstName,
        fullName: ensureNames({ firstName: participant.firstName, secondName: participant.secondName }).fullName,
        email: participant.email,
        isChild: participant.isChild,
        emailVerified: participant.emailVerified,
        contactEmail: participant.email || participant.primaryGuardianEmail || guardianEmails[0] || null,
      },
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};