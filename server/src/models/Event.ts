import { Schema, model, Document } from 'mongoose';

export type EventStatus = 'rascunho' | 'ativo' | 'sorteado' | 'cancelado';

export interface DrawHistoryEntry {
  tickets: string[];
  drawnAt: Date;
}

export interface EventDocument extends Document {
  name: string;
  status: EventStatus;
  participants: string[];
  drawHistory: DrawHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const DrawHistorySchema = new Schema<DrawHistoryEntry>(
  {
    tickets: [{ type: String, required: true }],
    drawnAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const EventSchema = new Schema<EventDocument>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['rascunho', 'ativo', 'sorteado', 'cancelado'], default: 'rascunho' },
    participants: [{ type: String, required: true }],
    drawHistory: { type: [DrawHistorySchema], default: [] }
  },
  { timestamps: true }
);

export const EventModel = model<EventDocument>('Event', EventSchema);
