import type { AutomationRecord, CardStatus, CodexSnapshot, DeckCard, ThreadRecord } from './types.js';
import type { UpdateInfo } from './update.js';

export interface CardOptions {
  now?: number;
  staleAfterMs?: number;
  limit?: number;
  update?: UpdateInfo;
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
    subtitle: thread.subtitle,
    status: threadStatus(thread),
    timestamp: thread.updatedAt,
    target: provider === 'claude'
      ? { kind: 'claude-session', sessionId: thread.id }
      : { kind: 'url', value: `codex://threads/${encodeURIComponent(thread.id)}` },
    source: provider === 'claude' ? 'claude' : 'thread',
  };
}

function isActiveSession(card: DeckCard): boolean {
  return card.source !== 'automation' && (card.status === 'thinking' || card.status === 'asking');
}

export function stabilizeActiveCards(previous: DeckCard[], next: DeckCard[]): DeckCard[] {
  const systemIndex = next.findIndex((card) => card.source === 'automation' || card.source === 'update');
  const sessionCount = systemIndex < 0 ? next.length : systemIndex;
  const nextSessions = next.slice(0, sessionCount);
  const nextById = new Map(nextSessions.map((card) => [card.id, card]));
  const placed = new Set<string>();
  const stable = new Array<DeckCard | undefined>(sessionCount);

  previous.slice(0, sessionCount).forEach((card, index) => {
    const updated = nextById.get(card.id);
    if (updated && isActiveSession(card) && isActiveSession(updated)) {
      stable[index] = updated;
      placed.add(updated.id);
    }
  });

  const remaining = nextSessions.filter((card) => !placed.has(card.id));
  let remainingIndex = 0;
  for (let index = 0; index < stable.length; index += 1) {
    stable[index] ??= remaining[remainingIndex++];
  }

  return [...stable.filter((card): card is DeckCard => card != null), ...next.slice(sessionCount)];
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

function aggregateTaskStatus(root: ThreadRecord, members: ThreadRecord[]): Pick<ThreadRecord, 'turnStatus' | 'hasQuestions'> {
  if (members.some((thread) => thread.turnStatus === 'inProgress' && thread.hasQuestions)) {
    return { turnStatus: 'inProgress', hasQuestions: true };
  }
  if (members.some((thread) => thread.turnStatus === 'inProgress')) {
    return { turnStatus: 'inProgress', hasQuestions: false };
  }
  if (root.turnStatus) return { turnStatus: root.turnStatus, hasQuestions: root.hasQuestions };
  if (members.some((thread) => thread.turnStatus === 'failed')) {
    return { turnStatus: 'failed', hasQuestions: false };
  }
  if (members.some((thread) => thread.turnStatus === 'completed' || thread.turnStatus === 'interrupted')) {
    return { turnStatus: 'completed', hasQuestions: false };
  }
  return { turnStatus: undefined, hasQuestions: false };
}

export function aggregateCodexTaskTrees(threads: ThreadRecord[]): ThreadRecord[] {
  const codexById = new Map(
    threads.filter((thread) => thread.provider !== 'claude').map((thread) => [thread.id, thread]),
  );
  const groups = new Map<string, ThreadRecord[]>();
  const visible: ThreadRecord[] = [];

  for (const thread of threads) {
    if (thread.provider === 'claude') {
      visible.push(thread);
      continue;
    }
    if (!thread.parentId) {
      if (thread.threadSource !== 'subagent' && thread.threadSource !== 'guardian_review') {
        visible.push(thread);
        if (!groups.has(thread.id)) groups.set(thread.id, [thread]);
      }
      continue;
    }

    let current = thread;
    const visited = new Set([thread.id]);
    while (current.parentId) {
      const parent = codexById.get(current.parentId);
      if (!parent || visited.has(parent.id)) {
        current = thread;
        break;
      }
      visited.add(parent.id);
      current = parent;
    }
    if (current === thread || current.threadSource === 'subagent' || current.threadSource === 'guardian_review') continue;
    const members = groups.get(current.id) ?? [current];
    members.push(thread);
    groups.set(current.id, members);
  }

  return visible.map((thread) => {
    const members = groups.get(thread.id);
    if (!members || members.length === 1) return thread;
    return {
      ...thread,
      ...aggregateTaskStatus(thread, members),
      updatedAt: Math.max(...members.map((member) => member.updatedAt)),
    };
  });
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

function updateCard(update: UpdateInfo, now: number): DeckCard {
  return {
    id: `update:${update.version}`,
    title: `Update ${update.version}`,
    subtitle: 'Open installer',
    status: 'update',
    timestamp: now,
    target: { kind: 'url', value: update.url },
    source: 'update',
  };
}

export function buildCards(snapshot: CodexSnapshot, options: CardOptions = {}): DeckCard[] {
  const now = options.now ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? 24 * 60 * 60 * 1000;
  const limit = options.limit ?? 15;

  const threads = aggregateCodexTaskTrees(latestRoutineRuns(snapshot.threads))
    .filter((thread) => now - thread.updatedAt <= staleAfterMs)
    .map(threadCard)
    .sort((a, b) => b.timestamp - a.timestamp);

  const automations = snapshot.automations
    .filter((automation) => automation.status.toUpperCase() === 'ACTIVE')
    .map((automation) => automationCard(automation, now))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, Math.max(0, limit - (options.update ? 1 : 0)));

  const updates = options.update ? [updateCard(options.update, now)] : [];
  return [
    ...threads.slice(0, Math.max(0, limit - automations.length - updates.length)),
    ...updates,
    ...automations,
  ];
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
