$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root "widgets\pomodoro.js"
$content = Get-Content -Raw -LiteralPath $path

if ($content -match '\buiLang\b') {
  throw "Pomodoro still depends on the removed uiLang global."
}
if ($content -notmatch 'function\s+pomoLanguage\s*\(') {
  throw "Pomodoro has no local language resolver."
}
if ($content -notmatch 'window\._lang') {
  throw "Pomodoro language resolver does not use the current ETHONE language."
}
if ($content -match '(?<!PomoDesktop)\bsendNotif\s*\(') {
  throw "Pomodoro still calls the optional sendNotif global directly."
}
if ($content -notmatch 'function\s+sendPomoDesktopNotification\s*\(') {
  throw "Pomodoro has no safe desktop notification adapter."
}

Write-Host "Pomodoro language contract: PASS"
