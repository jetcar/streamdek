param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,

    [string]$ApplicationArguments = '--background --supervised',

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory
)

$ErrorActionPreference = 'Stop'

$taskName = 'Streamdek'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'streamdek'
$pidPath = Join-Path $runtimeRoot 'streamdek.pid'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction `
    -Execute $ExecutablePath `
    -Argument $ApplicationArguments `
    -WorkingDirectory $WorkingDirectory
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$recoveryTrigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 1) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($logonTrigger, $recoveryTrigger) `
    -Principal $principal `
    -Settings $settings `
    -Description 'Streamdek agent status display with automatic restart' `
    -Force | Out-Null

Remove-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus' -ErrorAction SilentlyContinue

if (Test-Path -LiteralPath $pidPath) {
    $streamdekPid = [int](Get-Content -LiteralPath $pidPath -Raw)
    Stop-Process -Id $streamdekPid -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

Start-ScheduledTask -TaskName $taskName
