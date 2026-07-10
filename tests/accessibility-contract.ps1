$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$accessibility = Get-Content -Raw -LiteralPath (Join-Path $root "ui\accessibility.js")
$keyboard = Get-Content -Raw -LiteralPath (Join-Path $root "ui\keyboard-first.js")
$keyboardCss = Get-Content -Raw -LiteralPath (Join-Path $root "ui\keyboard-first.css")
$designSystem = Get-Content -Raw -LiteralPath (Join-Path $root "ui\design-system-6.css")
$uxFinal = Get-Content -Raw -LiteralPath (Join-Path $root "ui\ux-final-polish.css")
$themeEngine = Get-Content -Raw -LiteralPath (Join-Path $root "services\theme\engine.js")
$finishPass = Get-Content -Raw -LiteralPath (Join-Path $root "ui\finish-pass.js")
$index = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
$authCss = Get-Content -Raw -LiteralPath (Join-Path $root "ui\auth.css")
$modals = Get-Content -Raw -LiteralPath (Join-Path $root "components\modals.js")
$auth = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\premium-experience.js")
$authInteractivity = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\interactivity.js")
$authProduction = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\production.js")
$sidebar = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\shell.js")
$sidebarFinal = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\sidebar-final.js")
$shortcuts = Get-Content -Raw -LiteralPath (Join-Path $root "services\keyboard-shortcuts.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

function Assert-NoMatch([string]$content, [string]$pattern, [string]$message) {
  if ($content -match $pattern) { $failures.Add($message) }
}

# One semantic runtime owns screen-reader state while keyboard-first owns activation.
Assert-Match $accessibility 'function\s+syncLandmarks' "The accessibility runtime does not normalize application landmarks."
Assert-Match $accessibility 'function\s+syncSurfaceVisibility' "Inactive application surfaces are not removed from the accessibility tree."
Assert-Match $accessibility 'function\s+syncNavigation' "Navigation state is not synchronized for assistive technology."
Assert-Match $accessibility 'function\s+syncDisclosures' "Disclosure controls have no shared aria-expanded/aria-controls synchronization."
Assert-Match $accessibility 'function\s+syncLiveRegions' "Application feedback has no shared live-region contract."
Assert-Match $accessibility 'function\s+symbolicButtonLabel' "Symbol-only and emoji-only buttons can remain unnamed."
Assert-Match $accessibility '\.inert\s*=|setAttribute\(["'']inert' "Hidden pages and overlays are not made inert."
Assert-Match $accessibility 'removeAttribute\(["'']aria-current["'']\)' "Inactive navigation items expose aria-current=false instead of omitting the state."
Assert-Match $accessibility 'aria-expanded' "Expandable controls do not expose their current state."
Assert-Match $accessibility 'aria-controls' "Expandable controls are not related to their controlled surface."
Assert-Match $accessibility 'ETHONEAccessibility' "The accessibility runtime does not expose a diagnostics API."
Assert-Match $accessibility 'audit\s*:' "There is no reusable accessibility audit for release QA."
Assert-NoMatch $accessibility '\.theme-creator-overlay\.open' "Dynamically mounted creator dialogs are invisible to global Escape handling."
Assert-Match $accessibility 'lastStableFocus' "Generic overlays do not restore focus to their launcher."
Assert-Match $accessibility 'function\s+trapTopLayerFocus' "Dynamically mounted dialogs do not contain keyboard focus."

# Native keyboard behavior must remain intact.
Assert-Match $keyboard 'event\.key\s*!==\s*["'']Enter["''][\s\S]*?event\.key\s*!==\s*["''] ["'']' "Promoted controls do not support both Enter and Space."
Assert-Match $keyboard 'closest\(["'']\[inert\],\[aria-hidden=' "Keyboard promotion can enter an inert or aria-hidden subtree."
Assert-Match $keyboard 'ensureSkipLink' "There is no skip-to-content affordance."
Assert-Match $keyboard 'ROVING_CONTAINERS[\s\S]*?\[role=''tablist''\]' "Generic tablists do not support arrow-key navigation."
Assert-Match $keyboard '\[role=''radio''\]' "Radio-style choices cannot be activated from the keyboard."

# Modal lifecycle: focus containment, restoration, Escape and default Enter action.
Assert-Match $modals 'modalFocusStack' "Nested dialogs overwrite a single return-focus target."
Assert-Match $modals 'modal\.inert\s*=\s*false' "Opening a modal does not remove inert."
Assert-Match $modals 'modal\.inert\s*=\s*true' "Closing a modal leaves hidden controls keyboard reachable."
Assert-Match $modals 'e\.key\s*===\s*["'']Escape["'']' "Escape does not close dialogs."
Assert-Match $modals 'e\.key\s*===\s*["'']Enter["'']' "Enter does not trigger a dialog default action."
Assert-Match $modals 'function\s+setItemFieldVisibility' "The shared modal runtime crashes when optional item fields are not mounted."
Assert-Match $shortcuts 'ETHONEAccessibility[\s\S]*?closeTopLayer' "Global Escape bypasses the shared overlay lifecycle."

# Auth remains a real form; Enter must submit without inline-handler dependence.
Assert-Match $auth '<section id="auth-v3-hero" aria-labelledby="auth-v3-title"' "The login product introduction is hidden from screen readers."
Assert-Match $auth '<h2[^>]+id="auth-v3-title"' "The login hero has no stable accessible heading."
Assert-Match $auth '<div class="auth-v3-preview" id="auth-preview" aria-hidden="true" inert' "The decorative dashboard preview pollutes the login reading order."
Assert-NoMatch $authInteractivity 'qsa\(["'']#auth-screen button["'']\)\.forEach\(function\(btn\)\{btn\.type=["'']button["'']' "Auth interactivity converts submit buttons to plain buttons."
Assert-NoMatch $authProduction 'btn\.type\s*===\s*["'']submit["''][\s\S]*?btn\.type\s*=\s*["'']button["'']' "Auth production runtime disables native form submission."

# Sidebar disclosure state must include an explicit relationship and hidden content state.
Assert-Match $sidebar 'aria-controls="sidebar-section-' "Sidebar section headers are not related to their section bodies."
Assert-Match $sidebar 'body\.hidden\s*=\s*collapsed' "Collapsed sidebar groups remain exposed to keyboard and screen readers."
Assert-Match $sidebarFinal 'aria-haspopup["''],["'']menu' "The profile trigger does not identify its popup menu."
Assert-Match $sidebarFinal 'aria-controls["''],["'']sidebar-profile-menu' "The profile trigger is not related to its menu."
Assert-Match $sidebarFinal 'aria-expanded["''],open\?["'']true["'']:["'']false' "The profile trigger does not announce open and closed states."
Assert-Match $sidebarFinal 'node\.inert\s*=\s*!open' "The closed profile menu remains keyboard reachable."
Assert-Match $sidebarFinal 'profileMenuReturnFocus' "Closing the profile menu does not restore focus to its trigger."

# High-contrast OS modes must retain visible focus without relying on glow alone.
Assert-Match $keyboardCss '@media\s*\(prefers-contrast:\s*more\)' "Enhanced contrast preferences are not supported."
Assert-Match $keyboardCss '@media\s*\(forced-colors:\s*active\)' "Windows forced-colors mode is not supported."
Assert-Match $designSystem 'background:\s*linear-gradient\(180deg,\s*var\(--accent-contrast-hover\),\s*var\(--accent-contrast\)\)' "Canonical primary buttons use a violet that fails normal-text contrast with white."
Assert-Match $uxFinal 'var\(--accent-contrast-hover' "The high-specificity polish layer overrides the accessible primary-button contrast."
Assert-Match $themeEngine 'ETHONEColorContrast[\s\S]*?actionPair' "Theme presets do not derive WCAG-safe action colors."
Assert-Match $finishPass 'ETHONEColorContrast[\s\S]*?actionPair' "Custom accent updates can overwrite WCAG-safe action colors."
Assert-Match $index 'utils/color-contrast\.js[\s\S]*?services/theme/engine\.js' "Color contrast utilities load after the theme engine."
Assert-Match $authCss '#auth-card\s+\.lb-btn-primary\s*\{[\s\S]*?linear-gradient\(135deg,\s*var\(--accent-contrast-hover\)' "Login primary buttons override the accessible action palette."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Accessibility contract failed with $($failures.Count) issue(s)."
}

Write-Host "Accessibility contract: PASS"
