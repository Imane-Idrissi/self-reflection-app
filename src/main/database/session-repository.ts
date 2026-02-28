import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../../shared/types';

export class SessionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(name: string, originalIntent: string): Session {
    const session: Session = {
      session_id: uuidv4(),
      name,
      original_intent: originalIntent,
      final_intent: null,
      status: 'created',
      started_at: null,
      ended_at: null,
      ended_by: null,
      created_at: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO session (session_id, name, original_intent, final_intent, status, started_at, ended_at, ended_by, created_at)
      VALUES (@session_id, @name, @original_intent, @final_intent, @status, @started_at, @ended_at, @ended_by, @created_at)
    `).run(session);

    return session;
  }

  getById(sessionId: string): Session | undefined {
    return this.db.prepare('SELECT * FROM session WHERE session_id = ?').get(sessionId) as Session | undefined;
  }

  updateFinalIntent(sessionId: string, finalIntent: string): void {
    this.db.prepare('UPDATE session SET final_intent = ? WHERE session_id = ?').run(finalIntent, sessionId);
  }

  updateStatus(sessionId: string, status: Session['status'], startedAt?: string): void {
    if (startedAt) {
      this.db.prepare('UPDATE session SET status = ?, started_at = ? WHERE session_id = ?').run(status, startedAt, sessionId);
    } else {
      this.db.prepare('UPDATE session SET status = ? WHERE session_id = ?').run(status, sessionId);
    }
  }

  endSession(sessionId: string, endedBy: 'user' | 'auto'): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'UPDATE session SET status = ?, ended_at = ?, ended_by = ? WHERE session_id = ?'
    ).run('ended', now, endedBy, sessionId);
  }

  findByStatuses(statuses: Session['status'][]): Session[] {
    const placeholders = statuses.map(() => '?').join(', ');
    return this.db.prepare(
      `SELECT * FROM session WHERE status IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...statuses) as Session[];
  }

  findCompleted(limit: number, offset: number = 0): Session[] {
    return this.db.prepare(
      'SELECT * FROM session WHERE status = ? ORDER BY ended_at DESC LIMIT ? OFFSET ?'
    ).all('ended', limit, offset) as Session[];
  }

  deleteByStatus(status: Session['status']): number {
    const result = this.db.prepare('DELETE FROM session WHERE status = ?').run(status);
    return result.changes;
  }

  deleteAbandonedCreated(): number {
    const result = this.db.prepare(
      'DELETE FROM session WHERE status = ? AND final_intent IS NULL'
    ).run('created');
    return result.changes;
  }

  findResumable(): Session | undefined {
    return this.db.prepare(
      'SELECT * FROM session WHERE status = ? AND final_intent IS NOT NULL ORDER BY created_at DESC LIMIT 1'
    ).get('created') as Session | undefined;
  }
}
