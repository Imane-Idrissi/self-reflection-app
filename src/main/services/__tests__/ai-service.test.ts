import { describe, it, expect } from 'vitest';
import {
  buildVaguenessPrompt,
  buildRefinementPrompt,
  parseVaguenessResponse,
  parseRefinementResponse,
} from '../ai-service';

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
});
