$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sidebar = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\shell.js")
$resize = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\resizable-sidebar.js")
$settings = Get-Content -Raw -LiteralPath (Join-Path $root "services\settings\functional.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

Assert-Match $sidebar "if\(Actions&&typeof Actions\.dispatch==='function'\)\{[\s\S]*?return ok!==false;[\s\S]*?\}" "Sidebar falls through to legacy navigation after the Action Registry rejects an action."
Assert-Match $sidebar "function\s+sidebarExperimentalEnabled" "Sidebar cannot distinguish production-safe and experimental destinations."
Assert-Match $sidebar "SIDEBAR_EXPERIMENTAL_PAGES" "Sidebar has no explicit policy for experimental pages."
Assert-Match $sidebar "baseNav\.filter\(item=>!SIDEBAR_EXPERIMENTAL_PAGES\.has\(item\.id\)\|\|sidebarExperimentalEnabled\(\)\)" "Experimental sidebar destinations are not hidden from the production navigation."
Assert-Match $sidebar "if\(SIDEBAR_EXPERIMENTAL_PAGES\.has\(page\)&&!sidebarExperimentalEnabled\(\)\)return false" "Direct navigation can still open an experimental sidebar destination in production."
Assert-Match $resize "p\.theme\.sidebarWidth=width" "Mouse resize does not persist the custom width into the active profile theme."
Assert-Match $resize "saveStateNow" "Mouse resize is not persisted with the active profile."
if ($settings -match 't\.sidebarWidth\|\|localStorage\.getItem\("sb_width"\)') {
  $failures.Add("Settings resets the saved mouse-resized width to the theme default on every page change.")
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Sidebar behavior contract failed with $($failures.Count) issue(s)."
}

Write-Host "Sidebar behavior contract: PASS"
