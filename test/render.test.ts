import { describe, expect, it } from 'vitest';
import { renderCard, titleLines } from '../src/render.js';

describe('titleLines', () => {
  it('wraps long titles into two small lines', () => {
    const [one, two] = titleLines('A very long session title');
    expect(one.length).toBeLessThanOrEqual(10);
    expect(two.length).toBeLessThanOrEqual(10);
    expect(two.endsWith('…')).toBe(true);
  });
});

describe('renderCard', () => {
  it('produces a 72x72 RGB buffer', async () => {
    const buffer = await renderCard({
      id: 'thread:1',
      title: 'Test card',
      status: 'thinking',
      timestamp: Date.now(),
      targetUrl: 'codex://threads/1',
      source: 'thread',
    }, 72);
    expect(buffer).toHaveLength(72 * 72 * 3);
  }, 20_000);
});
