import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'self-reflection.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export function getDatabaseForTesting(dbPath: string): Database.Database {
  const testDb = new Database(dbPath);
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');
  initSchema(testDb);
  return testDb;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS session (
      session_id TEXT PRIMARY KEY,
      original_intent TEXT NOT NULL,
      final_intent TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      started_at TEXT,
      ended_at TEXT,
      ended_by TEXT,
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS capture (
      capture_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      window_title TEXT NOT NULL,
      app_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
