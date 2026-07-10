$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

function Read-ProjectFile([string]$relative) {
  Get-Content -Raw -LiteralPath (Join-Path $root $relative)
}

$index = Read-ProjectFile "index.html"
$store = Read-ProjectFile "state\store.js"
$language = Read-ProjectFile "services\language\index.js"
$theme = Read-ProjectFile "services\theme\engine.js"
$workspaces = Read-ProjectFile "services\workspaces.js"
$navigation = Read-ProjectFile "actions\legacy-navigation.js"
$sidebar = Read-ProjectFile "pages\dashboard\resizable-sidebar.js"

Assert-Match $index '<script src="\.\/state\/store\.js\?v=2"></script>\s*[\r\n]+<script src="\.\/services\/storage\.js"></script>' "State store must load before service facades."

Assert-Match $store 'ETHONEStateConsistency' "Canonical state consistency API is missing."
Assert-Match $store 'ethone:state:v1' "Canonical versioned state key is missing."
Assert-Match $store 'nexus_lang' "Legacy language alias nexus_lang is not preserved."
Assert-Match $store 'ethone_lang' "Legacy language alias ethone_lang is not preserved."
Assert-Match $store 'sb_width' "Legacy sidebar width alias sb_width is not preserved."
Assert-Match $store 'sidebar_width' "Legacy sidebar width alias sidebar_width is not preserved."
Assert-Match $store 'recordNavigation' "Navigation history persistence API is missing."
Assert-Match $store 'popstate' "Back/forward restoration is not wired."

Assert-Match $language 'ETHONEStateConsistency\.setLanguage' "Language facade must write canonical state."
Assert-Match $theme 'ETHONEStateConsistency\.setTheme' "Theme engine must write canonical state."
Assert-Match $workspaces 'ETHONEStateConsistency\.setWorkspace' "Workspace service must write canonical state."
Assert-Match $navigation 'ETHONEStateConsistency\.recordNavigation' "Navigation must record active page state."
Assert-Match $sidebar 'ETHONEStateConsistency\.setSidebar' "Sidebar resize/collapse must write canonical state."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "State consistency contract failed with $($failures.Count) issue(s)."
}

Write-Host "State consistency contract: PASS"
