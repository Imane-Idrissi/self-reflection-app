export interface Session {
  session_id: string;
  name: string;
  original_intent: string;
  final_intent: string | null;
  status: 'created' | 'active' | 'paused' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  ended_by: string | null;
  created_at: string;
}

export interface SessionEvent {
  event_id: string;
  session_id: string;
  event_type: 'paused' | 'resumed';
  created_at: string;
}

export interface Capture {
  capture_id: string;
  session_id: string;
  window_title: string;
  app_name: string;
  captured_at: string;
}

export interface Feeling {
  feeling_id: string;
  session_id: string;
  text: string;
  created_at: string;
}

export interface Report {
  report_id: string;
  session_id: string;
  summary: string | null;
  patterns: string | null;
  suggestions: string | null;
  status: 'generating' | 'ready' | 'failed';
  created_at: string;
}

export interface ReportEvidence {
  type: 'capture' | 'feeling';
  description: string;
  start_time: string;
  end_time: string | null;
}

export interface ReportPattern {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  evidence: ReportEvidence[];
}

export interface ReportSuggestion {
  text: string;
  addresses_pattern: string;
}

export interface ParsedReport {
  verdict: string;
  patterns: ReportPattern[];
  suggestions: ReportSuggestion[];
}

// API Key types

export interface ApiKeyCheckResponse {
  hasKey: boolean;
  maskedKey?: string;
}

export interface ApiKeySaveRequest {
  key: string;
}

export interface ApiKeySaveResponse {
  success: boolean;
  error?: string;
}

// IPC Request/Response types

export interface SessionCreateRequest {
  name: string;
  intent: string;
}

export interface SessionCreateResponse {
  session_id: string;
  status: 'specific' | 'vague';
  clarifying_questions?: string[];
  final_intent?: string;
  error?: string;
}

export interface SessionClarifyRequest {
  session_id: string;
  answers: string[];
}

export interface SessionClarifyResponse {
  refined_intent: string;
  error?: string;
}

export interface SessionConfirmIntentRequest {
  session_id: string;
  final_intent: string;
}

export interface SessionConfirmIntentResponse {
  success: boolean;
  error?: string;
}

export interface SessionStartRequest {
  session_id: string;
}

export interface SessionStartResponse {
  success: boolean;
  error?: string;
}

export interface SessionPauseRequest {
  session_id: string;
}

export interface SessionPauseResponse {
  success: boolean;
  error?: string;
}

export interface SessionResumeRequest {
  session_id: string;
}

export interface SessionResumeResponse {
  success: boolean;
  error?: string;
}

export interface SessionSummary {
  total_minutes: number;
  active_minutes: number;
  paused_minutes: number;
  capture_count: number;
  feeling_count: number;
}

export interface SessionEndRequest {
  session_id: string;
}

export interface SessionEndResponse {
  success: boolean;
  summary?: SessionSummary;
  error?: string;
}

export interface SessionCheckStaleResponse {
  ended_session?: {
    session_id: string;
    summary: SessionSummary;
  };
  resumable_session?: {
    session_id: string;
    final_intent: string;
  };
}

export interface FeelingCreateRequest {
  session_id: string;
  text: string;
}

export interface FeelingCreateResponse {
  success: boolean;
  feeling_id?: string;
  error?: string;
}

export interface ReportGetRequest {
  session_id: string;
}

export interface ReportGetResponse {
  status: 'generating' | 'ready' | 'failed';
  report?: ParsedReport;
  session?: {
    name: string;
    intent: string;
    total_minutes: number;
    active_minutes: number;
    paused_minutes: number;
  };
}

export interface ReportRetryRequest {
  session_id: string;
}

export interface ReportRetryResponse {
  success: boolean;
  error?: string;
}

export interface ReportDownloadResponse {
  success: boolean;
  error?: string;
}

export interface CaptureGetInRangeRequest {
  session_id: string;
  start_time: string;
  end_time: string;
}

export interface CaptureGetInRangeResponse {
  captures: Capture[];
}

export interface DashboardSession {
  session_id: string;
  name: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  has_report: boolean;
}

export interface DashboardGetSessionsRequest {
  limit?: number;
  offset?: number;
}

export interface ElectronAPI {
  apikeyCheck: () => Promise<ApiKeyCheckResponse>;
  apikeySave: (req: ApiKeySaveRequest) => Promise<ApiKeySaveResponse>;
  sessionCreate: (req: SessionCreateRequest) => Promise<SessionCreateResponse>;
  sessionClarify: (req: SessionClarifyRequest) => Promise<SessionClarifyResponse>;
  sessionConfirmIntent: (req: SessionConfirmIntentRequest) => Promise<SessionConfirmIntentResponse>;
  sessionStart: (req: SessionStartRequest) => Promise<SessionStartResponse>;
  sessionPause: (req: SessionPauseRequest) => Promise<SessionPauseResponse>;
  sessionResume: (req: SessionResumeRequest) => Promise<SessionResumeResponse>;
  sessionEnd: (req: SessionEndRequest) => Promise<SessionEndResponse>;
  sessionCheckStale: () => Promise<SessionCheckStaleResponse>;
  reportGet: (req: ReportGetRequest) => Promise<ReportGetResponse>;
  reportRetry: (req: ReportRetryRequest) => Promise<ReportRetryResponse>;
  captureGetInRange: (req: CaptureGetInRangeRequest) => Promise<CaptureGetInRangeResponse>;
  reportDownload: () => Promise<ReportDownloadResponse>;
  dashboardGetSessions: (req: DashboardGetSessionsRequest) => Promise<DashboardSession[]>;
  onAutoEndWarning: (callback: () => void) => void;
  onAutoEndTriggered: (callback: (summary: SessionSummary, sessionId: string) => void) => void;
  onCaptureWarning: (callback: () => void) => void;
  onCaptureWarningCleared: (callback: () => void) => void;
  onSessionStateChanged: (callback: (data: { state: 'active' | 'paused' | 'ended'; session_id: string; summary?: SessionSummary }) => void) => void;
}

export interface FloatingWindowState {
  session_id: string;
  status: 'active' | 'paused';
}

export interface FloatingAPI {
  feelingCreate: (req: FeelingCreateRequest) => Promise<FeelingCreateResponse>;
  getSessionState: () => Promise<FloatingWindowState>;
  onSessionStateChange: (callback: (state: { status: 'active' | 'paused' | 'ended' }) => void) => void;
  resize: (width: number, height: number, growDirection?: 'up' | 'down') => void;
  move: (deltaX: number, deltaY: number) => void;
  dismissed: () => void;
  setIgnoreMouse: (ignore: boolean) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
    floatingApi: FloatingAPI;
  }
}
