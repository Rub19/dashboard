$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
$notificationCss = Get-Content -Raw -LiteralPath (Join-Path $root "ui\notification-center.css")
$notificationJs = Get-Content -Raw -LiteralPath (Join-Path $root "actions\notification-center.js")
$commandPalette = Get-Content -Raw -LiteralPath (Join-Path $root "components\command-palette.js")
$finalProductPolish = Get-Content -Raw -LiteralPath (Join-Path $root "ui\final-product-polish.js")
$bootManager = Get-Content -Raw -LiteralPath (Join-Path $root "core\boot-manager.js")
$actionRegistry = Get-Content -Raw -LiteralPath (Join-Path $root "actions\action-registry.js")
$discordIntegration = Get-Content -Raw -LiteralPath (Join-Path $root "services\connections\discord.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

Assert-Match $index '<script[^>]+id="ethone-ui-dropdown"[^>]+type="application/ethone-lazy"[^>]+data-ethone-lazy-group="[^"]*\bdatabases\b[^"]*\bgaming\b[^"]*"[^>]+data-src="\.\/components\/dropdown\.js(?:\?[^\"]*)?"' "Shared dropdown controllers still load on the login screen."
Assert-Match $index '<script[^>]+id="ethone-ui-context-menu"[^>]+type="application/ethone-lazy"[^>]+data-ethone-lazy-group="[^"]*\bdatabases\b[^"]*\bgaming\b[^"]*"[^>]+data-src="\.\/components\/context-menu\.js(?:\?[^\"]*)?"' "Shared context-menu controllers still load on the login screen."

Assert-Match $notificationCss '#notif-panel\.notification-center\s*\{[\s\S]*?pointer-events\s*:\s*none' "Closed Notification Center can still intercept pointer input."
Assert-Match $notificationCss '#notif-panel\.notification-center\s*\{[\s\S]*?visibility\s*:\s*hidden' "Closed Notification Center remains keyboard-visible off screen."
Assert-Match $notificationCss '#notif-panel\.notification-center\.open\s*\{[\s\S]*?pointer-events\s*:\s*auto' "Open Notification Center does not restore pointer input."
Assert-Match $notificationCss '#notif-panel\.notification-center\.open\s*\{[\s\S]*?visibility\s*:\s*visible' "Open Notification Center does not restore visibility."
Assert-Match $notificationJs 'panel\.inert\s*=\s*false' "Opening Notification Center does not remove inert state."
Assert-Match $notificationJs 'panel\.inert\s*=\s*true' "Closing Notification Center does not restore inert state."

Assert-Match $commandPalette 'function\s+cmdCopy\s*\(' "Command Palette has no localizable chrome-copy helper."
Assert-Match $commandPalette 'input\.placeholder\s*=\s*cmdCopy\(' "Command Palette search placeholder remains hardcoded in English."
Assert-Match $commandPalette 'cmdCopy\("noResult"' "Command Palette empty state remains hardcoded in English."
Assert-Match $commandPalette 'cmdCopy\("resultCount"' "Command Palette result summary remains hardcoded in English."
Assert-Match $commandPalette 'CMD_CATEGORY_COPY' "Command Palette category labels are not localized."
Assert-Match $commandPalette 'cmdCopy\("navigate"' "Command Palette keyboard footer remains hardcoded in English."
Assert-Match $commandPalette 'function\s+cmdIntentBoost\s*\(' "Command Palette has no canonical-intent relevance boost."
Assert-Match $commandPalette 'cmdIntentBoost\(doc,\s*q\)' "Command Palette ranking does not prioritize exact page and action intent."
Assert-Match $commandPalette 'function\s+cmdRenderIcons\s*\([^)]+\)[\s\S]*querySelectorAll\("\[data-lucide\]"\)' "Command Palette icon rendering is not scoped to its own result tree."
Assert-Match $commandPalette 'window\.lucide\.createElement' "Command Palette still depends on a document-wide Lucide rescan for each render."
Assert-Match $index 'data-ethone-lazy-style-group="[^"]*\bonboarding\b[^"]*"[^>]+data-href="\.\/ui\/first-run\.css' "Onboarding styles cannot be loaded independently from the dashboard."
Assert-Match $index 'id="ethone-first-run"[^>]+data-ethone-lazy-group="[^"]*\bonboarding\b[^"]*"' "Onboarding runtime cannot be loaded independently from the dashboard."
Assert-Match $actionRegistry 'register\("onboarding\.open"' "Onboarding command is exposed before a deferred action is registered."
Assert-Match $actionRegistry 'register\("whatsnew\.open"' "What's New command is exposed before a deferred action is registered."
if ($finalProductPolish -match 'setAttribute\(\s*["'']placeholder["'']\s*,\s*["'']Search pages') {
  $failures.Add("Legacy final polish overwrites the localized Command Palette placeholder.")
}

Assert-Match $bootManager 'bootCompletedMs' "Boot Manager does not freeze its completed boot duration."
Assert-Match $bootManager 'ethone:boot-sequence-complete' "Boot Manager is not connected to the boot completion event."
if ($discordIntegration.Contains([string][char]0x00e2) -or
    $discordIntegration.Contains([string][char]0x00f0) -or
    $discordIntegration.Contains([string][char]0x00c3) -or
    $discordIntegration.Contains([string][char]0x00c2)) {
  $failures.Add("Discord integration still contains user-visible mojibake glyphs.")
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Release candidate contract failed with $($failures.Count) issue(s)."
}

Write-Host "Release candidate contract: PASS"
