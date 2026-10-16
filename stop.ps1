$ErrorActionPreference = 'Stop'
$taskUrl = 'http://127.0.0.1:8766'
try { $taskHealth = Invoke-RestMethod -Uri ($taskUrl + '/api/health') -TimeoutSec 2 } catch { Write-Host 'Workbench is not running on port 8766.'; exit 0 }
if ($taskHealth.service -ne 'offshore-assistant') { throw 'Port 8766 belongs to another application.' }
Invoke-RestMethod -Uri ($taskUrl + '/api/shutdown') -Method Post -ContentType 'application/json' -Headers @{'X-Run-Token'=$taskHealth.token} -Body '{}' | Out-Null
Write-Host 'Workbench shutdown requested; any active simulation will be cancelled.'
