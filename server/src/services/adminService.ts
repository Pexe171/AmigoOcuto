import { Types } from 'mongoose';
import { ParticipantModel } from '../models/Participant';
import { GiftListModel, GiftItem } from '../models/GiftList';
import {
  collectParticipantRecipients,
  sendTestEmailToParticipant,
  ParticipantEmailSnapshot,
} from './emailService';
import { ensureNames } from '../utils/nameUtils';

interface ParticipantData {
  _id: Types.ObjectId;
  firstName: string;
  secondName: string;
  email?: string;
  isChild: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  emailVerified: boolean;
  attendingInPerson?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GiftListData {
  participant: Types.ObjectId;
  items: GiftItem[];
}

export type AdminParticipantSummary = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  giftCount: number;
  createdAt: Date;
};

export type AdminParticipantDetails = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  gifts: GiftItem[];
  createdAt: Date;
  updatedAt: Date;
};

export const listParticipantsWithGiftSummary = async (): Promise<AdminParticipantSummary[]> => {
  const participants = await ParticipantModel.find().sort({ createdAt: 1 }).lean<ParticipantData[]>();
  const participantIds = participants.map((participant) => participant._id);
  const giftLists = await GiftListModel.find({ participant: { $in: participantIds } }).lean<GiftListData[]>();
  const giftMap = new Map<string, GiftItem[]>();

  giftLists.forEach((list) => {
    giftMap.set(list.participant.toString(), list.items);
  });

  return participants.map((participant) => {
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    const summary: AdminParticipantSummary = {
      id: participant._id.toString(),
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      isChild: participant.isChild,
      emailVerified: participant.emailVerified,
      giftCount: giftMap.get(participant._id.toString())?.length ?? 0,
      createdAt: participant.createdAt
    };

    if (participant.email) {
      summary.email = participant.email;
    }
    if (typeof participant.attendingInPerson === 'boolean') {
      summary.attendingInPerson = participant.attendingInPerson;
    }
    if (participant.primaryGuardianEmail) {
      summary.primaryGuardianEmail = participant.primaryGuardianEmail;
    }

    return summary;
  });
};

export const getParticipantDetailsForAdmin = async (participantId: string): Promise<AdminParticipantDetails> => {
  const participant = await ParticipantModel.findById(participantId).lean<ParticipantData | null>();
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  const giftList = await GiftListModel.findOne({ participant: participant._id }).lean<GiftListData | null>();

  const names = ensureNames({
    firstName: participant.firstName,
    secondName: participant.secondName,
  });

  const details: AdminParticipantDetails = {
    id: participant._id.toString(),
    firstName: participant.firstName,
    secondName: participant.secondName,
    fullName: names.fullName,
    isChild: participant.isChild,
    emailVerified: participant.emailVerified,
    guardianEmails: participant.guardianEmails,
    gifts: giftList?.items ?? [],
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt
  };

  if (participant.email) {
    details.email = participant.email;
  }
  if (typeof participant.attendingInPerson === 'boolean') {
    details.attendingInPerson = participant.attendingInPerson;
  }
  if (participant.primaryGuardianEmail) {
    details.primaryGuardianEmail = participant.primaryGuardianEmail;
  }

  return details;
};

export const sendTestEmailsToAllParticipants = async (): Promise<{ participants: number; recipients: number }> => {
  const participants = await ParticipantModel.find({ emailVerified: true }).exec();
  let participantsNotified = 0;
  let totalRecipients = 0;

  for (const participant of participants) {
    const snapshot: ParticipantEmailSnapshot = {
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      isChild: participant.isChild,
      guardianEmails: participant.guardianEmails ?? [],
    };

    if (participant.email) {
      snapshot.email = participant.email;
    }

    if (participant.primaryGuardianEmail) {
      snapshot.primaryGuardianEmail = participant.primaryGuardianEmail;
    }

    const recipients = collectParticipantRecipients(snapshot);
    if (recipients.length === 0) {
      continue;
    }
    participantsNotified += 1;
    totalRecipients += recipients.length;
    await sendTestEmailToParticipant(snapshot, recipients);
  }

  return { participants: participantsNotified, recipients: totalRecipients };
};
