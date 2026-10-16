$ErrorActionPreference = 'Stop'
$taskBundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$taskPython = if (Test-Path -LiteralPath $taskBundledPython) { $taskBundledPython } else { (Get-Command python -ErrorAction Stop).Source }
$taskPort = 8766
$taskUrl = 'http://127.0.0.1:' + $taskPort
try { $taskHealth = Invoke-RestMethod -Uri ($taskUrl + '/api/health') -TimeoutSec 2 } catch { $taskHealth = $null }
if ($taskHealth -and $taskHealth.service -ne 'offshore-assistant') { throw 'Port 8766 is occupied by another application.' }
if (-not $taskHealth) {
    & $taskPython (Join-Path $PSScriptRoot 'tools/doctor.py')
    if ($LASTEXITCODE -ne 0) { throw 'Installation check failed. Run install.ps1 first; existing results can still be viewed with a static server.' }
    $taskScript = Join-Path $PSScriptRoot 'server.py'
    Start-Process -FilePath $taskPython -ArgumentList @(('"' + $taskScript + '"'), '--port', [string]$taskPort) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden | Out-Null
    $taskReady = $false
    for ($taskAttempt=0; $taskAttempt -lt 30; $taskAttempt++) {
        try { $taskHealth = Invoke-RestMethod -Uri ($taskUrl + '/api/health') -TimeoutSec 1; if ($taskHealth.service -eq 'offshore-assistant') { $taskReady = $true; break } } catch { Start-Sleep -Milliseconds 200 }
    }
    if (-not $taskReady) { throw 'Local server failed to start. Run python server.py to inspect output.' }
}
Start-Process $taskUrl
