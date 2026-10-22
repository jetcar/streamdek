import { DatabaseSync } from 'node:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AutomationRecord, CodexSnapshot, ThreadRecord } from './types.js';

interface Paths {
  state: string;
  history: string;
  automations: string;
}

interface SqlRow {
  [key: string]: unknown;
}

function defaultPaths(): Paths {
  const root = join(homedir(), '.codex');
  return {
    state: join(root, 'state_5.sqlite'),
    history: join(root, 'thread_history_1.sqlite'),
    automations: join(root, 'sqlite', 'codex-dev.db'),
  };
}

function withDatabase<T>(path: string, fn: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(path, { readOnly: true, timeout: 1_000 });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function secondsToMs(value: unknown): number {
  return Number(value ?? 0) * 1_000;
}

function millis(value: unknown): number | undefined {
  return value == null ? undefined : Number(value);
}

function latestTurns(path: string): Map<string, { status: string; turnId: string }> {
  return withDatabase(path, (db) => {
    const rows = db.prepare(`
      SELECT turn_id, thread_id, status
      FROM (
        SELECT turn_id, thread_id, status,
          ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY rollout_ordinal DESC) AS row_number
        FROM thread_turns
      )
      WHERE row_number = 1
    `).all() as SqlRow[];

    return new Map(rows.map((row) => [String(row.thread_id), {
      status: String(row.status),
      turnId: String(row.turn_id),
    }]));
  });
}

function turnsWithQuestions(path: string, turnIds: string[]): Set<string> {
  if (turnIds.length === 0) return new Set();
  return withDatabase(path, (db) => {
    const statement = db.prepare(`
      SELECT item_json
      FROM thread_items
      WHERE turn_id = ? AND item_type = 'agentMessage'
      ORDER BY rollout_ordinal DESC
      LIMIT 1
    `);
    const asking = new Set<string>();
    for (const turnId of turnIds) {
      const row = statement.get(turnId) as SqlRow | undefined;
      if (!row?.item_json) continue;
      try {
        const item = JSON.parse(String(row.item_json)) as { questions?: unknown[] };
        if (Array.isArray(item.questions) && item.questions.length > 0) asking.add(turnId);
      } catch {
        // Ignore a partially written or unfamiliar item.
      }
    }
    return asking;
  });
}

function readThreads(paths: Paths): ThreadRecord[] {
  const turns = latestTurns(paths.history);
  const askingTurns = turnsWithQuestions(
    paths.history,
    [...turns.values()].filter((turn) => turn.status === 'inProgress').map((turn) => turn.turnId),
  );

  return withDatabase(paths.state, (db) => {
    const rows = db.prepare(`
      SELECT id, COALESCE(NULLIF(title, ''), NULLIF(name, ''), NULLIF(preview, ''), 'Untitled task') AS title,
        updated_at
      FROM threads
      WHERE archived = 0
      ORDER BY updated_at DESC
      LIMIT 200
    `).all() as SqlRow[];

    return rows.map((row) => {
      const id = String(row.id);
      const turn = turns.get(id);
      return {
        id,
        title: String(row.title),
        updatedAt: secondsToMs(row.updated_at),
        turnStatus: turn?.status,
        hasQuestions: turn ? askingTurns.has(turn.turnId) : false,
      };
    });
  });
}

function readAutomations(path: string): AutomationRecord[] {
  return withDatabase(path, (db) => {
    const automations = db.prepare(`
      SELECT id, name, status, next_run_at, last_run_at, kind, target_thread_id
      FROM automations
    `).all() as SqlRow[];
    const runs = db.prepare(`
      SELECT automation_id, status, updated_at
      FROM automation_runs
      ORDER BY updated_at DESC
    `).all() as SqlRow[];
    const latestRun = new Map<string, string>();
    for (const run of runs) {
      const id = String(run.automation_id);
      if (!latestRun.has(id)) latestRun.set(id, String(run.status));
    }

    return automations.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      status: String(row.status),
      nextRunAt: millis(row.next_run_at),
      lastRunAt: millis(row.last_run_at),
      kind: row.kind == null ? undefined : String(row.kind),
      targetThreadId: row.target_thread_id == null ? undefined : String(row.target_thread_id),
      latestRunStatus: latestRun.get(String(row.id)),
    }));
  });
}

export class CodexStateReader {
  readonly paths: Paths;

  constructor(paths: Partial<Paths> = {}) {
    this.paths = { ...defaultPaths(), ...paths };
  }

  read(): CodexSnapshot {
    return {
      threads: readThreads(this.paths),
      automations: readAutomations(this.paths.automations),
    };
  }
}
