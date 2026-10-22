import { describe, expect, it } from 'vitest';
import { parseClaudeTranscript } from '../src/claude-state.js';

const UPDATED_AT = Date.UTC(2026, 9, 22, 12, 0, 0);

function line(value: unknown): string {
  return JSON.stringify(value);
}

describe('parseClaudeTranscript', () => {
  it('uses the working folder name for a completed session', () => {
    const record = parseClaudeTranscript([
      line({ type: 'user', sessionId: 'session-1', cwd: '/repo/app', message: { content: 'Fix the login bug' } }),
      line({ type: 'assistant', sessionId: 'session-1', message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }),
    ].join('\n'), 'fallback', UPDATED_AT);

    expect(record).toMatchObject({
      id: 'session-1',
      title: 'app',
      subtitle: 'Done',
      updatedAt: UPDATED_AT,
      turnStatus: 'completed',
      provider: 'claude',
    });
  });

  it('falls back to the saved session name when no folder is recorded', () => {
    const record = parseClaudeTranscript([
      line({ type: 'ai-title', sessionId: 'session-4', aiTitle: 'Generated title' }),
      line({ type: 'custom-title', sessionId: 'session-4', customTitle: 'Release dashboard' }),
      line({ type: 'user', sessionId: 'session-4', message: { content: 'Build it' } }),
    ].join('\n'), 'fallback', UPDATED_AT);

    expect(record?.title).toBe('Release dashboard');
  });

  it('uses the session ID when folder and saved names are missing', () => {
    const record = parseClaudeTranscript(
      line({ type: 'user', sessionId: 'session-5', message: { content: 'Build it' } }),
      'fallback',
      UPDATED_AT,
    );
    expect(record?.title).toBe('session-5');
  });

  it('identifies scheduled task runs by routine name', () => {
    const record = parseClaudeTranscript([
      line({
        type: 'queue-operation',
        content: '<scheduled-task name="book-writer" file="/home/user/.claude/scheduled-tasks/book-writer/SKILL.md">',
      }),
      line({ type: 'user', sessionId: 'routine-run-1', cwd: '/repo/book', message: { content: 'Run it' } }),
    ].join('\n'), 'fallback', UPDATED_AT);

    expect(record).toMatchObject({
      id: 'routine-run-1',
      title: 'book-writer',
      routineName: 'book-writer',
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
