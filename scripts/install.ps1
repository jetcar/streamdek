$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node).Source
$appPath = Join-Path $projectRoot 'dist\app.js'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runValue = '"{0}" "{1}"' -f $nodePath, $appPath

Push-Location $projectRoot
try {
    if (Test-Path -LiteralPath (Join-Path $projectRoot 'src')) {
        npm ci
        npm run build
    } elseif (Test-Path -LiteralPath $appPath) {
        npm ci --omit=dev
    } else {
        throw 'Neither source files nor a prebuilt release were found.'
    }
} finally {
    Pop-Location
}

New-ItemProperty -Path $runKey -Name 'StreamdekCodexStatus' -Value $runValue -PropertyType String -Force | Out-Null
Start-Process -FilePath $nodePath -ArgumentList @($appPath) -WorkingDirectory $projectRoot -WindowStyle Hidden
Write-Output 'Streamdek is installed and running.'
