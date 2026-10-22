import { describe, expect, it } from 'vitest';
import { parseClaudeTranscript } from '../src/claude-state.js';

const UPDATED_AT = Date.UTC(2026, 9, 22, 12, 0, 0);

function line(value: unknown): string {
  return JSON.stringify(value);
}

describe('parseClaudeTranscript', () => {
  it('extracts a title and completed session', () => {
    const record = parseClaudeTranscript([
      line({ type: 'user', sessionId: 'session-1', cwd: '/repo/app', message: { content: 'Fix the login bug' } }),
      line({ type: 'assistant', sessionId: 'session-1', message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }),
    ].join('\n'), 'fallback', UPDATED_AT);

    expect(record).toMatchObject({
      id: 'session-1',
      title: 'Fix the login bug',
      updatedAt: UPDATED_AT,
      turnStatus: 'completed',
      provider: 'claude',
    });
  });

  it('detects a pending Claude question', () => {
    const record = parseClaudeTranscript([
      line({ type: 'user', message: { content: 'Build a UI' } }),
      line({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'AskUserQuestion' }] } }),
    ].join('\n'), 'session-2', UPDATED_AT);

    expect(record).toMatchObject({ turnStatus: 'inProgress', hasQuestions: true });
  });

  it('maps API errors and ignores files without conversation messages', () => {
    const failed = parseClaudeTranscript([
      line({ type: 'user', message: { content: 'Run tests' } }),
      line({ type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', message: { content: [] } }),
    ].join('\n'), 'session-3', UPDATED_AT);
    expect(failed?.turnStatus).toBe('failed');
    expect(parseClaudeTranscript(line({ type: 'cost-state' }), 'empty', UPDATED_AT)).toBeUndefined();
  });
});
