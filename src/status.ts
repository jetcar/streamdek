import type { AutomationRecord, CardStatus, CodexSnapshot, DeckCard, ThreadRecord } from './types.js';

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
  const provider = thread.provider ?? 'codex';
  return {
    id: provider === 'claude' && thread.routineName
      ? `claude-routine:${thread.routineName}`
      : `${provider}:${thread.id}`,
    title: thread.title || 'Untitled task',
    status: threadStatus(thread),
    timestamp: thread.updatedAt,
    target: provider === 'claude'
      ? { kind: 'claude-session', sessionId: thread.id }
      : { kind: 'url', value: `codex://threads/${encodeURIComponent(thread.id)}` },
    source: provider === 'claude' ? 'claude' : 'thread',
  };
}

function latestRoutineRuns(threads: ThreadRecord[]): ThreadRecord[] {
  const ordinary: ThreadRecord[] = [];
  const routines = new Map<string, ThreadRecord>();
  for (const thread of threads) {
    if (thread.provider !== 'claude' || !thread.routineName) {
      ordinary.push(thread);
      continue;
    }
    const current = routines.get(thread.routineName);
    if (!current || thread.updatedAt > current.updatedAt) routines.set(thread.routineName, thread);
  }
  return [...ordinary, ...routines.values()];
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
    target: { kind: 'url', value: targetUrl },
    source: 'automation',
  };
}

export function buildCards(snapshot: CodexSnapshot, options: CardOptions = {}): DeckCard[] {
  const now = options.now ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? 24 * 60 * 60 * 1000;
  const limit = options.limit ?? 15;

  const threads = latestRoutineRuns(snapshot.threads)
    .filter((thread) => now - thread.updatedAt <= staleAfterMs)
    .map(threadCard)
    .sort((a, b) => b.timestamp - a.timestamp);

  const automations = snapshot.automations
    .filter((automation) => automation.status.toUpperCase() === 'ACTIVE')
    .map((automation) => automationCard(automation, now))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, limit);

  return [...threads.slice(0, Math.max(0, limit - automations.length)), ...automations];
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
