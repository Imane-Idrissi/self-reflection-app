import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Report } from '../../shared/types';

export class ReportRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(sessionId: string): Report {
    const report: Report = {
      report_id: uuidv4(),
      session_id: sessionId,
      summary: null,
      patterns: null,
      suggestions: null,
      status: 'generating',
      created_at: new Date().toISOString(),
    };

    this.db.prepare(`
      INSERT INTO reports (report_id, session_id, summary, patterns, suggestions, status, created_at)
      VALUES (@report_id, @session_id, @summary, @patterns, @suggestions, @status, @created_at)
    `).run(report);

    return report;
  }

  getBySessionId(sessionId: string): Report | undefined {
    return this.db.prepare(
      'SELECT * FROM reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(sessionId) as Report | undefined;
  }

  hasReportForSession(sessionId: string): boolean {
    const row = this.db.prepare(
      "SELECT 1 FROM reports WHERE session_id = ? AND status = 'ready' LIMIT 1"
    ).get(sessionId);
    return !!row;
  }

  updateToReady(reportId: string, summary: string, patterns: string, suggestions: string): void {
    this.db.prepare(
      'UPDATE reports SET status = ?, summary = ?, patterns = ?, suggestions = ? WHERE report_id = ?'
    ).run('ready', summary, patterns, suggestions, reportId);
  }

  updateToFailed(reportId: string): void {
    this.db.prepare(
      'UPDATE reports SET status = ? WHERE report_id = ?'
    ).run('failed', reportId);
  }

  resetToGenerating(reportId: string): void {
    this.db.prepare(
      'UPDATE reports SET status = ?, summary = NULL, patterns = NULL, suggestions = NULL WHERE report_id = ?'
    ).run('generating', reportId);
  }

  markStaleAsFailedOnLaunch(): number {
    const result = this.db.prepare(
      "UPDATE reports SET status = 'failed' WHERE status = 'generating'"
    ).run();
    return result.changes;
  }
}
