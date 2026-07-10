$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Read-ProjectFile([string]$relative) {
  $path = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $path)) {
    $failures.Add("Missing file: $relative")
    return ""
  }
  return Get-Content -Raw -LiteralPath $path
}

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

function Assert-NotMatch([string]$content, [string]$pattern, [string]$message) {
  if ($content -match $pattern) { $failures.Add($message) }
}

$optimizer = Read-ProjectFile "ui\animation-optimizer.css"
$index = Read-ProjectFile "index.html"
$motion = Read-ProjectFile "ui\motion-system.js"
$animations = Read-ProjectFile "ui\animations.js"
$micro = Read-ProjectFile "ui\micro-interactions.js"
$living = Read-ProjectFile "pages\dashboard-living.js"
$sidebarTooltip = Read-ProjectFile "pages\dashboard\sidebar-tooltip.js"
$flow = Read-ProjectFile "services\ui\flow.js"
$sw = Read-ProjectFile "sw.js"

Assert-Match $optimizer '--motion-duration:\s*180ms' "The optimizer must define one finite motion duration."
Assert-Match $optimizer '--motion-ease:\s*cubic-bezier\(' "The optimizer must define one finite motion easing."
Assert-Match $optimizer '--motion-loop-duration:\s*1200ms' "Continuous indicators need one separate linear cadence."
Assert-Match $optimizer 'transition-property:\s*none\s*!important' "Legacy transitions must be disabled by default."
Assert-Match $optimizer 'transition-property:\s*transform\s*,\s*opacity\s*!important' "Allowed transitions must use transform and opacity only."
Assert-Match $optimizer ':is\(\s*#auth-screen,\s*#profile-screen,\s*#app-shell' "The final policy must outrank legacy ID-scoped motion rules."
Assert-Match $optimizer '#auth-screen\s+#auth-lang-bar\s+button' "The language switcher must override its legacy double-ID transition."
Assert-Match $optimizer '#app-shell\s+#main-content' "Main content must override legacy double-ID transition rules."
Assert-Match $optimizer '#ethone-skip-main' "The keyboard skip link must follow the compositor-only policy."
Assert-Match $optimizer 'will-change:\s*auto\s*!important' "Permanent will-change declarations must be neutralized."
Assert-Match $optimizer '\.ethone-motion-active[^\{]*\{[^\}]*will-change:\s*transform\s*,\s*opacity\s*!important' "GPU promotion must be scoped to active motion only."
Assert-NotMatch $optimizer 'transition-property:[^;]*(?:width|height|top|left|right|bottom|margin|padding|filter|box-shadow|background)' "The optimizer must never transition layout or paint-heavy properties."

Assert-Match $index '(?s)ui/layout-integrity\.css\?v=\d+.*ui/animation-optimizer\.css\?v=\d+' "The optimizer stylesheet must load after every visual layer."
Assert-Match $index 'ui/motion-system\.js\?v=6' "The optimized motion runtime must be cache-busted."
Assert-Match $sw '2026-07-10-production-v338-readiness' "The service worker cache version must match the production release."
Assert-Match $sw '\./ui/animation-optimizer\.css' "The optimizer stylesheet must be available offline."
Assert-Match $sw '\./ui/motion-system\.js' "The optimized motion runtime must be available offline."

Assert-NotMatch $motion 'filter\s*:' "Web Animations presets must use transform and opacity only."
Assert-NotMatch $motion 'style\.willChange' "The runtime must not leave inline will-change hints behind."
Assert-Match $motion 'ethone-motion-active' "The runtime must promote only currently animating elements."
Assert-Match $motion 'transitionrun' "CSS transitions must receive temporary GPU promotion."
Assert-Match $motion 'animationstart' "CSS animations must receive temporary GPU promotion."
Assert-NotMatch $animations 'requestAnimationFrame\(step\)' "Counters must not run a main-thread frame loop."
Assert-NotMatch $micro 'offsetWidth' "Micro-interactions must not force synchronous layout."
Assert-NotMatch $micro 'addEventListener\("pointermove"' "Decorative pointer tracking must not run continuously."
Assert-NotMatch $living 'requestAnimationFrame\(step\)' "Living dashboard counters must not run a main-thread frame loop."
Assert-NotMatch $sidebarTooltip 'offsetWidth' "Sidebar tooltip motion must not force synchronous layout."
Assert-NotMatch $flow 'void\s+ui\.transition\.offsetWidth' "Flow transitions must not force synchronous layout."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Animation optimizer contract failed with $($failures.Count) issue(s)."
}

Write-Host "Animation optimizer contract: PASS"
