import { readFileSync } from 'node:fs';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/jetcar/streamdek/releases/latest';
const RELEASE_BASE_URL = 'https://github.com/jetcar/streamdek/releases/tag/';

export interface UpdateInfo {
  version: string;
  url: string;
}

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function versionParts(version: string): number[] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match?.slice(1).map(Number);
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const next = versionParts(candidate);
  const installed = versionParts(current);
  if (!next || !installed) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== installed[index]) return next[index] > installed[index];
  }
  return false;
}

export function installedVersion(): string {
  const packageUrl = new URL('../package.json', import.meta.url);
  return (JSON.parse(readFileSync(packageUrl, 'utf8')) as { version: string }).version;
}

export class UpdateChecker {
  private lastCheckedAt = 0;
  private update?: UpdateInfo;

  constructor(
    private readonly currentVersion: string,
    private readonly fetcher: Fetch = fetch,
    private readonly intervalMs = 6 * 60 * 60 * 1_000,
  ) {}

  get available(): UpdateInfo | undefined {
    return this.update;
  }

  async check(now = Date.now()): Promise<UpdateInfo | undefined> {
    if (this.lastCheckedAt && now - this.lastCheckedAt < this.intervalMs) return this.update;
    this.lastCheckedAt = now;
    const response = await this.fetcher(LATEST_RELEASE_URL, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': `streamdek/${this.currentVersion}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub update check failed with HTTP ${response.status}`);
    const release = await response.json() as { tag_name?: unknown };
    if (typeof release.tag_name !== 'string' || !isNewerVersion(release.tag_name, this.currentVersion)) {
      this.update = undefined;
      return undefined;
    }
    const version = release.tag_name.replace(/^v/, '');
    this.update = { version, url: `${RELEASE_BASE_URL}${encodeURIComponent(release.tag_name)}` };
    return this.update;
  }
}

