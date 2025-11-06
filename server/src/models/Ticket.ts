import { Schema, model, Document, Types } from 'mongoose';

/**
 * Ticket emitido após o sorteio. Ele liga um participante ao amigo oculto que deverá
 * presentear e gera um código único usado no e-mail.
 */

export interface TicketDocument extends Document {
  event: Types.ObjectId;
  participant: Types.ObjectId;
  assignedParticipant: Types.ObjectId;
  ticketCode: string;
  createdAt: Date;
}

const TicketSchema = new Schema<TicketDocument>(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    assignedParticipant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    ticketCode: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TicketSchema.index({ event: 1, participant: 1 }, { unique: true });

export const TicketModel = model<TicketDocument>('Ticket', TicketSchema);
