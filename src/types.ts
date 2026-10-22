export type CardStatus = 'asking' | 'thinking' | 'error' | 'scheduled' | 'done' | 'idle';

export interface ThreadRecord {
  id: string;
  title: string;
  updatedAt: number;
  turnStatus?: string;
  hasQuestions?: boolean;
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

export interface DeckCard {
  id: string;
  title: string;
  status: CardStatus;
  timestamp: number;
  targetUrl: string;
  source: 'thread' | 'automation';
}

export interface CodexSnapshot {
  threads: ThreadRecord[];
  automations: AutomationRecord[];
}
