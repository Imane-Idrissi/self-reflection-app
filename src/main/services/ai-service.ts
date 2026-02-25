import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { Capture, Feeling, SessionEvent, ParsedReport } from '../../shared/types';

export interface VaguenessResult {
  status: 'specific' | 'vague';
  clarifying_questions?: string[];
}

export interface RefinementResult {
  refined_intent: string;
}

export class AiServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export class AiService {
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async checkVagueness(intent: string): Promise<VaguenessResult> {
    const prompt = buildVaguenessPrompt(intent);

    let text: string;
    try {
      const result = await this.model.generateContent(prompt);
      text = result.response.text();
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      throw new AiServiceError('Failed to check intent vagueness', error);
    }

    return parseVaguenessResponse(text);
  }

  async generateReport(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      throw new AiServiceError('Failed to generate report', error);
    }
  }

  async refineIntent(originalIntent: string, answers: string[]): Promise<RefinementResult> {
    const prompt = buildRefinementPrompt(originalIntent, answers);

    let text: string;
    try {
      const result = await this.model.generateContent(prompt);
      text = result.response.text();
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      throw new AiServiceError('Failed to refine intent', error);
    }

    return parseRefinementResponse(text);
  }
}

export function buildVaguenessPrompt(intent: string): string {
  return `You are helping a user set a clear intent for a focused work session. The intent should be specific enough that, at the end of the session, it's possible to evaluate whether they stayed on track.

Evaluate this intent: "${intent}"

A SPECIFIC intent clearly describes what the user will work on and what outcome they're aiming for. Examples:
- "Finish the database schema migration for the users table"
- "Write the first draft of the project proposal introduction section"
- "Debug the login timeout issue reported in ticket #423"

A VAGUE intent is too broad or abstract to meaningfully evaluate. Examples:
- "Be productive"
- "Work on my project"
- "Study"
- "Code stuff"

If the intent is vague, generate 1-3 clarifying questions that would help the user make it more specific. Ask only what's needed — don't ask 3 questions if 1 would suffice.

Respond with ONLY valid JSON in this exact format, no other text:

If specific:
{"status": "specific"}

If vague:
{"status": "vague", "clarifying_questions": ["question 1", "question 2"]}`;
}

export function buildRefinementPrompt(originalIntent: string, answers: string[]): string {
  const answersText = answers.map((a, i) => `Answer ${i + 1}: ${a}`).join('\n');

  return `A user set this intent for a work session: "${originalIntent}"

It was too vague, so they answered clarifying questions:
${answersText}

Based on their original intent and answers, write a single refined intent statement that is specific and actionable. Keep it concise (1-2 sentences). Write it from the user's perspective (as if they wrote it themselves).

Respond with ONLY valid JSON in this exact format, no other text:
{"refined_intent": "the refined intent text"}`;
}

export function parseVaguenessResponse(text: string): VaguenessResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AiServiceError('Could not find JSON in AI response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AiServiceError('AI response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AiServiceError('AI response is not a valid object');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.status !== 'specific' && obj.status !== 'vague') {
    throw new AiServiceError(`Invalid status in AI response: ${obj.status}`);
  }

  if (obj.status === 'vague') {
    if (!Array.isArray(obj.clarifying_questions) || obj.clarifying_questions.length === 0) {
      throw new AiServiceError('Vague response missing clarifying_questions');
    }
    if (!obj.clarifying_questions.every((q: unknown) => typeof q === 'string')) {
      throw new AiServiceError('clarifying_questions must be strings');
    }
    return {
      status: 'vague',
      clarifying_questions: obj.clarifying_questions as string[],
    };
  }

  return { status: 'specific' };
}

export function parseRefinementResponse(text: string): RefinementResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AiServiceError('Could not find JSON in AI response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AiServiceError('AI response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AiServiceError('AI response is not a valid object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.refined_intent !== 'string' || obj.refined_intent.length === 0) {
    throw new AiServiceError('AI response missing refined_intent');
  }

  return { refined_intent: obj.refined_intent };
}

// --- Report generation helpers ---

