import { ipcMain } from 'electron';
import { SessionService } from '../services/session-service';
import { AiService, AiServiceError } from '../services/ai-service';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionClarifyRequest,
  SessionClarifyResponse,
  SessionConfirmIntentRequest,
  SessionConfirmIntentResponse,
  SessionStartRequest,
  SessionStartResponse,
} from '../../shared/types';

export function registerSessionHandlers(
  sessionService: SessionService,
  aiService: AiService
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
      sessionService.startSession(req.session_id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  });
}
