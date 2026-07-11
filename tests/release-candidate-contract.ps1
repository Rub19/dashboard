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
$livePanelResize = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\live-panel-resize.js")
$releasePolish = Get-Content -Raw -LiteralPath (Join-Path $root "ui\release-polish.js")
$dashboardV4 = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard-v4.js")
$aiCore = Get-Content -Raw -LiteralPath (Join-Path $root "services\ai\core.js")
$workspaces = Get-Content -Raw -LiteralPath (Join-Path $root "services\workspaces.js")
$legacyTheme = Get-Content -Raw -LiteralPath (Join-Path $root "services\theme\legacy.js")
$authDictionary = Get-Content -Raw -LiteralPath (Join-Path $root "services\language\auth-dictionary.js")
$authInteractivity = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\interactivity.js")
$authProduction = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\production.js")
$legacyNavigation = Get-Content -Raw -LiteralPath (Join-Path $root "actions\legacy-navigation.js")
$accessibility = Get-Content -Raw -LiteralPath (Join-Path $root "ui\accessibility.js")
$iconSystem = Get-Content -Raw -LiteralPath (Join-Path $root "ui\icon-system.js")
$layoutIntegrity = Get-Content -Raw -LiteralPath (Join-Path $root "ui\layout-integrity.css")
$mobileRuntime = Get-Content -Raw -LiteralPath (Join-Path $root "ui\mobile.js")
$mobileSidebar = Get-Content -Raw -LiteralPath (Join-Path $root "pages\dashboard\mobile-sidebar.js")
$bootSequence = Get-Content -Raw -LiteralPath (Join-Path $root "core\boot-sequence.js")
$settingsV2 = Get-Content -Raw -LiteralPath (Join-Path $root "pages\settings\settings-v2.js")
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
Assert-Match $commandPalette 'input\.setAttribute\("aria-activedescendant"' "Command Palette does not expose the active option on its focused combobox."
Assert-Match $commandPalette 'nouvelle note' "Command Palette cannot resolve the localized new-note intent."
Assert-Match $index 'data-ethone-lazy-style-group="[^"]*\bonboarding\b[^"]*"[^>]+data-href="\.\/ui\/first-run\.css' "Onboarding styles cannot be loaded independently from the dashboard."
Assert-Match $index 'id="ethone-first-run"[^>]+data-ethone-lazy-group="[^"]*\bonboarding\b[^"]*"' "Onboarding runtime cannot be loaded independently from the dashboard."
Assert-Match $actionRegistry 'register\("onboarding\.open"' "Onboarding command is exposed before a deferred action is registered."
Assert-Match $actionRegistry 'register\("whatsnew\.open"' "What's New command is exposed before a deferred action is registered."
if ($finalProductPolish -match 'setAttribute\(\s*["'']placeholder["'']\s*,\s*["'']Search pages') {
  $failures.Add("Legacy final polish overwrites the localized Command Palette placeholder.")
}

