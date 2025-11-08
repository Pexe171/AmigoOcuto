import { findGiftListByParticipantId, createGiftList, updateGiftList, GiftItem, GiftList } from '../database/giftListRepository';

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
