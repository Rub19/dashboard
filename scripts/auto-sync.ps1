# Periodically commits and pushes any pending local changes in this repo.
# Runs unattended via a scheduled task; failures are logged, never thrown to the caller.

$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogPath = Join-Path $env:LOCALAPPDATA "ethone-autosync.log"

function Write-Log([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $LogPath -Value $line
}

try {
  Set-Location $RepoPath

  $status = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    exit 0
  }

  git add -A 2>&1 | Out-Null

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  git commit -m "Auto sync $timestamp" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Commit blocked (likely the pre-commit security scan) - changes stay local until fixed."
    exit 1
  }

  $pushOutput = git push origin main 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Push failed: $pushOutput"
    exit 1
  }

  Write-Log "Synced successfully."
} catch {
  Write-Log "ERROR: $_"
}
