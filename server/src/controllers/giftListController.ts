// Este ficheiro deve estar em server/src/controllers/giftListController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { upsertGiftList, getGiftList, upsertGiftListByEmail, getGiftListByEmail } from '../services/giftListService';

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
  if (!Types.ObjectId.isValid(participantId)) {
    res.status(400).json({ message: 'ID da inscrição inválido. O ID deve ter 24 caracteres hexadecimais.' });
    return;
  }
  try {
    // 1. Tenta criar ou atualizar a lista de presentes
    // O serviço trata de validar os itens com Zod e guardar a lista.
    const list = await upsertGiftList(participantId, req.body);
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
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  if (!Types.ObjectId.isValid(participantId)) {
    res.status(400).json({ message: 'ID da inscrição inválido. O ID deve ter 24 caracteres hexadecimais.' });
    return;
  }
  try {
    // 1. Tenta buscar a lista
    const list = await getGiftList(participantId);
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

// Esta função é chamada quando fazes PUT /api/participants/by-email/:email/gifts
export const updateGiftListByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.params;
  if (!email) {
    res.status(400).json({ message: 'Informe o e-mail do participante.' });
    return;
  }
  try {
    // 1. Tenta criar ou atualizar a lista de presentes
    const list = await upsertGiftListByEmail(decodeURIComponent(email), req.body);
    res.json({
      message: 'Lista de presentes atualizada com sucesso.',
      items: list.items,
    });
  } catch (error) {
    // 2. Se falhar (e-mail não existe, validação do Zod), devolve erro
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi confirmada')) {
      res.status(404).json({ message: errorMessage });
    } else {
      res.status(400).json({ message: errorMessage });
    }
  }
};

// Esta função é chamada quando fazes GET /api/participants/by-email/:email/gifts
export const fetchGiftListByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.params;
  if (!email) {
    res.status(400).json({ message: 'Informe o e-mail do participante.' });
    return;
  }
  try {
    // 1. Tenta buscar a lista
    const list = await getGiftListByEmail(decodeURIComponent(email));
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
