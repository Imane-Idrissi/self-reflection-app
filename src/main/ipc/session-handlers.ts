import { ipcMain } from 'electron';
import { SessionService } from '../services/session-service';
import { AiService, AiServiceError } from '../services/ai-service';
import { ReportService } from '../services/report-service';
import { FloatingWindowManager } from '../floating-window';
import { showTray, hideTray } from '../tray';
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
  CaptureGetInRangeRequest,
  CaptureGetInRangeResponse,
} from '../../shared/types';
import { CaptureRepository } from '../database/capture-repository';

export function registerSessionHandlers(
  sessionService: SessionService,
  aiService: AiService,
  floatingWindowManager: FloatingWindowManager,
  reportService: ReportService,
  captureRepo: CaptureRepository,
): void {
  ipcMain.handle('session:create', async (_event, req: SessionCreateRequest): Promise<SessionCreateResponse> => {
    const session = sessionService.createSession(req.intent);

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
      const message = error instanceof AiServiceError
        ? error.message
        : 'An unexpected error occurred';
      return {
        session_id: session.session_id,
        status: 'specific',
        final_intent: req.intent,
        error: message,
      };
    }
  });

  ipcMain.handle('session:clarify', async (_event, req: SessionClarifyRequest): Promise<SessionClarifyResponse> => {
    try {
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

  ipcMain.handle('session:start', async (_event, req: SessionStartRequest): Promise<SessionStartResponse> => {
    try {
      const result = sessionService.startSession(req.session_id);
      if (result.permissionDenied) {
        return { success: false, error: 'permission_denied' };
      }
      showTray('recording');
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
      showTray('paused');
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
      showTray('recording');
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
    const result = sessionService.checkStaleOnLaunch();
    hideTray();
    floatingWindowManager.destroy();
    if (!result) return {};
    return { ended_session: result };
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

  ipcMain.handle('capture:get-in-range', async (_event, req: CaptureGetInRangeRequest): Promise<CaptureGetInRangeResponse> => {
    const captures = captureRepo.getBySessionIdInTimeRange(req.session_id, req.start_time, req.end_time);
    return { captures };
  });
}
