import { describe, it, expect } from 'vitest';
import {
  buildVaguenessPrompt,
  buildRefinementPrompt,
  parseVaguenessResponse,
  parseRefinementResponse,
  collapseCaptures,
  buildReportPrompt,
  parseReportResponse,
} from '../ai-service';
import type { Capture, Feeling, SessionEvent } from '../../../shared/types';

describe('AI Service', () => {
  describe('buildVaguenessPrompt', () => {
    it('includes the user intent in the prompt', () => {
      const prompt = buildVaguenessPrompt('Fix the login bug');
      expect(prompt).toContain('Fix the login bug');
    });

    it('specifies the expected JSON format', () => {
      const prompt = buildVaguenessPrompt('Work on code');
      expect(prompt).toContain('"status"');
      expect(prompt).toContain('"clarifying_questions"');
    });
  });

  describe('buildRefinementPrompt', () => {
    it('includes original intent and answers', () => {
      const prompt = buildRefinementPrompt('Work on my project', ['The login page', 'React']);
      expect(prompt).toContain('Work on my project');
      expect(prompt).toContain('The login page');
      expect(prompt).toContain('React');
    });
  });

  describe('parseVaguenessResponse', () => {
    it('parses a specific response', () => {
      const result = parseVaguenessResponse('{"status": "specific"}');
      expect(result).toEqual({ status: 'specific' });
    });

    it('parses a vague response with clarifying questions', () => {
      const result = parseVaguenessResponse(
        '{"status": "vague", "clarifying_questions": ["What project?", "What part?"]}'
      );
      expect(result).toEqual({
        status: 'vague',
        clarifying_questions: ['What project?', 'What part?'],
      });
    });

    it('extracts JSON from surrounding text', () => {
      const result = parseVaguenessResponse(
        'Here is my analysis:\n{"status": "specific"}\nHope that helps!'
      );
      expect(result).toEqual({ status: 'specific' });
    });

    it('throws on missing JSON', () => {
      expect(() => parseVaguenessResponse('no json here')).toThrow('Could not find JSON');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseVaguenessResponse('{invalid json}')).toThrow('not valid JSON');
    });

    it('throws on invalid status', () => {
      expect(() => parseVaguenessResponse('{"status": "unknown"}')).toThrow('Invalid status');
    });

    it('throws when vague response has no clarifying questions', () => {
      expect(() => parseVaguenessResponse('{"status": "vague"}')).toThrow(
        'missing clarifying_questions'
      );
    });

    it('throws when vague response has empty questions array', () => {
      expect(() =>
        parseVaguenessResponse('{"status": "vague", "clarifying_questions": []}')
      ).toThrow('missing clarifying_questions');
    });

    it('throws when questions contain non-strings', () => {
      expect(() =>
        parseVaguenessResponse('{"status": "vague", "clarifying_questions": [123]}')
      ).toThrow('must be strings');
    });
  });

  describe('parseRefinementResponse', () => {
    it('parses a valid refinement response', () => {
      const result = parseRefinementResponse(
        '{"refined_intent": "Complete the database schema for the users table"}'
      );
      expect(result).toEqual({
        refined_intent: 'Complete the database schema for the users table',
      });
    });

    it('extracts JSON from surrounding text', () => {
      const result = parseRefinementResponse(
        'Based on your answers:\n{"refined_intent": "Build the login form"}\n'
      );
      expect(result).toEqual({ refined_intent: 'Build the login form' });
    });

    it('throws on missing refined_intent', () => {
      expect(() => parseRefinementResponse('{"other": "field"}')).toThrow(
        'missing refined_intent'
      );
    });

    it('throws on empty refined_intent', () => {
      expect(() => parseRefinementResponse('{"refined_intent": ""}')).toThrow(
        'missing refined_intent'
      );
    });

    it('throws on missing JSON', () => {
      expect(() => parseRefinementResponse('just text')).toThrow('Could not find JSON');
    });
  });

  describe('collapseCaptures', () => {
    it('returns empty array for empty input', () => {
      expect(collapseCaptures([])).toEqual([]);
    });

    it('groups consecutive identical captures into a single span', () => {
      const captures: Capture[] = [
        { capture_id: '1', session_id: 's1', window_title: 'main.ts - VS Code', app_name: 'Code', captured_at: '2024-01-01T09:00:00.000Z' },
        { capture_id: '2', session_id: 's1', window_title: 'main.ts - VS Code', app_name: 'Code', captured_at: '2024-01-01T09:00:03.000Z' },
        { capture_id: '3', session_id: 's1', window_title: 'main.ts - VS Code', app_name: 'Code', captured_at: '2024-01-01T09:00:06.000Z' },
      ];

      const spans = collapseCaptures(captures);
      expect(spans).toHaveLength(1);
      expect(spans[0].window_title).toBe('main.ts - VS Code');
      expect(spans[0].start_time).toBe('2024-01-01T09:00:00.000Z');
      expect(spans[0].end_time).toBe('2024-01-01T09:00:06.000Z');
    });

    it('splits on window title change', () => {
      const captures: Capture[] = [
        { capture_id: '1', session_id: 's1', window_title: 'main.ts - VS Code', app_name: 'Code', captured_at: '2024-01-01T09:00:00.000Z' },
        { capture_id: '2', session_id: 's1', window_title: 'YouTube - Chrome', app_name: 'Chrome', captured_at: '2024-01-01T09:45:00.000Z' },
      ];

      const spans = collapseCaptures(captures);
      expect(spans).toHaveLength(2);
      expect(spans[0].app_name).toBe('Code');
      expect(spans[1].app_name).toBe('Chrome');
    });

    it('splits on app name change even when title is the same', () => {
      const captures: Capture[] = [
        { capture_id: '1', session_id: 's1', window_title: 'Document', app_name: 'Word', captured_at: '2024-01-01T09:00:00.000Z' },
        { capture_id: '2', session_id: 's1', window_title: 'Document', app_name: 'Pages', captured_at: '2024-01-01T09:30:00.000Z' },
      ];

      const spans = collapseCaptures(captures);
      expect(spans).toHaveLength(2);
    });

    it('calculates duration in minutes', () => {
      const captures: Capture[] = [
        { capture_id: '1', session_id: 's1', window_title: 'File', app_name: 'App', captured_at: '2024-01-01T09:00:00.000Z' },
        { capture_id: '2', session_id: 's1', window_title: 'File', app_name: 'App', captured_at: '2024-01-01T09:45:00.000Z' },
      ];

      const spans = collapseCaptures(captures);
      expect(spans[0].duration_minutes).toBe(45);
    });

    it('handles a single capture', () => {
      const captures: Capture[] = [
        { capture_id: '1', session_id: 's1', window_title: 'Solo', app_name: 'App', captured_at: '2024-01-01T09:00:00.000Z' },
      ];

      const spans = collapseCaptures(captures);
      expect(spans).toHaveLength(1);
      expect(spans[0].duration_minutes).toBe(0);
    });
  });

  describe('buildReportPrompt', () => {
    const baseInput = {
      intent: 'Build the login page',
      total_minutes: 60,
      active_minutes: 55,
      paused_minutes: 5,
      feeling_count: 2,
      collapsed_captures: [
        {
          window_title: 'login.tsx - VS Code',
          app_name: 'Code',
          start_time: '2024-01-01T09:00:00.000Z',
          end_time: '2024-01-01T09:45:00.000Z',
          duration_minutes: 45,
        },
      ],
      feelings: [
        { feeling_id: 'f1', session_id: 's1', text: 'Feeling focused', created_at: '2024-01-01T09:22:00.000Z' },
      ] as Feeling[],
      events: [
        { event_id: 'e1', session_id: 's1', event_type: 'paused' as const, created_at: '2024-01-01T09:45:00.000Z' },
      ] as SessionEvent[],
    };

    it('includes the intent', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('Build the login page');
    });

    it('includes session metadata', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('60.0 minutes');
      expect(prompt).toContain('55.0 minutes');
    });

    it('includes collapsed capture spans', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('login.tsx - VS Code');
      expect(prompt).toContain('Code');
    });

    it('includes feeling logs interleaved', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('[FEELING]');
      expect(prompt).toContain('Feeling focused');
    });

    it('includes session events', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('[PAUSE]');
    });

    it('includes confidence criteria', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('high');
      expect(prompt).toContain('medium');
      expect(prompt).toContain('low');
    });

    it('includes JSON schema', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).toContain('"verdict"');
      expect(prompt).toContain('"patterns"');
      expect(prompt).toContain('"suggestions"');
    });

    it('does not include user identity', () => {
      const prompt = buildReportPrompt(baseInput);
      expect(prompt).not.toContain('username');
      expect(prompt).not.toContain('machine');
    });
  });

  describe('parseReportResponse', () => {
    const validReport = JSON.stringify({
      verdict: 'Good focused session overall.',
      patterns: [
        {
          name: 'Deep Focus',
          confidence: 'high',
          type: 'positive',
          description: 'Stayed on task for 45 minutes',
          evidence: [
            {
              type: 'capture',
              description: 'VS Code active for 45 min',
              start_time: '2024-01-01T09:00:00.000Z',
              end_time: '2024-01-01T09:45:00.000Z',
            },
          ],
        },
      ],
      suggestions: [
        {
          text: 'Take a short break after 45 minutes',
          addresses_pattern: 'Deep Focus',
        },
      ],
    });

    it('parses a valid full report', () => {
      const result = parseReportResponse(validReport);
      expect(result.verdict).toBe('Good focused session overall.');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].name).toBe('Deep Focus');
      expect(result.suggestions).toHaveLength(1);
    });

    it('extracts JSON from surrounding text', () => {
      const result = parseReportResponse(`Here is the analysis:\n${validReport}\nDone!`);
      expect(result.verdict).toBe('Good focused session overall.');
    });

    it('throws on missing verdict', () => {
      expect(() =>
        parseReportResponse('{"patterns": [], "suggestions": []}')
      ).toThrow('missing verdict');
    });

    it('throws on missing patterns array', () => {
      expect(() =>
        parseReportResponse('{"verdict": "ok", "suggestions": []}')
      ).toThrow('missing patterns');
    });

    it('throws on missing suggestions array', () => {
      expect(() =>
        parseReportResponse('{"verdict": "ok", "patterns": []}')
      ).toThrow('missing suggestions');
    });

    it('throws on invalid pattern confidence', () => {
      const bad = JSON.stringify({
        verdict: 'ok',
        patterns: [{ name: 'P', confidence: 'extreme', type: 'positive', description: 'd', evidence: [] }],
        suggestions: [],
      });
      expect(() => parseReportResponse(bad)).toThrow('invalid confidence');
    });

    it('throws on invalid pattern type', () => {
      const bad = JSON.stringify({
        verdict: 'ok',
        patterns: [{ name: 'P', confidence: 'high', type: 'bad', description: 'd', evidence: [] }],
        suggestions: [],
      });
      expect(() => parseReportResponse(bad)).toThrow('invalid type');
    });

    it('accepts empty patterns and suggestions arrays', () => {
      const result = parseReportResponse('{"verdict": "Quiet session.", "patterns": [], "suggestions": []}');
      expect(result.patterns).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('throws on missing JSON', () => {
      expect(() => parseReportResponse('no json here')).toThrow('Could not find JSON');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseReportResponse('{bad json}')).toThrow('not valid JSON');
    });
  });
});
