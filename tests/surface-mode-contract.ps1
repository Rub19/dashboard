$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$profile = Get-Content -Raw -LiteralPath (Join-Path $root "state\profile.js")
$boot = Get-Content -Raw -LiteralPath (Join-Path $root "core\boot.js")
$foundation = Get-Content -Raw -LiteralPath (Join-Path $root "ui\app-foundation.css")
$index = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

Assert-Match $profile "function\s+enterDashboard[\s\S]*?ethoneSetSurfaceVisible\('auth-screen','none'\)" "Dashboard entry does not unmount the auth surface."
Assert-Match $profile "function\s+enterDashboard[\s\S]*?ethoneSetSurfaceVisible\('app-shell','css'\)" "Dashboard entry does not restore the CSS-owned AppShell layout through the surface manager."
Assert-Match $profile "function\s+enterDashboard[\s\S]*?ethoneSetSurfaceVisible\('main-sidebar','flex'\)" "Dashboard entry does not restore sidebar opacity and visibility through the surface manager."
Assert-Match $profile "function\s+enterDashboard[\s\S]*?ethoneSetSurfaceVisible\('main-content','block'\)" "Dashboard entry does not restore main content opacity and visibility through the surface manager."
Assert-Match $profile "function\s+goToProfileScreen[\s\S]*?ethoneSetSurfaceVisible\('app-shell','none'\)" "Profile transition leaves the AppShell mounted behind the profile surface."
Assert-Match $profile "function\s+goToProfileScreen[\s\S]*?ethoneSetSurfaceVisible\('main-sidebar','none'\)" "Profile transition bypasses the surface manager for the sidebar."
Assert-Match $profile "function\s+goToProfileScreen[\s\S]*?ethoneSetSurfaceVisible\('profile-screen','flex'\)" "Profile transition bypasses the surface manager for the profile screen."
Assert-Match $boot "function\s+showAuth[\s\S]*?ethoneSetSurfaceVisible\('app-shell','none'\)" "Auth transition leaves the AppShell mounted behind the login surface."
Assert-Match $boot "function\s+showDashboardOrProfiles[\s\S]*?ethoneSetSurfaceVisible\('app-shell','css'\)" "Boot dashboard path does not restore the CSS-owned AppShell layout."
Assert-Match $boot "function\s+ethoneSetSurfaceInert[\s\S]*?'inert'\s+in\s+el[\s\S]*?setAttribute\('inert',''\)" "The surface manager does not provide a safe inert fallback for older browser engines."
Assert-Match $boot "function\s+ethoneSetSurfaceVisible[\s\S]*?ethoneSetSurfaceInert\(el,true\)" "Hidden surfaces are not removed from keyboard and assistive-technology interaction."
Assert-Match $boot "function\s+ethoneSetSurfaceVisible[\s\S]*?ethoneSetSurfaceInert\(el,false\)" "Visible surfaces are not restored to keyboard and assistive-technology interaction."
Assert-Match $boot "if\(display==='css'\)el\.style\.removeProperty\('display'\)" "The surface manager forces a desktop display mode instead of restoring responsive CSS ownership."
Assert-Match $foundation "html\.ethone-auth-mode\s+#app-shell[\s\S]*?pointer-events:none" "CSS does not provide a fail-safe isolation rule for the AppShell outside dashboard mode."
Assert-Match $index "#app-shell[\s\S]*?display:\s*none\s*!important" "The anti-flash layer does not keep AppShell content out of the first paint."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Surface mode contract failed with $($failures.Count) issue(s)."
}

Write-Host "Surface mode contract: PASS"
