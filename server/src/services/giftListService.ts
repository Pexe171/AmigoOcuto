import { z } from 'zod';
import { Types } from 'mongoose';
import { GiftListModel, GiftListDocument, GiftItem } from '../models/GiftList';
import { getParticipantOrFail, getParticipantByEmailOrFail } from './participantService';

const giftSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  url: z
    .string()
    .url('Informe um link válido')
    .optional()
    .or(z.literal('')),
  priority: z.enum(['alta', 'media', 'baixa']).default('media'),
  price: z
    .number()
    .min(0, 'O valor não pode ser negativo')
    .max(50, 'O valor máximo permitido é R$ 50,00')
    .optional()
});

const giftListSchema = z.object({
  items: z.array(giftSchema).max(50, 'Limite de 50 itens por participante.')
});

export type GiftListInput = z.infer<typeof giftListSchema>;

export const upsertGiftList = async (
  participantId: string,
  input: GiftListInput
): Promise<GiftListDocument> => {
  if (!Types.ObjectId.isValid(participantId)) {
    throw new Error('ID da inscrição inválido. O ID deve ter 24 caracteres hexadecimais.');
  }
  await getParticipantOrFail(participantId);
  const data = giftListSchema.parse(input);

  const giftList = await GiftListModel.findOneAndUpdate(
    { participant: new Types.ObjectId(participantId) },
    { items: data.items },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return giftList;
};

export const getGiftList = async (participantId: string): Promise<GiftListDocument | null> => {
  if (!Types.ObjectId.isValid(participantId)) {
    throw new Error('ID da inscrição inválido. O ID deve ter 24 caracteres hexadecimais.');
  }
  // Verificar se o participante existe primeiro
  await getParticipantOrFail(participantId);
  try {
    const giftList = await GiftListModel.findOne({ participant: new Types.ObjectId(participantId) }).exec();
    return giftList;
  } catch (error) {
    console.error(`[DEBUG] Erro ao buscar lista de presentes para participante ${participantId}:`, error);
    throw error;
  }
};

export const getGiftItems = async (participantId: string): Promise<GiftItem[]> => {
  const list = await getGiftList(participantId);
  return list?.items ?? [];
};