$ErrorActionPreference = 'Stop'

$runtimeRoot = Join-Path $env:LOCALAPPDATA 'streamdek'
$pidPath = Join-Path $runtimeRoot 'streamdek.pid'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

Stop-ScheduledTask -TaskName 'Streamdek' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'Streamdek' -Confirm:$false -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus' -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $pidPath) {
    $streamdekPid = [int](Get-Content -LiteralPath $pidPath -Raw)
    Stop-Process -Id $streamdekPid -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}
Write-Output 'Streamdek is stopped and removed from Windows startup and automatic restart.'
