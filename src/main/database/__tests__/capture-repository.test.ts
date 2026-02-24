import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { CaptureRepository } from '../capture-repository';

let db: Database.Database;
let repo: CaptureRepository;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE session (
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
  db.exec(`
    CREATE TABLE capture (
      capture_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      window_title TEXT NOT NULL,
      app_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.prepare(`
    INSERT INTO session (session_id, original_intent, status, created_at)
    VALUES ('test-session', 'Test intent', 'active', ?)
  `).run(new Date().toISOString());
  repo = new CaptureRepository(db);
});

afterEach(() => {
  db.close();
});

describe('CaptureRepository', () => {
  describe('create', () => {
    it('creates a capture with correct fields', () => {
      const capture = repo.create('test-session', 'main.ts — VS Code', 'Code');

      expect(capture.capture_id).toBeTruthy();
      expect(capture.session_id).toBe('test-session');
      expect(capture.window_title).toBe('main.ts — VS Code');
      expect(capture.app_name).toBe('Code');
      expect(capture.captured_at).toBeTruthy();
    });

    it('persists the capture to the database', () => {
      const capture = repo.create('test-session', 'Google — Chrome', 'Google Chrome');
      const found = repo.getBySessionId('test-session');

      expect(found).toHaveLength(1);
      expect(found[0].capture_id).toBe(capture.capture_id);
    });
  });

  describe('getBySessionId', () => {
    it('returns captures ordered by captured_at', () => {
      repo.create('test-session', 'First Window', 'App1');
      repo.create('test-session', 'Second Window', 'App2');
      repo.create('test-session', 'Third Window', 'App3');

      const captures = repo.getBySessionId('test-session');
      expect(captures).toHaveLength(3);
      expect(captures[0].window_title).toBe('First Window');
      expect(captures[2].window_title).toBe('Third Window');
    });

    it('returns empty array for session with no captures', () => {
      const captures = repo.getBySessionId('test-session');
      expect(captures).toHaveLength(0);
    });

    it('only returns captures for the specified session', () => {
      db.prepare(`
        INSERT INTO session (session_id, original_intent, status, created_at)
        VALUES ('other-session', 'Other intent', 'active', ?)
      `).run(new Date().toISOString());

      repo.create('test-session', 'Window A', 'AppA');
      repo.create('other-session', 'Window B', 'AppB');

      const captures = repo.getBySessionId('test-session');
      expect(captures).toHaveLength(1);
      expect(captures[0].window_title).toBe('Window A');
    });
  });

  describe('countBySessionId', () => {
    it('returns 0 for session with no captures', () => {
      expect(repo.countBySessionId('test-session')).toBe(0);
    });

    it('returns correct count', () => {
      repo.create('test-session', 'Window 1', 'App1');
      repo.create('test-session', 'Window 2', 'App2');
      repo.create('test-session', 'Window 3', 'App3');

      expect(repo.countBySessionId('test-session')).toBe(3);
    });

    it('only counts captures for the specified session', () => {
      db.prepare(`
        INSERT INTO session (session_id, original_intent, status, created_at)
        VALUES ('other-session', 'Other intent', 'active', ?)
      `).run(new Date().toISOString());

      repo.create('test-session', 'Window A', 'AppA');
      repo.create('other-session', 'Window B', 'AppB');
      repo.create('other-session', 'Window C', 'AppC');

      expect(repo.countBySessionId('test-session')).toBe(1);
    });
  });

  describe('getBySessionIdInTimeRange', () => {
    it('returns captures within the time range', () => {
      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c1', 'test-session', 'Window A', 'App1', '2024-01-01T09:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c2', 'test-session', 'Window B', 'App2', '2024-01-01T09:30:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c3', 'test-session', 'Window C', 'App3', '2024-01-01T10:00:00.000Z')
      `).run();

      const captures = repo.getBySessionIdInTimeRange(
        'test-session',
        '2024-01-01T09:00:00.000Z',
        '2024-01-01T09:30:00.000Z'
      );
      expect(captures).toHaveLength(2);
      expect(captures[0].window_title).toBe('Window A');
      expect(captures[1].window_title).toBe('Window B');
    });

    it('returns empty array when no captures in range', () => {
      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c1', 'test-session', 'Window A', 'App1', '2024-01-01T09:00:00.000Z')
      `).run();

      const captures = repo.getBySessionIdInTimeRange(
        'test-session',
        '2024-01-01T10:00:00.000Z',
        '2024-01-01T11:00:00.000Z'
      );
      expect(captures).toHaveLength(0);
    });
  });
});
