export interface Session {
  session_id: string;
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

// IPC Request/Response types

export interface SessionCreateRequest {
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

export interface ElectronAPI {
  sessionCreate: (req: SessionCreateRequest) => Promise<SessionCreateResponse>;
  sessionClarify: (req: SessionClarifyRequest) => Promise<SessionClarifyResponse>;
  sessionConfirmIntent: (req: SessionConfirmIntentRequest) => Promise<SessionConfirmIntentResponse>;
  sessionStart: (req: SessionStartRequest) => Promise<SessionStartResponse>;
  sessionPause: (req: SessionPauseRequest) => Promise<SessionPauseResponse>;
  sessionResume: (req: SessionResumeRequest) => Promise<SessionResumeResponse>;
  sessionEnd: (req: SessionEndRequest) => Promise<SessionEndResponse>;
  sessionCheckStale: () => Promise<SessionCheckStaleResponse>;
  onAutoEndWarning: (callback: () => void) => void;
  onAutoEndTriggered: (callback: (summary: SessionSummary) => void) => void;
  onCaptureWarning: (callback: () => void) => void;
  onCaptureWarningCleared: (callback: () => void) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
