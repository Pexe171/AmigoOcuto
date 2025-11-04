// Este ficheiro deve estar em server/src/controllers/giftListController.ts
import { Request, Response } from 'express';
import { upsertGiftList, getGiftList } from '../services/giftListService';

// Esta função é chamada quando fazes PUT /api/participants/:participantId/gifts
export const updateGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    // 1. Tenta criar ou atualizar a lista de presentes
    const list = await upsertGiftList(participantId, req.body);
    res.json({
      message: 'Lista de presentes atualizada com sucesso.',
      items: list.items,
    });
  } catch (error) {
    // 2. Se falhar (ID não existe, validação do Zod), devolve erro
    res.status(400).json({ message: (error as Error).message });
  }
};

// Esta função é chamada quando fazes GET /api/participants/:participantId/gifts
export const fetchGiftList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    // 1. Tenta buscar a lista
    const list = await getGiftList(participantId);
    // 2. Devolve os itens (ou uma lista vazia se não existir)
    res.json({ items: list?.items ?? [] });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
