// server/src/config/sqliteDatabase.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from './environment';
import { logger } from '../observability/logger';

const dataDir = path.resolve(__dirname, '../../data');
const dbPath = env.SQLITE_IN_MEMORY ? ':memory:' : path.join(dataDir, 'database.db');

if (!env.SQLITE_IN_MEMORY) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (error) {
    logger.warn({ event: 'sqlite:data-dir-create-failed', dataDir, error }, 'Falha ao criar diretório de dados, usando :memory:');
    // Fallback to in-memory database if we can't create the directory
    // This is useful for environments like Render where the file system is read-only
  }
}

const verbose =
  env.LOG_LEVEL === 'debug'
    ? (message?: unknown, ...params: unknown[]) => {
        if (typeof message === 'string') {
          logger.debug({ sql: message, params }, 'SQLite verbose output');
        } else if (message !== undefined) {
          logger.debug({ message, params }, 'SQLite verbose output');
        }
      }
    : undefined;

const db: InstanceType<typeof Database> = new Database(dbPath, { verbose });

function initializeDatabase() {
  logger.info({ event: 'sqlite:init', dbPath }, 'Inicializando a base SQLite');

    // Create Participants table
    db.exec(`
        CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            firstName TEXT NOT NULL,
            secondName TEXT NOT NULL,
            email TEXT UNIQUE,
            isChild BOOLEAN DEFAULT FALSE,
            primaryGuardianEmail TEXT,
            guardianEmails TEXT, -- Stored as JSON string (array of emails)
            emailVerified BOOLEAN DEFAULT FALSE,
            verificationCodeHash TEXT,
            verificationExpiresAt DATETIME,
            attendingInPerson BOOLEAN,
            preferredEventId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create GiftLists table
    db.exec(`
        CREATE TABLE IF NOT EXISTS giftLists (
            id TEXT PRIMARY KEY,
            participantId TEXT NOT NULL,
            items TEXT, -- Stored as JSON string (array of gift items)
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participantId) REFERENCES participants(id) ON DELETE CASCADE
        );
    `);

    // Create Events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT,
            status TEXT NOT NULL DEFAULT 'ativo',
            participants TEXT NOT NULL DEFAULT '[]',
            drawHistory TEXT NOT NULL DEFAULT '[]',
            drawDateTime DATETIME,
            moderatorEmail TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const eventColumns = db.prepare('PRAGMA table_info(events)').all() as { name: string }[];
    if (!eventColumns.some((column) => column.name === 'location')) {
        db.exec('ALTER TABLE events ADD COLUMN location TEXT');
    }
    if (!eventColumns.some((column) => column.name === 'status')) {
        db.exec("ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'");
    }
    if (!eventColumns.some((column) => column.name === 'participants')) {
        db.exec("ALTER TABLE events ADD COLUMN participants TEXT NOT NULL DEFAULT '[]'");
    }
    if (!eventColumns.some((column) => column.name === 'drawHistory')) {
        db.exec("ALTER TABLE events ADD COLUMN drawHistory TEXT NOT NULL DEFAULT '[]'");
    }
    if (!eventColumns.some((column) => column.name === 'drawDateTime')) {
        db.exec('ALTER TABLE events ADD COLUMN drawDateTime DATETIME');
    }
    if (!eventColumns.some((column) => column.name === 'moderatorEmail')) {
        db.exec('ALTER TABLE events ADD COLUMN moderatorEmail TEXT');
    }

    // Create PendingParticipants table
    db.exec(`
        CREATE TABLE IF NOT EXISTS pendingParticipants (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            firstName TEXT NOT NULL,
            secondName TEXT NOT NULL,
            isChild BOOLEAN DEFAULT FALSE,
            primaryGuardianEmail TEXT,
            guardianEmails TEXT, -- Stored as JSON string (array of emails)
            attendingInPerson BOOLEAN,
            preferredEventId TEXT,
            verificationCodeHash TEXT NOT NULL,
            expiresAt DATETIME NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const participantsColumns = db.prepare('PRAGMA table_info(participants)').all() as { name: string }[];
    if (!participantsColumns.some((column) => column.name === 'preferredEventId')) {
        db.exec('ALTER TABLE participants ADD COLUMN preferredEventId TEXT');
    }

    const pendingColumns = db.prepare('PRAGMA table_info(pendingParticipants)').all() as { name: string }[];
    if (!pendingColumns.some((column) => column.name === 'preferredEventId')) {
        db.exec('ALTER TABLE pendingParticipants ADD COLUMN preferredEventId TEXT');
    }

    // Create Tickets table
    db.exec(`
        CREATE TABLE IF NOT EXISTS eventTickets (
            id TEXT PRIMARY KEY,
            eventId TEXT NOT NULL,
            participantId TEXT NOT NULL,
            assignedParticipantId TEXT NOT NULL,
            ticketCode TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (participantId) REFERENCES participants(id) ON DELETE CASCADE,
            FOREIGN KEY (assignedParticipantId) REFERENCES participants(id) ON DELETE CASCADE
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS jobExecutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jobName TEXT NOT NULL,
            startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            finishedAt DATETIME,
            status TEXT NOT NULL,
            message TEXT
        );
    `);

  logger.info({ event: 'sqlite:init-success' }, 'SQLite inicializado com sucesso');
}

// Run initialization and set PRAGMA for performance
initializeDatabase();
db.pragma('journal_mode = WAL'); // Recommended for better performance and concurrency

export const resetDatabase = (): void => {
  const tables = [
    'eventTickets',
    'events',
    'giftLists',
    'participants',
    'pendingParticipants',
    'jobExecutions',
  ];
  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch (error) {
      logger.warn({ event: 'sqlite:reset-failed', table, error }, 'Falha ao limpar tabela');
    }
  }
};

export default db;
