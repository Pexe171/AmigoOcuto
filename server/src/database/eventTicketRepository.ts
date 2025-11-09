import { randomUUID } from 'crypto';
import db from '../config/sqliteDatabase';

export interface EventTicket {
  id: string;
  eventId: string;
  participantId: string;
  assignedParticipantId: string;
  ticketCode: string;
  createdAt: Date;
}

const rowToTicket = (row: any): EventTicket | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    eventId: row.eventId,
    participantId: row.participantId,
    assignedParticipantId: row.assignedParticipantId,
    ticketCode: row.ticketCode,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
};

export const createEventTicket = (
  eventId: string,
  participantId: string,
  assignedParticipantId: string,
  ticketCode: string,
): EventTicket => {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO eventTickets (id, eventId, participantId, assignedParticipantId, ticketCode, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, eventId, participantId, assignedParticipantId, ticketCode, now);
  const inserted = findTicketById(id);
  if (!inserted) {
    throw new Error('Não foi possível guardar o ticket do evento.');
  }
  return inserted;
};

export const findTicketById = (id: string): EventTicket | null => {
  const stmt = db.prepare('SELECT * FROM eventTickets WHERE id = ?');
  const row = stmt.get(id);
  return rowToTicket(row);
};

export const findTicketsByEventId = (eventId: string): EventTicket[] => {
  const stmt = db.prepare('SELECT * FROM eventTickets WHERE eventId = ?');
  return stmt
    .all(eventId)
    .map(rowToTicket)
    .filter((ticket): ticket is EventTicket => ticket !== null);
};

export const deleteTicketsByEventId = (eventId: string): void => {
  const stmt = db.prepare('DELETE FROM eventTickets WHERE eventId = ?');
  stmt.run(eventId);
};

export const deleteEventTickets = (ticketIds: string[]): void => {
  if (ticketIds.length === 0) {
    return;
  }
  const placeholders = ticketIds.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM eventTickets WHERE id IN (${placeholders})`);
  stmt.run(...ticketIds);
};
