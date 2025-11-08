import { Request, Response } from 'express';
import { getGiftList, updateGiftListItems } from '../services/giftListService';
import { extractErrorMessage } from '../utils/extractErrorMessage'; // Assuming this utility exists

export const getParticipantGiftList = (req: Request, res: Response): void => {
  try {
    const { participantId } = req.params;
    if (!participantId) {
      res.status(400).json({ message: 'Participant ID is required.' });
      return;
    }
    const giftList = getGiftList(participantId);
    res.json(giftList);
  } catch (error) {
    res.status(500).json({ message: extractErrorMessage(error) });
  }
};

export const updateParticipantGiftList = (req: Request, res: Response): void => {
  try {
    const { participantId } = req.params;
    if (!participantId) {
      res.status(400).json({ message: 'Participant ID is required.' });
      return;
    }
    const { items } = req.body; // items should be an array of GiftItem
    
    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'Items must be an array.' });
      return;
    }

    const updatedList = updateGiftListItems(participantId, items);
    if (!updatedList) {
      res.status(404).json({ message: 'Gift list not found or could not be updated.' });
      return;
    }
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ message: extractErrorMessage(error) });
  }
};