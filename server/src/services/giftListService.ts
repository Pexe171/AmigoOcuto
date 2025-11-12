import {
  findGiftListByParticipantId,
  findGiftListsByParticipantIds,
  createGiftList,
  updateGiftList,
  GiftItem,
  GiftList,
} from '../database/giftListRepository';
import { findLatestTicketByParticipantId } from '../database/eventTicketRepository';
import { findParticipantById } from '../database/participantRepository';
import { ensureNames } from '../utils/nameUtils';

export interface AssignedFriendSummary {
  assignedParticipant: {
    id: string;
    firstName: string;
    secondName: string;
    fullName: string;
    isChild: boolean;
  };
  giftItems: GiftItem[];
}

export const getGiftList = (participantId: string): GiftList => {
  let giftList = findGiftListByParticipantId(participantId);
  if (!giftList) {
    giftList = createGiftList(participantId);
  }
  return giftList;
};

export const updateGiftListItems = (participantId: string, items: GiftItem[]): GiftList | null => {
  return updateGiftList(participantId, items);
};

export const getAssignedFriendSummary = (participantId: string): AssignedFriendSummary | null => {
  const ticket = findLatestTicketByParticipantId(participantId);
  if (!ticket) {
    return null;
  }

  const assignedParticipant = findParticipantById(ticket.assignedParticipantId);
  if (!assignedParticipant) {
    return null;
  }

  const names = ensureNames({
    firstName: assignedParticipant.firstName,
    secondName: assignedParticipant.secondName,
  });

  const giftList = getGiftList(assignedParticipant.id);

  return {
    assignedParticipant: {
      id: assignedParticipant.id,
      firstName: names.firstName,
      secondName: names.secondName,
      fullName: names.fullName,
      isChild: Boolean(assignedParticipant.isChild),
    },
    giftItems: giftList.items,
  };
};

export const getParticipantsWithoutGiftItems = (participantIds: string[]): string[] => {
  if (participantIds.length === 0) {
    return [];
  }

  const giftLists = findGiftListsByParticipantIds(participantIds);
  const giftMap = new Map(giftLists.map((list) => [list.participantId, list.items]));

  return participantIds.filter((participantId) => {
    const items = giftMap.get(participantId);
    return !items || items.length === 0;
  });
};
