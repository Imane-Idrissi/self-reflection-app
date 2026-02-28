import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import { SessionService } from '../services/session-service';
import { AiService, AiServiceError } from '../services/ai-service';
import { ReportService } from '../services/report-service';
import { FloatingWindowManager } from '../floating-window';
import { showTray, hideTray, TrayActions } from '../tray';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionClarifyRequest,
  SessionClarifyResponse,
  SessionConfirmIntentRequest,
  SessionConfirmIntentResponse,
  SessionStartRequest,
  SessionStartResponse,
  SessionPauseRequest,
  SessionPauseResponse,
  SessionResumeRequest,
  SessionResumeResponse,
  SessionEndRequest,
  SessionEndResponse,
  SessionCheckStaleResponse,
  FeelingCreateRequest,
  FeelingCreateResponse,
  ReportGetRequest,
  ReportGetResponse,
  ReportRetryRequest,
  ReportRetryResponse,
  ReportDownloadResponse,
  CaptureGetInRangeRequest,
  CaptureGetInRangeResponse,
  DashboardGetSessionsRequest,
  DashboardSession,
} from '../../shared/types';
import { CaptureRepository } from '../database/capture-repository';

function friendlyAiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const cause = error instanceof AiServiceError && error.cause instanceof Error
    ? error.cause.message
    : raw;
  const lower = cause.toLowerCase();

  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('429'))
    return 'Your API key has exceeded its quota. Check your billing at aistudio.google.com/apikey';
  if (lower.includes('api_key_invalid') || lower.includes('401') || lower.includes('permission'))
    return 'Your API key is invalid or expired. Please update it in settings.';
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('enotfound'))
    return 'Network error — check your internet connection.';
  return "Couldn't reach the AI service right now";
}

