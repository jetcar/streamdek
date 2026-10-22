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
  customTitle?: string;
  aiTitle?: string;
  agentName?: string;
  content?: string;
  message?: {
    role?: string;
    stop_reason?: string | null;
    content?: string | Array<{ type?: string; text?: string; name?: string }>;
  };
}

function cleanTitle(
  cwd: string | undefined,
  sessionName: string | undefined,
  routineName: string | undefined,
  id: string,
): string {
  if (routineName) return routineName;
  if (cwd) return basename(cwd);
  return sessionName?.trim().slice(0, 80) || id;
}

function scheduledTaskName(entry: ClaudeMessage): string | undefined {
  const messageContent = entry.message?.content;
  const content = [
    entry.content,
    typeof messageContent === 'string' ? messageContent : undefined,
    ...(Array.isArray(messageContent) ? messageContent.map((block) => block.text) : []),
  ].filter((value): value is string => value != null);
  for (const value of content) {
    const match = value.match(/<scheduled-task\b[^>]*\bname=(["'])([^"']+)\1/i);
    if (match?.[2]) return match[2].trim().slice(0, 80);
  }
  return undefined;
}

function responseText(entry: ClaudeMessage): string | undefined {
  const content = entry.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter((block) => block.type === 'text').map((block) => block.text).join(' ')
      : '';
  return text.replace(/\s+/g, ' ').trim() || undefined;
}

export function parseClaudeTranscript(content: string, fallbackId: string, updatedAt: number): ThreadRecord | undefined {
  let id = fallbackId;
  let cwd: string | undefined;
  let sessionName: string | undefined;
  let sessionNamePriority = 0;
  let routineName: string | undefined;
  let turnStatus: string | undefined;
  let hasQuestions = false;
  let subtitle: string | undefined;
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
    routineName ??= scheduledTaskName(entry);
    const named = entry.type === 'custom-title'
      ? { value: entry.customTitle, priority: 3 }
      : entry.type === 'ai-title'
        ? { value: entry.aiTitle, priority: 2 }
        : entry.type === 'agent-name'
          ? { value: entry.agentName, priority: 1 }
          : undefined;
    if (named?.value && named.priority >= sessionNamePriority) {
      sessionName = named.value;
      sessionNamePriority = named.priority;
    }
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    sawConversation = true;

    if (entry.type === 'user') {
      turnStatus = 'inProgress';
      hasQuestions = false;
      continue;
    }

    if (entry.isApiErrorMessage || entry.error) {
      turnStatus = 'failed';
      hasQuestions = false;
      continue;
    }

    subtitle = responseText(entry) ?? subtitle;
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
    title: cleanTitle(cwd, sessionName, routineName, id),
    subtitle,
    updatedAt,
    turnStatus,
    hasQuestions,
    provider: 'claude',
    routineName,
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

  read(updatedAfter = 0): ThreadRecord[] {
    return transcriptFiles(this.root)
      .map((path) => {
        const stat = statSync(path);
        if (stat.mtimeMs < updatedAfter) return undefined;
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
