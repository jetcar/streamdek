import { describe, expect, it, vi } from 'vitest';
import { isNewerVersion, UpdateChecker } from '../src/update.js';

describe('isNewerVersion', () => {
  it('compares stable semantic versions', () => {
    expect(isNewerVersion('v1.7.0', '1.6.2')).toBe(true);
    expect(isNewerVersion('1.6.2', '1.6.2')).toBe(false);
    expect(isNewerVersion('1.6.1', '1.6.2')).toBe(false);
    expect(isNewerVersion('not-a-version', '1.6.2')).toBe(false);
  });
});

describe('UpdateChecker', () => {
  it('returns a trusted release link when an update is available', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ tag_name: 'v1.7.0' }), { status: 200 }));
    const checker = new UpdateChecker('1.6.2', fetcher);

    await expect(checker.check(1_000)).resolves.toEqual({
      version: '1.7.0',
      url: 'https://github.com/jetcar/streamdek/releases/tag/v1.7.0',
    });
  });

  it('reuses the result until the check interval expires', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ tag_name: 'v1.7.0' }), { status: 200 }));
    const checker = new UpdateChecker('1.6.2', fetcher, 1_000);

    await checker.check(1_000);
    await checker.check(1_500);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects failed release checks without inventing an update', async () => {
    const checker = new UpdateChecker('1.6.2', async () => new Response('', { status: 503 }));
    await expect(checker.check(1_000)).rejects.toThrow('HTTP 503');
    expect(checker.available).toBeUndefined();
  });
});

