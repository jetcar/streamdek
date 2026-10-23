param(
    [Parameter(Mandatory = $true)]
    [string]$NodePath,

    [Parameter(Mandatory = $true)]
    [string]$AppPath
)

$ErrorActionPreference = 'Continue'

while ($true) {
    & $NodePath $AppPath
    Start-Sleep -Seconds 5
}

