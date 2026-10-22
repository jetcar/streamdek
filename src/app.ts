import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CodexStateReader } from './codex-state.js';
import { DeckController } from './deck.js';
import { runtimeDirectory } from './platform.js';
import { buildCards } from './status.js';

const runtimeRoot = runtimeDirectory();
const logPath = join(runtimeRoot, 'streamdek.log');
const pidPath = join(runtimeRoot, 'streamdek.pid');
const pollMs = Number(process.env.STREAMDEK_POLL_MS ?? 2_000);
const staleHours = Number(process.env.STREAMDEK_STALE_HOURS ?? 24);

mkdirSync(runtimeRoot, { recursive: true });

function log(message: string, error?: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : error == null ? '' : String(error);
  const line = `${new Date().toISOString()} ${message}${detail ? ` — ${detail}` : ''}\n`;
  process.stdout.write(line);
  appendFileSync(logPath, line);
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

if (existsSync(pidPath)) {
  const existingPid = Number(readFileSync(pidPath, 'utf8').trim());
  if (Number.isInteger(existingPid) && existingPid !== process.pid && processExists(existingPid)) {
    log(`Already running as process ${existingPid}`);
    process.exit(0);
  }
}
writeFileSync(pidPath, String(process.pid));

const reader = new CodexStateReader();
const controller = new DeckController(log);
let stopping = false;
let lastError = '';
let lastErrorAt = 0;

function logThrottled(message: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  const key = `${message}:${detail}`;
  const now = Date.now();
  if (key !== lastError || now - lastErrorAt > 60_000) {
    log(message, error);
    lastError = key;
    lastErrorAt = now;
  }
}

async function tick(): Promise<void> {
  try {
    if (!controller.connected && !(await controller.connect())) {
      logThrottled('Waiting for a Stream Deck', 'No supported device found');
      return;
    }
    const snapshot = reader.read();
    const cards = buildCards(snapshot, { staleAfterMs: staleHours * 60 * 60 * 1_000, limit: 15 });
    await controller.display(cards);
    lastError = '';
  } catch (error) {
    logThrottled('Refresh failed', error);
    if (!controller.connected) await controller.close();
  }
}

async function loop(): Promise<void> {
  while (!stopping) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await controller.close();
  try {
    if (readFileSync(pidPath, 'utf8').trim() === String(process.pid)) rmSync(pidPath);
  } catch {
    // The runtime directory may already have been removed during uninstall.
  }
}

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
process.once('exit', () => {
  try {
    if (readFileSync(pidPath, 'utf8').trim() === String(process.pid)) rmSync(pidPath);
  } catch {
    // Nothing to clean up.
  }
});

log(`Streamdek started as process ${process.pid}`);
void loop().catch((error) => {
  log('Streamdek stopped unexpectedly', error);
  process.exitCode = 1;
});
