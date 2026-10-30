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

async function fixture(
  onOpen: (value: DeckCard) => void = () => undefined,
  onRequest: (deviceName: string, approvalUrl: string) => void = () => undefined,
  trustLoopback = false,
  onApprove: (value: DeckCard) => void = () => undefined,
): Promise<WifiServer> {
  const directory = mkdtempSync(join(tmpdir(), 'streamdek-wifi-'));
  directories.push(directory);
  const server = new WifiServer({
    tokenPath: join(directory, 'token'),
    token: 'test-token',
    pairingCode: '123456',
    host: '127.0.0.1',
    port: 0,
    advertise: false,
    log: () => undefined,
    openCard: onOpen,
    approveCard: onApprove,
    requestApproval: onRequest,
    trustLoopback,
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
  it('serves the responsive browser display', async () => {
    const server = await fixture();
    const response = await fetch(`http://127.0.0.1:${server.port}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('content-security-policy')).toContain("connect-src 'self' ws: wss:");
    expect(body).toContain('<title>Streamdek</title>');
    expect(body).toContain('viewport-fit=cover');
    expect(body).toContain('Request access');
    expect(body).not.toContain('Enter the six-digit code');
  });

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

  it('automatically approves a display opened on the same computer', async () => {
    const server = await fixture(() => undefined, () => undefined, true);
    const requested = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceName: 'Local browser' }),
    });
    const request = await requested.json() as { requestId: string };
    const granted = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests/${request.requestId}`);

    expect(granted.status).toBe(200);
    expect(await granted.json()).toEqual({ status: 'approved', token: 'test-token', protocolVersion: 1 });
  });

  it('grants browser access after approval on the desktop', async () => {
    let approvalUrl = '';
    const server = await fixture(undefined, (deviceName, url) => {
      expect(deviceName).toBe('Office tablet');
      approvalUrl = url;
    });
    const requested = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceName: 'Office tablet' }),
    });
    const request = await requested.json() as { requestId: string };

    expect(requested.status).toBe(202);
    expect(approvalUrl).toContain(`id=${request.requestId}`);
    const pending = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests/${request.requestId}`);
    expect(pending.status).toBe(202);
    expect(await pending.json()).toEqual({ status: 'pending' });

    const approvalPage = await fetch(approvalUrl);
    expect(await approvalPage.text()).toContain('Office tablet');
    const approved = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests/${request.requestId}/approve`, { method: 'POST' });
    expect(approved.status).toBe(200);

    const granted = await fetch(`http://127.0.0.1:${server.port}/v1/access-requests/${request.requestId}`);
    expect(granted.status).toBe(200);
    expect(await granted.json()).toEqual({ status: 'approved', token: 'test-token', protocolVersion: 1 });
  });

  it('rate limits invalid pairing attempts', async () => {
    const server = await fixture();
    let status = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      status = (await fetch(`http://127.0.0.1:${server.port}/v1/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: '000000' }),
      })).status;
    }
    expect(status).toBe(429);
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

  it('accepts a paired browser WebSocket token in the URL', async () => {
    const server = await fixture();
    server.publish([card]);
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/v1/cards?token=test-token`);

    const message = await nextMessage(socket);
    expect(message.type).toBe('snapshot');
    expect(message.cards).toEqual([{
      id: 'thread-1',
      title: 'streamdek',
      subtitle: 'Ready for review',
      status: 'done',
      timestamp: 123,
      source: 'thread',
    }]);
    socket.close();
  });

  it('allows an authenticated browser to approve only an asking card', async () => {
    let approved: DeckCard | undefined;
    const server = await fixture(() => undefined, () => undefined, false, (value) => { approved = value; });
    const asking = { ...card, status: 'asking' as const };
    server.publish([asking]);
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/v1/cards?token=test-token`);
    await nextMessage(socket);

    socket.send(JSON.stringify({ type: 'approve', cardId: asking.id }));
    expect(await nextMessage(socket)).toEqual({ type: 'approved', cardId: asking.id });
    expect(approved).toEqual(asking);
    socket.close();
  });
});
