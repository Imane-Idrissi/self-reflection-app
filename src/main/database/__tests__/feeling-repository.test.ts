import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { FeelingRepository } from '../feeling-repository';

let db: Database.Database;
let repo: FeelingRepository;

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
    CREATE TABLE feeling (
      feeling_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.prepare(`
    INSERT INTO session (session_id, original_intent, status, created_at)
    VALUES ('test-session', 'Test intent', 'active', ?)
  `).run(new Date().toISOString());
  repo = new FeelingRepository(db);
});

afterEach(() => {
  db.close();
});

describe('FeelingRepository', () => {
  describe('create', () => {
    it('creates a feeling with correct fields', () => {
      const feeling = repo.create('test-session', 'Feeling focused and productive');

      expect(feeling.feeling_id).toBeTruthy();
      expect(feeling.session_id).toBe('test-session');
      expect(feeling.text).toBe('Feeling focused and productive');
      expect(feeling.created_at).toBeTruthy();
    });

    it('persists the feeling to the database', () => {
      const feeling = repo.create('test-session', 'A bit anxious');
      const found = repo.getBySessionId('test-session');

      expect(found).toHaveLength(1);
      expect(found[0].feeling_id).toBe(feeling.feeling_id);
    });
  });

  describe('getBySessionId', () => {
    it('returns feelings ordered by created_at', () => {
      repo.create('test-session', 'First feeling');
      repo.create('test-session', 'Second feeling');
      repo.create('test-session', 'Third feeling');

      const feelings = repo.getBySessionId('test-session');
      expect(feelings).toHaveLength(3);
      expect(feelings[0].text).toBe('First feeling');
      expect(feelings[2].text).toBe('Third feeling');
    });

    it('returns empty array for session with no feelings', () => {
      const feelings = repo.getBySessionId('test-session');
      expect(feelings).toHaveLength(0);
    });

    it('only returns feelings for the specified session', () => {
      db.prepare(`
        INSERT INTO session (session_id, original_intent, status, created_at)
        VALUES ('other-session', 'Other intent', 'active', ?)
      `).run(new Date().toISOString());

      repo.create('test-session', 'My feeling');
      repo.create('other-session', 'Their feeling');

      const feelings = repo.getBySessionId('test-session');
      expect(feelings).toHaveLength(1);
      expect(feelings[0].text).toBe('My feeling');
    });
  });

  describe('countBySessionId', () => {
    it('returns 0 for session with no feelings', () => {
      expect(repo.countBySessionId('test-session')).toBe(0);
    });

    it('returns correct count', () => {
      repo.create('test-session', 'Feeling 1');
      repo.create('test-session', 'Feeling 2');
      repo.create('test-session', 'Feeling 3');

      expect(repo.countBySessionId('test-session')).toBe(3);
    });

    it('only counts feelings for the specified session', () => {
      db.prepare(`
        INSERT INTO session (session_id, original_intent, status, created_at)
        VALUES ('other-session', 'Other intent', 'active', ?)
      `).run(new Date().toISOString());

      repo.create('test-session', 'My feeling');
      repo.create('other-session', 'Their feeling');
      repo.create('other-session', 'Another feeling');

      expect(repo.countBySessionId('test-session')).toBe(1);
    });
  });
});
