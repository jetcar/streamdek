import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { claudeDirectory } from './platform.js';
import type { ThreadRecord } from './types.js';

interface ClaudeMessage {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  error?: unknown;
  isApiErrorMessage?: boolean;
  message?: {
    role?: string;
    stop_reason?: string | null;
    content?: string | Array<{ type?: string; text?: string; name?: string }>;
  };
}

function textContent(message: ClaudeMessage): string | undefined {
  const content = message.message?.content;
  if (typeof content === 'string') return content;
  return content?.find((item) => item.type === 'text' && item.text)?.text;
}

function cleanTitle(value: string | undefined, cwd: string | undefined): string {
  const firstLine = value
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (firstLine) return firstLine.slice(0, 80);
  return cwd ? basename(cwd) : 'Claude Code session';
}

export function parseClaudeTranscript(content: string, fallbackId: string, updatedAt: number): ThreadRecord | undefined {
  let id = fallbackId;
  let cwd: string | undefined;
  let title: string | undefined;
  let turnStatus: string | undefined;
  let hasQuestions = false;
  let sawConversation = false;

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let entry: ClaudeMessage;
    try {
      entry = JSON.parse(line) as ClaudeMessage;
    } catch {
      continue;
    }

    if (entry.sessionId) id = entry.sessionId;
    if (entry.cwd) cwd = entry.cwd;
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    sawConversation = true;

    if (entry.type === 'user') {
      const value = textContent(entry);
      if (!title && value) title = value;
      turnStatus = 'inProgress';
      hasQuestions = false;
      continue;
    }

    if (entry.isApiErrorMessage || entry.error) {
      turnStatus = 'failed';
      hasQuestions = false;
      continue;
    }

    const blocks = Array.isArray(entry.message?.content) ? entry.message.content : [];
    const tools = blocks.filter((item) => item.type === 'tool_use');
    if (tools.length > 0) {
      turnStatus = 'inProgress';
      hasQuestions = tools.some((item) => item.name === 'AskUserQuestion' || item.name === 'ExitPlanMode');
    } else if (entry.message?.stop_reason) {
      turnStatus = 'completed';
      hasQuestions = false;
    } else {
      turnStatus = 'inProgress';
      hasQuestions = false;
    }
  }

  if (!sawConversation) return undefined;
  return {
    id,
    title: cleanTitle(title, cwd),
    updatedAt,
    turnStatus,
    hasQuestions,
    provider: 'claude',
  };
}

function transcriptFiles(root: string): string[] {
  const projects = join(root, 'projects');
  if (!existsSync(projects)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'subagents') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
    }
  };
  visit(projects);
  return files;
}

export class ClaudeStateReader {
  private readonly cache = new Map<string, { signature: string; record?: ThreadRecord }>();

  constructor(readonly root = claudeDirectory()) {}

  read(): ThreadRecord[] {
    return transcriptFiles(this.root)
      .map((path) => {
        const stat = statSync(path);
        const signature = `${stat.size}:${stat.mtimeMs}`;
        const cached = this.cache.get(path);
        if (cached?.signature === signature) return cached.record;
        const record = parseClaudeTranscript(readFileSync(path, 'utf8'), basename(path, '.jsonl'), stat.mtimeMs);
        this.cache.set(path, { signature, record });
        return record;
      })
      .filter((record): record is ThreadRecord => record != null);
  }
}
