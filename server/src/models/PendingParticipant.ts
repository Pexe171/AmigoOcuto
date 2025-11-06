import { Schema, model, Document } from 'mongoose';
import { VerificationInfo } from './Participant';

/**
 * Guardamos inscrições pendentes aqui até que o e-mail seja confirmado.
 * Evita sujar a coleção principal com dados incompletos.
 */

export interface PendingParticipantDocument extends Document {
  firstName: string;
  secondName: string;
  nickname?: string;
  email?: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  attendingInPerson?: boolean;
  verification: VerificationInfo;
  createdAt: Date;
  updatedAt: Date;
}

const PendingParticipantSchema = new Schema<PendingParticipantDocument>(
  {
    firstName: { type: String, required: true },
    secondName: { type: String, required: true },
    nickname: { type: String },
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    isChild: { type: Boolean, default: false },
    primaryGuardianEmail: { type: String, lowercase: true, trim: true },
    guardianEmails: [{ type: String, lowercase: true, trim: true }],
    attendingInPerson: { type: Boolean },
    verification: {
      codeHash: { type: String, required: true },
      expiresAt: { type: Date, required: true }
    }
  },
  { timestamps: true }
);

export const PendingParticipantModel = model<PendingParticipantDocument>('PendingParticipant', PendingParticipantSchema);
