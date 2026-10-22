$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node).Source
$appPath = Join-Path $projectRoot 'dist\app.js'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runValue = '"{0}" "{1}"' -f $nodePath, $appPath

Push-Location $projectRoot
try {
    npm install
    npm run build
} finally {
    Pop-Location
}

New-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus' -Value $runValue -PropertyType String -Force | Out-Null
Start-Process -FilePath $nodePath -ArgumentList @($appPath) -WorkingDirectory $projectRoot -WindowStyle Hidden
Write-Output 'Streamdek is installed and running.'
