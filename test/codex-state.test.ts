import { describe, expect, it } from 'vitest';
import {
  agentMessageDetails,
  codexParentThreadId,
  codexThreadSubtitle,
  codexThreadTitle,
} from '../src/codex-state.js';

describe('codexParentThreadId', () => {
  it('reads attached and spawned-agent parent links', () => {
    expect(codexParentThreadId({ attachedThreadParentId: 'attached-parent' })).toBe('attached-parent');
    expect(codexParentThreadId({
      source: JSON.stringify({
        subagent: { thread_spawn: { parent_thread_id: 'spawn-parent' } },
      }),
    })).toBe('spawn-parent');
  });

  it('ignores unrelated or invalid source metadata', () => {
    expect(codexParentThreadId({ source: 'vscode' })).toBeUndefined();
    expect(codexParentThreadId({ source: JSON.stringify({ subagent: { other: 'guardian' } }) })).toBeUndefined();
  });
});

describe('codexThreadTitle', () => {
  it('prefers the working folder over the saved session name and first prompt', () => {
    expect(codexThreadTitle({
      cwd: '\\\\?\\C:\\repo\\streamdek',
      name: 'Show agent sessions on Stream Deck',
      title: 'i have stream deck connected',
      preview: 'i have stream deck connected',
    })).toBe('streamdek');
  });

  it('uses the saved session name when the working folder is missing', () => {
    expect(codexThreadTitle({
      cwd: '',
      name: 'Show agent sessions on Stream Deck',
      title: 'i have stream deck connected',
      preview: 'i have stream deck connected',
    })).toBe('Show agent sessions on Stream Deck');
  });

  it('uses the existing title only when folder and session name are missing', () => {
    expect(codexThreadTitle({
      cwd: '',
      name: '',
      title: 'Fallback task title',
      preview: 'First prompt',
    })).toBe('Fallback task title');
  });
});

describe('codexThreadSubtitle', () => {
  it('uses the saved session label and falls back to the first prompt', () => {
    expect(codexThreadSubtitle({
      name: 'Show agent sessions on Stream Deck',
      title: 'i have stream deck connected',
      preview: 'i have stream deck connected',
    })).toBe('Show agent sessions on Stream Deck');
    expect(codexThreadSubtitle({ name: '', title: '', preview: 'First prompt' })).toBe('First prompt');
  });
});

describe('agentMessageDetails', () => {
  it('extracts the last response text and pending questions', () => {
    expect(agentMessageDetails(JSON.stringify({
      type: 'agentMessage',
      text: 'Tests pass and the release is ready.',
      questions: [{ id: 'confirm' }],
    }))).toEqual({
      hasQuestions: true,
      response: 'Tests pass and the release is ready.',
    });
  });
});
