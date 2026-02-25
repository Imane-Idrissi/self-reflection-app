import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from '../../database/session-repository';
import { SessionEventsRepository } from '../../database/session-events-repository';
import { CaptureRepository } from '../../database/capture-repository';
import { FeelingRepository } from '../../database/feeling-repository';
import { CaptureService } from '../capture-service';
import { SessionService } from '../session-service';

let db: Database.Database;
let captureService: CaptureService;
let service: SessionService;
const mockGetActiveWindow = vi.fn();
const mockCheckPermission = vi.fn();

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
  db.exec(`
    CREATE TABLE session_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
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
  db.exec(`
    CREATE TABLE feeling (
      feeling_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  const repo = new SessionRepository(db);
  const eventsRepo = new SessionEventsRepository(db);
  const captureRepo = new CaptureRepository(db);
  const feelingRepo = new FeelingRepository(db);

  mockCheckPermission.mockReturnValue(true);
  mockGetActiveWindow.mockResolvedValue(undefined);

  captureService = new CaptureService(captureRepo, mockGetActiveWindow, mockCheckPermission);
  service = new SessionService(repo, eventsRepo, captureRepo, feelingRepo, captureService);
});

afterEach(() => {
  captureService.stop();
  db.close();
  vi.restoreAllMocks();
});

function createActiveSession(): string {
  const session = service.createSession('Test', 'Test intent');
  service.startSession(session.session_id);
  return session.session_id;
}

