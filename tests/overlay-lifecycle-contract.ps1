$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$spaces = Get-Content -Raw -LiteralPath (Join-Path $root "services\spaces-ui.js")
$shortcuts = Get-Content -Raw -LiteralPath (Join-Path $root "services\keyboard-shortcuts.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

Assert-Match $spaces 'class="spaces-overlay"[^>]+aria-hidden="true"[^>]+inert' "Closed Spaces overlay is not inert before first open."
Assert-Match $spaces 'overlay\.inert=false' "Opening Spaces does not restore interactivity."
Assert-Match $spaces 'overlay\.inert=true' "Closing Spaces leaves a hidden interactive subtree mounted."
Assert-Match $spaces 'document\.addEventListener\("keydown"[\s\S]*?e\.key==="Escape"[\s\S]*?closeOverlay\(\)' "Spaces cannot always be closed from the keyboard with Escape when focus remains on its launcher."
Assert-Match $spaces 'previousFocus' "Spaces does not restore focus to its launcher after closing."
Assert-Match $spaces 'action\.classList\.contains\("spaces-close"\)' "Clicking the Spaces close icon can be ignored when its inner icon is the event target."
Assert-Match $shortcuts 'ETHONESpacesUI[\s\S]*?close' "Global Escape bypasses the Spaces lifecycle cleanup."
Assert-Match $shortcuts 'ETHONESidebarFinal[\s\S]*?closeProfileMenu' "Global Escape leaves the sidebar profile menu open."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Overlay lifecycle contract failed with $($failures.Count) issue(s)."
}

Write-Host "Overlay lifecycle contract: PASS"
