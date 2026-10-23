import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CodexStateReader } from './codex-state.js';
import { ClaudeStateReader } from './claude-state.js';
import { DeckController } from './deck.js';
import { openDeckTarget, runtimeDirectory } from './platform.js';
import { buildCards, stabilizeActiveCards } from './status.js';
import type { DeckCard } from './types.js';
import { WifiServer } from './wifi.js';

const runtimeRoot = runtimeDirectory();
const logPath = join(runtimeRoot, 'streamdek.log');
const pidPath = join(runtimeRoot, 'streamdek.pid');
const pollMs = Number(process.env.STREAMDEK_POLL_MS ?? 2_000);
const staleHours = Number(process.env.STREAMDEK_STALE_HOURS ?? 24);
const wifiPort = Number(process.env.STREAMDEK_WIFI_PORT ?? 8_910);

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
const claudeReader = new ClaudeStateReader();
const controller = new DeckController(log);
const wifi = new WifiServer({
  tokenPath: join(runtimeRoot, 'wifi-token'),
  port: wifiPort,
  log,
  openCard: (card) => openDeckTarget(card.target, log),
});
let stopping = false;
let lastError = '';
let lastErrorAt = 0;
let wifiCards: DeckCard[] = [];

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
  let deckAvailable = controller.connected;
  try {
    if (!deckAvailable) deckAvailable = await controller.connect();
    if (!deckAvailable) {
      logThrottled('Waiting for a Stream Deck', 'No supported device found');
    }
  } catch (error) {
    logThrottled('Stream Deck connection failed', error);
  }

  try {
    const snapshot = reader.read();
    snapshot.threads.push(...claudeReader.read(Date.now() - staleHours * 60 * 60 * 1_000));
    const cardOptions = { staleAfterMs: staleHours * 60 * 60 * 1_000 };
    const deckCards = buildCards(snapshot, { ...cardOptions, limit: 15 });
    wifiCards = stabilizeActiveCards(wifiCards, buildCards(snapshot, { ...cardOptions, limit: 100 }));
    wifi.publish(wifiCards);
    if (deckAvailable) await controller.display(deckCards);
    if (deckAvailable) lastError = '';
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
  await Promise.all([controller.close(), wifi.close()]);
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

async function start(): Promise<void> {
  log(`Streamdek started as process ${process.pid}`);
  await wifi.start();
  await loop();
}

void start().catch((error) => {
  log('Streamdek stopped unexpectedly', error);
  process.exitCode = 1;
});
