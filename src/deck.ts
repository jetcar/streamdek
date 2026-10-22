import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node';
import type { StreamDeck } from '@elgato-stream-deck/core';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { renderBlank, renderCard } from './render.js';
import type { DeckCard } from './types.js';

export type Log = (message: string, error?: unknown) => void;

export class DeckController {
  private deck?: StreamDeck;
  private cards: DeckCard[] = [];
  private hashes: string[] = [];
  private disconnected = false;

  constructor(private readonly log: Log) {}

  get connected(): boolean {
    return this.deck != null && !this.disconnected;
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;
    if (this.deck) await this.close();
    const devices = await listStreamDecks();
    if (devices.length === 0) return false;

    const deck = await openStreamDeck(devices[0].path);
    this.deck = deck;
    this.disconnected = false;
    this.hashes = [];
    deck.on('down', (control) => {
      if (control.type !== 'button') return;
      const card = this.cards[control.index];
      if (card) openCodex(card.targetUrl, this.log);
    });
    deck.on('error', (error) => {
      this.disconnected = true;
      this.log('Stream Deck connection error', error);
    });
    await deck.setBrightness(55);
    this.log(`Connected to ${deck.modelInfo.name}`);
    return true;
  }

  async display(cards: DeckCard[]): Promise<void> {
    const deck = this.deck;
    if (!deck || this.disconnected) throw new Error('Stream Deck is disconnected');
    const buttons = deck.modelInfo.controls
      .filter((control) => control.type === 'button' && control.feedbackType === 'lcd')
      .sort((a, b) => a.index - b.index);
    this.cards = cards.slice(0, buttons.length);
    const now = Date.now();

    await Promise.all(buttons.map(async (button, position) => {
      const card = this.cards[position];
      const minute = Math.floor(now / 60_000);
      const hash = createHash('sha1').update(card ? `${card.id}|${card.status}|${card.title}|${card.timestamp}|${minute}` : 'blank').digest('hex');
      if (this.hashes[position] === hash) return;
      const image = card
        ? await renderCard(card, button.pixelSize.width, now)
        : await renderBlank(button.pixelSize.width);
      await deck.fillKeyBuffer(button.index, image, { format: 'rgb' });
      this.hashes[position] = hash;
    }));
  }

  async close(): Promise<void> {
    const deck = this.deck;
    this.deck = undefined;
    this.disconnected = true;
    if (deck) await deck.close().catch(() => undefined);
  }
}

function openCodex(url: string, log: Log): void {
  try {
    const child = spawn('explorer.exe', [url], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    log(`Opened ${url}`);
  } catch (error) {
    log(`Could not open ${url}`, error);
  }
}
