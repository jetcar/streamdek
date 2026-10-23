param(
    [Parameter(Mandatory = $true)]
    [string]$NodePath,

    [Parameter(Mandatory = $true)]
    [string]$AppPath,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory
)

$ErrorActionPreference = 'Stop'

$taskName = 'Streamdek'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'streamdek'
$pidPath = Join-Path $runtimeRoot 'streamdek.pid'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$watchPath = Join-Path $PSScriptRoot 'watch-windows.ps1'
$powerShellPath = (Get-Command powershell.exe).Source
$watchArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -NodePath "{1}" -AppPath "{2}"' -f `
    $watchPath, $NodePath, $AppPath

$action = New-ScheduledTaskAction `
    -Execute $powerShellPath `
    -Argument $watchArguments `
    -WorkingDirectory $WorkingDirectory
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
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
