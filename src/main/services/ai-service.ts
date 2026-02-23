import Anthropic from '@anthropic-ai/sdk';

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
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async checkVagueness(intent: string): Promise<VaguenessResult> {
    const prompt = buildVaguenessPrompt(intent);

    let text: string;
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = response.content[0];
      if (block.type !== 'text') {
        throw new AiServiceError('Unexpected response format from AI');
      }
      text = block.text;
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      throw new AiServiceError('Failed to check intent vagueness', error);
    }

    return parseVaguenessResponse(text);
  }

  async refineIntent(originalIntent: string, answers: string[]): Promise<RefinementResult> {
    const prompt = buildRefinementPrompt(originalIntent, answers);

    let text: string;
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = response.content[0];
      if (block.type !== 'text') {
        throw new AiServiceError('Unexpected response format from AI');
      }
      text = block.text;
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
