$ErrorActionPreference = 'Stop'
$taskBundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$taskPython = if (Test-Path -LiteralPath $taskBundledPython) { $taskBundledPython } else { (Get-Command python -ErrorAction Stop).Source }
Push-Location -LiteralPath $PSScriptRoot
try {
    & $taskPython 'tools/setup_engine.py'
    if ($LASTEXITCODE -ne 0) { throw 'Official download failed. Check network access to GitHub, then rerun install.ps1; verified files are reused.' }
    & $taskPython 'tools/doctor.py'
    if ($LASTEXITCODE -ne 0) { throw 'Installation verification failed. See checks above.' }
    Write-Host 'Installation ready. Run start.ps1 to open the workbench.'
} finally { Pop-Location }
