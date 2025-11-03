import { z } from 'zod';
import { GiftListModel, GiftListDocument, GiftItem } from '../models/GiftList';
import { getParticipantOrFail } from './participantService';

const giftSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  url: z.string().url().optional(),
  priority: z.enum(['alta', 'media', 'baixa']).default('media')
});

const giftListSchema = z.object({
  items: z.array(giftSchema).max(50, 'Limite de 50 itens por participante.')
});

export type GiftListInput = z.infer<typeof giftListSchema>;

export const upsertGiftList = async (
  participantId: string,
  input: GiftListInput
): Promise<GiftListDocument> => {
  await getParticipantOrFail(participantId);
  const data = giftListSchema.parse(input);

  const giftList = await GiftListModel.findOneAndUpdate(
    { participant: participantId },
    { items: data.items },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return giftList;
};

export const getGiftList = async (participantId: string): Promise<GiftListDocument | null> => {
  await getParticipantOrFail(participantId);
  return GiftListModel.findOne({ participant: participantId }).exec();
};

export const getGiftItems = async (participantId: string): Promise<GiftItem[]> => {
  const list = await getGiftList(participantId);
  return list?.items ?? [];
};
