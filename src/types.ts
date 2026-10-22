export type CardStatus = 'asking' | 'thinking' | 'error' | 'scheduled' | 'done' | 'idle';

export interface ThreadRecord {
  id: string;
  title: string;
  updatedAt: number;
  turnStatus?: string;
  hasQuestions?: boolean;
  provider?: 'codex' | 'claude';
}

export interface AutomationRecord {
  id: string;
  name: string;
  status: string;
  nextRunAt?: number;
  lastRunAt?: number;
  kind?: string;
  targetThreadId?: string;
  latestRunStatus?: string;
}

export type DeckTarget =
  | { kind: 'url'; value: string }
  | { kind: 'claude-session'; sessionId: string };

export interface DeckCard {
  id: string;
  title: string;
  status: CardStatus;
  timestamp: number;
  target: DeckTarget;
  source: 'thread' | 'automation' | 'claude';
}

export interface CodexSnapshot {
  threads: ThreadRecord[];
  automations: AutomationRecord[];
}
