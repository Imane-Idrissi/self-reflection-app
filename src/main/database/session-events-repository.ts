import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { SessionEvent } from '../../shared/types';

export class SessionEventsRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(sessionId: string, eventType: SessionEvent['event_type']): SessionEvent {
    const event: SessionEvent = {
      event_id: uuidv4(),
      session_id: sessionId,
      event_type: eventType,
      created_at: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO session_events (event_id, session_id, event_type, created_at)
      VALUES (@event_id, @session_id, @event_type, @created_at)
    `).run(event);

    return event;
  }

  getBySessionId(sessionId: string): SessionEvent[] {
    return this.db.prepare(
      'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as SessionEvent[];
  }
}
