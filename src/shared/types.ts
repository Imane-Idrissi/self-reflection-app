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

export interface ElectronAPI {
  sessionCreate: (req: SessionCreateRequest) => Promise<SessionCreateResponse>;
  sessionClarify: (req: SessionClarifyRequest) => Promise<SessionClarifyResponse>;
  sessionConfirmIntent: (req: SessionConfirmIntentRequest) => Promise<SessionConfirmIntentResponse>;
  sessionStart: (req: SessionStartRequest) => Promise<SessionStartResponse>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
