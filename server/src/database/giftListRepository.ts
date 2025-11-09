import db from '../config/sqliteDatabase';
import { randomUUID } from 'crypto';

export interface GiftItem {
  id: string;
  name: string;
  url?: string;
  notes?: string;
  description?: string;
  priority?: 'alta' | 'media' | 'baixa';
  purchased: boolean;
}

export interface GiftList {
  id: string;
  participantId: string;
  items: GiftItem[];
  createdAt: string;
  updatedAt: string;
}

const rowToGiftList = (row: any): GiftList | null => {
  if (!row) return null;
  return {
    id: row.id,
    participantId: row.participantId,
    items: row.items ? JSON.parse(row.items) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const findGiftListByParticipantId = (participantId: string): GiftList | null => {
  try {
    const stmt = db.prepare('SELECT * FROM giftLists WHERE participantId = ?');
    const row = stmt.get(participantId);
    return rowToGiftList(row);
  } catch (error) {
    console.error(`Error in findGiftListByParticipantId for participantId ${participantId}:`, error);
    throw error;
  }
};

export const findGiftListsByParticipantIds = (participantIds: string[]): GiftList[] => {
  if (participantIds.length === 0) {
    return [];
  }

  const placeholders = participantIds.map(() => '?').join(',');
  try {
    const stmt = db.prepare(`SELECT * FROM giftLists WHERE participantId IN (${placeholders})`);
    return stmt
      .all(...participantIds)
      .map(rowToGiftList)
      .filter((list: GiftList | null): list is GiftList => list !== null);
  } catch (error) {
    console.error(`Error in findGiftListsByParticipantIds for participantIds ${participantIds.join(', ')}:`, error);
    throw error;
  }
};

export const createGiftList = (participantId: string): GiftList => {
  const newId = randomUUID();
  const now = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      INSERT INTO giftLists (id, participantId, items, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(newId, participantId, JSON.stringify([]), now, now);
    const inserted = findGiftListByParticipantId(participantId);
    if (!inserted) {
      throw new Error('Não foi possível criar a lista de presentes.');
    }
    return inserted;
  } catch (error) {
    console.error(`Error in createGiftList for participantId ${participantId}:`, error);
    throw error;
  }
};

export const updateGiftList = (participantId: string, items: GiftItem[]): GiftList | null => {
  const now = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      UPDATE giftLists
      SET items = ?, updatedAt = ?
      WHERE participantId = ?
    `);
    stmt.run(JSON.stringify(items), now, participantId);
    return findGiftListByParticipantId(participantId);
  } catch (error) {
    console.error(`Error in updateGiftList for participantId ${participantId}:`, error);
    throw error;
  }
};

export const deleteGiftListByParticipantId = (participantId: string): void => {
  try {
    const stmt = db.prepare('DELETE FROM giftLists WHERE participantId = ?');
    stmt.run(participantId);
  } catch (error) {
    console.error(`Error in deleteGiftListByParticipantId for participantId ${participantId}:`, error);
    throw error;
  }
};
