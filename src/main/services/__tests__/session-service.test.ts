import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from '../../database/session-repository';
import { SessionEventsRepository } from '../../database/session-events-repository';
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
  db.exec(`
    CREATE TABLE session_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  const repo = new SessionRepository(db);
  const eventsRepo = new SessionEventsRepository(db);
  service = new SessionService(repo, eventsRepo);
});

afterEach(() => {
  db.close();
});

function createActiveSession(): string {
  const session = service.createSession('Test intent');
  service.startSession(session.session_id);
  return session.session_id;
}

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

  describe('pauseSession', () => {
    it('transitions active session to paused', () => {
      const id = createActiveSession();
      service.pauseSession(id);

      const session = service.getSession(id);
      expect(session!.status).toBe('paused');
    });

    it('creates a paused event', () => {
      const id = createActiveSession();
      service.pauseSession(id);

      const events = db.prepare('SELECT * FROM session_events WHERE session_id = ?').all(id) as any[];
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('paused');
    });

    it('throws if session is not active', () => {
      const session = service.createSession('Test');
      expect(() => service.pauseSession(session.session_id)).toThrow('Cannot pause session in status: created');
    });

    it('throws if session is already paused', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      expect(() => service.pauseSession(id)).toThrow('Cannot pause session in status: paused');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.pauseSession('bad-id')).toThrow('Session not found');
    });
  });

  describe('resumeSession', () => {
    it('transitions paused session to active', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      service.resumeSession(id);

      const session = service.getSession(id);
      expect(session!.status).toBe('active');
    });

    it('creates a resumed event', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      service.resumeSession(id);

      const events = db.prepare('SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC').all(id) as any[];
      expect(events).toHaveLength(2);
      expect(events[0].event_type).toBe('paused');
      expect(events[1].event_type).toBe('resumed');
    });

    it('throws if session is not paused', () => {
      const id = createActiveSession();
      expect(() => service.resumeSession(id)).toThrow('Cannot resume session in status: active');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.resumeSession('bad-id')).toThrow('Session not found');
    });
  });

  describe('endSession', () => {
    it('ends an active session with user as ended_by', () => {
      const id = createActiveSession();
      service.endSession(id, 'user');

      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
      expect(session!.ended_at).toBeTruthy();
      expect(session!.ended_by).toBe('user');
    });

    it('ends a paused session', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      service.endSession(id, 'user');

      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
    });

    it('returns a session summary', () => {
      const id = createActiveSession();
      const summary = service.endSession(id, 'user');

      expect(summary).toHaveProperty('total_minutes');
      expect(summary).toHaveProperty('active_minutes');
      expect(summary).toHaveProperty('paused_minutes');
      expect(summary).toHaveProperty('capture_count');
      expect(summary).toHaveProperty('feeling_count');
      expect(summary.capture_count).toBe(0);
      expect(summary.feeling_count).toBe(0);
    });

    it('throws if session is not active or paused', () => {
      const session = service.createSession('Test');
      expect(() => service.endSession(session.session_id)).toThrow('Cannot end session in status: created');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.endSession('bad-id')).toThrow('Session not found');
    });

    it('cannot end an already ended session', () => {
      const id = createActiveSession();
      service.endSession(id);
      expect(() => service.endSession(id)).toThrow('Cannot end session in status: ended');
    });
  });

  describe('getActiveTimeMinutes', () => {
    it('returns 0 for a session that has not started', () => {
      const session = service.createSession('Test');
      expect(service.getActiveTimeMinutes(session.session_id)).toBe(0);
    });

    it('returns positive time for an active session', () => {
      const id = createActiveSession();
      const minutes = service.getActiveTimeMinutes(id);
      expect(minutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasActiveSession', () => {
    it('returns false when no sessions exist', () => {
      expect(service.hasActiveSession()).toBe(false);
    });

    it('returns false when only created sessions exist', () => {
      service.createSession('Test');
      expect(service.hasActiveSession()).toBe(false);
    });

    it('returns true when an active session exists', () => {
      createActiveSession();
      expect(service.hasActiveSession()).toBe(true);
    });

    it('returns true when a paused session exists', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      expect(service.hasActiveSession()).toBe(true);
    });

    it('returns false when all sessions are ended', () => {
      const id = createActiveSession();
      service.endSession(id);
      expect(service.hasActiveSession()).toBe(false);
    });
  });

  describe('checkStaleOnLaunch', () => {
    it('returns null when no stale sessions', () => {
      expect(service.checkStaleOnLaunch()).toBeNull();
    });

    it('auto-ends an active session', () => {
      const id = createActiveSession();
      const result = service.checkStaleOnLaunch();

      expect(result).not.toBeNull();
      expect(result!.session_id).toBe(id);
      expect(result!.summary).toHaveProperty('total_minutes');

      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
      expect(session!.ended_by).toBe('auto');
    });

    it('auto-ends a paused session', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      const result = service.checkStaleOnLaunch();

      expect(result).not.toBeNull();
      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
      expect(session!.ended_by).toBe('auto');
    });

    it('auto-ends multiple stale sessions and returns the most recent', () => {
      const id1 = createActiveSession();
      service.endSession(id1);

      const id2 = createActiveSession();
      const id3 = createActiveSession();
      service.pauseSession(id3);

      const result = service.checkStaleOnLaunch();
      expect(result).not.toBeNull();

      const s2 = service.getSession(id2);
      const s3 = service.getSession(id3);
      expect(s2!.status).toBe('ended');
      expect(s3!.status).toBe('ended');
    });

    it('ignores created and ended sessions', () => {
      service.createSession('Created only');
      const id = createActiveSession();
      service.endSession(id);

      expect(service.checkStaleOnLaunch()).toBeNull();
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

  describe('multiple pause/resume cycles', () => {
    it('supports multiple pause and resume cycles', () => {
      const id = createActiveSession();

      service.pauseSession(id);
      expect(service.getSession(id)!.status).toBe('paused');

      service.resumeSession(id);
      expect(service.getSession(id)!.status).toBe('active');

      service.pauseSession(id);
      expect(service.getSession(id)!.status).toBe('paused');

      service.resumeSession(id);
      expect(service.getSession(id)!.status).toBe('active');

      const summary = service.endSession(id);
      expect(service.getSession(id)!.status).toBe('ended');

      const events = db.prepare('SELECT * FROM session_events WHERE session_id = ?').all(id) as any[];
      expect(events).toHaveLength(4);
    });
  });
});
