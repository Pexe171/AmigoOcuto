// Este ficheiro deve estar em server/src/controllers/participantController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Participant, PendingParticipant } from '../services/participantService';
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

// Esta função é chamada quando fazes POST /api/participants
export const createParticipant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Tenta registar o participante (aqui é que o email é disparado)
    const participant: PendingParticipantDocument = await registerParticipant(req.body);
    res.status(201).json({
      id: participant._id,
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
    const participant: ParticipantDocument = await verifyParticipant(req.body);
    res.json({
      id: participant._id,
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
    const contactEmail = participant.isChild
      ? participant.primaryGuardianEmail ?? participant.guardianEmails[0] ?? null
      : participant.email ?? null;
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    res.json({
      id: participant._id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      emailVerified: participant.emailVerified,
      isChild: participant.isChild,
      email: participant.email,
      primaryGuardianEmail: participant.primaryGuardianEmail,
      guardianEmails: participant.guardianEmails ?? [],
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
          id: participant._id,
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
    const contactEmail = participant.isChild
      ? participant.primaryGuardianEmail ?? participant.guardianEmails[0] ?? null
      : participant.email ?? null;
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    res.json({
      id: participant._id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      emailVerified: participant.emailVerified,
      isChild: participant.isChild,
      email: participant.email,
      primaryGuardianEmail: participant.primaryGuardianEmail,
      guardianEmails: participant.guardianEmails ?? [],
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

    const token = jwt.sign(
      { participantId: participant._id, email: participant.email || participant.primaryGuardianEmail } as ParticipantTokenPayload,
      env.ADMIN_JWT_SECRET, // Reusing ADMIN_JWT_SECRET for now, should be a separate secret
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
      message: 'Login de participante bem-sucedido.',
      token,
      participant: {
        id: participant._id,
        firstName: participant.firstName,
        fullName: ensureNames({ firstName: participant.firstName, secondName: participant.secondName }).fullName,
        email: participant.email,
        isChild: participant.isChild,
        emailVerified: participant.emailVerified,
        contactEmail: participant.email || participant.primaryGuardianEmail,
      },
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};