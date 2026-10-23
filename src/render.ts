import sharp from 'sharp';
import { relativeTime } from './status.js';
import type { CardStatus, DeckCard } from './types.js';

const THEME: Record<CardStatus, { background: string; accent: string; label: string }> = {
  asking: { background: '#35101d', accent: '#ff4d83', label: 'ASKING' },
  thinking: { background: '#10243a', accent: '#48a8ff', label: 'WORKING' },
  error: { background: '#351010', accent: '#ff5147', label: 'ERROR' },
  scheduled: { background: '#26153a', accent: '#b981ff', label: 'SCHEDULED' },
  update: { background: '#39290d', accent: '#ffb52e', label: 'UPDATE' },
  done: { background: '#112d22', accent: '#46d68c', label: 'DONE' },
  idle: { background: '#1e2228', accent: '#929aa5', label: 'IDLE' },
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character);
}

export function titleLines(title: string, maxChars = 10): [string, string] {
  const clean = title.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean, ''];

  const words = clean.split(' ');
  const lines: string[] = ['', ''];
  let line = 0;
  for (const word of words) {
    const candidate = `${lines[line]} ${word}`.trim();
    if (candidate.length <= maxChars || lines[line].length === 0) {
      lines[line] = candidate.slice(0, maxChars);
    } else if (line === 0) {
      line = 1;
      lines[line] = word.slice(0, maxChars);
    } else {
      lines[line] = `${lines[line].slice(0, Math.max(0, maxChars - 1))}…`;
      break;
    }
  }
  if (clean.length > lines.join(' ').length && !lines[1].endsWith('…')) {
    lines[1] = `${lines[1].slice(0, Math.max(0, maxChars - 1))}…`;
  }
  return [lines[0], lines[1]];
}

function compactLine(value: string, maxChars: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1).trimEnd()}…`;
}

export function cardTextLines(card: DeckCard): [string, string] {
  return card.subtitle
    ? [compactLine(card.title, 10), compactLine(card.subtitle, 12)]
    : titleLines(card.title);
}

export async function renderCard(card: DeckCard, size: number, now = Date.now()): Promise<Buffer> {
  const theme = THEME[card.status];
  const [lineOne, lineTwo] = cardTextLines(card);
  const svg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" rx="7" fill="${theme.background}"/>
      <rect x="0" y="0" width="72" height="5" rx="2" fill="${theme.accent}"/>
      <text x="5" y="17" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="7" font-weight="700">${theme.label}</text>
      <text x="5" y="34" fill="#ffffff" font-family="Arial, sans-serif" font-size="10" font-weight="700">${escapeXml(lineOne)}</text>
      <text x="5" y="46" fill="${card.subtitle ? '#c7d0da' : '#ffffff'}" font-family="Arial, sans-serif" font-size="${card.subtitle ? '7' : '10'}" font-weight="${card.subtitle ? '400' : '700'}">${escapeXml(lineTwo)}</text>
      <text x="5" y="64" fill="#aeb8c4" font-family="Arial, sans-serif" font-size="8">${card.source === 'automation' ? 'AUTO ' : card.source === 'claude' ? 'CLAUDE ' : card.source === 'update' ? 'RELEASE ' : ''}${relativeTime(card.timestamp, now)}</text>
    </svg>
  `);

  return sharp(svg).resize(size, size).flatten({ background: '#000000' }).raw().toBuffer();
}

export async function renderBlank(size: number): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: '#000000' } }).raw().toBuffer();
}
