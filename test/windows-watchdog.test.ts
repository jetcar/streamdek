import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Windows background task packaging', () => {
  it('launches the desktop process directly with scheduled recovery', () => {
    const registration = readFileSync(join(root, 'scripts', 'register-windows-task.ps1'), 'utf8');

    expect(registration).toContain("$taskName = 'Streamdek'");
    expect(registration).toContain('-Execute $ExecutablePath');
    expect(registration).toContain('-Argument $ApplicationArguments');
    expect(registration).not.toContain('powershell.exe');
    expect(registration).not.toContain('watch-windows.ps1');
    expect(registration).toContain('$recoveryTrigger = New-ScheduledTaskTrigger');
    expect(registration).toContain('-RepetitionInterval (New-TimeSpan -Minutes 1)');
    expect(registration).toContain('-AllowStartIfOnBatteries');
    expect(registration).toContain('-DontStopIfGoingOnBatteries');
    expect(registration).toContain('-Trigger @($logonTrigger, $recoveryTrigger)');
    expect(registration).toContain('Start-ScheduledTask -TaskName $taskName');
  });

  it('includes the background task registration in the Windows installer', () => {
    const workflow = readFileSync(join(root, '.github', 'workflows', 'release.yml'), 'utf8');
    const installer = readFileSync(join(root, 'packaging', 'windows', 'streamdek.iss'), 'utf8');

    expect(workflow).toContain('scripts/register-windows-task.ps1');
    expect(workflow).not.toContain('scripts/watch-windows.ps1');
    expect(installer).toContain('register-windows-task.ps1');
    expect(installer).toContain('-ExecutablePath ""{app}\\Streamdek.exe""');
  });

  it('removes both current and legacy startup registrations on uninstall', () => {
    const uninstall = readFileSync(join(root, 'scripts', 'uninstall.ps1'), 'utf8');

    expect(uninstall).toContain("Unregister-ScheduledTask -TaskName 'Streamdek'");
    expect(uninstall).toContain("Remove-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus'");
  });
});
