import { collectParticipantRecipients, sendTestEmailToParticipant } from './emailService';
import { ensureNames } from '../utils/nameUtils';
import {
  findAllParticipants,
  findParticipantById,
  deleteParticipant as removeParticipantRecord,
} from '../database/participantRepository';
import {
  findGiftListByParticipantId,
  findGiftListsByParticipantIds,
  deleteGiftListByParticipantId,
  GiftItem,
} from '../database/giftListRepository';
import { listVerifiedParticipants } from './participantService';

const collectContactEmails = (
  email?: string | null,
  primaryGuardianEmail?: string | null,
  guardianEmails: string[] = [],
): string[] => {
  const unique = new Set<string>();
  if (email) {
    unique.add(email);
  }
  if (primaryGuardianEmail) {
    unique.add(primaryGuardianEmail);
  }
  guardianEmails.forEach((guardianEmail) => {
    if (guardianEmail) {
      unique.add(guardianEmail);
    }
  });
  return Array.from(unique);
};

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
  contactEmails: string[];
  giftCount: number;
  createdAt: string;
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
  contactEmails: string[];
  gifts: GiftItem[];
  createdAt: string;
  updatedAt: string;
};

export type AdminRemovedParticipant = {
  id: string;
  fullName: string;
};

export const listParticipantsWithGiftSummary = async (): Promise<AdminParticipantSummary[]> => {
  const participants = findAllParticipants().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const participantIds = participants.map((participant) => participant.id);
  const giftLists = findGiftListsByParticipantIds(participantIds);
  const giftMap = new Map<string, GiftItem[]>();

  giftLists.forEach((list) => {
    giftMap.set(list.participantId, list.items);
  });

  return participants.map((participant) => {
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    const contactEmails = collectContactEmails(
      participant.email,
      participant.primaryGuardianEmail,
      participant.guardianEmails ?? [],
    );

    const summary: AdminParticipantSummary = {
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      isChild: participant.isChild,
      emailVerified: participant.emailVerified,
      contactEmails,
      giftCount: giftMap.get(participant.id)?.length ?? 0,
      createdAt: participant.createdAt,
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

export const getParticipantDetailsForAdmin = async (
  participantId: string,
): Promise<AdminParticipantDetails> => {
  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  const giftList = findGiftListByParticipantId(participant.id);
  const names = ensureNames({
    firstName: participant.firstName,
    secondName: participant.secondName,
  });

  const guardianEmails = participant.guardianEmails ?? [];
  const contactEmails = collectContactEmails(
    participant.email,
    participant.primaryGuardianEmail,
    guardianEmails,
  );

  const details: AdminParticipantDetails = {
    id: participant.id,
    firstName: participant.firstName,
    secondName: participant.secondName,
    fullName: names.fullName,
    isChild: participant.isChild,
    emailVerified: participant.emailVerified,
    guardianEmails,
    contactEmails,
    gifts: giftList?.items ?? [],
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
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

export const deleteParticipantForAdmin = (participantId: string): AdminRemovedParticipant => {
  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  const names = ensureNames({
    firstName: participant.firstName,
    secondName: participant.secondName,
  });

  deleteGiftListByParticipantId(participantId);
  removeParticipantRecord(participantId);

  return { id: participantId, fullName: names.fullName };
};

export const sendTestEmailsToAllParticipants = async (): Promise<{
  participants: number;
  recipients: number;
}> => {
  const verifiedParticipants = await listVerifiedParticipants();
  let participantsNotified = 0;
  let totalRecipients = 0;

  for (const participant of verifiedParticipants) {
    const recipients = collectParticipantRecipients({
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });

    if (recipients.length === 0) {
      continue;
    }

    participantsNotified += 1;
    totalRecipients += recipients.length;

    await sendTestEmailToParticipant(
      {
        id: participant.id,
        firstName: participant.firstName,
        secondName: participant.secondName,
        isChild: participant.isChild,
        email: participant.email ?? null,
        primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
        guardianEmails: participant.guardianEmails ?? [],
      },
      recipients,
    );
  }

  return { participants: participantsNotified, recipients: totalRecipients };
};
