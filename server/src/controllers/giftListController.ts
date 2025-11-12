import { Request, Response } from 'express';
import { getGiftList, updateGiftListItems, getAssignedFriendSummary } from '../services/giftListService';
import { extractErrorMessage } from '../utils/extractErrorMessage';

export const getParticipantGiftList = (req: Request, res: Response): void => {
  try {
    const { participantId } = req.params;
    if (!participantId) {
      res.status(400).json({ message: 'Informe o identificador do participante.' });
      return;
    }

    if (req.participantId && req.participantId !== participantId) {
      res
        .status(403)
        .json({ message: 'Você não tem permissão para visualizar a lista de presentes de outra pessoa.' });
      return;
    }
    const giftList = getGiftList(participantId);
    res.json(giftList);
  } catch (error) {
    res.status(500).json({ message: extractErrorMessage(error) });
  }
};

export const getAssignedFriend = (req: Request, res: Response): void => {
  try {
    const { participantId } = req.params;

    if (!participantId) {
      res.status(400).json({ message: 'Informe o identificador do participante.' });
      return;
    }

    if (req.participantId && req.participantId !== participantId) {
      res
        .status(403)
        .json({ message: 'Você não tem permissão para visualizar o amigo secreto de outra pessoa.' });
      return;
    }

    const summary = getAssignedFriendSummary(participantId);

    if (!summary) {
      res.status(404).json({ message: 'Ainda não há um amigo secreto disponível para você. Aguarde o sorteio.' });
      return;
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: extractErrorMessage(error) });
  }
};

export const updateParticipantGiftList = (req: Request, res: Response): void => {
  try {
    const { participantId } = req.params;
    if (!participantId) {
      res.status(400).json({ message: 'Informe o identificador do participante.' });
      return;
    }

    if (req.participantId && req.participantId !== participantId) {
      res
        .status(403)
        .json({ message: 'Você não tem permissão para alterar a lista de presentes de outra pessoa.' });
      return;
    }
    const { items } = req.body; // items should be an array of GiftItem

    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'A lista de presentes precisa ser um array válido.' });
      return;
    }

    const updatedList = updateGiftListItems(participantId, items);
    if (!updatedList) {
      res.status(404).json({ message: 'Não foi possível localizar ou atualizar a lista de presentes.' });
      return;
    }
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ message: extractErrorMessage(error) });
  }
};