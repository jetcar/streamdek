import { describe, expect, it } from 'vitest';
import { codexDirectory, opener, runtimeDirectory } from '../src/platform.js';

describe('runtimeDirectory', () => {
  it('uses the native state location on every supported platform', () => {
    expect(runtimeDirectory('win32', { LOCALAPPDATA: 'C:\\Local' }, 'C:\\Users\\me')).toBe('C:\\Local\\streamdek');
    expect(runtimeDirectory('darwin', {}, '/Users/me')).toBe('/Users/me/Library/Application Support/streamdek');
    expect(runtimeDirectory('linux', {}, '/home/me')).toBe('/home/me/.local/state/streamdek');
    expect(runtimeDirectory('linux', { XDG_STATE_HOME: '/state' }, '/home/me')).toBe('/state/streamdek');
  });

  it('honours an absolute explicit state directory', () => {
    expect(runtimeDirectory('linux', { STREAMDEK_STATE_DIR: '/srv/streamdek' }, '/home/me')).toBe('/srv/streamdek');
  });
});

describe('codexDirectory', () => {
  it('honours CODEX_HOME and falls back to the home directory', () => {
    expect(codexDirectory({ CODEX_HOME: '/opt/codex' }, '/home/me', 'linux')).toBe('/opt/codex');
    expect(codexDirectory({}, '/home/me', 'linux')).toBe('/home/me/.codex');
  });
});

describe('opener', () => {
  it.each([
    ['win32', 'explorer.exe'],
    ['darwin', 'open'],
    ['linux', 'xdg-open'],
  ])('uses the native URL opener on %s', (platform, command) => {
    expect(opener(platform).command).toBe(command);
  });

  it('rejects unsupported platforms', () => {
    expect(() => opener('aix')).toThrow('Unsupported platform');
  });
});
