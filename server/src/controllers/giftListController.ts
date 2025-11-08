// Este ficheiro deve estar em server/src/controllers/giftListController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { upsertGiftList, getGiftList } from '../services/giftListService';

// Esta função é chamada quando fazes PUT /api/participants/:participantId/gifts
export const updateGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const participantId = req.participantId;
  if (!participantId) {
    res.status(401).json({ message: 'ID do participante não encontrado no token.' });
    return;
  }
  try {
    // 1. Tenta criar ou atualizar a lista de presentes
    const list = await upsertGiftList(participantId.toString(), req.body);
    res.json({
      message: 'Lista de presentes atualizada com sucesso.',
      items: list.items,
    });
  } catch (error) {
    // 2. Se falhar (ID não existe, validação do Zod), devolve erro
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi confirmada')) {
      res.status(404).json({ message: errorMessage });
    } else {
      res.status(400).json({ message: errorMessage });
    }
  }
};

// Esta função é chamada quando fazes GET /api/participants/:participantId/gifts
export const fetchGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const participantId = req.participantId;
  if (!participantId) {
    res.status(401).json({ message: 'ID do participante não encontrado no token.' });
    return;
  }
  try {
    // 1. Tenta buscar a lista
    const list = await getGiftList(participantId.toString());
    // 2. Devolve os itens (ou uma lista vazia se não existir)
    res.json({ items: list?.items ?? [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi confirmada')) {
      res.status(404).json({ message: errorMessage });
    } else {
      res.status(400).json({ message: errorMessage });
    }
  }
};
