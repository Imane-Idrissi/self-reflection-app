import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { CaptureRepository } from '../../database/capture-repository';
import { CaptureService, ActiveWindowResult, GetActiveWindowFn, CheckPermissionFn } from '../capture-service';

let db: Database.Database;
let repo: CaptureRepository;
let mockGetActiveWindow: ReturnType<typeof vi.fn<GetActiveWindowFn>>;
let mockCheckPermission: ReturnType<typeof vi.fn<CheckPermissionFn>>;
let service: CaptureService;

beforeEach(() => {
  vi.useFakeTimers();
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
    CREATE TABLE capture (
      capture_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      window_title TEXT NOT NULL,
      app_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.prepare(`
    INSERT INTO session (session_id, original_intent, status, created_at)
    VALUES ('test-session', 'Test intent', 'active', ?)
  `).run(new Date().toISOString());

  repo = new CaptureRepository(db);
  mockGetActiveWindow = vi.fn<GetActiveWindowFn>();
  mockCheckPermission = vi.fn<CheckPermissionFn>();
  service = new CaptureService(repo, mockGetActiveWindow, mockCheckPermission);
});

afterEach(() => {
  service.stop();
  db.close();
  vi.useRealTimers();
});

describe('CaptureService', () => {
  describe('checkPermission', () => {
    it('returns true when permission is granted', async () => {
      mockCheckPermission.mockResolvedValue(true);
      expect(await service.checkPermission()).toBe(true);
    });

    it('returns false when permission is denied', async () => {
      mockCheckPermission.mockResolvedValue(false);
      expect(await service.checkPermission()).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('starts polling and sets isRunning to true', () => {
      service.start('test-session');
      expect(service.isRunning()).toBe(true);
    });

    it('stops polling and sets isRunning to false', () => {
      service.start('test-session');
      service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('prevents double-start', () => {
      mockGetActiveWindow.mockResolvedValue({ title: 'Window', owner: { name: 'App' } });
      service.start('test-session');
      service.start('test-session');

      vi.advanceTimersByTime(3000);

      expect(mockGetActiveWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('polling', () => {
    it('writes a capture row every 3 seconds', async () => {
      mockGetActiveWindow.mockResolvedValue({ title: 'main.ts — VS Code', owner: { name: 'Code' } });
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);
      expect(repo.countBySessionId('test-session')).toBe(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(repo.countBySessionId('test-session')).toBe(2);
    });

    it('writes correct window_title and app_name', async () => {
      mockGetActiveWindow.mockResolvedValue({ title: 'Google — Chrome', owner: { name: 'Google Chrome' } });
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);

      const captures = repo.getBySessionId('test-session');
      expect(captures[0].window_title).toBe('Google — Chrome');
      expect(captures[0].app_name).toBe('Google Chrome');
    });

    it('skips when active window returns undefined', async () => {
      mockGetActiveWindow.mockResolvedValue(undefined);
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);

      expect(repo.countBySessionId('test-session')).toBe(0);
    });

    it('skips when window title is empty', async () => {
      mockGetActiveWindow.mockResolvedValue({ title: '', owner: { name: 'App' } });
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);

      expect(repo.countBySessionId('test-session')).toBe(0);
    });

    it('skips when owner name is empty', async () => {
      mockGetActiveWindow.mockResolvedValue({ title: 'Window', owner: { name: '' } });
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);

      expect(repo.countBySessionId('test-session')).toBe(0);
    });

    it('stops writing after stop is called', async () => {
      mockGetActiveWindow.mockResolvedValue({ title: 'Window', owner: { name: 'App' } });
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);
      expect(repo.countBySessionId('test-session')).toBe(1);

      service.stop();

      await vi.advanceTimersByTimeAsync(6000);
      expect(repo.countBySessionId('test-session')).toBe(1);
    });
  });

  describe('consecutive failure tracking', () => {
    it('increments failure count on error', async () => {
      mockGetActiveWindow.mockRejectedValue(new Error('System call failed'));
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);
      expect(service.getConsecutiveFailures()).toBe(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(service.getConsecutiveFailures()).toBe(2);
    });

    it('resets failure count on successful capture', async () => {
      mockGetActiveWindow.mockRejectedValueOnce(new Error('Failed'));
      mockGetActiveWindow.mockRejectedValueOnce(new Error('Failed'));
      mockGetActiveWindow.mockResolvedValueOnce({ title: 'Window', owner: { name: 'App' } });

      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(3000);
      expect(service.getConsecutiveFailures()).toBe(2);

      await vi.advanceTimersByTimeAsync(3000);
      expect(service.getConsecutiveFailures()).toBe(0);
    });

    it('resets failure count on stop', async () => {
      mockGetActiveWindow.mockRejectedValue(new Error('Failed'));
      service.start('test-session');

      await vi.advanceTimersByTimeAsync(3000);
      expect(service.getConsecutiveFailures()).toBe(1);

      service.stop();
      expect(service.getConsecutiveFailures()).toBe(0);
    });
  });

  describe('warning callbacks', () => {
    it('fires onWarning after 10 consecutive failures', async () => {
      const onWarning = vi.fn();
      const onWarningCleared = vi.fn();
      service.setWarningCallbacks({ onWarning, onWarningCleared });

      mockGetActiveWindow.mockRejectedValue(new Error('Failed'));
      service.start('test-session');

      for (let i = 0; i < 9; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      expect(onWarning).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(3000);
      expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('does not fire onWarning more than once while active', async () => {
      const onWarning = vi.fn();
      const onWarningCleared = vi.fn();
      service.setWarningCallbacks({ onWarning, onWarningCleared });

      mockGetActiveWindow.mockRejectedValue(new Error('Failed'));
      service.start('test-session');

      for (let i = 0; i < 15; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('fires onWarningCleared when capture resumes after warning', async () => {
      const onWarning = vi.fn();
      const onWarningCleared = vi.fn();
      service.setWarningCallbacks({ onWarning, onWarningCleared });

      mockGetActiveWindow.mockRejectedValue(new Error('Failed'));
      service.start('test-session');

      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      expect(onWarning).toHaveBeenCalledTimes(1);

      mockGetActiveWindow.mockResolvedValue({ title: 'Window', owner: { name: 'App' } });
      await vi.advanceTimersByTimeAsync(3000);
      expect(onWarningCleared).toHaveBeenCalledTimes(1);
    });

    it('fires onWarningCleared on stop if warning was active', async () => {
      const onWarning = vi.fn();
      const onWarningCleared = vi.fn();
      service.setWarningCallbacks({ onWarning, onWarningCleared });

      mockGetActiveWindow.mockRejectedValue(new Error('Failed'));
      service.start('test-session');

      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      expect(onWarning).toHaveBeenCalledTimes(1);

      service.stop();
      expect(onWarningCleared).toHaveBeenCalledTimes(1);
    });
  });
});
