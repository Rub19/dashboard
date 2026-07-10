$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$stylePath = Join-Path $root "ui\onboarding-premium-final.css"
$serviceWorkerPath = Join-Path $root "sw.js"
$firstRunPath = Join-Path $root "services\onboarding\first-run.js"
$flowPath = Join-Path $root "services\ui\flow.js"
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
$firstRun = Get-Content -Raw $firstRunPath
$flow = Get-Content -Raw $flowPath

if (-not (Test-Path $stylePath)) {
  $failures.Add("Missing final onboarding polish stylesheet.")
} else {
  $style = Get-Content -Raw $stylePath

  Assert-Contains $style '#ethone-first-run-root\s*\{' "Onboarding tokens are not isolated to the first-run root."
  Assert-Contains $style '--fron-card-radius\s*:\s*var\(--radius-lg' "Onboarding cards do not use the ETHONE radius system."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-choice[^\{]*\{[^\}]*(display\s*:\s*grid\s*!important|min-height\s*:\s*104px\s*!important)' "Choice cards can still be flattened by global button styles."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-choice[^\{]*\{[^\}]*height\s*:\s*112px\s*!important' "Desktop choice cards do not share a stable height."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-step-link[^\{]*\{[^\}]*display\s*:\s*grid\s*!important' "Progress steps can still be flattened by global button styles."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-btn[^\{]*\{[^\}]*min-height\s*:\s*44px\s*!important' "Onboarding actions do not use the premium control height."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-step-content[^\{]*\{[^\}]*scrollbar-width\s*:\s*none' "The onboarding content still exposes a browser scrollbar."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-step-link\.is-active' "The active onboarding step has no dedicated final state."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-live-preview' "The live preview has no scoped final surface treatment."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-live-preview\.is-preview-updating' "Live preview changes do not use the immersive morph transition."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-launch-shell' "The final ETHONE launch sequence has no isolated shell."
  Assert-Contains $style '@keyframes\s+fron-preview-morph' "The live preview morph animation is missing."
  Assert-Contains $style '@keyframes\s+fron-premium-content-in' "The onboarding step transition is missing."
  Assert-Contains $style '@media\s*\(max-width:\s*900px\)[\s\S]*#ethone-first-run-root\s+\.fron-shell\.fron-shell-v6[^\{]*\{[^\}]*grid-template-columns\s*:\s*1fr\s*!important' "The mobile onboarding can still inherit the two-column shell."
  Assert-Contains $style '@media\s*\(max-width:\s*900px\)[\s\S]*#ethone-first-run-root\s+\.fron-shell-v6\s+\.fron-body[^\{]*\{[^\}]*display\s*:\s*block' "Mobile onboarding sections can still overlap inside an implicit grid."
  Assert-Contains $style '@media\s*\(max-width:\s*900px\)[\s\S]*#ethone-first-run-root\s+\.fron-step-content[^\{]*\{[^\}]*overflow\s*:\s*visible' "Mobile onboarding can still create a nested content scrollbar."
  Assert-Contains $style '@media\s*\(max-width:\s*900px\)[\s\S]*#ethone-first-run-root\s+\.fron-live-preview[^\{]*\{[^\}]*min-height\s*:\s*600px' "The tablet live preview can still clip the full dashboard composition."
  Assert-Contains $style '@media\s*\(max-width:\s*620px\)[\s\S]*#ethone-first-run-root\s+\.fron-live-preview[^\{]*\{[^\}]*min-height\s*:\s*340px' "The mobile live preview can clip its immersive content."
  Assert-Contains $style '@media\s*\(max-height:\s*780px\)[\s\S]*\.fron-live-widget:nth-child\(n\+5\)[^\{]*\{[^\}]*display\s*:\s*none' "Short desktop previews still squeeze all live widgets into unreadable rows."
  Assert-Contains $style '@media\s*\(max-height:\s*780px\)[\s\S]*#ethone-first-run-root\s+\.fron-overlay[^\{]*\{[^\}]*padding\s*:\s*8px' "Short desktop shells can still be clipped by the overlay padding."
  Assert-Contains $style '@media\s*\(max-height:\s*780px\)[\s\S]*\.fron-mini-grid\s+article[^\{]*\{[^\}]*height\s*:\s*66px' "The welcome utility cards still overflow short desktop shells."
  Assert-Contains $style '@media\s*\(max-height:\s*760px\)[\s\S]*\.fron-mini-grid\s+article[^\{]*\{[^\}]*min-height\s*:\s*66px' "The 760px breakpoint still restores oversized welcome cards."
  Assert-Contains $style '#ethone-first-run-root\s+\.fron-live-hero\s*>\s*div[^\{]*\{[^\}]*min-width\s*:\s*0' "The live preview hero can still clip its clock."
  Assert-Contains $style '@media\s*\(prefers-reduced-motion:\s*reduce\)' "The final onboarding layer lacks reduced-motion support."
  Assert-Contains $style 'body\.ethone-first-run-active\s+#ethone-ux-status[^\{]*\{[^\}]*z-index\s*:\s*2147482900' "Global save feedback can still cover the final launch sequence."

  if ($style -match 'transition\s*:\s*all') {
    $failures.Add("The onboarding uses an unbounded transition: all.")
  }
}

Assert-Contains $index 'data-ethone-lazy-style-group="onboarding"[^>]+data-href="\.\/ui\/onboarding-premium-final\.css\?v=10"' "Final onboarding stylesheet is not registered in the onboarding lazy group."
if ($serviceWorker -match 'ui/onboarding-premium-final\.css') {
  $failures.Add("Final onboarding stylesheet must not be part of the boot precache.")
}

$polishIndex = $index.IndexOf('ui/onboarding-premium-final.css')
$globalPolishIndex = $index.IndexOf('ui/ultimate-visual-polish.css')
if ($polishIndex -lt 0 -or $polishIndex -lt $globalPolishIndex) {
  $failures.Add("Final onboarding stylesheet must load after the global visual polish layer.")
}

if ($firstRun -match '(?i)\b(fetch|XMLHttpRequest)\s*\(') {
  $failures.Add("The onboarding must not start network API work during configuration.")
}

Assert-Contains $firstRun 'data-fron-action="close"[^\r\n]{0,180}iconMarkup\("x"\)' "The onboarding close action must use the shared Lucide icon system."
Assert-Contains $firstRun 'event\.key==="Enter"[\s\S]{0,420}action\.click\(\)' "The onboarding does not guarantee keyboard activation for its focused actions."
Assert-Contains $firstRun 'document\.addEventListener\("keydown",handleGlobalKeydown,true\)[\s\S]{0,420}document\.removeEventListener\("keydown",handleGlobalKeydown,true\)' "The onboarding Escape listener is not scoped to the open lifecycle."
Assert-Contains $firstRun 'flow:"personal"[\s\S]{0,180}dashboard:"control"' "The onboarding state does not persist Flow and dashboard composition choices."
Assert-Contains $firstRun 'data-preview-flow=' "The live preview does not expose its active Flow state."
Assert-Contains $firstRun 'data-preview-layout=' "The live preview does not expose its dashboard composition state."
Assert-Contains $firstRun 'function\s+refreshStepOnly' "Onboarding choices still require a full-shell render."
Assert-Contains $firstRun 'if\(isCompleting\)return false' "The final launch sequence is not protected against duplicate completion."
Assert-Contains $firstRun 'function\s+clearLaunchTimers[\s\S]{0,180}clearTimeout' "Launch timers are not centrally cleaned up."
Assert-Contains $firstRun 'function\s+runLaunchSequence' "The final progressive dashboard construction sequence is missing."
Assert-Contains $firstRun 'orderedPreviewWidgets\(st,preferredId\)' "A newly selected widget can remain invisible in the live preview."
Assert-Contains $flow 'setInitial:\s*setInitialFlow' "The Flow runtime cannot accept an onboarding selection without applying a full Flow layout."

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  throw "Onboarding premium contract failed with $($failures.Count) issue(s)."
}

Write-Host "Onboarding premium contract: PASS"
