$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$index = Get-Content -Raw -LiteralPath $indexPath
$serviceWorker = Get-Content -Raw -LiteralPath (Join-Path $root "sw.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { $failures.Add($message) }
}

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

$requiredFiles = @(
  "scripts\codebase-audit.mjs",
  "core\dom-runtime.js",
  "services\onboarding\gate.js",
  "ui\app-foundation.css"
)
foreach ($relative in $requiredFiles) {
  Assert-True (Test-Path -LiteralPath (Join-Path $root $relative)) "Missing cleanup architecture file: $relative"
}

$removedFiles = @(
  "actions\legacy-notifications.js",
  "pages\databases\context-menu.js",
  "pages\databases\dropdown.js",
  "pages\valorant-accounts\context-menu.js",
  "pages\valorant-accounts\dropdown.js",
  "services\ai\brain-33b.js",
  "services\ai\brain-34.js",
  "services\ai\brain-os-36.js",
  "services\ai\brain-platform-35.js",
  "services\ai\intelligence-33a.js"
)
foreach ($relative in $removedFiles) {
  Assert-True (-not (Test-Path -LiteralPath (Join-Path $root $relative))) "Proven dead module still exists: $relative"
}

Assert-True ($index -notmatch 'application/ethone-disabled') "Disabled legacy module declarations remain in index.html."
Assert-Match $index '<link[^>]+id="ethone-app-foundation"[^>]+href="\.\/ui\/app-foundation\.css\?v=\d+"' "Application foundation CSS is not externalized."

$inlineStyles = [regex]::Matches($index, '<style\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
Assert-True ($inlineStyles -eq 3) "Only the three boot-critical style blocks may remain inline; found $inlineStyles."

Assert-Match $index '<script[^>]+id="ethone-dom-runtime"[^>]+src="\.\/core\/dom-runtime\.js\?v=1"' "Shared DOM runtime is not loaded."
Assert-Match $index '<script[^>]+id="ethone-onboarding-gate"[^>]+data-ethone-lazy-group="dashboard"[^>]+data-src="\.\/services\/onboarding\/gate\.js\?v=1"' "Onboarding gate is not dashboard-lazy."
Assert-Match $index '<script[^>]+id="ethone-first-run"[^>]+data-ethone-lazy-group="onboarding"[^>]+data-src="\.\/services\/onboarding\/first-run\.js' "Full onboarding runtime still loads with the dashboard."
Assert-Match $index '<link[^>]+data-ethone-lazy-style-group="onboarding"[^>]+data-href="\.\/ui\/first-run\.css' "Base onboarding CSS still loads with the dashboard."
Assert-Match $index '<link[^>]+data-ethone-lazy-style-group="onboarding"[^>]+data-href="\.\/ui\/onboarding-premium-final\.css' "Premium onboarding CSS is still global."

Assert-True ($serviceWorker -notmatch 'ETHONE_CORE_ASSETS') "Service worker still contains the unused all-assets manifest."
Assert-Match $serviceWorker '"\.\/ui\/app-foundation\.css"' "Service worker does not cache the application foundation."
Assert-Match $serviceWorker '"\.\/core\/dom-runtime\.js"' "Service worker does not cache the shared DOM runtime."
Assert-Match $serviceWorker '"\.\/services\/onboarding\/gate\.js"' "Service worker does not cache the lightweight onboarding gate."
Assert-True ($serviceWorker -notmatch 'ETHONE_BOOT_ASSETS\s*=\s*\[[\s\S]*?onboarding-premium-final\.css') "Service worker still eagerly caches premium onboarding CSS."

$observerOwners = @(
  "ui\accessibility.js",
  "ui\clarity-polish.js",
  "ui\icon-system.js",
  "ui\mobile.js",
  "ui\ux-final-polish.js",
  "ui\release-polish.js",
  "core\production-hardening.js"
)
foreach ($relative in $observerOwners) {
  $path = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $path)) { continue }
  $content = Get-Content -Raw -LiteralPath $path
  Assert-Match $content 'ETHONEDOMRuntime' "$relative does not use the shared DOM runtime."
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Codebase cleanup contract failed with $($failures.Count) issue(s)."
}

Write-Host "Codebase cleanup contract: PASS"
