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
import { HttpError, requireEmailParam, requireObjectIdParam, respondWithError } from '../utils/httpError';

/**
 * Controlador responsável pelo fluxo público (inscrição, confirmação e listas).
 * Cada função envia mensagens pensadas para alguém que está a seguir um tutorial
 * ou a depurar a aplicação pela primeira vez.
 */

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
    // 2. Qualquer erro previsto retorna resposta amigável pelo helper comum.
    respondWithError(res, error, 400);
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
    respondWithError(res, error, 400);
  }
};

// Função para reenviar o código (não está a ser usada no frontend novo, mas existe)
export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = requireObjectIdParam(req.params.id, { resourceLabel: 'da inscrição' });
    // O serviço cuida de gerar um novo código e reenviar o e-mail automaticamente.
    await resendVerificationCode(id);
    res.json({
      message: 'Um novo código foi enviado para o e-mail principal cadastrado.',
    });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

// Função para buscar o status (usada na página de lista de presentes)
export const getParticipantStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = requireObjectIdParam(req.params.id, { resourceLabel: 'da inscrição' });
    // Recupera o documento (confirmado ou informa erro amigável se ainda estiver pendente).
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
    respondWithError(res, error, 400);
  }
};

export const searchParticipantsByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      throw HttpError.badRequest('Informe um termo para pesquisar participantes.');
    }
    // Pesquisa com regex controlada para evitar injection e limitar resultados.
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
          nickname: participant.nickname,
          emailVerified: participant.emailVerified,
          isChild: participant.isChild,
        };
      })
    });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

export const getParticipantStatusByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const email = requireEmailParam(req.params.email, { resourceLabel: 'do participante' });
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
    respondWithError(res, error, 400);
  }
};

export const updateEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Após validar conflito de e-mails, o serviço dispara um novo código automaticamente.
    await updateParticipantEmail(req.body);
    res.json({
      message: 'E-mail atualizado com sucesso. Um novo código de verificação foi enviado para o novo endereço.',
    });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};