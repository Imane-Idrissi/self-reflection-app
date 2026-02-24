import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Capture } from '../../shared/types';

export class CaptureRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(sessionId: string, windowTitle: string, appName: string): Capture {
    const capture: Capture = {
      capture_id: uuidv4(),
      session_id: sessionId,
      window_title: windowTitle,
      app_name: appName,
      captured_at: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at)
      VALUES (@capture_id, @session_id, @window_title, @app_name, @captured_at)
    `).run(capture);

    return capture;
  }

  getBySessionId(sessionId: string): Capture[] {
    return this.db.prepare(
      'SELECT * FROM capture WHERE session_id = ? ORDER BY captured_at ASC'
    ).all(sessionId) as Capture[];
  }

  countBySessionId(sessionId: string): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM capture WHERE session_id = ?'
    ).get(sessionId) as { count: number };
    return row.count;
  }
}
