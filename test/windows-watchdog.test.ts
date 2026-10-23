import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Windows watchdog packaging', () => {
  it('supervises and relaunches the desktop process', () => {
    const watchdog = readFileSync(join(root, 'scripts', 'watch-windows.ps1'), 'utf8');
    const registration = readFileSync(join(root, 'scripts', 'register-windows-task.ps1'), 'utf8');

    expect(watchdog).toContain('while ($true)');
    expect(watchdog).toContain('& $NodePath $AppPath');
    expect(registration).toContain("$taskName = 'Streamdek'");
    expect(registration).toContain("Join-Path $PSScriptRoot 'watch-windows.ps1'");
    expect(registration).toContain('Start-ScheduledTask -TaskName $taskName');
  });

  it('includes the watchdog scripts in the Windows installer', () => {
    const workflow = readFileSync(join(root, '.github', 'workflows', 'release.yml'), 'utf8');
    const installer = readFileSync(join(root, 'packaging', 'windows', 'streamdek.iss'), 'utf8');

    expect(workflow).toContain('scripts/register-windows-task.ps1');
    expect(workflow).toContain('scripts/watch-windows.ps1');
    expect(installer).toContain('register-windows-task.ps1');
  });

  it('removes both current and legacy startup registrations on uninstall', () => {
    const uninstall = readFileSync(join(root, 'scripts', 'uninstall.ps1'), 'utf8');

    expect(uninstall).toContain("Unregister-ScheduledTask -TaskName 'Streamdek'");
    expect(uninstall).toContain("Remove-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus'");
  });
});

