import { Schema, model, Document } from 'mongoose';

export type ParticipantRole = 'adult' | 'child';

export interface VerificationInfo {
  codeHash: string;
  expiresAt: Date;
}

export interface ParticipantDocument extends Document {
  firstName: string;
  secondName: string;
  nickname?: string;
  email?: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  emailVerified: boolean;
  verification?: VerificationInfo;
  attendingInPerson?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<VerificationInfo>(
  {
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { _id: false }
);

const ParticipantSchema = new Schema<ParticipantDocument>(
  {
    firstName: { type: String, required: true },
    secondName: { type: String, required: true },
    nickname: { type: String },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true
    },
    isChild: { type: Boolean, default: false },
    primaryGuardianEmail: { type: String, lowercase: true, trim: true },
    guardianEmails: [{ type: String, lowercase: true, trim: true }],
    emailVerified: { type: Boolean, default: false },
    verification: { type: VerificationSchema },
    attendingInPerson: { type: Boolean }
  },
  { timestamps: true }
);

export const ParticipantModel = model<ParticipantDocument>('Participant', ParticipantSchema);
