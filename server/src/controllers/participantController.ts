// Este ficheiro deve estar em server/src/controllers/participantController.ts
import { Request, Response } from 'express';
import {
  registerParticipant,
  verifyParticipant,
  resendVerificationCode,
  getParticipantOrFail,
  searchParticipants,
} from '../services/participantService';

// Esta função é chamada quando fazes POST /api/participants
export const createParticipant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Tenta registar o participante (aqui é que o email é disparado)
    const participant = await registerParticipant(req.body);
    res.status(201).json({
      id: participant._id,
      message:
        'Inscrição criada com sucesso. Verifique o e-mail informado para confirmar a participação.',
    });
  } catch (error) {
    // 2. Se falhar (ex: validação do Zod), devolve um erro 400
    // (Foi isto que aconteceu no teu último log: POST 400)
    res.status(400).json({ message: (error as Error).message });
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
    res.json({
      id: participant._id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      nickname: participant.nickname,
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
      results: results.map((participant) => ({
        id: participant._id,
        firstName: participant.firstName,
        secondName: participant.secondName,
        nickname: participant.nickname,
        emailVerified: participant.emailVerified,
        isChild: participant.isChild
      }))
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
