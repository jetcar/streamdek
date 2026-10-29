import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { hostname } from 'node:os';
import { dirname } from 'node:path';
import { Bonjour, type Service } from 'bonjour-service';
import { WebSocket, WebSocketServer } from 'ws';
import type { Log } from './deck.js';
import type { DeckCard } from './types.js';

export const WIFI_PROTOCOL_VERSION = 1;
const WEB_APP = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

export interface WifiCard {
  id: string;
  title: string;
  subtitle?: string;
  status: DeckCard['status'];
  timestamp: number;
  source: DeckCard['source'];
}

interface WifiServerOptions {
  tokenPath: string;
  openCard: (card: DeckCard) => void;
  log: Log;
  host?: string;
  port?: number;
  pairingCode?: string;
  token?: string;
  advertise?: boolean;
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function publicCard(card: DeckCard): WifiCard {
  return {
    id: card.id,
    title: card.title,
    ...(card.subtitle ? { subtitle: card.subtitle } : {}),
    status: card.status,
    timestamp: card.timestamp,
    source: card.source,
  };
}

function sameSecret(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

function readOrCreateToken(path: string): string {
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const token = randomBytes(32).toString('base64url');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${token}\n`, { encoding: 'utf8', mode: 0o600 });
  return token;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 4_096) throw new Error('Request body is too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export class WifiServer {
  private readonly host: string;
  private readonly requestedPort: number;
  private readonly token: string;
  private readonly code: string;
  private readonly webSockets = new WebSocketServer({ noServer: true });
  private readonly http: Server;
  private bonjour?: Bonjour;
  private service?: Service;
  private cards: DeckCard[] = [];
  private digest = '';
  private readonly pairingAttempts = new Map<string, { startedAt: number; count: number }>();

  constructor(private readonly options: WifiServerOptions) {
    this.host = options.host ?? '0.0.0.0';
    this.requestedPort = options.port ?? 8_910;
    this.token = options.token ?? readOrCreateToken(options.tokenPath);
    this.code = options.pairingCode ?? String(randomInt(100_000, 1_000_000));
    this.http = createServer((request, response) => void this.handleHttp(request, response));
    this.http.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname !== '/v1/cards' || !this.authorized(request, url)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      this.webSockets.handleUpgrade(request, socket, head, (client) => {
        this.webSockets.emit('connection', client, request);
      });
    });
    this.webSockets.on('connection', (client) => {
      this.sendSnapshot(client);
      client.on('message', (data) => this.handleMessage(client, data.toString()));
    });
  }

  get pairingCode(): string {
    return this.code;
  }

  get port(): number {
    const address = this.http.address();
    return address && typeof address === 'object' ? address.port : this.requestedPort;
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.http.once('error', reject);
      this.http.listen(this.requestedPort, this.host, () => {
        this.http.off('error', reject);
        resolve();
      });
    });
    if (this.options.advertise !== false) {
      this.bonjour = new Bonjour(undefined, (error: unknown) => this.options.log('Wi-Fi discovery error', error));
      this.service = this.bonjour.publish({
        name: `Streamdek on ${hostname()}`,
        type: 'streamdek',
        port: this.port,
        txt: { protocol: String(WIFI_PROTOCOL_VERSION) },
      });
    }
    this.options.log(`Wi-Fi display listening on port ${this.port}; web display http://${hostname()}:${this.port}; pairing code ${this.code}`);
  }

  publish(cards: DeckCard[]): void {
    this.cards = cards;
    const nextDigest = JSON.stringify(cards.map(publicCard));
    if (nextDigest === this.digest) return;
    this.digest = nextDigest;
    for (const client of this.webSockets.clients) this.sendSnapshot(client);
  }

  async close(): Promise<void> {
    if (this.service) await new Promise<void>((resolve) => this.service?.stop(() => resolve()));
    this.bonjour?.destroy();
    this.service = undefined;
    this.bonjour = undefined;
    for (const client of this.webSockets.clients) client.close(1001, 'Server stopping');
    this.webSockets.close();
    if (!this.http.listening) return;
    await new Promise<void>((resolve, reject) => {
      this.http.close((error) => error ? reject(error) : resolve());
    });
  }

  private authorized(request: IncomingMessage, url: URL): boolean {
    const header = request.headers.authorization ?? '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const queryToken = url.searchParams.get('token') ?? '';
    return (bearer !== '' && sameSecret(bearer, this.token))
      || (queryToken !== '' && sameSecret(queryToken, this.token));
  }

  private async handleHttp(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-length': Buffer.byteLength(WEB_APP),
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        'x-content-type-options': 'nosniff',
      });
      response.end(WEB_APP);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/v1/info') {
      json(response, 200, {
        service: 'streamdek',
        name: hostname(),
        protocolVersion: WIFI_PROTOCOL_VERSION,
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/v1/pair') {
      if (!this.allowPairing(request)) {
        json(response, 429, { error: 'Too many pairing attempts' });
        return;
      }
      try {
        const body = await readBody(request) as { code?: unknown };
        if (typeof body.code !== 'string' || !sameSecret(body.code, this.code)) {
          json(response, 401, { error: 'Invalid pairing code' });
          return;
        }
        this.pairingAttempts.delete(request.socket.remoteAddress ?? 'unknown');
        json(response, 200, { token: this.token, protocolVersion: WIFI_PROTOCOL_VERSION });
      } catch {
        json(response, 400, { error: 'Invalid JSON body' });
      }
      return;
    }
    json(response, 404, { error: 'Not found' });
  }

  private allowPairing(request: IncomingMessage): boolean {
    const key = request.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const previous = this.pairingAttempts.get(key);
    const attempt = !previous || now - previous.startedAt >= 60_000
      ? { startedAt: now, count: 1 }
      : { startedAt: previous.startedAt, count: previous.count + 1 };
    this.pairingAttempts.set(key, attempt);
    return attempt.count <= 10;
  }

  private sendSnapshot(client: WebSocket): void {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify({
      type: 'snapshot',
      protocolVersion: WIFI_PROTOCOL_VERSION,
      cards: this.cards.map(publicCard),
    }));
  }

  private handleMessage(client: WebSocket, raw: string): void {
    try {
      const message = JSON.parse(raw) as { type?: unknown; cardId?: unknown };
      if (message.type !== 'open' || typeof message.cardId !== 'string') throw new Error('Invalid message');
      const card = this.cards.find((item) => item.id === message.cardId);
      if (!card) throw new Error('Card is no longer available');
      this.options.openCard(card);
      client.send(JSON.stringify({ type: 'opened', cardId: card.id }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Invalid message';
      client.send(JSON.stringify({ type: 'error', error: detail }));
    }
  }
}
