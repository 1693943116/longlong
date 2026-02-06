import 'server-only';

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

const getDbPath = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'funds.db');
};

const initDb = (database: Database.Database) => {
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      initial_cost REAL NOT NULL,
      current_amount REAL NOT NULL,
      last_settlement_date TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, code)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      fund_code TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      value REAL NOT NULL,
      change REAL NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, fund_code, date, time)
    );
  `);
};

const migrateDb = (database: Database.Database) => {
  try {
    const columns = database.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    const hasCreatedAt = columns.some(column => column.name === 'created_at');
    if (!hasCreatedAt) {
      database.exec('ALTER TABLE users ADD COLUMN created_at TEXT');
      const now = new Date().toISOString();
      database.prepare('UPDATE users SET created_at = ? WHERE created_at IS NULL').run(now);
    }
  } catch (error) {
    // If migration fails, surface the error to avoid silent data issues.
    console.error('[DB] Migration failed:', error);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    db = new Database(getDbPath());
    initDb(db);
    migrateDb(db);
  }
  return db;
};
