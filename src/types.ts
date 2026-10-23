export type CardStatus = 'asking' | 'thinking' | 'error' | 'scheduled' | 'update' | 'done' | 'idle';

export interface ThreadRecord {
  id: string;
  title: string;
  subtitle?: string;
  updatedAt: number;
  turnStatus?: string;
  hasQuestions?: boolean;
  provider?: 'codex' | 'claude';
  routineName?: string;
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
  subtitle?: string;
  status: CardStatus;
  timestamp: number;
  target: DeckTarget;
  source: 'thread' | 'automation' | 'claude' | 'update';
}

export interface CodexSnapshot {
  threads: ThreadRecord[];
  automations: AutomationRecord[];
}
