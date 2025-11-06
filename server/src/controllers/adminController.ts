import { Request, Response } from 'express';
import { createEvent, listEvents, cancelEvent, drawEvent, getEventHistory } from '../services/eventService';
import { env } from '../config/environment';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import {
  getParticipantDetailsForAdmin,
  listParticipantsWithGiftSummary,
  sendTestEmailsToAllParticipants
} from '../services/adminService';
import { HttpError, requireObjectIdParam, respondWithError } from '../utils/httpError';

/**
 * Controlador do painel administrativo. Cada função aqui corresponde diretamente
 * a uma rota definida em `adminRoutes.ts`. A ideia é manter respostas amigáveis e
 * mensagens claras para quem opera o painel.
 */

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
        throw HttpError.unauthorized('Sessão administrativa expirada. Faça login novamente.');
      }
    }

    const normalizedEmail = credentials.email!.toLowerCase();
    if (
      normalizedEmail !== env.ADMIN_EMAIL.toLowerCase() ||
      credentials.password !== env.ADMIN_PASSWORD
    ) {
      throw HttpError.unauthorized('Credenciais administrativas inválidas.');
    }

    const token = jwt.sign(
      { email: env.ADMIN_EMAIL } satisfies AdminTokenPayload,
      env.ADMIN_JWT_SECRET,
      { expiresIn: `${env.ADMIN_SESSION_MINUTES}m` }
    );

    res.json({ message: 'Acesso autorizado.', token, email: env.ADMIN_EMAIL });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const listParticipants = async (_req: Request, res: Response): Promise<void> => {
  // Listagem resumida para o dashboard: carrega contagem de presentes e status.
  const participants = await listParticipantsWithGiftSummary();
  res.json(participants);
};

export const getParticipantDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const participantId = requireObjectIdParam(req.params.participantId, {
      resourceLabel: 'do participante',
    });
    // Aqui mostramos informações completas, incluindo lista de presentes.
    const details = await getParticipantDetailsForAdmin(participantId);
    res.json(details);
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const createNewEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await createEvent(req.body);
    res.status(201).json({ id: event._id, name: event.name, status: event.status });
  } catch (error) {
    respondWithError(res, error, 400);
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
  try {
    const eventId = requireObjectIdParam(req.params.eventId, { resourceLabel: 'do evento' });
    const event = await cancelEvent(eventId);
    res.json({ id: event._id, name: event.name, status: event.status });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const runDraw = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = requireObjectIdParam(req.params.eventId, { resourceLabel: 'do evento' });
    // O serviço devolve o evento actualizado e a quantidade de tickets enviados.
    const result = await drawEvent({ eventId });
    res.json({
      message: 'Sorteio executado com sucesso. Os participantes receberam seus tickets por e-mail.',
      event: { id: result.event._id, status: result.event.status },
      tickets: result.tickets
    });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = requireObjectIdParam(req.params.eventId, { resourceLabel: 'do evento' });
    const history = await getEventHistory(eventId);
    res.json(history);
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const triggerTestEmails = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Ideal para homologação: dispara e-mails fictícios e informa quantos destinatários foram atingidos.
    const result = await sendTestEmailsToAllParticipants();
    res.json({
      message: 'Disparo de teste executado com sucesso.',
      participants: result.participants,
      recipients: result.recipients
    });
  } catch (error) {
    respondWithError(res, error, 500);
  }
};
