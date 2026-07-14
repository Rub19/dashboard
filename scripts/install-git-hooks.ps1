param(
  [string]$NodeExe = "node"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $Root

try {
  $PreviousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  try {
    $InsideWorkTree = & git rev-parse --is-inside-work-tree 2>$null
    $GitProbeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $PreviousErrorPreference
  }

  if ($GitProbeExitCode -ne 0 -or $InsideWorkTree -ne "true") {
    [Console]::Error.WriteLine("ETHONE hook installation blocked: $Root does not contain valid Git metadata. Restore the repository or run git init first.")
    exit 1
  }

  & git config core.hooksPath .githooks
  if ($LASTEXITCODE -ne 0) { throw "Unable to configure core.hooksPath." }

  & $NodeExe ./scripts/precommit-upload-check.mjs --all
  if ($LASTEXITCODE -ne 0) { throw "The initial upload safety scan failed." }

  & $NodeExe ./scripts/audit-security.mjs
  if ($LASTEXITCODE -ne 0) { throw "The repository security audit failed." }

  Write-Output "ETHONE Git hooks installed: .githooks"
} finally {
  Pop-Location
}