Assert-Match $bootManager 'bootCompletedMs' "Boot Manager does not freeze its completed boot duration."
Assert-Match $bootManager 'ethone:boot-sequence-complete' "Boot Manager is not connected to the boot completion event."
Assert-Match $livePanelResize 'document\.addEventListener\("pointerup",endDrag,true\)' "Widget panel resize can remain captured when the pointer leaves its handle."
Assert-Match $livePanelResize 'lostpointercapture' "Widget panel resize does not clean up lost pointer capture."
Assert-Match $releasePolish 'ETHONENotifications&&typeof window\.ETHONENotifications\.toast' "Release polish still replaces the unified Notification Center toast service."
Assert-Match $notificationJs 'dedupe:"pomo-session-"\+count' "Pomodoro completion notifications use an unstable dedupe key."
Assert-Match $dashboardV4 'quick\(tr\("note"\),"notes\.new"' "Dashboard new-note action only navigates instead of creating a note."
Assert-Match $dashboardV4 'quick\(tr\("market"\),"marketplace\.open"' "Dashboard Marketplace action is still disabled or bypasses the Action Registry."
Assert-Match $dashboardV4 'runAction\("todos\.open"\)' "Dashboard task hero action does not match its visible label."
Assert-Match $aiCore 'role="tablist"' "ETHONE AI manager tabs have no accessible tab semantics."
Assert-Match $aiCore 'updateProvider\(id,[\s\S]*?\{render:false\}\)' "ETHONE AI provider save triggers an unnecessary manager rebuild."
Assert-Match $aiCore 'renderAIManager\(\{force:true\}\);setAIState\("error","Model refresh failed' "ETHONE AI refresh errors are overwritten by the next manager render."
Assert-Match $workspaces 'setProperty\("--primary",accent\)' "Workspace accent does not update the global primary token family."
Assert-Match $workspaces 'setProperty\("--accent-rgb",rgbValue\)' "Workspace accent does not update RGB design tokens."
Assert-Match $legacyTheme 'syncActiveWorkspaceAccent\(hex\)' "Custom accent is not persisted into the active workspace."
Assert-Match $legacyTheme 'syncActiveWorkspaceAccent\(theme\.accent\)' "Theme preset accent is not persisted into the active workspace."
Assert-Match $authDictionary 'registration_success' "Auth dictionary has no dedicated registration success copy."
Assert-Match $authInteractivity 'setErr\(tr\("registration_success"\),true\)' "Interactive registration still displays password-reset feedback."
Assert-Match $authProduction 'setErr\(tr\("registration_success"\),true\)' "Production registration still displays password-reset feedback."
Assert-Match $legacyNavigation "setAttribute\('aria-selected','true'\)" "Settings tabs do not expose their selected state to assistive technology."
Assert-Match $legacyNavigation "s\.setAttribute\('aria-hidden','true'\)" "Inactive Settings panels remain exposed to keyboard and screen readers."
Assert-Match $legacyNavigation 'ETHONEAccessibility\.refresh' "Settings does not refresh accessibility metadata after rendering a tab."
Assert-Match $accessibility 'sidebar-customize-row' "Generated Settings switches are missing accessible label inference."
Assert-Match $accessibility '!tab\.hidden && !tab\.inert && tab\.getAttribute\("aria-hidden"\) !== "true"' "Hidden or inert tabs can still become the selected tab."
Assert-Match $accessibility '\[aria-haspopup\]\[aria-controls\]:not\(\[role=''combobox''\]\)' "Accessibility disclosure sync still overwrites Command Palette combobox state."
Assert-Match $iconSystem 'accessibleLabel\s*=\s*readableLabel\(shell\)' "Icon shells lose their accessible label after replacing placeholder text."
Assert-Match $iconSystem 'isWholeWordPlaceholder' "The icon system still removes complete semantic labels such as Tasks or Save."
Assert-Match $iconSystem 'if \(surroundingText\)[\s\S]*?shell\.setAttribute\("aria-hidden", "true"\)' "Decorative Lucide shells are announced before their visible label."
Assert-Match $layoutIntegrity '@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1180px\)[\s\S]*?#app-shell\.app-shell[\s\S]*?grid-template-columns:\s*var\(--ethone-tablet-rail\)\s+minmax\(0,\s*1fr\)\s+0\s*!important' "Tablet AppShell can still inherit the desktop widgets-panel track and crush the page."
Assert-Match $layoutIntegrity '@media\s*\(max-width:\s*768px\)[\s\S]*?#app-shell\.app-shell[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important' "Mobile AppShell does not enforce a single full-width page track."
Assert-Match $mobileRuntime 'if\(document\.body\)boot\(\)' "Mobile runtime still depends on a DOMContentLoaded event that may already have fired."
Assert-Match $mobileRuntime 'sidebar\.inert=false;[\s\S]*?sidebar\.removeAttribute\("aria-hidden"\)' "Mobile runtime does not restore the desktop sidebar after a viewport change."
Assert-Match $mobileRuntime 'sidebar\.inert=!drawerOpen' "Closed mobile sidebar remains keyboard-accessible."
Assert-Match $mobileSidebar 'sidebar\.inert=!open' "Mobile sidebar toggle does not synchronize inert state."
Assert-Match $bootSequence 'FINALIZE_TIMER=setTimeout\(function\(\)\{finalizeDashboardMount\(cycle\)\},120\)' "Dashboard boot can remain stuck when requestAnimationFrame is throttled."
Assert-Match $bootSequence 'bootBanner\.setAttribute\("aria-hidden","true"\)' "Completed dashboard boot banner remains exposed to assistive technology."
Assert-Match $settingsV2 'if \(!available\)[\s\S]*?button\.setAttribute\("aria-selected", "false"\)' "Hidden experimental Settings tabs can remain selected."
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
