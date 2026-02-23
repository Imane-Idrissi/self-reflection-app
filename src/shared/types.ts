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
