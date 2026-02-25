import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from '../session-repository';
import { SessionEventsRepository } from '../session-events-repository';

let db: Database.Database;
let sessionRepo: SessionRepository;
let eventsRepo: SessionEventsRepository;

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
  sessionRepo = new SessionRepository(db);
  eventsRepo = new SessionEventsRepository(db);
});

afterEach(() => {
  db.close();
});

describe('SessionEventsRepository', () => {
  describe('create', () => {
    it('creates a paused event with correct fields', () => {
      const session = sessionRepo.create('Test', 'Test intent');
      const event = eventsRepo.create(session.session_id, 'paused');

      expect(event.event_id).toBeTruthy();
      expect(event.session_id).toBe(session.session_id);
      expect(event.event_type).toBe('paused');
      expect(event.created_at).toBeTruthy();
    });

    it('creates a resumed event', () => {
      const session = sessionRepo.create('Test', 'Test intent');
      const event = eventsRepo.create(session.session_id, 'resumed');

      expect(event.event_type).toBe('resumed');
    });

    it('rejects event for nonexistent session', () => {
      expect(() => eventsRepo.create('nonexistent-id', 'paused')).toThrow();
    });
  });

  describe('getBySessionId', () => {
    it('returns events in chronological order', () => {
      const session = sessionRepo.create('Test', 'Test intent');
      eventsRepo.create(session.session_id, 'paused');
      eventsRepo.create(session.session_id, 'resumed');
      eventsRepo.create(session.session_id, 'paused');

      const events = eventsRepo.getBySessionId(session.session_id);
      expect(events).toHaveLength(3);
      expect(events[0].event_type).toBe('paused');
      expect(events[1].event_type).toBe('resumed');
      expect(events[2].event_type).toBe('paused');
    });

    it('returns empty array for session with no events', () => {
      const session = sessionRepo.create('Test', 'Test intent');
      const events = eventsRepo.getBySessionId(session.session_id);
      expect(events).toHaveLength(0);
    });

    it('returns only events for the specified session', () => {
      const session1 = sessionRepo.create('S1', 'Intent 1');
      const session2 = sessionRepo.create('S2', 'Intent 2');
      eventsRepo.create(session1.session_id, 'paused');
      eventsRepo.create(session2.session_id, 'paused');
      eventsRepo.create(session2.session_id, 'resumed');

      const events1 = eventsRepo.getBySessionId(session1.session_id);
      const events2 = eventsRepo.getBySessionId(session2.session_id);
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(2);
    });
  });
});