export interface CollapsedCapture {
  window_title: string;
  app_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface ReportPromptInput {
  intent: string;
  total_minutes: number;
  active_minutes: number;
  paused_minutes: number;
  feeling_count: number;
  collapsed_captures: CollapsedCapture[];
  feelings: Feeling[];
  events: SessionEvent[];
}

export function collapseCaptures(captures: Capture[]): CollapsedCapture[] {
  if (captures.length === 0) return [];

  const spans: CollapsedCapture[] = [];
  let current = captures[0];
  let startTime = current.captured_at;

  for (let i = 1; i < captures.length; i++) {
    const next = captures[i];
    if (next.window_title === current.window_title && next.app_name === current.app_name) {
      current = next;
    } else {
      spans.push({
        window_title: current.window_title,
        app_name: current.app_name,
        start_time: startTime,
        end_time: current.captured_at,
        duration_minutes: (new Date(current.captured_at).getTime() - new Date(startTime).getTime()) / 60000,
      });
      current = next;
      startTime = next.captured_at;
    }
  }

  spans.push({
    window_title: current.window_title,
    app_name: current.app_name,
    start_time: startTime,
    end_time: current.captured_at,
    duration_minutes: (new Date(current.captured_at).getTime() - new Date(startTime).getTime()) / 60000,
  });

  return spans;
}

export function buildReportPrompt(input: ReportPromptInput): string {
  const timeline = buildTimeline(input.collapsed_captures, input.feelings, input.events);

  return `You are an insightful behavioral analyst helping a user understand their work session. Your role is to identify patterns in how they spent their time, correlate their behavior with their emotional state, and provide honest but supportive feedback.

Analyze this work session and produce a structured behavioral report.

## Session Intent
"${input.intent}"

## Session Metadata
- Total time: ${input.total_minutes.toFixed(1)} minutes
- Active time: ${input.active_minutes.toFixed(1)} minutes
- Paused time: ${input.paused_minutes.toFixed(1)} minutes
- Feeling logs recorded: ${input.feeling_count}

## Chronological Timeline
${timeline || 'No activity data recorded.'}

## Analysis Instructions

1. **Identify behavioral patterns** — look for recurring behaviors, context switches, procrastination signals, focus periods, and correlations between feelings and actions.

2. **Assign confidence levels** based on evidence strength:
   - **high**: Multiple evidence points from different sources (captures + feelings), clear correlation with the intent.
   - **medium**: Observable pattern in captures, but limited or no feeling data to confirm the user's internal state.
   - **low**: Single observation or ambiguous evidence, possible but not certain.

3. **Classify each pattern** as positive, negative, or neutral relative to the stated intent.

4. **Generate suggestions** only for negative or neutral patterns. Suggestions should be specific enough to be actionable but general enough to apply beyond this single session. Do not suggest generic advice like "stay focused" — be specific about what behavior to change and how.

5. **Tone**: Be honest but supportive. Acknowledge positive patterns, not just negative ones. Frame suggestions as helpful, not judgmental. The user is doing something vulnerable by reflecting on their behavior.

## Output Format

Respond with ONLY valid JSON in this exact format, no other text:

{
  "verdict": "One sentence summarizing how the session went relative to the intent",
  "patterns": [
    {
      "name": "Short pattern name",
      "confidence": "high | medium | low",
      "type": "positive | negative | neutral",
      "description": "Brief explanation of what was observed",
      "evidence": [
        {
          "type": "capture | feeling",
          "description": "Human-readable evidence description",
          "start_time": "ISO 8601 timestamp",
          "end_time": "ISO 8601 timestamp or null for feelings"
        }
      ]
    }
  ],
  "suggestions": [
    {
      "text": "Actionable suggestion text",
      "addresses_pattern": "Name of the pattern this addresses"
    }
  ]
}`;
}

function buildTimeline(
  captures: CollapsedCapture[],
  feelings: Feeling[],
  events: SessionEvent[],
): string {
  type TimelineEntry = {
    time: string;
    sort: number;
    text: string;
  };

  const entries: TimelineEntry[] = [];

  for (const span of captures) {
    const dur = span.duration_minutes < 1
      ? '<1 min'
      : `${Math.round(span.duration_minutes)} min`;
    entries.push({
      time: span.start_time,
      sort: new Date(span.start_time).getTime(),
      text: `${span.start_time} – ${span.end_time} (${dur}) | ${span.app_name} | ${span.window_title}`,
    });
  }

  for (const feeling of feelings) {
    entries.push({
      time: feeling.created_at,
      sort: new Date(feeling.created_at).getTime(),
      text: `  ${feeling.created_at} [FEELING] "${feeling.text}"`,
    });
  }

  for (const event of events) {
    const label = event.event_type === 'paused' ? 'PAUSE' : 'RESUME';
    entries.push({
      time: event.created_at,
      sort: new Date(event.created_at).getTime(),
      text: `${event.created_at} [${label}]`,
    });
  }

  entries.sort((a, b) => a.sort - b.sort);
  return entries.map(e => e.text).join('\n');
}

export function parseReportResponse(text: string): ParsedReport {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AiServiceError('Could not find JSON in AI response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AiServiceError('AI response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AiServiceError('AI response is not a valid object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.verdict !== 'string' || obj.verdict.length === 0) {
    throw new AiServiceError('Report missing verdict');
  }

  if (!Array.isArray(obj.patterns)) {
    throw new AiServiceError('Report missing patterns array');
  }

  if (!Array.isArray(obj.suggestions)) {
    throw new AiServiceError('Report missing suggestions array');
  }

  for (const pattern of obj.patterns) {
    if (!pattern || typeof pattern !== 'object') {
      throw new AiServiceError('Invalid pattern in report');
    }
    const p = pattern as Record<string, unknown>;
    if (typeof p.name !== 'string') {
      throw new AiServiceError('Pattern missing name');
    }
    if (!['high', 'medium', 'low'].includes(p.confidence as string)) {
      throw new AiServiceError('Pattern has invalid confidence level');
    }
    if (!['positive', 'negative', 'neutral'].includes(p.type as string)) {
      throw new AiServiceError('Pattern has invalid type');
    }
    if (typeof p.description !== 'string') {
      throw new AiServiceError('Pattern missing description');
    }
    if (!Array.isArray(p.evidence)) {
      throw new AiServiceError('Pattern missing evidence array');
    }
  }

  for (const suggestion of obj.suggestions) {
    if (!suggestion || typeof suggestion !== 'object') {
      throw new AiServiceError('Invalid suggestion in report');
    }
    const s = suggestion as Record<string, unknown>;
    if (typeof s.text !== 'string') {
      throw new AiServiceError('Suggestion missing text');
    }
    if (typeof s.addresses_pattern !== 'string') {
      throw new AiServiceError('Suggestion missing addresses_pattern');
    }
  }

  return {
    verdict: obj.verdict,
    patterns: obj.patterns as ParsedReport['patterns'],
    suggestions: obj.suggestions as ParsedReport['suggestions'],
  };
}
