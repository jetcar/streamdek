import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { DeckCard } from '../src/types.js';
import { WifiServer } from '../src/wifi.js';

const card: DeckCard = {
  id: 'thread-1',
  title: 'streamdek',
  subtitle: 'Ready for review',
  status: 'done',
  timestamp: 123,
  target: { kind: 'url', value: 'chatgpt://codex/thread-1' },
  source: 'thread',
};

const servers: WifiServer[] = [];
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function fixture(onOpen: (value: DeckCard) => void = () => undefined): Promise<WifiServer> {
  const directory = mkdtempSync(join(tmpdir(), 'streamdek-wifi-'));
  directories.push(directory);
  const server = new WifiServer({
    tokenPath: join(directory, 'token'),
    token: 'test-token',
    pairingCode: '123456',
    host: '127.0.0.1',
    port: 0,
    log: () => undefined,
    openCard: onOpen,
  });
  servers.push(server);
  await server.start();
  return server;
}

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(JSON.parse(data.toString()) as Record<string, unknown>));
    socket.once('error', reject);
  });
}

describe('WifiServer', () => {
  it('pairs with the displayed code', async () => {
    const server = await fixture();
    const response = await fetch(`http://127.0.0.1:${server.port}/v1/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: 'test-token', protocolVersion: 1 });
  });

  it('streams public card data and opens a card on the desktop', async () => {
    let opened: DeckCard | undefined;
    const server = await fixture((value) => { opened = value; });
    server.publish([card]);
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/v1/cards`, {
      headers: { authorization: 'Bearer test-token' },
    });
    const snapshot = await nextMessage(socket);

    expect(snapshot).toEqual({
      type: 'snapshot',
      protocolVersion: 1,
      cards: [{
        id: 'thread-1',
        title: 'streamdek',
        subtitle: 'Ready for review',
        status: 'done',
        timestamp: 123,
        source: 'thread',
      }],
    });
    expect(JSON.stringify(snapshot)).not.toContain('chatgpt://');

    socket.send(JSON.stringify({ type: 'open', cardId: 'thread-1' }));
    expect(await nextMessage(socket)).toEqual({ type: 'opened', cardId: 'thread-1' });
    expect(opened).toEqual(card);
    socket.close();
  });
});
