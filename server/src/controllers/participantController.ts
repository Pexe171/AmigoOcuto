// Este ficheiro deve estar em server/src/controllers/participantController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  registerParticipant,
  verifyParticipant,
  resendVerificationCode,
  getParticipantOrFail,
  searchParticipants,
  getParticipantByEmailOrFail,
  updateParticipantEmail,
  requestVerificationCodeByEmail,
  authenticateParticipantByEmailAndCode,
} from '../services/participantService';
import { ensureNames } from '../utils/nameUtils';
import { logger } from '../observability/logger';
import { sendWelcomeEmail, ParticipantContact } from '../services/emailService';
import { secretManager } from '../security/secretManager';
import { recordAuthEvent } from '../security/auditService';

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

  throw new Error('Participante sem identificador vÃ¡lido.');
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
      logger.warn({ event: 'participant:guardianEmails-parse-error', error }, 'Não foi possível converter guardianEmails armazenados como string JSON.');
      return [guardianEmails];
    }
    return [guardianEmails];
  }

  return [];
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, '')
    .toLowerCase();

const CLIENT_ERROR_KEYWORDS = [
  'informe',
  'crian',
  'adultos',
  'inscri',
  'codigo',
  'participante',
  'email',
  'respons',
  'nenhum email',
  'valido',
];

const isClientErrorIndicator = (normalizedMessage: string): boolean =>
  normalizedMessage.length > 0 &&
  CLIENT_ERROR_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword));

const resolveClientErrorStatus = (normalizedMessage: string): number => {
  if (normalizedMessage.includes('ja esta inscrito') && normalizedMessage.includes('confirmado')) {
    return 409;
  }
  if (normalizedMessage.includes('ja foi confirmada')) {
    return 409;
  }
  if (normalizedMessage.includes('nao encontrado')) {
    return 404;
  }
  return 400;
};

const PARTICIPANT_COOKIE_NAME = 'participant_token';
const PARTICIPANT_SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hora

const baseParticipantCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const persistParticipantSession = (res: Response, token: string): void => {
  res.cookie(PARTICIPANT_COOKIE_NAME, token, {
    ...baseParticipantCookieOptions,
    maxAge: PARTICIPANT_SESSION_DURATION_MS,
  });
};

const clearParticipantSession = (res: Response): void => {
  res.clearCookie(PARTICIPANT_COOKIE_NAME, baseParticipantCookieOptions);
};

// Esta funÃ§Ã£o Ã© chamada quando fazes POST /api/participants
export const createParticipant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Tenta registar o participante (aqui Ã© que o email Ã© disparado)
    const participant = await registerParticipant(req.body);
    res.status(201).json({
      id: resolveParticipantId(participant),
      message:
        'InscriÃ§Ã£o criada com sucesso. Verifique o e-mail informado para confirmar a participaÃ§Ã£o.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';
    const normalizedMessage = errorMessage ? normalizeText(errorMessage) : '';

    if (isClientErrorIndicator(normalizedMessage)) {
      res.status(resolveClientErrorStatus(normalizedMessage)).json({ message: errorMessage });
      return;
    }

    logger.error({ event: 'participant:create-error', error }, 'Erro ao criar participante');
    res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
  }
};

// Esta funÃ§Ã£o Ã© chamada quando fazes POST /api/participants/verify
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

    // Enviar e-mail de boas-vindas após confirmação
    const contact: ParticipantContact = {
      firstName: participant.firstName,
      isChild: participant.isChild,
      email: participant.email,
      primaryGuardianEmail: participant.primaryGuardianEmail,
      guardianEmails: participant.guardianEmails || [],
    };

    // Enviar e-mail de boas-vindas com instruções
    await sendWelcomeEmail(contact, participant.isChild);
  } catch (error) {
    recordAuthEvent({
      subject: 'participant',
      outcome: 'failure',
      email: req.body?.email,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(400).json({ message: (error as Error).message });
  }
};

// FunÃ§Ã£o para reenviar o cÃ³digo (nÃ£o estÃ¡ a ser usada no frontend novo, mas existe)
export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscriÃ§Ã£o.' });
    return;
  }
  try {
    await resendVerificationCode(id);
    res.json({
      message: 'Um novo cÃ³digo foi enviado para o e-mail principal cadastrado.',
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// Endpoint /me para verificar sessão atual
export const getCurrentParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    // O middleware requireParticipantAuth já validou o token e setou req.participantId
    const participantId = req.participantId;
    if (!participantId) {
      res.status(401).json({ message: 'Sessão inválida.' });
      return;
    }

    const participant = await getParticipantOrFail(participantId);
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
    res.status(401).json({ message: 'Sessão expirada ou inválida.' });
  }
};
export const requestVerificationCode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await requestVerificationCodeByEmail(req.body);
    res.json({ message: 'Código de verificação enviado para o e-mail informado, se existir cadastro.' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// FunÃ§Ã£o para buscar o status (usada na pÃ¡gina de lista de presentes)
export const getParticipantStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: 'Informe o identificador da inscriÃ§Ã£o.' });
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
    if (errorMessage.includes('nÃ£o encontrado') || errorMessage.includes('nÃ£o foi confirmada')) {
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
      message: 'E-mail atualizado com sucesso. Um novo cÃ³digo de verificaÃ§Ã£o foi enviado para o novo endereÃ§o.',
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

type ParticipantTokenPayload = {
  participantId: string;
  email?: string;
};

export const authenticateParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      recordAuthEvent({ subject: 'participant', outcome: 'failure', email, reason: 'missing_credentials' });
      res.status(400).json({ message: 'Informe o e-mail e o cÃ³digo de verificaÃ§Ã£o.' });
      return;
    }

    const participant = await authenticateParticipantByEmailAndCode({ email, code });

    const guardianEmails = extractGuardianEmails(participant);
    const participantId = resolveParticipantId(participant);

    const token = jwt.sign(
      { participantId, email: participant.email || participant.primaryGuardianEmail } as ParticipantTokenPayload,
      secretManager.getSecret('ADMIN_JWT_SECRET'),
      { expiresIn: '1h' },
    );

    recordAuthEvent({ subject: 'participant', outcome: 'success', email });

    persistParticipantSession(res, token);

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

export const logoutParticipant = (_req: Request, res: Response): void => {
  clearParticipantSession(res);
  res.json({ message: 'Sessão encerrada com sucesso.' });
};




