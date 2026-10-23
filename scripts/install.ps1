$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node).Source
$appPath = Join-Path $projectRoot 'dist\app.js'

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

& (Join-Path $PSScriptRoot 'register-windows-task.ps1') `
    -NodePath $nodePath `
    -AppPath $appPath `
    -WorkingDirectory $projectRoot
Write-Output 'Streamdek is installed and running.'
