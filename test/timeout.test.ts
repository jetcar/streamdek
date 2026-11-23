import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../src/timeout.js';

afterEach(() => vi.useRealTimers());

describe('withTimeout', () => {
  it('returns an operation that finishes before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('done'), 100, 'stalled')).resolves.toBe('done');
  });

  it('rejects a stalled operation at the deadline', async () => {
    vi.useFakeTimers();
    const result = withTimeout(new Promise<never>(() => undefined), 30_000, 'refresh stalled');
    const assertion = expect(result).rejects.toThrow('refresh stalled');
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });
});
