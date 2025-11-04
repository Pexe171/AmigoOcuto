import { Request, Response } from 'express';
import { createEvent, listEvents, cancelEvent, drawEvent, getEventHistory } from '../services/eventService';
import { env } from '../config/environment';
import {
  getParticipantDetailsForAdmin,
  listParticipantsWithGiftSummary
} from '../services/adminService';

export const authenticateAdmin = (req: Request, res: Response): void => {
  const { token } = req.body as { token?: string };
  if (!token || token !== env.ADMIN_TOKEN) {
    res.status(401).json({ message: 'Token administrativo inválido.' });
    return;
  }
  res.json({ message: 'Acesso autorizado.' });
};

export const listParticipants = async (_req: Request, res: Response): Promise<void> => {
  const participants = await listParticipantsWithGiftSummary();
  res.json(participants);
};

export const getParticipantDetails = async (req: Request, res: Response): Promise<void> => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    const details = await getParticipantDetailsForAdmin(participantId);
    res.json(details);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
};

export const createNewEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await createEvent(req.body);
    res.status(201).json({ id: event._id, name: event.name, status: event.status });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const listAllEvents = async (_req: Request, res: Response): Promise<void> => {
  const events = await listEvents();
  res.json(
    events.map((event) => ({
      id: event._id,
      name: event.name,
      status: event.status,
      participantes: event.participants.length,
      sorteios: event.drawHistory.length,
      criadoEm: event.createdAt
    }))
  );
};

export const cancelExistingEvent = async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400).json({ message: 'Informe o identificador do evento.' });
    return;
  }
  try {
    const event = await cancelEvent(eventId);
    res.json({ id: event._id, name: event.name, status: event.status });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const runDraw = async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400).json({ message: 'Informe o identificador do evento.' });
    return;
  }
  try {
    const result = await drawEvent({ eventId });
    res.json({
      message: 'Sorteio executado com sucesso. Os participantes receberam seus tickets por e-mail.',
      event: { id: result.event._id, status: result.event.status },
      tickets: result.tickets
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400).json({ message: 'Informe o identificador do evento.' });
    return;
  }
  try {
    const history = await getEventHistory(eventId);
    res.json(history);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
