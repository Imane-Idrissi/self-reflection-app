import { contextBridge, ipcRenderer } from 'electron';
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
  SessionSummary,
} from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  sessionCreate: (req: SessionCreateRequest): Promise<SessionCreateResponse> =>
    ipcRenderer.invoke('session:create', req),

  sessionClarify: (req: SessionClarifyRequest): Promise<SessionClarifyResponse> =>
    ipcRenderer.invoke('session:clarify', req),

  sessionConfirmIntent: (req: SessionConfirmIntentRequest): Promise<SessionConfirmIntentResponse> =>
    ipcRenderer.invoke('session:confirm-intent', req),

  sessionStart: (req: SessionStartRequest): Promise<SessionStartResponse> =>
    ipcRenderer.invoke('session:start', req),

  sessionPause: (req: SessionPauseRequest): Promise<SessionPauseResponse> =>
    ipcRenderer.invoke('session:pause', req),

  sessionResume: (req: SessionResumeRequest): Promise<SessionResumeResponse> =>
    ipcRenderer.invoke('session:resume', req),

  sessionEnd: (req: SessionEndRequest): Promise<SessionEndResponse> =>
    ipcRenderer.invoke('session:end', req),

  sessionCheckStale: (): Promise<SessionCheckStaleResponse> =>
    ipcRenderer.invoke('session:check-stale'),

  onAutoEndWarning: (callback: () => void) => {
    ipcRenderer.on('session:auto-end-warning', () => callback());
  },

  onAutoEndTriggered: (callback: (summary: SessionSummary) => void) => {
    ipcRenderer.on('session:auto-end-triggered', (_event, summary: SessionSummary) => callback(summary));
  },

  onCaptureWarning: (callback: () => void) => {
    ipcRenderer.on('capture:warning', () => callback());
  },

  onCaptureWarningCleared: (callback: () => void) => {
    ipcRenderer.on('capture:warning-cleared', () => callback());
  },
});