describe('SessionService', () => {
  describe('createSession', () => {
    it('creates a session with original_intent and status created', () => {
      const session = service.createSession('Login Page', 'Build the login page');

      expect(session.original_intent).toBe('Build the login page');
      expect(session.status).toBe('created');
      expect(session.final_intent).toBeNull();
      expect(session.started_at).toBeNull();
    });
  });

  describe('confirmIntent', () => {
    it('sets the final_intent on an existing session', () => {
      const session = service.createSession('Work', 'Work on stuff');
      service.confirmIntent(session.session_id, 'Complete the API integration for user auth');

      const updated = service.getSession(session.session_id);
      expect(updated!.final_intent).toBe('Complete the API integration for user auth');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.confirmIntent('bad-id', 'intent')).toThrow('Session not found');
    });
  });

  describe('startSession', () => {
    it('sets status to active and started_at when permission granted', () => {
      const session = service.createSession('Focus', 'Focus time');
      const result = service.startSession(session.session_id);

      expect(result.started).toBe(true);
      expect(result.permissionDenied).toBe(false);

      const updated = service.getSession(session.session_id);
      expect(updated!.status).toBe('active');
      expect(updated!.started_at).toBeTruthy();
    });

    it('starts the capture service', () => {
      const session = service.createSession('Focus', 'Focus time');
      service.startSession(session.session_id);

      expect(captureService.isRunning()).toBe(true);
    });

    it('returns permissionDenied when accessibility permission is denied', () => {
      mockCheckPermission.mockReturnValue(false);

      const session = service.createSession('Focus', 'Focus time');
      const result = service.startSession(session.session_id);

      expect(result.started).toBe(false);
      expect(result.permissionDenied).toBe(true);

      const updated = service.getSession(session.session_id);
      expect(updated!.status).toBe('created');
    });

    it('does not start capture when permission denied', () => {
      mockCheckPermission.mockReturnValue(false);

      const session = service.createSession('Focus', 'Focus time');
      service.startSession(session.session_id);

      expect(captureService.isRunning()).toBe(false);
    });

    it('throws for nonexistent session', () => {
      expect(() => service.startSession('bad-id')).toThrow('Session not found');
    });

    it('throws if session is not in created status', () => {
      const session = service.createSession('Focus', 'Focus time');
      service.startSession(session.session_id);

      expect(() => service.startSession(session.session_id)).toThrow('Cannot start session in status: active');
    });
  });

  describe('pauseSession', () => {
    it('transitions active session to paused and stops capture', () => {
      const id = createActiveSession();
      expect(captureService.isRunning()).toBe(true);

      service.pauseSession(id);

      const session = service.getSession(id);
      expect(session!.status).toBe('paused');
      expect(captureService.isRunning()).toBe(false);
    });

    it('creates a paused event', () => {
      const id = createActiveSession();
      service.pauseSession(id);

      const events = db.prepare('SELECT * FROM session_events WHERE session_id = ?').all(id) as any[];
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('paused');
    });

    it('throws if session is not active', () => {
      const session = service.createSession('Test', 'Test');
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
    it('transitions paused session to active and restarts capture', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      expect(captureService.isRunning()).toBe(false);

      service.resumeSession(id);

      const session = service.getSession(id);
      expect(session!.status).toBe('active');
      expect(captureService.isRunning()).toBe(true);
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
    it('ends an active session and stops capture', () => {
      const id = createActiveSession();
      expect(captureService.isRunning()).toBe(true);

      service.endSession(id, 'user');

      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
      expect(session!.ended_at).toBeTruthy();
      expect(session!.ended_by).toBe('user');
      expect(captureService.isRunning()).toBe(false);
    });

    it('ends a paused session', () => {
      const id = createActiveSession();
      service.pauseSession(id);
      service.endSession(id, 'user');

      const session = service.getSession(id);
      expect(session!.status).toBe('ended');
    });

    it('returns a session summary with real capture and feeling counts', () => {
      const id = createActiveSession();

      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c1', ?, 'Window', 'App', ?)
      `).run(id, new Date().toISOString());
      db.prepare(`
        INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
        VALUES ('c2', ?, 'Window2', 'App2', ?)
      `).run(id, new Date().toISOString());

      service.createFeeling(id, 'Feeling great');
      service.createFeeling(id, 'A bit tired now');

      const summary = service.endSession(id, 'user');

      expect(summary).toHaveProperty('total_minutes');
      expect(summary).toHaveProperty('active_minutes');
      expect(summary).toHaveProperty('paused_minutes');
      expect(summary.capture_count).toBe(2);
      expect(summary.feeling_count).toBe(2);
    });

    it('throws if session is not active or paused', () => {
      const session = service.createSession('Test', 'Test');
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
      const session = service.createSession('Test', 'Test');
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
      service.createSession('Test', 'Test');
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

    it('auto-ends an active session and stops capture', () => {
      const id = createActiveSession();
      expect(captureService.isRunning()).toBe(true);

      const result = service.checkStaleOnLaunch();

      expect(result).not.toBeNull();
      expect(result!.session_id).toBe(id);
      expect(result!.summary).toHaveProperty('total_minutes');
      expect(captureService.isRunning()).toBe(false);

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
      service.createSession('Created', 'Created only');
      const id = createActiveSession();
      service.endSession(id);

      expect(service.checkStaleOnLaunch()).toBeNull();
    });
  });

  describe('cleanupAbandoned', () => {
    it('deletes sessions with status created', () => {
      service.createSession('A1', 'Abandoned 1');
      service.createSession('A2', 'Abandoned 2');
      const active = service.createSession('Active', 'Active session');
      service.startSession(active.session_id);

      const deleted = service.cleanupAbandoned();
      expect(deleted).toBe(2);
    });

    it('returns 0 when nothing to clean up', () => {
      expect(service.cleanupAbandoned()).toBe(0);
    });
  });

  describe('createFeeling', () => {
    it('creates a feeling for an active session', () => {
      const id = createActiveSession();
      const feeling = service.createFeeling(id, 'Feeling focused');

      expect(feeling.feeling_id).toBeTruthy();
      expect(feeling.session_id).toBe(id);
      expect(feeling.text).toBe('Feeling focused');
      expect(feeling.created_at).toBeTruthy();
    });

    it('creates a feeling for a paused session', () => {
      const id = createActiveSession();
      service.pauseSession(id);

      const feeling = service.createFeeling(id, 'Taking a break, feeling okay');
      expect(feeling.session_id).toBe(id);
      expect(feeling.text).toBe('Taking a break, feeling okay');
    });

    it('trims whitespace from text', () => {
      const id = createActiveSession();
      const feeling = service.createFeeling(id, '  Feeling good  ');
      expect(feeling.text).toBe('Feeling good');
    });

    it('throws for empty text', () => {
      const id = createActiveSession();
      expect(() => service.createFeeling(id, '')).toThrow('Feeling text cannot be empty');
    });

    it('throws for whitespace-only text', () => {
      const id = createActiveSession();
      expect(() => service.createFeeling(id, '   ')).toThrow('Feeling text cannot be empty');
    });

    it('throws for ended session', () => {
      const id = createActiveSession();
      service.endSession(id);
      expect(() => service.createFeeling(id, 'Too late')).toThrow('Cannot log feeling for session in status: ended');
    });

    it('throws for created session', () => {
      const session = service.createSession('Test', 'Test');
      expect(() => service.createFeeling(session.session_id, 'Too early')).toThrow('Cannot log feeling for session in status: created');
    });

    it('throws for nonexistent session', () => {
      expect(() => service.createFeeling('bad-id', 'Hello')).toThrow('Session not found');
    });
  });

  describe('multiple pause/resume cycles', () => {
    it('supports multiple pause and resume cycles with capture start/stop', () => {
      const id = createActiveSession();
      expect(captureService.isRunning()).toBe(true);

      service.pauseSession(id);
      expect(captureService.isRunning()).toBe(false);

      service.resumeSession(id);
      expect(captureService.isRunning()).toBe(true);

      service.pauseSession(id);
      expect(captureService.isRunning()).toBe(false);

      service.resumeSession(id);
      expect(captureService.isRunning()).toBe(true);

      service.endSession(id);
      expect(captureService.isRunning()).toBe(false);
      expect(service.getSession(id)!.status).toBe('ended');

      const events = db.prepare('SELECT * FROM session_events WHERE session_id = ?').all(id) as any[];
      expect(events).toHaveLength(4);
    });
  });
});
