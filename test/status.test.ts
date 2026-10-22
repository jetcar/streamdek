import { describe, expect, it } from 'vitest';
import { buildCards, relativeTime, threadStatus } from '../src/status.js';
import type { CodexSnapshot, ThreadRecord } from '../src/types.js';

const NOW = Date.UTC(2026, 9, 22, 12, 0, 0);

function thread(overrides: Partial<ThreadRecord> = {}): ThreadRecord {
  return {
    id: 'thread-1',
    title: 'Task one',
    updatedAt: NOW,
    turnStatus: 'completed',
    ...overrides,
  };
}

describe('threadStatus', () => {
  it('distinguishes questions from other in-progress work', () => {
    expect(threadStatus(thread({ turnStatus: 'inProgress', hasQuestions: true }))).toBe('asking');
    expect(threadStatus(thread({ turnStatus: 'inProgress', hasQuestions: false }))).toBe('thinking');
  });

  it('maps terminal states', () => {
    expect(threadStatus(thread({ turnStatus: 'failed' }))).toBe('error');
    expect(threadStatus(thread({ turnStatus: 'completed' }))).toBe('done');
    expect(threadStatus(thread({ turnStatus: undefined }))).toBe('idle');
  });
});

describe('buildCards', () => {
  it('hides stale threads but retains active automations', () => {
    const snapshot: CodexSnapshot = {
      threads: [thread({ updatedAt: NOW - 25 * 60 * 60 * 1_000 })],
      automations: [{
        id: 'nightly',
        name: 'Nightly task',
        status: 'ACTIVE',
        nextRunAt: NOW + 60_000,
        targetThreadId: 'target-1',
      }],
    };
    const cards = buildCards(snapshot, { now: NOW });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ id: 'automation:nightly', status: 'scheduled' });
    expect(cards[0].target).toEqual({ kind: 'url', value: 'codex://threads/target-1' });
  });

  it('orders sessions by latest activity instead of status', () => {
    const snapshot: CodexSnapshot = {
      threads: [
        thread({ id: 'older-error', turnStatus: 'failed', updatedAt: NOW - 60_000 }),
        thread({ id: 'newest-done', turnStatus: 'completed', updatedAt: NOW }),
        thread({ id: 'oldest-thinking', turnStatus: 'inProgress', updatedAt: NOW - 120_000 }),
      ],
      automations: [],
    };
    expect(buildCards(snapshot, { now: NOW }).map((card) => card.id)).toEqual([
      'codex:newest-done', 'codex:older-error', 'codex:oldest-thinking',
    ]);
  });

  it('reserves the last buttons for active automations', () => {
    const snapshot: CodexSnapshot = {
      threads: [
        thread({ id: 'newest', updatedAt: NOW }),
        thread({ id: 'middle', updatedAt: NOW - 1_000 }),
        thread({ id: 'oldest', updatedAt: NOW - 2_000 }),
      ],
      automations: [{ id: 'auto', name: 'Auto', status: 'ACTIVE', nextRunAt: NOW + 60_000 }],
    };
    expect(buildCards(snapshot, { now: NOW, limit: 3 }).map((card) => card.id)).toEqual([
      'codex:newest', 'codex:middle', 'automation:auto',
    ]);
  });

  it('limits cards to the available keys', () => {
    const snapshot: CodexSnapshot = {
      threads: Array.from({ length: 20 }, (_, index) => thread({ id: String(index) })),
      automations: [],
    };
    expect(buildCards(snapshot, { now: NOW, limit: 15 })).toHaveLength(15);
  });

  it('creates resumable Claude Code cards', () => {
    const snapshot: CodexSnapshot = {
      threads: [thread({ id: 'claude-1', provider: 'claude', turnStatus: 'inProgress' })],
      automations: [],
    };
    expect(buildCards(snapshot, { now: NOW })[0]).toMatchObject({
      id: 'claude:claude-1',
      source: 'claude',
      status: 'thinking',
      target: { kind: 'claude-session', sessionId: 'claude-1' },
    });
  });

  it('groups Claude routine runs under the latest session', () => {
    const snapshot: CodexSnapshot = {
      threads: [
        thread({
          id: 'routine-old',
          title: 'nightly-build',
          provider: 'claude',
          routineName: 'nightly-build',
          turnStatus: 'failed',
          updatedAt: NOW - 60_000,
        }),
        thread({
          id: 'routine-latest',
          title: 'nightly-build',
          provider: 'claude',
          routineName: 'nightly-build',
          turnStatus: 'inProgress',
          updatedAt: NOW,
        }),
        thread({ id: 'ordinary', title: 'app', provider: 'claude', updatedAt: NOW - 1_000 }),
      ],
      automations: [],
    };

    const cards = buildCards(snapshot, { now: NOW });
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: 'claude-routine:nightly-build',
      title: 'nightly-build',
      status: 'thinking',
      target: { kind: 'claude-session', sessionId: 'routine-latest' },
    });
  });
});

describe('relativeTime', () => {
  it('formats past and future times compactly', () => {
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe('5m');
    expect(relativeTime(NOW + 2 * 3_600_000, NOW)).toBe('+2h');
  });
});
