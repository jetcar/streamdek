import { describe, expect, it } from 'vitest';
import { cardTextLines, renderCard, titleLines } from '../src/render.js';

describe('titleLines', () => {
  it('wraps long titles into two small lines', () => {
    const [one, two] = titleLines('A very long session title');
    expect(one.length).toBeLessThanOrEqual(10);
    expect(two.length).toBeLessThanOrEqual(10);
    expect(two.endsWith('…')).toBe(true);
  });
});

describe('cardTextLines', () => {
  it('uses the second line for the latest response', () => {
    expect(cardTextLines({
      id: 'codex:1',
      title: 'streamdek',
      subtitle: 'Tests pass and release is ready',
      status: 'thinking',
      timestamp: Date.now(),
      target: { kind: 'url', value: 'codex://threads/1' },
      source: 'thread',
    })).toEqual(['streamdek', 'Tests pass…']);
  });
});

describe('renderCard', () => {
  it('produces a 72x72 RGB buffer', async () => {
    const buffer = await renderCard({
      id: 'thread:1',
      title: 'Test card',
      status: 'thinking',
      timestamp: Date.now(),
      target: { kind: 'url', value: 'codex://threads/1' },
      source: 'thread',
    }, 72);
    expect(buffer).toHaveLength(72 * 72 * 3);
  }, 20_000);

  it('renders update cards', async () => {
    const buffer = await renderCard({
      id: 'update:1.7.0',
      title: 'Update 1.7.0',
      subtitle: 'Open installer',
      status: 'update',
      timestamp: Date.now(),
      target: { kind: 'url', value: 'https://github.com/jetcar/streamdek/releases/tag/v1.7.0' },
      source: 'update',
    }, 72);
    expect(buffer).toHaveLength(72 * 72 * 3);
  }, 20_000);
});
