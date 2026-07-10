$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
$boot = Get-Content -Raw -LiteralPath (Join-Path $root "core\boot.js")
$qaRepair = Get-Content -Raw -LiteralPath (Join-Path $root "core\qa-repair.js")
$marketplace = Get-Content -Raw -LiteralPath (Join-Path $root "services\marketplace\runtime.js")
$integrations = Get-Content -Raw -LiteralPath (Join-Path $root "services\connections\integration-hub.js")
$commandPalette = Get-Content -Raw -LiteralPath (Join-Path $root "components\command-palette.js")
$actions = Get-Content -Raw -LiteralPath (Join-Path $root "actions\action-registry.js")
$legacyNavigation = Get-Content -Raw -LiteralPath (Join-Path $root "actions\legacy-navigation.js")
$settingsV2 = Get-Content -Raw -LiteralPath (Join-Path $root "pages\settings\settings-v2.js")
$settingsPremium = Get-Content -Raw -LiteralPath (Join-Path $root "pages\settings\settings-premium.js")
$timelineCss = Get-Content -Raw -LiteralPath (Join-Path $root "pages\timeline\style.css")
$integrityCss = Get-Content -Raw -LiteralPath (Join-Path $root "ui\layout-integrity.css")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

function Assert-NoMatch([string]$content, [string]$pattern, [string]$message) {
  if ($content -match $pattern) { $failures.Add($message) }
}

Assert-NoMatch $index 'showChangelog\s*\(|services/auth/legacy/changelog\.js|v5\.3\.2' "Profile selection still exposes the obsolete changelog."
Assert-Match $index 'id="profile-version-label"[^>]*>v1\.0\.0</div>' "Profile selection does not expose the current release version."
Assert-NoMatch $boot 'keep only the real Rub|const\s+rubs\s*=|ethoneDeleteDuplicateProfilesFromCloud' "Profile normalization still contains account-specific destructive cleanup."
Assert-Match $boot 'const\s+seenIds\s*=\s*new Set\(\)' "Profile normalization is not keyed by stable ids."
Assert-NoMatch $qaRepair 'ethone-auto-empty|Page pr[eê]te|cleanProfilesVisual|window\.ethoneCleanProfileList\s*=' "QA repair still injects fake content or overrides profile state."
Assert-Match $marketplace 'const\s+CATEGORIES\s*=\s*\["Featured","Themes"\]' "Marketplace still exposes unfinished product categories."
Assert-Match $marketplace 'const\s+catalog\s*=\s*\[\s*\]' "Marketplace still ships fabricated catalog entries."
Assert-NoMatch $marketplace '\b(?:rating|downloads|screenshots)\b' "Marketplace still contains fabricated popularity or screenshot metadata."
Assert-Match $marketplace 'placeholder="Search themes, palettes and styles\.\.\."' "Marketplace search still advertises unavailable categories."
Assert-Match $integrations 'defs\s*:\s*function\s*\(\)\s*\{\s*return\s+releaseDefs\(\)\.slice\(\)' "Integration Hub API still exposes unfinished services."
$commandIntegrations = [regex]::Match($commandPalette, 'const\s+CMD_INTEGRATIONS\s*=\s*\[([\s\S]*?)\r?\n\];').Groups[1].Value
$marketplaceFallbacks = [regex]::Match($commandPalette, 'const\s+CMD_MARKETPLACE_FALLBACKS\s*=\s*\[([\s\S]*?)\r?\n\];').Groups[1].Value
Assert-NoMatch $commandIntegrations 'Google Calendar|Google Drive|\bOBS\b|YouTube|Battle\.net|Last\.fm' "Command Palette still indexes unfinished integrations."
Assert-NoMatch $marketplaceFallbacks 'Widget Marketplace|Layout Store|Automation Packs|AI Agents' "Command Palette still exposes unfinished Marketplace categories."
Assert-Match $commandPalette 'function\s+cmdExperimentalEnabled\s*\(' "Command Palette does not gate experimental commands."
Assert-NoMatch $commandPalette 'comingSoon\s*:\s*true' "Command Palette still exposes a known incomplete command."
Assert-Match $commandPalette 'overlay\.inert\s*=\s*!open' "Command Palette can remain inert when opened."
Assert-NoMatch $actions 'Feature coming soon|Fonctionnalite bientot disponible' "Action Registry still promises unfinished functionality."
Assert-Match $legacyNavigation 'dataset\.section\s*!==\s*["'']recent["'']' "Navigation does not prefer one canonical non-recent sidebar item."
Assert-Match $legacyNavigation 'async function loadAccountInfo\(\)[\s\S]*?try\s*\{[\s\S]*?catch\s*\(' "Account settings can leave a rejected request or permanent loading state."
Assert-Match $settingsV2 'experimentalEnabled\s*\(' "Settings does not gate experimental sections."
Assert-NoMatch $settingsV2 '>3 tasks|3 tasks\s+[^<]+1 workspace' "Settings preview still contains fabricated activity data."
Assert-NoMatch $settingsPremium '__ethoneAutomationTimer\s*=\s*setInterval|ETHONE 2026\.07 \(V28\)' "Settings still starts an idle automation timer or exposes an obsolete build."
Assert-NoMatch $index 'triggers externes restent[\s\S]{0,100}Coming Soon' "Settings still exposes incomplete automation copy."
@(
  "index.html",
  "services\connections\integration-hub.js",
  "pages\gaming\valorant-connect.js",
  "pages\gaming\hub.js",
  "widgets\github.js"
) | ForEach-Object {
  $content = Get-Content -Raw -LiteralPath (Join-Path $root $_)
  Assert-NoMatch $content 'Rub19|rub19|squeezie' ("Developer-specific example data remains in " + $_)
}
Assert-Match $timelineCss '#page-activity\s+\.aic-filters\s*\{[\s\S]*?grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)' "Activity filters still collapse into unreadable buttons."
Assert-Match $integrityCss '#page-marketplace\s+\.mp41-shell\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)' "Marketplace can still overflow horizontally."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Production readiness contract failed with $($failures.Count) issue(s)."
}

Write-Host "Production readiness contract: PASS"
