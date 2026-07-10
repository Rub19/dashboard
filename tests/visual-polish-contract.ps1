$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$stylePath = Join-Path $root "ui\ultimate-visual-polish.css"
$foundationPath = Join-Path $root "ui\app-foundation.css"
$analyticsPath = Join-Path $root "widgets\analytics-charts.js"
$serviceWorkerPath = Join-Path $root "sw.js"
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Contains {
  param(
    [string]$Content,
    [string]$Pattern,
    [string]$Message
  )

  if ($Content -notmatch $Pattern) {
    $failures.Add($Message)
  }
}

$index = Get-Content -Raw $indexPath
$serviceWorker = Get-Content -Raw $serviceWorkerPath
$foundation = Get-Content -Raw $foundationPath
$analytics = Get-Content -Raw $analyticsPath

if (-not (Test-Path $stylePath)) {
  $failures.Add("Missing final visual polish stylesheet.")
} else {
  $style = Get-Content -Raw $stylePath

  Assert-Contains $style '--sidebar-compact-width\s*:\s*76px' "Compact sidebar width token is missing."
  Assert-Contains $style '--sidebar-icon-width\s*:\s*58px' "Icon-only sidebar width token is missing."
  Assert-Contains $style '--radius-control\s*:\s*calc\(14px\s*\*\s*var\(--theme-radius-scale' "Canonical control radius token is missing."
  Assert-Contains $style '\.compact[^\{]*\.os-empty-row[^\{]*\{[^\}]*display\s*:\s*none' "Compact sidebar empty states can still overflow the rail."
  Assert-Contains $style '#apc-notif-bell[^\{]*\{[^\}]*overflow\s*:\s*visible' "Login preview notification badge can still be clipped."
  Assert-Contains $style '#notif-bell-btn[^\{]*\{[^\}]*overflow\s*:\s*visible' "Application notification badge can still be clipped."
  Assert-Contains $style '\.fron-shell-v6\s+\.fron-main[^\{]*\{[^\}]*(min-height\s*:\s*0|overflow\s*:\s*hidden)' "Onboarding main grid is not height-contained."
  Assert-Contains $style '\.fron-shell-v6\s+\.fron-live-grid[^\{]*\{[^\}]*grid-auto-rows\s*:\s*minmax\(0,\s*1fr\)' "Onboarding preview widget rows can still overflow their frame."
  Assert-Contains $style '\.fron-shell-v6\s+\.fron-live-widget[^\{]*\{[^\}]*min-height\s*:\s*0' "Onboarding preview widgets still enforce an overflowing minimum height."
  Assert-Contains $style '#cmd-palette-overlay\.open[^\{]*~?[^\{]*#ethone-keyboard-hud|:has\(#cmd-palette-overlay\.open\)[^\{]*#ethone-keyboard-hud' "Keyboard HUD is not suppressed while the command palette is open."
  Assert-Contains $style '#cmd-palette\s+\.cmd-item\.selected' "Command palette selected state is not specific enough to beat injected palette styles."
  Assert-Contains $style 'html\s+body\s+#page-settings\s+\.modal-input[\s\S]*border-radius\s*:\s*var\(--radius-control\)\s*!important' "Settings profile fields still use a legacy radius instead of the canonical control token."
  Assert-Contains $style '#page-marketplace\s+\.mp-screenshot-top\s+span[^{]*\{[^}]*font-size\s*:\s*var\(--type-micro\)\s*!important' "Marketplace preview labels remain below the minimum readable type token."
  Assert-Contains $style '\.settings-social-icon[^{]*\{[^}]*width\s*:\s*var\(--icon-shell-sm\)' "Settings social links do not use the canonical icon shell geometry."
  Assert-Contains $style '@media\s*\(max-width:\s*768px\)[\s\S]*#ethone-ux-status[^\{]*\{[^\}]*bottom\s*:\s*calc\(' "Mobile save feedback can still overlap the bottom navigation."
  Assert-Contains $style '@media\s*\(max-width:\s*768px\)[\s\S]*#ethone-brain-everywhere-root[^\{]*\{[^\}]*bottom\s*:\s*calc\(' "Mobile Brain control can still overlap the bottom navigation."
  Assert-Contains $style 'prefers-reduced-motion\s*:\s*reduce' "Reduced-motion fallback is missing."
}

Assert-Contains $index 'settings-social-icon[\s\S]{0,180}data-lucide="at-sign"' "Twitter profile field still uses a system emoji."
Assert-Contains $index 'settings-social-icon[\s\S]{0,180}data-lucide="git-branch"' "GitHub profile field does not use a Lucide glyph available in the production bundle."
Assert-Contains $index 'settings-social-icon[\s\S]{0,180}data-lucide="globe-2"' "Website profile field still uses a system emoji."
Assert-Contains $index 'settings-social-icon[\s\S]{0,180}data-lucide="camera"' "Instagram profile field does not use a Lucide glyph available in the production bundle."
Assert-Contains $index 'ui/ultimate-visual-polish\.css\?v=4' "Final visual polish stylesheet is not loaded by index.html with the current cache version."
Assert-Contains $serviceWorker 'ui/ultimate-visual-polish\.css' "Final visual polish stylesheet is not precached."
Assert-Contains $analytics 'class="anv-grid anv-grid-primary"' "Analytics still uses a generic primary class that inherits button styling."
Assert-Contains $analytics 'class="anv-grid anv-grid-secondary"' "Analytics still uses a generic secondary class that can inherit control styling."
Assert-Contains $foundation '\.anv-grid\.anv-grid-primary' "Analytics primary grid does not use a namespaced selector."
Assert-Contains $foundation '\.anv-grid\.anv-grid-secondary' "Analytics secondary grid does not use a namespaced selector."

if ($analytics -match 'class="anv-grid\s+(primary|secondary|tertiary)"') {
  $failures.Add("Analytics grid levels still use global utility class names.")
}

$polishIndex = $index.IndexOf('ui/ultimate-visual-polish.css')
$previousLayerIndex = $index.IndexOf('ui/ux-final-polish.css')
if ($polishIndex -lt 0 -or $polishIndex -lt $previousLayerIndex) {
  $failures.Add("Final visual polish stylesheet must load after ux-final-polish.css.")
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  throw "Visual polish contract failed with $($failures.Count) issue(s)."
}

Write-Host "Visual polish contract: PASS"
