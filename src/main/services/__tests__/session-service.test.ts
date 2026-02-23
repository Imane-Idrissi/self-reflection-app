import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from '../../database/session-repository';
import { SessionService } from '../session-service';

let db: Database.Database;
let service: SessionService;

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
  const repo = new SessionRepository(db);
  service = new SessionService(repo);
});

afterEach(() => {
  db.close();
});

describe('SessionService', () => {
  describe('createSession', () => {
    it('creates a session with original_intent and status created', () => {
      const session = service.createSession('Build the login page');

      expect(session.original_intent).toBe('Build the login page');
      expect(session.status).toBe('created');
      expect(session.final_intent).toBeNull();
      expect(session.started_at).toBeNull();
    });
  });

  describe('confirmIntent', () => {
    it('sets the final_intent on an existing session', () => {
      const session = service.createSession('Work on stuff');
      service.confirmIntent(session.session_id, 'Complete the API integration for user auth');

      const updated = service.getSession(session.session_id);
      expect(updated!.final_intent).toBe('Complete the API integration for user auth');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.confirmIntent('bad-id', 'intent')).toThrow('Session not found');
    });
  });

  describe('startSession', () => {
    it('sets status to active and started_at timestamp', () => {
      const session = service.createSession('Focus time');
      service.startSession(session.session_id);

      const updated = service.getSession(session.session_id);
      expect(updated!.status).toBe('active');
      expect(updated!.started_at).toBeTruthy();
    });

    it('throws for nonexistent session', () => {
      expect(() => service.startSession('bad-id')).toThrow('Session not found');
    });

    it('throws if session is not in created status', () => {
      const session = service.createSession('Focus time');
      service.startSession(session.session_id);

      expect(() => service.startSession(session.session_id)).toThrow('Cannot start session in status: active');
    });
  });

  describe('cleanupAbandoned', () => {
    it('deletes sessions with status created', () => {
      service.createSession('Abandoned 1');
      service.createSession('Abandoned 2');
      const active = service.createSession('Active session');
      service.startSession(active.session_id);

      const deleted = service.cleanupAbandoned();
      expect(deleted).toBe(2);
    });

    it('returns 0 when nothing to clean up', () => {
      expect(service.cleanupAbandoned()).toBe(0);
    });
  });
});
