import { Request, Response } from 'express';
import {
  registerParticipant,
  verifyParticipant,
  resendVerificationCode,
  getParticipantOrFail
} from '../services/participantService';

export const createParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const participant = await registerParticipant(req.body);
    res.status(201).json({
      id: participant._id,
      message: 'Inscrição criada com sucesso. Verifique o e-mail informado para confirmar a participação.'
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const confirmParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const participant = await verifyParticipant(req.body);
    res.json({
      id: participant._id,
      emailVerified: participant.emailVerified,
      message: 'E-mail confirmado com sucesso. Prepare a sua lista de presentes!'
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscrição.' });
    return;
  }
  try {
    await resendVerificationCode(id);
    res.json({ message: 'Um novo código foi enviado para o e-mail principal cadastrado.' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getParticipantStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscrição.' });
    return;
  }
  try {
    const participant = await getParticipantOrFail(id);
    res.json({
      id: participant._id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      nickname: participant.nickname,
      emailVerified: participant.emailVerified,
      isChild: participant.isChild,
      attendingInPerson: participant.attendingInPerson
    });
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
};
