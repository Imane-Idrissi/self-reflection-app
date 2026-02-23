import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from '../session-repository';

let db: Database.Database;
let repo: SessionRepository;

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
  repo = new SessionRepository(db);
});

afterEach(() => {
  db.close();
});

describe('SessionRepository', () => {
  describe('create', () => {
    it('creates a session with correct fields', () => {
      const session = repo.create('Write unit tests for the database layer');

      expect(session.session_id).toBeTruthy();
      expect(session.original_intent).toBe('Write unit tests for the database layer');
      expect(session.final_intent).toBeNull();
      expect(session.status).toBe('created');
      expect(session.started_at).toBeNull();
      expect(session.ended_at).toBeNull();
      expect(session.ended_by).toBeNull();
      expect(session.created_at).toBeTruthy();
    });

    it('persists the session to the database', () => {
      const session = repo.create('Build the app');
      const found = repo.getById(session.session_id);

      expect(found).toBeDefined();
      expect(found!.original_intent).toBe('Build the app');
    });
  });

  describe('getById', () => {
    it('returns undefined for nonexistent session', () => {
      const found = repo.getById('nonexistent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('updateFinalIntent', () => {
    it('sets final_intent on an existing session', () => {
      const session = repo.create('Work on the project');
      repo.updateFinalIntent(session.session_id, 'Complete the database migration for user table');

      const updated = repo.getById(session.session_id);
      expect(updated!.final_intent).toBe('Complete the database migration for user table');
    });
  });

  describe('updateStatus', () => {
    it('updates status to active with started_at', () => {
      const session = repo.create('Focus on coding');
      const now = new Date().toISOString();
      repo.updateStatus(session.session_id, 'active', now);

      const updated = repo.getById(session.session_id);
      expect(updated!.status).toBe('active');
      expect(updated!.started_at).toBe(now);
    });

    it('updates status without changing started_at', () => {
      const session = repo.create('Focus on coding');
      repo.updateStatus(session.session_id, 'ended');

      const updated = repo.getById(session.session_id);
      expect(updated!.status).toBe('ended');
      expect(updated!.started_at).toBeNull();
    });
  });

  describe('deleteByStatus', () => {
    it('deletes all sessions with the given status', () => {
      repo.create('Abandoned 1');
      repo.create('Abandoned 2');
      const kept = repo.create('Will be active');
      repo.updateStatus(kept.session_id, 'active', new Date().toISOString());

      const deleted = repo.deleteByStatus('created');
      expect(deleted).toBe(2);

      const remaining = repo.getById(kept.session_id);
      expect(remaining).toBeDefined();
      expect(remaining!.status).toBe('active');
    });

    it('returns 0 when no sessions match', () => {
      const deleted = repo.deleteByStatus('created');
      expect(deleted).toBe(0);
    });
  });
});
