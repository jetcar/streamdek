import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('desktop tray application', () => {
  it('starts hidden and provides open, restart, and exit actions', () => {
    const tray = readFileSync(join(root, 'src', 'tray.ts'), 'utf8');

    expect(tray).toContain("process.argv.includes('--background')");
    expect(tray).toContain("label: 'Open Streamdek'");
    expect(tray).toContain("label: 'Restart'");
    expect(tray).toContain("label: 'Exit'");
    expect(tray).toContain("tray.on('click', showWindow)");
    expect(tray).toContain("writeFileSync(intentionalExitPath, 'stopped by user')");
    expect(tray).toContain('app.exit(1)');
  });

  it('packages the Electron tray shell on every desktop OS', () => {
    const workflow = readFileSync(join(root, '.github', 'workflows', 'release.yml'), 'utf8');
    const macLaunchAgent = readFileSync(join(root, 'packaging', 'macos', 'com.jetcar.streamdek.plist'), 'utf8');
    const linuxService = readFileSync(join(root, 'packaging', 'linux', 'streamdek.service'), 'utf8');

    expect(workflow).toContain('electron-builder --win dir');
    expect(workflow).toContain('electron-builder --mac dir');
    expect(workflow).toContain('electron-builder --linux dir');
    expect(macLaunchAgent).toContain('/Applications/Streamdek.app/Contents/MacOS/Streamdek');
    expect(linuxService).toContain('/opt/streamdek/streamdek --background --supervised');
  });
});
