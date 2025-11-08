import {
  findGiftListByParticipantId,
  findGiftListsByParticipantIds,
  createGiftList,
  updateGiftList,
  GiftItem,
  GiftList,
} from '../database/giftListRepository';

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
