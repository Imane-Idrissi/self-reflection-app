import { contextBridge, ipcRenderer } from 'electron';
import type {
  ApiKeyCheckResponse,
  ApiKeySaveRequest,
  ApiKeySaveResponse,
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
  SessionDeleteRequest,
  SessionDeleteResponse,
  SessionCheckStaleResponse,
  SessionSummary,
  ReportGetRequest,
  ReportGetResponse,
  ReportRetryRequest,
  ReportRetryResponse,
  ReportDownloadResponse,
  CaptureGetInRangeRequest,
  CaptureGetInRangeResponse,
  DashboardGetSessionsRequest,
  DashboardSession,
} from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  apikeyCheck: (): Promise<ApiKeyCheckResponse> =>
    ipcRenderer.invoke('apikey:check'),

  apikeySave: (req: ApiKeySaveRequest): Promise<ApiKeySaveResponse> =>
    ipcRenderer.invoke('apikey:save', req),

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

  sessionDelete: (req: SessionDeleteRequest): Promise<SessionDeleteResponse> =>
    ipcRenderer.invoke('session:delete', req),

  sessionCheckStale: (): Promise<SessionCheckStaleResponse> =>
    ipcRenderer.invoke('session:check-stale'),

  reportGet: (req: ReportGetRequest): Promise<ReportGetResponse> =>
    ipcRenderer.invoke('report:get', req),

  reportRetry: (req: ReportRetryRequest): Promise<ReportRetryResponse> =>
    ipcRenderer.invoke('report:retry', req),

  reportDownload: (): Promise<ReportDownloadResponse> =>
    ipcRenderer.invoke('report:download'),

  captureGetInRange: (req: CaptureGetInRangeRequest): Promise<CaptureGetInRangeResponse> =>
    ipcRenderer.invoke('capture:get-in-range', req),

  dashboardGetSessions: (req: DashboardGetSessionsRequest): Promise<DashboardSession[]> =>
    ipcRenderer.invoke('dashboard:get-sessions', req),

  onAutoEndWarning: (callback: () => void) => {
    ipcRenderer.on('session:auto-end-warning', () => callback());
  },

  onAutoEndTriggered: (callback: (summary: SessionSummary, sessionId: string) => void) => {
    ipcRenderer.on('session:auto-end-triggered', (_event, summary: SessionSummary, sessionId: string) => callback(summary, sessionId));
  },

  onCaptureWarning: (callback: () => void) => {
    ipcRenderer.on('capture:warning', () => callback());
  },

  onCaptureWarningCleared: (callback: () => void) => {
    ipcRenderer.on('capture:warning-cleared', () => callback());
  },

  onSessionStateChanged: (callback: (data: { state: 'active' | 'paused' | 'ended'; session_id: string; summary?: SessionSummary }) => void) => {
    ipcRenderer.on('session:state-changed', (_event, data) => callback(data));
  },
});
