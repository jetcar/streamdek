$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'

Push-Location $projectRoot
try {
    if (Test-Path -LiteralPath (Join-Path $projectRoot 'src')) {
        npm ci
        npm run build
    } elseif (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\tray.js')) {
        npm ci --omit=dev
    } else {
        throw 'Neither source files nor a prebuilt release were found.'
    }
} finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $electronPath)) {
    throw 'Electron desktop runtime was not found.'
}

& (Join-Path $PSScriptRoot 'register-windows-task.ps1') `
    -ExecutablePath $electronPath `
    -ApplicationArguments ('"{0}" --background' -f $projectRoot) `
    -WorkingDirectory $projectRoot
Write-Output 'Streamdek is installed and running.'
