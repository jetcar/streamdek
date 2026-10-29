import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';
import type { Log } from './deck.js';
import type { DeckTarget } from './types.js';

type SupportedPlatform = 'win32' | 'darwin' | 'linux';

export function runtimeDirectory(
  platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): string {
  const path = platform === 'win32' ? win32 : posix;
  if (env.STREAMDEK_STATE_DIR && path.isAbsolute(env.STREAMDEK_STATE_DIR)) return env.STREAMDEK_STATE_DIR;
  if (platform === 'win32') return path.join(env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'streamdek');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'streamdek');
  const stateHome = env.XDG_STATE_HOME && path.isAbsolute(env.XDG_STATE_HOME)
    ? env.XDG_STATE_HOME
    : path.join(home, '.local', 'state');
  return path.join(stateHome, 'streamdek');
}

export function codexDirectory(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
  platform = process.platform,
): string {
  const path = platform === 'win32' ? win32 : posix;
  return env.CODEX_HOME && path.isAbsolute(env.CODEX_HOME) ? env.CODEX_HOME : path.join(home, '.codex');
}

export function claudeDirectory(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
  platform = process.platform,
): string {
  const path = platform === 'win32' ? win32 : posix;
  return env.CLAUDE_CONFIG_DIR && path.isAbsolute(env.CLAUDE_CONFIG_DIR)
    ? env.CLAUDE_CONFIG_DIR
    : path.join(home, '.claude');
}

export function opener(platform = process.platform): { command: string; args: (url: string) => string[] } {
  const supported = platform as SupportedPlatform;
  if (supported === 'win32') return { command: 'explorer.exe', args: (url) => [url] };
  if (supported === 'darwin') return { command: 'open', args: (url) => [url] };
  if (supported === 'linux') return { command: 'xdg-open', args: (url) => [url] };
  throw new Error(`Unsupported platform: ${platform}`);
}

export function openExternal(url: string, log: Log): void {
  try {
    const selected = opener();
    const child = spawn(selected.command, selected.args(url), {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    log(`Opened ${url}`);
  } catch (error) {
    log(`Could not open ${url}`, error);
  }
}

export function notificationCommand(
  message: string,
  platform = process.platform,
): { command: string; args: string[] } {
  const supported = platform as SupportedPlatform;
  if (supported === 'win32') {
    const encoded = Buffer.from(message, 'utf8').toString('base64');
    const script = `$m=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'));$e=[Security.SecurityElement]::Escape($m);$x=New-Object Windows.Data.Xml.Dom.XmlDocument;$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>Streamdek</text><text>'+$e+'</text></binding></visual></toast>');[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Streamdek').Show([Windows.UI.Notifications.ToastNotification]::new($x))`;
    return { command: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script] };
  }
  if (supported === 'darwin') {
    return { command: 'osascript', args: ['-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title "Streamdek"', '-e', 'end run', message] };
  }
  if (supported === 'linux') return { command: 'notify-send', args: ['Streamdek', message] };
  throw new Error(`Unsupported platform: ${platform}`);
}

export function requestDeviceApproval(deviceName: string, approvalUrl: string, log: Log): void {
  try {
    const selected = notificationCommand(`${deviceName} is requesting display access. Approve it on this computer.`);
    const child = spawn(selected.command, selected.args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', (error) => log('Could not show device approval notification', error));
    child.unref();
  } catch (error) {
    log('Could not show device approval notification', error);
  }
  openExternal(approvalUrl, log);
}

export function claudeLauncher(
  sessionId: string,
  platform = process.platform,
): { command: string; args: string[] } {
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) throw new Error('Invalid Claude session ID');
  const supported = platform as SupportedPlatform;
  if (supported === 'win32') {
    return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'start', '""', 'claude', '--resume', sessionId] };
  }
  if (supported === 'darwin') {
    return {
      command: 'osascript',
      args: ['-e', `tell application "Terminal" to do script "claude --resume ${sessionId}"`],
    };
  }
  if (supported === 'linux') {
    return { command: 'x-terminal-emulator', args: ['-e', 'claude', '--resume', sessionId] };
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

export function openDeckTarget(target: DeckTarget, log: Log): void {
  if (target.kind === 'url') {
    openExternal(target.value, log);
    return;
  }
  try {
    const selected = claudeLauncher(target.sessionId);
    const child = spawn(selected.command, selected.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.on('error', (error) => log(`Could not open Claude session ${target.sessionId}`, error));
    child.unref();
    log(`Opened Claude session ${target.sessionId}`);
  } catch (error) {
    log(`Could not open Claude session ${target.sessionId}`, error);
  }
}
