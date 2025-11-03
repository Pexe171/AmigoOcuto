import { Request, Response } from 'express';
import { upsertGiftList, getGiftList } from '../services/giftListService';

export const updateGiftList = async (req: Request, res: Response): Promise<void> => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    const list = await upsertGiftList(participantId, req.body);
    res.json({ message: 'Lista de presentes atualizada com sucesso.', items: list.items });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const fetchGiftList = async (req: Request, res: Response): Promise<void> => {
  const { participantId } = req.params;
  if (!participantId) {
    res.status(400).json({ message: 'Informe o identificador do participante.' });
    return;
  }
  try {
    const list = await getGiftList(participantId);
    res.json({ items: list?.items ?? [] });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
