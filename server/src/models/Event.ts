import { Schema, model, Document, Types } from 'mongoose';

export type EventStatus = 'rascunho' | 'ativo' | 'sorteado' | 'cancelado';

export interface DrawHistoryEntry {
  tickets: Types.ObjectId[];
  drawnAt: Date;
}

export interface EventDocument extends Document {
  name: string;
  status: EventStatus;
  participants: Types.ObjectId[];
  drawHistory: DrawHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const DrawHistorySchema = new Schema<DrawHistoryEntry>(
  {
    tickets: [{ type: Schema.Types.ObjectId, ref: 'Ticket', required: true }],
    drawnAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const EventSchema = new Schema<EventDocument>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['rascunho', 'ativo', 'sorteado', 'cancelado'], default: 'rascunho' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Participant', required: true }],
    drawHistory: { type: [DrawHistorySchema], default: [] }
  },
  { timestamps: true }
);

export const EventModel = model<EventDocument>('Event', EventSchema);
