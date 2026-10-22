import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';
import type { Log } from './deck.js';

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
