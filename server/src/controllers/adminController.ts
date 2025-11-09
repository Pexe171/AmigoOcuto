import { Request, Response } from 'express';
import { createEvent, listEvents, cancelEvent, drawEvent, undoLastDraw, getEventHistory, includeParticipantInEvent, excludeParticipantFromEvent } from '../services/eventService';
import { findEventById } from '../database/eventRepository';
import { env } from '../config/environment';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import {
  deleteParticipantForAdmin,
  getParticipantDetailsForAdmin,
  listParticipantsWithGiftSummary,
  sendTestEmailsToAllParticipants
} from '../services/adminService';

type AdminTokenPayload = { email: string };

const loginSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1, 'Informe a senha administrativa.').optional(),
    token: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.token) {
      return;
    }
    if (!data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o e-mail administrativo.', path: ['email'] });
    }
    if (!data.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a senha administrativa.', path: ['password'] });
    }
  });

export const authenticateAdmin = (req: Request, res: Response): void => {
  try {
    const credentials = loginSchema.parse(req.body ?? {});

    if (credentials.token) {
      try {
        const payload = jwt.verify(credentials.token, env.ADMIN_JWT_SECRET) as AdminTokenPayload & JwtPayload;
        res.json({
          message: 'Sessão restaurada com sucesso.',
          token: credentials.token,
          email: payload.email ?? env.ADMIN_EMAIL
        });
        return;
      } catch (error) {
        res.status(401).json({ message: 'Sessão administrativa expirada. Faça login novamente.' });
        return;
      }
    }

    const normalizedEmail = credentials.email!.toLowerCase();
    if (
      normalizedEmail !== env.ADMIN_EMAIL.toLowerCase() ||
      credentials.password !== env.ADMIN_PASSWORD
    ) {
      res.status(401).json({ message: 'Credenciais administrativas inválidas.' });
      return;
    }

    const token = jwt.sign(
      { email: env.ADMIN_EMAIL } satisfies AdminTokenPayload,
      env.ADMIN_JWT_SECRET,
      { expiresIn: `${env.ADMIN_SESSION_MINUTES}m` }
    );

    res.json({ message: 'Acesso autorizado.', token, email: env.ADMIN_EMAIL });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Informe o e-mail e a senha administrativos.' });
      return;
    }
    res.status(400).json({ message: (error as Error).message });
  }
};

export const listParticipants = async (_req: Request, res: Response): Promise<void> => {
  try {
    const participants = await listParticipantsWithGiftSummary();
    res.json(participants);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
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

export const deleteParticipant = (req: Request, res: Response): void => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    const removed = deleteParticipantForAdmin(participantId);
    res.json({
      message: 'Participante removido com sucesso.',
      participant: removed,
    });
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
};

export const createNewEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await createEvent(req.body);
    res.status(201).json({ id: event.id, name: event.name, status: event.status });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const listAllEvents = async (_req: Request, res: Response): Promise<void> => {
  const events = await listEvents();
  res.json(
    events.map((event) => ({
      id: event.id,
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
    res.json({ id: event.id, name: event.name, status: event.status });
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
      event: { id: result.event.id, status: result.event.status },
      tickets: result.tickets
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const undoDraw = async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400).json({ message: 'Informe o identificador do evento.' });
    return;
  }
  try {
    const event = await undoLastDraw({ eventId });
    res.json({
      message: 'Último sorteio desfeito com sucesso. Os participantes foram notificados por e-mail.',
      event: { id: event.id, status: event.status }
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

export const triggerTestEmails = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await sendTestEmailsToAllParticipants();
    res.json({
      message: 'Disparo de teste executado com sucesso.',
      participants: result.participants,
      recipients: result.recipients
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const addParticipantToEvent = (req: Request, res: Response): void => {
  const { eventId, participantId } = req.params;
  if (!eventId || !participantId) {
    res.status(400).json({ message: 'Informe os identificadores do evento e do participante.' });
    return;
  }
  try {
    includeParticipantInEvent(eventId, participantId);
    res.json({ message: 'Participante adicionado ao evento com sucesso.' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const removeParticipantFromEvent = (req: Request, res: Response): void => {
  const { eventId, participantId } = req.params;
  if (!eventId || !participantId) {
    res.status(400).json({ message: 'Informe os identificadores do evento e do participante.' });
    return;
  }
  try {
    excludeParticipantFromEvent(eventId, participantId);
    res.json({ message: 'Participante removido do evento com sucesso.' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getEventDetails = async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400).json({ message: 'Informe o identificador do evento.' });
    return;
  }
  try {
    const event = findEventById(eventId);
    if (!event) {
      throw new Error('Evento não encontrado.');
    }
    res.json(event);
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
};
