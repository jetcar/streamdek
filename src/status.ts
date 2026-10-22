import type { AutomationRecord, CardStatus, CodexSnapshot, DeckCard, ThreadRecord } from './types.js';

const PRIORITY: Record<CardStatus, number> = {
  asking: 0,
  thinking: 1,
  error: 2,
  scheduled: 3,
  done: 4,
  idle: 5,
};

export interface CardOptions {
  now?: number;
  staleAfterMs?: number;
  limit?: number;
}

export function threadStatus(thread: ThreadRecord): CardStatus {
  if (thread.turnStatus === 'inProgress') return thread.hasQuestions ? 'asking' : 'thinking';
  if (thread.turnStatus === 'failed') return 'error';
  if (thread.turnStatus === 'completed' || thread.turnStatus === 'interrupted') return 'done';
  return 'idle';
}

function automationStatus(automation: AutomationRecord): CardStatus {
  const runStatus = automation.latestRunStatus?.toUpperCase();
  if (runStatus === 'RUNNING' || runStatus === 'IN_PROGRESS') return 'thinking';
  if (runStatus === 'FAILED' || runStatus === 'ERROR') return 'error';
  return 'scheduled';
}

function threadCard(thread: ThreadRecord): DeckCard {
  return {
    id: `thread:${thread.id}`,
    title: thread.title || 'Untitled task',
    status: threadStatus(thread),
    timestamp: thread.updatedAt,
    targetUrl: `codex://threads/${encodeURIComponent(thread.id)}`,
    source: 'thread',
  };
}

function automationCard(automation: AutomationRecord, now: number): DeckCard {
  const targetUrl = automation.targetThreadId
    ? `codex://threads/${encodeURIComponent(automation.targetThreadId)}`
    : 'codex://automations';

  return {
    id: `automation:${automation.id}`,
    title: automation.name || automation.id,
    status: automationStatus(automation),
    timestamp: automation.nextRunAt ?? automation.lastRunAt ?? now,
    targetUrl,
    source: 'automation',
  };
}

export function buildCards(snapshot: CodexSnapshot, options: CardOptions = {}): DeckCard[] {
  const now = options.now ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? 24 * 60 * 60 * 1000;
  const limit = options.limit ?? 15;

  const threads = snapshot.threads
    .filter((thread) => now - thread.updatedAt <= staleAfterMs)
    .map(threadCard);

  const automations = snapshot.automations
    .filter((automation) => automation.status.toUpperCase() === 'ACTIVE')
    .map((automation) => automationCard(automation, now));

  return [...threads, ...automations]
    .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const delta = timestamp - now;
  const absolute = Math.abs(delta);
  const future = delta > 0;
  if (absolute < 60_000) return future ? '<1m' : 'now';
  if (absolute < 3_600_000) return `${future ? '+' : ''}${Math.round(absolute / 60_000)}m`;
  if (absolute < 86_400_000) return `${future ? '+' : ''}${Math.round(absolute / 3_600_000)}h`;
  return `${future ? '+' : ''}${Math.round(absolute / 86_400_000)}d`;
}
