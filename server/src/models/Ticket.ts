import { Schema, model, Document } from 'mongoose';

export interface TicketDocument extends Document {
  event: string;
  participant: string;
  assignedParticipant: string;
  ticketCode: string;
  createdAt: Date;
}

const TicketSchema = new Schema<TicketDocument>(
  {
    event: { type: String, required: true },
    participant: { type: String, required: true },
    assignedParticipant: { type: String, required: true },
    ticketCode: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TicketSchema.index({ event: 1, participant: 1 }, { unique: true });

export const TicketModel = model<TicketDocument>('Ticket', TicketSchema);
