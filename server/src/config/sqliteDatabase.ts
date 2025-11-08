// server/src/config/sqliteDatabase.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the path for the SQLite database file
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'database.db');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize the database connection
const db: InstanceType<typeof Database> = new Database(dbPath, { verbose: console.log }); // verbose para registrar queries

function initializeDatabase() {
    console.log('Initializing SQLite database...');

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
            description TEXT,
            eventDate DATETIME NOT NULL,
            location TEXT,
            adminId TEXT NOT NULL, -- Assuming an admin creates events
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            -- FOREIGN KEY (adminId) REFERENCES admins(id) -- If an admin table exists
        );
    `);

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
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            eventId TEXT NOT NULL,
            participantId TEXT NOT NULL,
            ticketType TEXT NOT NULL,
            price REAL NOT NULL,
            isPaid BOOLEAN DEFAULT FALSE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (participantId) REFERENCES participants(id) ON DELETE CASCADE
        );
    `);

    console.log('SQLite database initialized successfully.');
}

// Run initialization and set PRAGMA for performance
initializeDatabase();
db.pragma('journal_mode = WAL'); // Recommended for better performance and concurrency

export default db;
