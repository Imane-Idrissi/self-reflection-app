import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'unblurry.db');
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
      name TEXT NOT NULL DEFAULT '',
      original_intent TEXT NOT NULL,
      final_intent TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      started_at TEXT,
      ended_at TEXT,
      ended_by TEXT,
      created_at TEXT NOT NULL
    )
  `);

  migrateSessionName(database);

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

  database.exec(`
    CREATE TABLE IF NOT EXISTS feeling (
      feeling_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      summary TEXT,
      patterns TEXT,
      suggestions TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
}

function migrateSessionName(database: Database.Database): void {
  const columns = database.pragma('table_info(session)') as { name: string }[];
  const hasName = columns.some((col) => col.name === 'name');
  if (hasName) return;

  database.exec("ALTER TABLE session ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  database.exec("UPDATE session SET name = SUBSTR(original_intent, 1, 40) WHERE name = ''");
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
