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
  repo = new SessionRepository(db);
});

afterEach(() => {
  db.close();
});

describe('SessionRepository', () => {
  describe('create', () => {
    it('creates a session with correct fields', () => {
      const session = repo.create('DB Tests', 'Write unit tests for the database layer');

      expect(session.session_id).toBeTruthy();
      expect(session.name).toBe('DB Tests');
      expect(session.original_intent).toBe('Write unit tests for the database layer');
      expect(session.final_intent).toBeNull();
      expect(session.status).toBe('created');
      expect(session.started_at).toBeNull();
      expect(session.ended_at).toBeNull();
      expect(session.ended_by).toBeNull();
      expect(session.created_at).toBeTruthy();
    });

    it('persists the session to the database', () => {
      const session = repo.create('Build', 'Build the app');
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
      const session = repo.create('Project', 'Work on the project');
      repo.updateFinalIntent(session.session_id, 'Complete the database migration for user table');

      const updated = repo.getById(session.session_id);
      expect(updated!.final_intent).toBe('Complete the database migration for user table');
    });
  });

  describe('updateStatus', () => {
    it('updates status to active with started_at', () => {
      const session = repo.create('Coding', 'Focus on coding');
      const now = new Date().toISOString();
      repo.updateStatus(session.session_id, 'active', now);

      const updated = repo.getById(session.session_id);
      expect(updated!.status).toBe('active');
      expect(updated!.started_at).toBe(now);
    });

    it('updates status without changing started_at', () => {
      const session = repo.create('Coding', 'Focus on coding');
      repo.updateStatus(session.session_id, 'ended');

      const updated = repo.getById(session.session_id);
      expect(updated!.status).toBe('ended');
      expect(updated!.started_at).toBeNull();
    });
  });

  describe('deleteByStatus', () => {
    it('deletes all sessions with the given status', () => {
      repo.create('A1', 'Abandoned 1');
      repo.create('A2', 'Abandoned 2');
      const kept = repo.create('Active', 'Will be active');
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

  describe('endSession', () => {
    it('sets status to ended with ended_at and ended_by', () => {
      const session = repo.create('Test', 'Test intent');
      repo.updateStatus(session.session_id, 'active', new Date().toISOString());
      repo.endSession(session.session_id, 'user');

      const updated = repo.getById(session.session_id);
      expect(updated!.status).toBe('ended');
      expect(updated!.ended_at).toBeTruthy();
      expect(updated!.ended_by).toBe('user');
    });

    it('sets ended_by to auto for auto-ended sessions', () => {
      const session = repo.create('Test', 'Test intent');
      repo.updateStatus(session.session_id, 'active', new Date().toISOString());
      repo.endSession(session.session_id, 'auto');

      const updated = repo.getById(session.session_id);
      expect(updated!.ended_by).toBe('auto');
    });
  });

  describe('findByStatuses', () => {
    it('returns sessions matching any of the given statuses', () => {
      const s1 = repo.create('S1', 'Intent 1');
      repo.updateStatus(s1.session_id, 'active', new Date().toISOString());

      const s2 = repo.create('S2', 'Intent 2');
      repo.updateStatus(s2.session_id, 'paused');

      repo.create('S3', 'Intent 3'); // stays 'created'

      const found = repo.findByStatuses(['active', 'paused']);
      expect(found).toHaveLength(2);
      const statuses = found.map(s => s.status);
      expect(statuses).toContain('active');
      expect(statuses).toContain('paused');
    });

    it('returns empty array when no sessions match', () => {
      repo.create('S1', 'Intent 1');
      const found = repo.findByStatuses(['active', 'paused']);
      expect(found).toHaveLength(0);
    });

    it('returns all matching sessions', () => {
      const s1 = repo.create('First', 'First');
      repo.updateStatus(s1.session_id, 'active', new Date().toISOString());

      const s2 = repo.create('Second', 'Second');
      repo.updateStatus(s2.session_id, 'active', new Date().toISOString());

      const found = repo.findByStatuses(['active']);
      expect(found).toHaveLength(2);
    });
  });
});
