import db from '../config/sqliteDatabase';
import { Participant, PendingParticipant } from '../services/participantService'; // Assuming these interfaces are defined there
import { randomUUID } from 'crypto';

// Helper to convert SQLite row to Participant interface
const rowToParticipant = (row: any): Participant | null => {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.firstName,
    secondName: row.secondName,
    email: row.email,
    isChild: Boolean(row.isChild),
    primaryGuardianEmail: row.primaryGuardianEmail,
    guardianEmails: row.guardianEmails ? JSON.parse(row.guardianEmails) : [],
    emailVerified: Boolean(row.emailVerified),
    verificationCodeHash: row.verificationCodeHash,
    verificationExpiresAt: row.verificationExpiresAt,
    attendingInPerson: Boolean(row.attendingInPerson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

// Helper to convert SQLite row to PendingParticipant interface
const rowToPendingParticipant = (row: any): PendingParticipant | null => {
  if (!row || !row.id) return null; // Add check for row.id
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    secondName: row.secondName,
    isChild: Boolean(row.isChild),
    primaryGuardianEmail: row.primaryGuardianEmail,
    guardianEmails: row.guardianEmails ? JSON.parse(row.guardianEmails) : [],
    attendingInPerson: Boolean(row.attendingInPerson),
    verificationCodeHash: row.verificationCodeHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

// --- Participant Repository Functions ---

export const findParticipantById = (id: string): Participant | null => {
  const stmt = db.prepare('SELECT * FROM participants WHERE id = ?');
  const row = stmt.get(id);
  return rowToParticipant(row);
};

export const findParticipantByEmail = (email: string): Participant | null => {
  try {
    const stmt = db.prepare('SELECT * FROM participants WHERE email = ? OR primaryGuardianEmail = ?');
    const row = stmt.get(email, email);
    console.log(`[DEBUG] findParticipantByEmail for email ${email}:`, row); // Added debug log
    return rowToParticipant(row);
  } catch (error) {
    console.error(`Error in findParticipantByEmail for email ${email}:`, error);
    throw error;
  }
};

export const findParticipantByPrimaryEmail = (email: string): Participant | null => {
  const stmt = db.prepare('SELECT * FROM participants WHERE email = ?');
  const row = stmt.get(email);
  return rowToParticipant(row);
};

export const insertParticipant = (
  participant: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): Participant => {
  const newId = participant.id ?? randomUUID();
  const createdAt = participant.createdAt ?? new Date().toISOString();
  const updatedAt = participant.updatedAt ?? createdAt;
  const stmt = db.prepare(`
    INSERT INTO participants (
      id, firstName, secondName, email, isChild, primaryGuardianEmail,
      guardianEmails, emailVerified, verificationCodeHash, verificationExpiresAt,
      attendingInPerson, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    newId,
    participant.firstName,
    participant.secondName,
    participant.email,
    participant.isChild ? 1 : 0,
    participant.primaryGuardianEmail,
    participant.guardianEmails ? JSON.stringify(participant.guardianEmails) : null,
    participant.emailVerified ? 1 : 0,
    participant.verificationCodeHash,
    participant.verificationExpiresAt,
    participant.attendingInPerson ? 1 : 0,
    createdAt,
    updatedAt
  );
  const inserted = findParticipantById(newId);
  if (!inserted) {
    throw new Error('Não foi possível guardar o participante após a inserção.');
  }
  return inserted;
};

export const updateParticipant = (id: string, updates: Partial<Participant>): Participant | null => {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'createdAt') {
      continue;
    }
    setClauses.push(`${key} = ?`);
    if (key === 'isChild' || key === 'emailVerified' || key === 'attendingInPerson') {
      params.push(value ? 1 : 0);
    } else if (key === 'guardianEmails') {
      params.push(value ? JSON.stringify(value) : null);
    } else {
      params.push(value);
    }
  }
  setClauses.push('updatedAt = ?');
  params.push(now);
  params.push(id);

  if (setClauses.length === 1) {
    return findParticipantById(id);
  }

  const stmt = db.prepare(`UPDATE participants SET ${setClauses.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return findParticipantById(id);
};

export const deleteParticipant = (id: string): void => {
  const stmt = db.prepare('DELETE FROM participants WHERE id = ?');
  stmt.run(id);
};

export const countParticipants = (): number => {
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM participants');
  const row = stmt.get() as { total: number };
  return row.total;
};

export const findAllParticipants = (): Participant[] => {
  const stmt = db.prepare('SELECT * FROM participants');
  return stmt
    .all()
    .map(rowToParticipant)
    .filter((participant: Participant | null): participant is Participant => participant !== null);
};

export const searchParticipantsByNameAndEmail = (term: string): Participant[] => {
  const searchTerm = `%${term.toLowerCase()}%`;
  const stmt = db.prepare(`
    SELECT * FROM participants
    WHERE (LOWER(firstName) LIKE ? OR LOWER(secondName) LIKE ? OR LOWER(email) LIKE ? OR LOWER(primaryGuardianEmail) LIKE ?)
    AND emailVerified = 1
    ORDER BY firstName, secondName
    LIMIT 15
  `);
  return stmt
    .all(searchTerm, searchTerm, searchTerm, searchTerm)
    .map(rowToParticipant)
    .filter((participant: Participant | null): participant is Participant => participant !== null);
};

// --- PendingParticipant Repository Functions ---

export const findPendingParticipantById = (id: string): PendingParticipant | null => {
  const stmt = db.prepare('SELECT * FROM pendingParticipants WHERE id = ?');
  const row = stmt.get(id);
  return rowToPendingParticipant(row);
};

export const findPendingParticipantByEmail = (email: string): PendingParticipant | null => {
  const stmt = db.prepare('SELECT * FROM pendingParticipants WHERE email = ?');
  const row = stmt.get(email);
  return rowToPendingParticipant(row);
};

export const insertPendingParticipant = (pendingParticipant: Omit<PendingParticipant, 'id' | 'createdAt' | 'updatedAt'>): PendingParticipant => {
  const newId = randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO pendingParticipants (
      id, email, firstName, secondName, isChild, primaryGuardianEmail, guardianEmails,
      attendingInPerson, verificationCodeHash, expiresAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    newId,
    pendingParticipant.email,
    pendingParticipant.firstName,
    pendingParticipant.secondName,
    pendingParticipant.isChild ? 1 : 0,
    pendingParticipant.primaryGuardianEmail,
    pendingParticipant.guardianEmails ? JSON.stringify(pendingParticipant.guardianEmails) : null,
    pendingParticipant.attendingInPerson ? 1 : 0,
    pendingParticipant.verificationCodeHash,
    pendingParticipant.expiresAt,
    now,
    now
  );
  const inserted = findPendingParticipantById(newId);
  if (!inserted) {
    throw new Error('Não foi possível guardar o participante pendente após a inserção.');
  }
  return inserted;
};

export const updatePendingParticipant = (id: string, updates: Partial<PendingParticipant>): PendingParticipant | null => {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'createdAt') {
      continue;
    }
    setClauses.push(`${key} = ?`);
    if (key === 'isChild' || key === 'attendingInPerson') {
      params.push(value ? 1 : 0);
    } else if (key === 'guardianEmails') {
      params.push(value ? JSON.stringify(value) : null);
    } else {
      params.push(value);
    }
  }
  setClauses.push('updatedAt = ?');
  params.push(now);
  params.push(id);

  if (setClauses.length === 1) {
    return findPendingParticipantById(id);
  }

  const stmt = db.prepare(`UPDATE pendingParticipants SET ${setClauses.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return findPendingParticipantById(id);
};

export const deletePendingParticipant = (id: string): void => {
  const stmt = db.prepare('DELETE FROM pendingParticipants WHERE id = ?');
  stmt.run(id);
};

export const deletePendingParticipantsByEmail = (email: string): void => {
  const stmt = db.prepare('DELETE FROM pendingParticipants WHERE email = ?');
  stmt.run(email);
};

export const countPendingParticipants = (): number => {
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM pendingParticipants');
  const row = stmt.get() as { total: number };
  return row.total;
};

export const findPendingParticipantByEmailOrGuardianEmail = (email: string): PendingParticipant | null => {
  try {
    const stmt = db.prepare('SELECT * FROM pendingParticipants WHERE email = ? OR primaryGuardianEmail = ?');
    const row = stmt.get(email, email);
    return rowToPendingParticipant(row);
  } catch (error) {
    console.error(`Error in findPendingParticipantByEmailOrGuardianEmail for email ${email}:`, error);
    throw error;
  }
};
