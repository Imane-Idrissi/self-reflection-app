import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ReportRepository } from '../report-repository';

let db: Database.Database;
let repo: ReportRepository;

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
    CREATE TABLE reports (
      report_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      summary TEXT,
      patterns TEXT,
      suggestions TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.prepare(`
    INSERT INTO session (session_id, original_intent, status, created_at)
    VALUES ('test-session', 'Test intent', 'ended', ?)
  `).run(new Date().toISOString());
  repo = new ReportRepository(db);
});

afterEach(() => {
  db.close();
});

describe('ReportRepository', () => {
  describe('create', () => {
    it('creates a report with status generating and null content fields', () => {
      const report = repo.create('test-session');

      expect(report.report_id).toBeTruthy();
      expect(report.session_id).toBe('test-session');
      expect(report.status).toBe('generating');
      expect(report.summary).toBeNull();
      expect(report.patterns).toBeNull();
      expect(report.suggestions).toBeNull();
      expect(report.created_at).toBeTruthy();
    });

    it('persists the report to the database', () => {
      repo.create('test-session');
      const found = repo.getBySessionId('test-session');
      expect(found).toBeDefined();
    });
  });

  describe('getBySessionId', () => {
    it('returns the report for a session', () => {
      const report = repo.create('test-session');
      const found = repo.getBySessionId('test-session');

      expect(found).toBeDefined();
      expect(found!.report_id).toBe(report.report_id);
    });

    it('returns undefined for a session with no report', () => {
      expect(repo.getBySessionId('test-session')).toBeUndefined();
    });

    it('returns the most recent report if multiple exist', () => {
      const first = repo.create('test-session');
      // Manually insert a second report with a later timestamp
      db.prepare(`
        INSERT INTO reports (report_id, session_id, summary, patterns, suggestions, status, created_at)
        VALUES ('second-report', 'test-session', NULL, NULL, NULL, 'generating', '2099-01-01T00:00:00.000Z')
      `).run();

      const found = repo.getBySessionId('test-session');
      expect(found!.report_id).toBe('second-report');
    });
  });

  describe('updateToReady', () => {
    it('sets status to ready and populates content fields', () => {
      const report = repo.create('test-session');
      const patterns = JSON.stringify([{ name: 'Focus' }]);
      const suggestions = JSON.stringify([{ text: 'Try X' }]);

      repo.updateToReady(report.report_id, 'Good session', patterns, suggestions);

      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('ready');
      expect(found!.summary).toBe('Good session');
      expect(found!.patterns).toBe(patterns);
      expect(found!.suggestions).toBe(suggestions);
    });
  });

  describe('updateToFailed', () => {
    it('sets status to failed', () => {
      const report = repo.create('test-session');
      repo.updateToFailed(report.report_id);

      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('failed');
    });
  });

  describe('resetToGenerating', () => {
    it('clears content and sets status back to generating', () => {
      const report = repo.create('test-session');
      repo.updateToReady(report.report_id, 'Summary', '[]', '[]');
      repo.resetToGenerating(report.report_id);

      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('generating');
      expect(found!.summary).toBeNull();
      expect(found!.patterns).toBeNull();
      expect(found!.suggestions).toBeNull();
    });
  });

  describe('markStaleAsFailedOnLaunch', () => {
    it('updates generating reports to failed and returns count', () => {
      repo.create('test-session');
      const count = repo.markStaleAsFailedOnLaunch();

      expect(count).toBe(1);
      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('failed');
    });

    it('ignores ready reports', () => {
      const report = repo.create('test-session');
      repo.updateToReady(report.report_id, 'Summary', '[]', '[]');

      const count = repo.markStaleAsFailedOnLaunch();
      expect(count).toBe(0);

      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('ready');
    });

    it('ignores failed reports', () => {
      const report = repo.create('test-session');
      repo.updateToFailed(report.report_id);

      const count = repo.markStaleAsFailedOnLaunch();
      expect(count).toBe(0);

      const found = repo.getBySessionId('test-session');
      expect(found!.status).toBe('failed');
    });

    it('returns 0 when no generating reports exist', () => {
      expect(repo.markStaleAsFailedOnLaunch()).toBe(0);
    });
  });
});
