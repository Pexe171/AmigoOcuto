// Este ficheiro deve estar em server/src/controllers/giftListController.ts
import { Request, Response } from 'express';
import { upsertGiftList, getGiftList, upsertGiftListByEmail, getGiftListByEmail } from '../services/giftListService';
import { respondWithError, requireEmailParam, requireObjectIdParam } from '../utils/httpError';

// Esta função é chamada quando fazes PUT /api/participants/:participantId/gifts
export const updateGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const participantId = requireObjectIdParam(req.params.participantId, {
      resourceLabel: 'da inscrição',
    });
    // 1. Tenta criar ou atualizar a lista de presentes
    // O serviço trata de validar os itens com Zod e guardar a lista.
    const list = await upsertGiftList(participantId, req.body);
    res.json({
      message: 'Lista de presentes atualizada com sucesso.',
      items: list.items,
    });
  } catch (error) {
    // 2. Resposta padronizada via helper (404/400 conforme o tipo de erro).
    respondWithError(res, error, 400);
  }
};

// Esta função é chamada quando fazes GET /api/participants/:participantId/gifts
export const fetchGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const participantId = requireObjectIdParam(req.params.participantId, {
      resourceLabel: 'da inscrição',
    });
    // 1. Tenta buscar a lista
    const list = await getGiftList(participantId);
    // 2. Devolve os itens (ou uma lista vazia se não existir)
    res.json({ items: list?.items ?? [] });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};

// Esta função é chamada quando fazes PUT /api/participants/by-email/:email/gifts
export const updateGiftListByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const email = requireEmailParam(req.params.email, { resourceLabel: 'do participante' });
    // 1. Tenta criar ou atualizar a lista de presentes
    const list = await upsertGiftListByEmail(email, req.body);
    res.json({
      message: 'Lista de presentes atualizada com sucesso.',
      items: list.items,
    });
  } catch (error) {
    // 2. Helper cuida do status adequado para conflitos/validações.
    respondWithError(res, error, 400);
  }
};

// Esta função é chamada quando fazes GET /api/participants/by-email/:email/gifts
export const fetchGiftListByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const email = requireEmailParam(req.params.email, { resourceLabel: 'do participante' });
    // 1. Tenta buscar a lista
    const list = await getGiftListByEmail(email);
    // 2. Devolve os itens (ou uma lista vazia se não existir)
    res.json({ items: list?.items ?? [] });
  } catch (error) {
    respondWithError(res, error, 400);
  }
};
