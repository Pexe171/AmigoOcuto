import db from '../config/sqliteDatabase';
import { randomUUID } from 'crypto';
import { logger } from '../observability/logger';
import { getCurrentUTCTimestamp } from '../utils/dateUtils';

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
    logger.error({ event: 'giftlist:find-by-participant-error', participantId, error }, 'Erro ao buscar lista de presentes por participante');
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
    logger.error({ event: 'giftlist:find-many-error', participantIds, error }, 'Erro ao buscar listas de presentes por participantes');
    throw error;
  }
};

export const createGiftList = (participantId: string): GiftList => {
  const newId = randomUUID();
  const now = getCurrentUTCTimestamp();
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
    logger.error({ event: 'giftlist:create-error', participantId, error }, 'Erro ao criar lista de presentes');
    throw error;
  }
};

export const updateGiftList = (participantId: string, items: GiftItem[]): GiftList | null => {
  const now = getCurrentUTCTimestamp();
  try {
    const stmt = db.prepare(`
      UPDATE giftLists
      SET items = ?, updatedAt = ?
      WHERE participantId = ?
    `);
    stmt.run(JSON.stringify(items), now, participantId);
    return findGiftListByParticipantId(participantId);
  } catch (error) {
    logger.error({ event: 'giftlist:update-error', participantId, error }, 'Erro ao atualizar lista de presentes');
    throw error;
  }
};

export const deleteGiftListByParticipantId = (participantId: string): void => {
  try {
    const stmt = db.prepare('DELETE FROM giftLists WHERE participantId = ?');
    stmt.run(participantId);
  } catch (error) {
    logger.error({ event: 'giftlist:delete-error', participantId, error }, 'Erro ao eliminar lista de presentes');
    throw error;
  }
};
