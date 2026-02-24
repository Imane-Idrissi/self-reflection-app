import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { ReportRepository } from '../../database/report-repository';
import { SessionRepository } from '../../database/session-repository';
import { CaptureRepository } from '../../database/capture-repository';
import { FeelingRepository } from '../../database/feeling-repository';
import { SessionEventsRepository } from '../../database/session-events-repository';
import { AiService } from '../ai-service';
import { ReportService } from '../report-service';

let db: Database.Database;
let reportRepo: ReportRepository;
let sessionRepo: SessionRepository;
let captureRepo: CaptureRepository;
let feelingRepo: FeelingRepository;
let eventsRepo: SessionEventsRepository;
let aiService: AiService;
let reportService: ReportService;

const validAiResponse = JSON.stringify({
  verdict: 'Good session overall.',
  patterns: [
    {
      name: 'Deep Focus',
      confidence: 'high',
      type: 'positive',
      description: 'Stayed on task',
      evidence: [
        {
          type: 'capture',
          description: 'VS Code active',
          start_time: '2024-01-01T09:00:00.000Z',
          end_time: '2024-01-01T09:45:00.000Z',
        },
      ],
    },
  ],
  suggestions: [
    {
      text: 'Take breaks more often',
      addresses_pattern: 'Deep Focus',
    },
  ],
});

function createTestSchema(database: Database.Database) {
  database.exec(`
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
  database.exec(`
    CREATE TABLE session_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  database.exec(`
    CREATE TABLE capture (
      capture_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      window_title TEXT NOT NULL,
      app_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  database.exec(`
    CREATE TABLE feeling (
      feeling_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  database.exec(`
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
}

function createEndedSession(id: string = 'test-session'): string {
  const startedAt = '2024-01-01T09:00:00.000Z';
  const endedAt = '2024-01-01T10:00:00.000Z';
  db.prepare(`
    INSERT INTO session (session_id, original_intent, final_intent, status, started_at, ended_at, ended_by, created_at)
    VALUES (?, 'Build the login page', 'Build the login page with React', 'ended', ?, ?, 'user', ?)
  `).run(id, startedAt, endedAt, startedAt);
  return id;
}

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createTestSchema(db);

  reportRepo = new ReportRepository(db);
  sessionRepo = new SessionRepository(db);
  captureRepo = new CaptureRepository(db);
  feelingRepo = new FeelingRepository(db);
  eventsRepo = new SessionEventsRepository(db);
  aiService = new AiService('test-key');

  reportService = new ReportService(
    reportRepo, sessionRepo, captureRepo, feelingRepo, eventsRepo, aiService,
  );
});

afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});

describe('ReportService', () => {
  describe('startGeneration', () => {
    it('creates a report row and calls AI, updating to ready on success', async () => {
      const sessionId = createEndedSession();
      vi.spyOn(aiService, 'generateReport').mockResolvedValue(validAiResponse);

      reportService.startGeneration(sessionId);

      // Wait for background generation
      await vi.waitFor(() => {
        const report = reportRepo.getBySessionId(sessionId);
        expect(report!.status).toBe('ready');
      });

      const report = reportRepo.getBySessionId(sessionId);
      expect(report!.summary).toBe('Good session overall.');
      expect(JSON.parse(report!.patterns!)).toHaveLength(1);
    });

    it('updates to failed on AI error', async () => {
      const sessionId = createEndedSession();
      vi.spyOn(aiService, 'generateReport').mockRejectedValue(new Error('API error'));

      reportService.startGeneration(sessionId);

      await vi.waitFor(() => {
        const report = reportRepo.getBySessionId(sessionId);
        expect(report!.status).toBe('failed');
      });
    });

    it('skips if ready report already exists', () => {
      const sessionId = createEndedSession();
      const report = reportRepo.create(sessionId);
      reportRepo.updateToReady(report.report_id, 'Done', '[]', '[]');

      const spy = vi.spyOn(aiService, 'generateReport');
      reportService.startGeneration(sessionId);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getReport', () => {
    it('returns generating status for generating report', () => {
      const sessionId = createEndedSession();
      reportRepo.create(sessionId);

      const result = reportService.getReport(sessionId);
      expect(result.status).toBe('generating');
      expect(result.report).toBeUndefined();
    });

    it('returns failed status for failed report', () => {
      const sessionId = createEndedSession();
      const report = reportRepo.create(sessionId);
      reportRepo.updateToFailed(report.report_id);

      const result = reportService.getReport(sessionId);
      expect(result.status).toBe('failed');
    });

    it('returns ready status with parsed report and session data', () => {
      const sessionId = createEndedSession();
      const report = reportRepo.create(sessionId);
      reportRepo.updateToReady(
        report.report_id,
        'Good session overall.',
        JSON.stringify([{
          name: 'Focus', confidence: 'high', type: 'positive',
          description: 'Good focus', evidence: [],
        }]),
        JSON.stringify([{ text: 'Keep it up', addresses_pattern: 'Focus' }]),
      );

      const result = reportService.getReport(sessionId);
      expect(result.status).toBe('ready');
      expect(result.report!.verdict).toBe('Good session overall.');
      expect(result.report!.patterns).toHaveLength(1);
      expect(result.report!.suggestions).toHaveLength(1);
      expect(result.session!.intent).toBe('Build the login page with React');
      expect(result.session!.total_minutes).toBe(60);
    });

    it('returns generating status when no report exists', () => {
      const sessionId = createEndedSession();
      const result = reportService.getReport(sessionId);
      expect(result.status).toBe('generating');
    });
  });

  describe('retryGeneration', () => {
    it('resets failed report and retriggers generation', async () => {
      const sessionId = createEndedSession();
      const report = reportRepo.create(sessionId);
      reportRepo.updateToFailed(report.report_id);

      vi.spyOn(aiService, 'generateReport').mockResolvedValue(validAiResponse);

      reportService.retryGeneration(sessionId);

      await vi.waitFor(() => {
        const updated = reportRepo.getBySessionId(sessionId);
        expect(updated!.status).toBe('ready');
      });
    });

    it('throws for non-failed report', () => {
      const sessionId = createEndedSession();
      reportRepo.create(sessionId);

      expect(() => reportService.retryGeneration(sessionId)).toThrow('Cannot retry report in status: generating');
    });

    it('throws when no report exists', () => {
      const sessionId = createEndedSession();
      expect(() => reportService.retryGeneration(sessionId)).toThrow('No report found');
    });
  });

  describe('markStaleAsFailedOnLaunch', () => {
    it('marks generating reports as failed', () => {
      const sessionId = createEndedSession();
      reportRepo.create(sessionId);

      const count = reportService.markStaleAsFailedOnLaunch();
      expect(count).toBe(1);

      const report = reportRepo.getBySessionId(sessionId);
      expect(report!.status).toBe('failed');
    });

    it('returns 0 when no stale reports', () => {
      expect(reportService.markStaleAsFailedOnLaunch()).toBe(0);
    });
  });
});