export function registerSessionHandlers(
  sessionService: SessionService,
  getAiService: () => AiService | null,
  floatingWindowManager: FloatingWindowManager,
  reportService: ReportService,
  captureRepo: CaptureRepository,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle('session:create', async (_event, req: SessionCreateRequest): Promise<SessionCreateResponse> => {
    const session = sessionService.createSession(req.name, req.intent);
    const aiService = getAiService();

    if (!aiService) {
      sessionService.confirmIntent(session.session_id, req.intent);
      return {
        session_id: session.session_id,
        status: 'specific',
        final_intent: req.intent,
        error: 'No API key configured',
      };
    }

    try {
      const result = await aiService.checkVagueness(req.intent);

      if (result.status === 'specific') {
        sessionService.confirmIntent(session.session_id, req.intent);
        return {
          session_id: session.session_id,
          status: 'specific',
          final_intent: req.intent,
        };
      }

      return {
        session_id: session.session_id,
        status: 'vague',
        clarifying_questions: result.clarifying_questions,
      };
    } catch (error) {
      sessionService.confirmIntent(session.session_id, req.intent);
      return {
        session_id: session.session_id,
        status: 'specific',
        final_intent: req.intent,
        error: friendlyAiError(error),
      };
    }
  });

  ipcMain.handle('session:clarify', async (_event, req: SessionClarifyRequest): Promise<SessionClarifyResponse> => {
    try {
      const aiService = getAiService();
      if (!aiService) {
        return { refined_intent: '', error: 'No API key configured' };
      }

      const session = sessionService.getSession(req.session_id);
      if (!session) {
        return { refined_intent: '', error: 'Session not found' };
      }

      const result = await aiService.refineIntent(session.original_intent, req.answers);
      sessionService.confirmIntent(req.session_id, result.refined_intent);

      return { refined_intent: result.refined_intent };
    } catch (error) {
      const message = error instanceof AiServiceError
        ? error.message
        : 'An unexpected error occurred';
      return { refined_intent: '', error: message };
    }
  });

  ipcMain.handle('session:confirm-intent', async (_event, req: SessionConfirmIntentRequest): Promise<SessionConfirmIntentResponse> => {
    try {
      sessionService.confirmIntent(req.session_id, req.final_intent);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  const trayActions: TrayActions = {
    onPause: (sessionId: string) => {
      const win = getMainWindow();
      sessionService.pauseSession(sessionId);
      showTray('paused', sessionId);
      floatingWindowManager.sendSessionState('paused');
      win?.webContents.send('session:state-changed', { state: 'paused', session_id: sessionId });
    },
    onResume: (sessionId: string) => {
      const win = getMainWindow();
      sessionService.resumeSession(sessionId);
      showTray('recording', sessionId);
      floatingWindowManager.sendSessionState('active');
      win?.webContents.send('session:state-changed', { state: 'active', session_id: sessionId });
    },
    onEnd: (sessionId: string) => {
      const win = getMainWindow();
      const summary = sessionService.endSession(sessionId, 'user');
      hideTray();
      floatingWindowManager.destroy();
      reportService.startGeneration(sessionId);
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
      win?.webContents.send('session:state-changed', { state: 'ended', session_id: sessionId, summary });
    },
  };

  ipcMain.handle('session:start', async (_event, req: SessionStartRequest): Promise<SessionStartResponse> => {
    try {
      const result = await sessionService.startSession(req.session_id);
      if (result.permissionDenied) {
        return { success: false, error: 'permission_denied' };
      }
      showTray('recording', req.session_id, trayActions, getMainWindow);
      floatingWindowManager.create(req.session_id, 'active');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('session:pause', async (_event, req: SessionPauseRequest): Promise<SessionPauseResponse> => {
    try {
      sessionService.pauseSession(req.session_id);
      showTray('paused', req.session_id);
      floatingWindowManager.sendSessionState('paused');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('session:resume', async (_event, req: SessionResumeRequest): Promise<SessionResumeResponse> => {
    try {
      sessionService.resumeSession(req.session_id);
      showTray('recording', req.session_id);
      floatingWindowManager.sendSessionState('active');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('session:end', async (_event, req: SessionEndRequest): Promise<SessionEndResponse> => {
    try {
      const summary = sessionService.endSession(req.session_id, 'user');
      hideTray();
      floatingWindowManager.destroy();
      reportService.startGeneration(req.session_id);
      return { success: true, summary };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('session:check-stale', async (): Promise<SessionCheckStaleResponse> => {
    reportService.markStaleAsFailedOnLaunch();
    const result = sessionService.checkStaleOnLaunch();
    hideTray();
    floatingWindowManager.destroy();
    if (result) {
      reportService.startGeneration(result.session_id);
      return { ended_session: result };
    }

    const resumable = sessionService.findResumableSession();
    if (resumable) {
      return {
        resumable_session: {
          session_id: resumable.session_id,
          final_intent: resumable.final_intent!,
        },
      };
    }

    return {};
  });

  ipcMain.handle('feeling:create', async (_event, req: FeelingCreateRequest): Promise<FeelingCreateResponse> => {
    try {
      const feeling = sessionService.createFeeling(req.session_id, req.text);
      return { success: true, feeling_id: feeling.feeling_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('report:get', async (_event, req: ReportGetRequest): Promise<ReportGetResponse> => {
    return reportService.getReport(req.session_id);
  });

  ipcMain.handle('report:retry', async (_event, req: ReportRetryRequest): Promise<ReportRetryResponse> => {
    try {
      reportService.retryGeneration(req.session_id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });

  ipcMain.handle('report:download', async (event): Promise<ReportDownloadResponse> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, error: 'No window found' };

      const date = new Date().toISOString().split('T')[0];
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath: `session-report-${date}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (canceled || !filePath) return { success: false };

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });

      await fs.writeFile(filePath, pdfBuffer);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      };
    }
  });

  ipcMain.handle('capture:get-in-range', async (_event, req: CaptureGetInRangeRequest): Promise<CaptureGetInRangeResponse> => {
    const captures = captureRepo.getBySessionIdInTimeRange(req.session_id, req.start_time, req.end_time);
    return { captures };
  });

  ipcMain.handle('dashboard:get-sessions', async (_event, req: DashboardGetSessionsRequest): Promise<DashboardSession[]> => {
    const limit = req.limit ?? 10;
    const sessions = sessionService.getCompletedSessions(limit);
    return sessions.map((s) => {
      const startMs = s.started_at ? new Date(s.started_at).getTime() : new Date(s.created_at).getTime();
      const endMs = s.ended_at ? new Date(s.ended_at).getTime() : startMs;
      return {
        session_id: s.session_id,
        name: s.name,
        started_at: s.started_at || s.created_at,
        ended_at: s.ended_at || s.created_at,
        duration_minutes: Math.round((endMs - startMs) / 60000),
        has_report: reportService.hasReport(s.session_id),
      };
    });
  });

}
