import { randomUUID } from 'crypto';
import db from '../config/sqliteDatabase';

type EventStatus = 'rascunho' | 'ativo' | 'sorteado' | 'cancelado';

export interface DrawHistoryEntry {
  tickets: string[];
  drawnAt: Date;
}

export interface EventRecord {
  id: string;
  name: string;
  location: string | null;
  status: EventStatus;
  participants: string[];
  drawHistory: DrawHistoryEntry[];
  drawDateTime: Date | null;
  moderatorEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const parseDate = (value: string | Date | null | undefined): Date => {
  if (!value) {
    return new Date();
  }
  return value instanceof Date ? value : new Date(value);
};

const parseDrawHistory = (raw: string | null | undefined): DrawHistoryEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Array<{ tickets: string[]; drawnAt: string }>;
    return parsed.map((entry) => ({
      tickets: Array.isArray(entry.tickets) ? entry.tickets : [],
      drawnAt: parseDate(entry.drawnAt ?? new Date().toISOString()),
    }));
  } catch (error) {
    console.error('Erro ao analisar histórico de sorteios do evento:', error);
    return [];
  }
};

const serializeDrawHistory = (entries: DrawHistoryEntry[]): string =>
  JSON.stringify(
    entries.map((entry) => ({
      tickets: entry.tickets,
      drawnAt: entry.drawnAt.toISOString(),
    })),
  );

const serializeParticipants = (participants: string[]): string => JSON.stringify(participants);

const parseParticipants = (raw: string | null | undefined): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.error('Erro ao analisar participantes do evento:', error);
    return [];
  }
};

const rowToEvent = (row: any): EventRecord | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    location: typeof row.location === 'string' && row.location.trim().length > 0 ? row.location : null,
    status: row.status as EventStatus,
    participants: parseParticipants(row.participants),
    drawHistory: parseDrawHistory(row.drawHistory),
    drawDateTime: row.drawDateTime ? parseDate(row.drawDateTime) : null,
    moderatorEmail: row.moderatorEmail || null,
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
  };
};

export const insertEvent = (params: {
  id?: string;
  name: string;
  location?: string | null;
  status?: EventStatus;
  participants?: string[];
  drawHistory?: DrawHistoryEntry[];
  drawDateTime?: Date | null;
  moderatorEmail?: string | null;
}): EventRecord => {
  const id = params.id ?? randomUUID();
  const status = params.status ?? 'ativo';
  const participants = params.participants ?? [];
  const drawHistory = params.drawHistory ?? [];

  const stmt = db.prepare(`
    INSERT INTO events (
      id,
      name,
      location,
      status,
      participants,
      drawHistory,
      drawDateTime,
      moderatorEmail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.name,
    params.location ?? null,
    status,
    serializeParticipants(participants),
    serializeDrawHistory(drawHistory),
    params.drawDateTime?.toISOString() ?? null,
    params.moderatorEmail ?? null
  );

  const inserted = findEventById(id);
  if (!inserted) {
    throw new Error('Não foi possível guardar o evento após a criação.');
  }
  return inserted;
};

export const findEventById = (id: string): EventRecord | null => {
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  const row = stmt.get(id);
  return rowToEvent(row);
};

export const listAllEvents = (): EventRecord[] => {
  const stmt = db.prepare('SELECT * FROM events ORDER BY datetime(createdAt) DESC');
  return stmt
    .all()
    .map(rowToEvent)
    .filter((event: EventRecord | null): event is EventRecord => event !== null);
};

export const updateEvent = (id: string, updates: Partial<Omit<EventRecord, 'id'>>): EventRecord | null => {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    params.push(updates.name);
  }

  if (updates.location !== undefined) {
    fields.push('location = ?');
    params.push(updates.location ?? null);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    params.push(updates.status);
  }

  if (updates.participants !== undefined) {
    fields.push('participants = ?');
    params.push(serializeParticipants(updates.participants));
  }

  if (updates.drawHistory !== undefined) {
    fields.push('drawHistory = ?');
    params.push(serializeDrawHistory(updates.drawHistory));
  }

  if (updates.drawDateTime !== undefined) {
    fields.push('drawDateTime = ?');
    params.push(updates.drawDateTime?.toISOString() ?? null);
  }

  if (updates.moderatorEmail !== undefined) {
    fields.push('moderatorEmail = ?');
    params.push(updates.moderatorEmail ?? null);
  }

  if (fields.length === 0) {
    return findEventById(id);
  }

  fields.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const stmt = db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return findEventById(id);
};

export const addParticipantToEvent = (eventId: string, participantId: string): EventRecord | null => {
  const event = findEventById(eventId);
  if (!event) {
    return null;
  }

  if (!event.participants.includes(participantId)) {
    event.participants.push(participantId);
  }

  return updateEvent(eventId, { participants: event.participants });
};

export const removeParticipantFromEvent = (eventId: string, participantId: string): EventRecord | null => {
  const event = findEventById(eventId);
  if (!event) {
    return null;
  }

  const updatedParticipants = event.participants.filter(id => id !== participantId);
  return updateEvent(eventId, { participants: updatedParticipants });
};

export const appendDrawHistoryEntry = (
  eventId: string,
  entry: DrawHistoryEntry,
): EventRecord | null => {
  const event = findEventById(eventId);
  if (!event) {
    return null;
  }

  const updatedHistory = [...event.drawHistory, entry];
  return updateEvent(eventId, { drawHistory: updatedHistory, status: 'sorteado' });
};

export const removeLastDrawHistoryEntry = (eventId: string): EventRecord | null => {
  const event = findEventById(eventId);
  if (!event) {
    return null;
  }

  if (event.drawHistory.length === 0) {
    return event;
  }

  const updatedHistory = event.drawHistory.slice(0, -1);
  const newStatus = updatedHistory.length === 0 ? 'ativo' : 'sorteado';
  return updateEvent(eventId, { drawHistory: updatedHistory, status: newStatus });
};

export const deleteEvent = (id: string): boolean => {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

export const findEventsNeedingReminder = (): EventRecord[] => {
  const now = new Date().toISOString();
  const stmt = db.prepare('SELECT * FROM events WHERE drawDateTime IS NOT NULL AND drawDateTime <= ? AND status = ?');
  return stmt
    .all(now, 'ativo')
    .map(rowToEvent)
    .filter((event: EventRecord | null): event is EventRecord => event !== null && event.moderatorEmail !== null);
};
