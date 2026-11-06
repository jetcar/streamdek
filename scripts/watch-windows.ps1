param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,

    [string]$ApplicationArguments = '--background --supervised'
)

$ErrorActionPreference = 'Continue'

while ($true) {
    $process = Start-Process -FilePath $ExecutablePath -ArgumentList $ApplicationArguments -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        break
    }
    Start-Sleep -Seconds 5
}
