import { describe, expect, it } from 'vitest';
import { approvalLauncher, claudeDirectory, claudeLauncher, codexDirectory, deviceApprovalCommand, notificationCommand, opener, runtimeDirectory } from '../src/platform.js';

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
    ['win32', 'cmd.exe'],
    ['darwin', 'open'],
    ['linux', 'xdg-open'],
  ])('uses the native URL opener on %s', (platform, command) => {
    expect(opener(platform).command).toBe(command);
  });

  it('uses the Windows shell URL handler rather than opening Explorer', () => {
    expect(opener('win32').args('http://127.0.0.1:8910/approve?id=test')).toEqual([
      '/d', '/s', '/c', 'start', '""',
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

describe('deviceApprovalCommand', () => {
  it('shows a Windows confirmation dialog and posts approval without raw user input in the script', () => {
    const selected = deviceApprovalCommand("Office'; exit", 'http://127.0.0.1:8910/approve?id=request_1', 'win32');
    expect(selected?.command).toBe('powershell.exe');
    expect(selected?.args.join(' ')).toContain('MessageBox');
    expect(selected?.args).not.toContain('Hidden');
    expect(selected?.args.join(' ')).not.toContain("Office'; exit");
    expect(selected?.args.join(' ')).not.toContain('request_1');
  });

  it('keeps the browser approval flow on macOS and Linux', () => {
    expect(deviceApprovalCommand('Tablet', 'http://127.0.0.1:8910/approve?id=request_1', 'darwin')).toBeUndefined();
    expect(deviceApprovalCommand('Tablet', 'http://127.0.0.1:8910/approve?id=request_1', 'linux')).toBeUndefined();
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

describe('approvalLauncher', () => {
  it('resumes Codex and Claude sessions with an approval response', () => {
    expect(approvalLauncher({ kind: 'url', value: 'codex://threads/thread-123' }, 'win32')).toMatchObject({
      command: 'codex.exe',
      args: ['exec', 'resume', 'thread-123', expect.stringContaining('Approved')],
    });
    expect(approvalLauncher({ kind: 'claude-session', sessionId: 'claude-123' }, 'linux')).toMatchObject({
      command: 'claude',
      args: ['--resume', 'claude-123', '--print', expect.stringContaining('Approved')],
    });
  });

  it('rejects targets that cannot receive input', () => {
    expect(() => approvalLauncher({ kind: 'url', value: 'https://example.com' }, 'linux')).toThrow('cannot receive approval');
  });
});
