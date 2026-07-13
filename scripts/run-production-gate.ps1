param([string]$NodeExe = "node")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
Push-Location $root
try {
  $syntaxTargets = @(
    Get-ChildItem (Join-Path $root "v8") -Recurse -File |
      Where-Object { $_.Extension -in @(".js", ".mjs") }
    Get-ChildItem (Join-Path $root "scripts") -File |
      Where-Object { $_.Extension -in @(".js", ".mjs") }
    Get-Item (Join-Path $root "sw.js")
  )
  $syntaxTargets | ForEach-Object {
      & $NodeExe --check $_.FullName
      if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.FullName)" }
    }
  & $NodeExe (Join-Path $root "scripts\validate-production.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Production validation failed" }
  & $NodeExe (Join-Path $root "scripts\prepare-pages-artifact.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Pages artifact validation failed" }
  & $NodeExe --test (Join-Path $root "tests\*.test.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Infrastructure tests failed" }
  Write-Host "ETHONE production gate: PASS" -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $dist) {
    $resolvedDist = (Resolve-Path -LiteralPath $dist).Path
    if ([System.IO.Path]::GetDirectoryName($resolvedDist) -ne (Resolve-Path -LiteralPath $root).Path) {
      throw "Refusing to remove artifact outside the workspace root"
    }
    Remove-Item -LiteralPath $resolvedDist -Recurse -Force
  }
  Pop-Location
}
