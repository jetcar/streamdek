import { describe, expect, it } from 'vitest';
import { claudeDirectory, claudeLauncher, codexDirectory, notificationCommand, opener, runtimeDirectory } from '../src/platform.js';

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

describe('claudeDirectory', () => {
  it('honours CLAUDE_CONFIG_DIR and falls back to the home directory', () => {
    expect(claudeDirectory({ CLAUDE_CONFIG_DIR: '/opt/claude' }, '/home/me', 'linux')).toBe('/opt/claude');
    expect(claudeDirectory({}, '/home/me', 'linux')).toBe('/home/me/.claude');
  });
});

describe('opener', () => {
  it.each([
    ['win32', 'rundll32.exe'],
    ['darwin', 'open'],
    ['linux', 'xdg-open'],
  ])('uses the native URL opener on %s', (platform, command) => {
    expect(opener(platform).command).toBe(command);
  });

  it('uses the Windows URL protocol handler rather than opening Explorer', () => {
    expect(opener('win32').args('http://127.0.0.1:8910/approve?id=test')).toEqual([
      'url.dll,FileProtocolHandler',
      'http://127.0.0.1:8910/approve?id=test',
    ]);
  });

  it('rejects unsupported platforms', () => {
    expect(() => opener('aix')).toThrow('Unsupported platform');
  });
});

describe('notificationCommand', () => {
  it('uses native notification tools without interpolating the device name on macOS and Linux', () => {
    expect(notificationCommand('Office tablet', 'darwin')).toEqual({
      command: 'osascript',
      args: ['-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title "Streamdek"', '-e', 'end run', 'Office tablet'],
    });
    expect(notificationCommand('Office tablet', 'linux')).toEqual({ command: 'notify-send', args: ['Streamdek', 'Office tablet'] });
  });

  it('encodes notification text passed to PowerShell', () => {
    const selected = notificationCommand("Tablet'; exit", 'win32');
    expect(selected.command).toBe('powershell.exe');
    expect(selected.args.join(' ')).not.toContain("Tablet'; exit");
  });
});

describe('claudeLauncher', () => {
  it.each([
    ['win32', 'cmd.exe'],
    ['darwin', 'osascript'],
    ['linux', 'x-terminal-emulator'],
  ])('opens a resumable session on %s', (platform, command) => {
    const launcher = claudeLauncher('session-123', platform);
    expect(launcher.command).toBe(command);
    expect(launcher.args.join(' ')).toContain('session-123');
  });

  it('rejects unsafe session IDs', () => {
    expect(() => claudeLauncher('session; shutdown', 'linux')).toThrow('Invalid Claude session ID');
  });
});
