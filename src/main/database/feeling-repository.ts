import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Feeling } from '../../shared/types';

export class FeelingRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(sessionId: string, text: string): Feeling {
    const feeling: Feeling = {
      feeling_id: uuidv4(),
      session_id: sessionId,
      text,
      created_at: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO feeling (feeling_id, session_id, text, created_at)
      VALUES (@feeling_id, @session_id, @text, @created_at)
    `).run(feeling);

    return feeling;
  }

  getBySessionId(sessionId: string): Feeling[] {
    return this.db.prepare(
      'SELECT * FROM feeling WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as Feeling[];
  }

  countBySessionId(sessionId: string): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM feeling WHERE session_id = ?'
    ).get(sessionId) as { count: number };
    return row.count;
  }
}
