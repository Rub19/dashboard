$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$modelPath = Join-Path $root "services\os\mission-control-model.js"
$viewPath = Join-Path $root "ui\mission-control.js"
$stylePath = Join-Path $root "ui\mission-control.css"
$lazyPath = Join-Path $root "core\lazy-modules.js"
$brainContextPath = Join-Path $root "services\brain-os\context-engine.js"
$indexPath = Join-Path $root "index.html"
$workerPath = Join-Path $root "sw.js"
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Contains([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

if (-not (Test-Path -LiteralPath $modelPath)) {
  $failures.Add("Mission Control data model is missing.")
  $model = ""
} else {
  $model = Get-Content -Raw -LiteralPath $modelPath
}

$view = Get-Content -Raw -LiteralPath $viewPath
$style = Get-Content -Raw -LiteralPath $stylePath
$lazy = Get-Content -Raw -LiteralPath $lazyPath
$brainContext = Get-Content -Raw -LiteralPath $brainContextPath
$index = Get-Content -Raw -LiteralPath $indexPath
$worker = Get-Content -Raw -LiteralPath $workerPath

Assert-Contains $model 'ETHONEMissionControlModel' "Mission Control model is not exported."
foreach ($name in @("snapshot", "getSpaces", "getFlows", "getWindows", "getAISessions", "getWidgets", "getDashboards", "getProjects", "search", "reorder", "createSpace")) {
  Assert-Contains $model ("\b" + [regex]::Escape($name) + "\s*:") ("Mission Control model API is missing " + $name + ".")
}
Assert-Contains $model 'normalize\(' "Mission Control fuzzy search has no normalized matching."
Assert-Contains $model 'subsequenceScore' "Mission Control fuzzy search has no subsequence ranking."
Assert-Contains $model 'ethone:mission-control-order:v2' "Mission Control tile order is not persisted."

Assert-Contains $view 'ETHONEMissionControlModel' "Mission Control view bypasses its data model."
foreach ($section in @("spaces", "flows", "windows", "ai", "widgets", "dashboards", "projects")) {
  Assert-Contains $view ('\b' + $section + '\s*:\s*\[') ("Mission Control does not define the " + $section + " section.")
}
Assert-Contains $view 'data-emc-section=\\?"' "Mission Control sections do not expose a stable DOM contract."
Assert-Contains $view 'data-emc-create=["'']space["'']' "Mission Control cannot create a Space in place."
Assert-Contains $view 'data-emc-create=["'']flow["'']' "Mission Control cannot launch Flow creation."
Assert-Contains $view 'dragstart' "Mission Control has no drag and drop support."
Assert-Contains $view 'dragover' "Mission Control does not expose drop targets."
Assert-Contains $view 'addEventListener\(["'']pointerdown["'']\s*,\s*onPointerDown' "Mission Control drag and drop has no pointer/touch path."
Assert-Contains $view 'ArrowDown' "Mission Control has no keyboard result navigation."
Assert-Contains $view 'ArrowUp' "Mission Control has no reverse keyboard navigation."
Assert-Contains $view 'trapFocus' "Mission Control dialog does not trap focus."
Assert-Contains $view 'previousFocus' "Mission Control does not restore focus on close."
Assert-Contains $view 'focusedItemId' "Mission Control does not preserve roving focus across data refreshes."
Assert-Contains $view 'AbortController' "Mission Control does not clean its open-session listeners."
Assert-Contains $view 'requestAnimationFrame' "Mission Control opening is not sequenced through a paint frame."
Assert-Contains $view 'aria-live=["'']polite["'']' "Mission Control search result count is not announced."

Assert-Contains $style '\.emc-environment-grid' "Mission Control environment overview layout is missing."
Assert-Contains $style '\.emc-window-preview' "Mission Control window preview styling is missing."
Assert-Contains $style '\.emc-create-dialog' "Mission Control Space creation dialog styling is missing."
Assert-Contains $style '@media\s*\(max-width\s*:\s*768px\)' "Mission Control mobile breakpoint is missing."
Assert-Contains $style '@media\s*\(prefers-reduced-motion\s*:\s*reduce\)' "Mission Control reduced-motion fallback is missing."
if ($style -match 'transition\s*:\s*all') { $failures.Add("Mission Control uses transition: all.") }

Assert-Contains $lazy 'STABLE_ON_DEMAND_GROUPS\s*=\s*\{[\s\S]*["'']mission-control["'']\s*:\s*true' "Mission Control is still disabled in production mode."
Assert-Contains $lazy 'STABLE_ON_DEMAND_GROUPS\s*=\s*\{[\s\S]*flows\s*:\s*true' "Flows cannot be loaded on demand from Mission Control."
Assert-Contains $lazy 'loadGroup\("mission-control"\)[\s\S]*ETHONEMissionControl\.open' "Mission Control shortcut does not lazy-load the view."
Assert-Contains $lazy 'Ctrl\+Shift\+Space|commandCenterCombo|missionCombo' "Mission Control global shortcut contract is missing."
Assert-Contains $lazy 'missionCombo[\s\S]{0,360}stopImmediatePropagation\(' "Mission Control shortcut does not prevent a second global shortcut handler from opening another interface."
Assert-Contains $brainContext 'keydown[\s\S]{0,180}defaultPrevented' "Brain OS does not yield when Mission Control already owns Ctrl+Shift+Space."
if ($lazy -match 'var\s+missionCombo[\s\S]{0,420}INPUT\|TEXTAREA\|SELECT[^\r\n]*return') {
  $failures.Add("Mission Control shortcut is still blocked while an input is focused.")
}

Assert-Contains $index 'services/os/mission-control-model\.js\?v=' "Mission Control model is not registered as a lazy module."
$modelIndex = $index.IndexOf('services/os/mission-control-model.js')
$viewIndex = $index.IndexOf('ui/mission-control.js')
if ($modelIndex -lt 0 -or $viewIndex -lt 0 -or $modelIndex -gt $viewIndex) {
  $failures.Add("Mission Control model must load before the view.")
}
Assert-Contains $worker 'services/os/mission-control-model\.js' "Mission Control model is not cached for offline use."
Assert-Contains $worker 'ui/mission-control\.js' "Mission Control view is not cached for offline use."
Assert-Contains $worker 'ui/mission-control\.css' "Mission Control styles are not cached for offline use."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Mission Control contract failed with $($failures.Count) issue(s)."
}

Write-Host "Mission Control contract: PASS"
