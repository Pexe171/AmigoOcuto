import { Schema, model, Document, Types } from 'mongoose';

/**
 * Cada participante pode manter uma lista personalizada de presentes. Os itens
 * guardam nome, descrição opcional, link e prioridade.
 */

export interface GiftItem {
  name: string;
  description?: string;
  url?: string;
  priority?: 'alta' | 'media' | 'baixa';
  price?: number;
}

export interface GiftListDocument extends Document {
  participant: Types.ObjectId;
  items: GiftItem[];
  updatedAt: Date;
}

const GiftItemSchema = new Schema<GiftItem>(
  {
    name: { type: String, required: true },
    description: { type: String },
    url: { type: String },
    priority: { type: String, enum: ['alta', 'media', 'baixa'], default: 'media' },
    price: { type: Number, min: 0, max: 50 }
  },
  { _id: false }
);

const GiftListSchema = new Schema<GiftListDocument>(
  {
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', unique: true, required: true },
    items: { type: [GiftItemSchema], default: [] }
  },
  { timestamps: true }
);

export const GiftListModel = model<GiftListDocument>('GiftList', GiftListSchema);
