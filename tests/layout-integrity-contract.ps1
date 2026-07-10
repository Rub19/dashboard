$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$stylePath = Join-Path $root "ui\layout-integrity.css"
$indexPath = Join-Path $root "index.html"
$workerPath = Join-Path $root "sw.js"
$aiEverywherePath = Join-Path $root "services\ai\everywhere.js"
$brainOsGlobalPath = Join-Path $root "services\ai\brain-os-global.js"
$brainEverywherePath = Join-Path $root "services\os\brain-everywhere.js"
$notesStylePath = Join-Path $root "ui\notes-v2.css"
$qaRepairPath = Join-Path $root "core\qa-repair.js"
$lazyModulesPath = Join-Path $root "core\lazy-modules.js"
$bootPath = Join-Path $root "core\boot.js"
$healthPath = Join-Path $root "pages\health\index.js"
$dashboardShellPath = Join-Path $root "pages\dashboard\shell.js"
$sidebarFinalPath = Join-Path $root "pages\dashboard\sidebar-final.js"
$sidebarResizePath = Join-Path $root "pages\dashboard\resizable-sidebar.js"
$mobileSidebarPath = Join-Path $root "pages\dashboard\mobile-sidebar.js"
$navigationPath = Join-Path $root "actions\legacy-navigation.js"
$keyboardFirstPath = Join-Path $root "ui\keyboard-first.js"
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Contains([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) {
    $failures.Add($message)
  }
}

if (-not (Test-Path -LiteralPath $stylePath)) {
  $failures.Add("Missing ui/layout-integrity.css.")
  $style = ""
} else {
  $style = Get-Content -Raw -LiteralPath $stylePath
}

$index = Get-Content -Raw -LiteralPath $indexPath
$worker = Get-Content -Raw -LiteralPath $workerPath
$aiEverywhere = Get-Content -Raw -LiteralPath $aiEverywherePath
$brainOsGlobal = Get-Content -Raw -LiteralPath $brainOsGlobalPath
$brainEverywhere = Get-Content -Raw -LiteralPath $brainEverywherePath
$notesStyle = Get-Content -Raw -LiteralPath $notesStylePath
$qaRepair = Get-Content -Raw -LiteralPath $qaRepairPath
$lazyModules = Get-Content -Raw -LiteralPath $lazyModulesPath
$boot = Get-Content -Raw -LiteralPath $bootPath
$health = Get-Content -Raw -LiteralPath $healthPath
$dashboardShell = Get-Content -Raw -LiteralPath $dashboardShellPath
$sidebarFinal = Get-Content -Raw -LiteralPath $sidebarFinalPath
$sidebarResize = Get-Content -Raw -LiteralPath $sidebarResizePath
$mobileSidebar = Get-Content -Raw -LiteralPath $mobileSidebarPath
$navigation = Get-Content -Raw -LiteralPath $navigationPath
$keyboardFirst = Get-Content -Raw -LiteralPath $keyboardFirstPath

Assert-Contains $index 'ui/layout-integrity\.css\?v=' "Layout integrity stylesheet is not loaded by index.html."
Assert-Contains $worker 'ui/layout-integrity\.css' "Layout integrity stylesheet is not precached."

$layoutIndex = $index.IndexOf('ui/layout-integrity.css')
$polishIndex = $index.IndexOf('ui/onboarding-premium-final.css')
if ($layoutIndex -lt 0 -or $layoutIndex -lt $polishIndex) {
  $failures.Add("Layout integrity stylesheet must load after the final visual layers.")
}

Assert-Contains $style 'body:has\(#ethone-brain-everywhere-root\)[^{]*#brain-os-orb' "Duplicate Brain OS launcher is not isolated when Brain Everywhere is mounted."
Assert-Contains $style '#brain-os-orb[^{]*\{[^}]*display\s*:\s*none\s*!important' "Duplicate Brain OS launcher is not removed from layout flow."
Assert-Contains $style 'body\.ethone-dashboard-v4\s+#ethone-brain-everywhere-root[^{]*\{[^}]*display\s*:\s*none\s*!important' "Dashboard still mounts a redundant floating Brain launcher above its native Brain controls."
Assert-Contains $style '@media\s*\(max-width\s*:\s*768px\)[\s\S]*#ethone-brain-everywhere-root[^{]*\{[^}]*display\s*:\s*none\s*!important' "Mobile keeps a floating Brain launcher above the persistent Brain navigation action."
Assert-Contains $style '@media\s*\(max-width\s*:\s*768px\)[\s\S]*\.brain-everywhere-strip[^{]*\{[^}]*display\s*:\s*none\s*!important' "Mobile keeps a full Brain context strip above the persistent Brain navigation action."
Assert-Contains $style '@media\s*\(max-width\s*:\s*768px\)[\s\S]*#aie-suggestion-stack[^{]*\{[^}]*display\s*:\s*none\s*!important' "Mobile contextual suggestions can still cover primary content."
Assert-Contains $style 'body\.ethone-mobile\s+\.modal-overlay\.open\s*>\s*\.modal[^{]*\{[^}]*height\s*:\s*auto\s*!important' "Mobile dialogs can still inherit a forced full-viewport height and leave empty space."
Assert-Contains $style 'body\.ethone-mobile\s+\.modal-overlay\.open\s*>\s*\.modal[^{]*\{[^}]*max-height\s*:\s*calc\(100dvh' "Mobile dialogs are not bounded to the visible viewport."
Assert-Contains $style 'body\.ethone-mobile\s+#notif-panel\.notification-center\.open[^{]*\{[^}]*top\s*:\s*calc\(58px' "Mobile Notification Center can still render under the fixed top bar."
Assert-Contains $style 'body\.ethone-mobile\s+#notif-panel\.notification-center\.open[^{]*\{[^}]*bottom\s*:\s*calc\(88px' "Mobile Notification Center can still render under the persistent navigation dock."
Assert-Contains $style 'body\.ethone-mobile\s+#notif-panel\s+\.nc2-filter-row[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important' "Mobile Notification Center filters still require a clipped horizontal rail."
Assert-Contains $style '#notif-panel\.notification-center-v2\s+\.nc2-filter-row[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important[^}]*overflow\s*:\s*visible\s*!important' "Notification Center filters still allow a hidden horizontal rail."
Assert-Contains $style '@media\s*\(max-width:768px\)[\s\S]*#page-widget-marketplace\s+\.wm-toolbar[^{]*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)\s*!important' "The mobile Widget Marketplace toolbar can restore desktop-width columns."
Assert-Contains $style 'body\.ethone-mobile:has\(#notif-panel\.open\)\s+#ethone-ux-status[^{]*\{[^}]*bottom\s*:\s*calc\(152px' "Transient save feedback can still cover Notification Center footer actions."
Assert-Contains $style 'body\.ethone-mobile\s+#cmd-footer[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(3,minmax\(0,1fr\)\)\s*!important' "Mobile Command Palette footer can still clip its shortcut hints."
Assert-Contains $style 'body\.ethone-mobile\s+#cmd-footer\s*>\s*span[^{]*\{[^}]*font-size\s*:\s*0\s*!important' "Mobile Command Palette still renders desktop shortcut descriptions in a constrained footer."
Assert-Contains $style '#page-files\s+\.files-tools[^{]*\{[^}]*flex-wrap\s*:\s*wrap\s*!important' "Files toolbar still relies on horizontal overflow on narrow screens."
Assert-Contains $style '#page-kanban\s+\.kanban-board[^{]*\{[^}]*grid-template-columns\s*:\s*1fr\s*!important' "Kanban does not collapse to a single mobile column."
Assert-Contains $style '#page-marketplace\s+\.mp41-shell\s*>\s*\*[^{]*\{[^}]*min-width\s*:\s*0\s*!important' "Marketplace children can still expand the mobile layout through intrinsic width."
Assert-Contains $style '#page-marketplace\s+\.mp-store-categories[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important' "Marketplace categories still require horizontal scrolling on mobile."
Assert-Contains $style '#page-activity\s+\.aic-hour[^{]*\{[^}]*min-width\s*:\s*0\s*!important' "Activity chart columns still inherit the global button minimum width."
Assert-Contains $style '#page-versions\s+\.version-filterbar[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important' "Version Center filters still overflow as a mobile rail."
Assert-Contains $style '#page-widget-marketplace[\s\S]*\.wm-grid[\s\S]*min-width\s*:\s*0\s*!important' "Widget Marketplace grid children can still expand their mobile track."
Assert-Contains $style '#page-widget-marketplace\s+\.wm-card[^{]*\{[^}]*white-space\s*:\s*normal\s*!important' "Interactive Widget Marketplace cards still inherit compact button text clipping."
Assert-Contains $style '#page-widget-marketplace\s+\.wm-rating\s+button[^{]*\{[^}]*padding\s*:\s*0\s*!important' "Widget rating controls still inherit generic button padding."
Assert-Contains $style '#page-widget-marketplace\s+\.wm-tabs[^{]*\{[^}]*grid-column\s*:\s*1\s*/\s*-1\s*!important' "Widget Marketplace category tabs can still retain a clipped horizontal scroll state."
Assert-Contains $style '#page-marketplace\s+:where\(\.mp-brain-card,\.mp-store-card\)[^{]*\{[^}]*display\s*:\s*grid\s*!important' "Marketplace interactive cards still inherit the generic button flex layout."
Assert-Contains $style '#page-marketplace\s+\.mp-brain-card[^{]*\{[^}]*grid-template-columns\s*:\s*44px\s+minmax\(0,1fr\)\s+auto\s*!important' "Marketplace recommendation cards can still collapse their install action into adjacent cards."
Assert-Contains $style '#page-marketplace\s+\.mp-store-card[^{]*\{[^}]*grid-template-columns\s*:\s*132px\s+minmax\(0,1fr\)\s*!important' "Marketplace catalog cards can still lose their preview/content grid."
Assert-Contains $style '#page-versions\s+\.version-filterbar[^{]*\{[^}]*flex-wrap\s*:\s*wrap' "Version Center filters can still leave the desktop viewport."
Assert-Contains $style '#ethone-quality-toast[\s\S]*top\s*:\s*70px\s*!important' "Mobile quality toasts can still cover bottom navigation controls."
Assert-Contains $style 'height\s*:\s*calc\(100dvh\s*-\s*96px\)\s*!important' "Mobile content scroll surface does not reserve the persistent navigation dock."
Assert-Contains $style '#main-content[^{]*\{[^}]*padding-bottom\s*:' "Main scroll surface has no floating-control clearance."
Assert-Contains $style 'scroll-padding-bottom\s*:' "Main scroll surface has no scroll safe area."
Assert-Contains $style '#aie-suggestion-stack[^{]*\{[^}]*position\s*:\s*relative\s*!important' "Contextual Brain suggestions can still float above page controls."
Assert-Contains $style '@media\s*\(max-width\s*:\s*1024px\)' "Tablet and mobile shell contract is missing."
Assert-Contains $style 'body\.ethone-dashboard-v4\s+#page-dashboard\s+\.d4-widgetgrid[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important' "Tablet Dashboard V4 grid can still be forced into four narrow tracks by a legacy polish layer."
Assert-Contains $style '#d4-widget-grid\s*>\s*\[data-widget-id\][^{]*\{[^}]*grid-column\s*:\s*1\s*/\s*-1\s*!important' "Tablet dashboard widgets can still collapse into half-width cells."
Assert-Contains $style '#app-shell[^{]*\{[^}]*width\s*:\s*100%\s*!important' "AppShell is not guaranteed to fill narrow viewports."
Assert-Contains $style '#main-sidebar[^,{]*:not\(\.mobile-open\)[^{]*\{[^}]*pointer-events\s*:\s*none\s*!important' "Closed off-canvas sidebar can still capture pointer events."
Assert-Contains $style '#main-sidebar[^,{]*:not\(\.mobile-open\)[^{]*\{[^}]*visibility\s*:\s*hidden\s*!important' "Closed off-canvas sidebar remains exposed to hit testing."
Assert-Contains $style 'body\.ethone-dashboard-mounted\s+#ethone-spaces-root\s*>\s*\.space-switcher-button[^{]*\{[^}]*display\s*:\s*none\s*!important[^}]*pointer-events\s*:\s*none\s*!important' "Redundant floating Spaces launcher can cover sidebar or live-panel controls."

if ($style -match 'transition\s*:\s*all') {
  $failures.Add("Layout integrity stylesheet uses transition: all.")
}

Assert-Contains $aiEverywhere 'MAX_VISIBLE_SUGGESTIONS\s*=\s*1' "Contextual suggestion stack is not capped to one visible card."
Assert-Contains $aiEverywhere 'trimSuggestionStack' "Contextual suggestions are not reconciled before rendering."
Assert-Contains $aiEverywhere 'insertAdjacentElement\("afterend",stack\)' "Contextual suggestions are not mounted in the active page flow."
Assert-Contains $aiEverywhere 'activeSuggestionStack[\s\S]*ensureSuggestionStack\(\)' "Active Brain suggestions are not rehomed after navigation."
Assert-Contains $aiEverywhere 'state\.suggestions\.delete' "Dismissed suggestions remain retained indefinitely."
Assert-Contains $aiEverywhere 'function\s+hasCanonicalBrainStrip' "AI Everywhere cannot detect the canonical Brain surface."
Assert-Contains $aiEverywhere 'hasCanonicalBrainStrip\(page\)[\s\S]*bar\.remove\(\)' "AI Everywhere can leave its legacy page action row beside the canonical Brain strip."
Assert-Contains $aiEverywhere 'function\s+pageContextSuggestion\(\)[\s\S]*hasCanonicalBrainStrip\(pageElement\)[\s\S]*return' "Generic page-help suggestions still duplicate the canonical Brain surface."
Assert-Contains $brainOsGlobal 'renderPageStrip\(ctx\)[\s\S]*brain-everywhere-strip[\s\S]*legacyStrip\.remove\(\)' "Brain OS can still mount a second context strip beside Brain Everywhere."
Assert-Contains $brainEverywhere '\.tab-content\.active\[id\^=''page-''\]' "Brain Everywhere does not cover every active application page."
Assert-Contains $brainEverywhere 'querySelectorAll\("\.brain-os-strip,\.aie-page-actions\[data-aie-page-actions\]"\)[\s\S]*remove\(\)' "The canonical Brain strip does not clean late-mounted legacy context rows."
Assert-Contains $notesStyle '\.notes-editor-head[^{]*\{[^}]*grid-template-areas\s*:\s*"title actions"\s*"meta actions"' "Notes title and metadata still share an overlapping grid row."
Assert-Contains $notesStyle '\.notes-title-input[^{]*\{[^}]*grid-area\s*:\s*title[^}]*width\s*:\s*100%' "Notes title input can still overflow its grid track."
Assert-Contains $notesStyle '@media\(max-width:620px\)[\s\S]*\.notes-editor-head[^{]*\{[^}]*grid-template-areas\s*:\s*"title"\s*"meta"\s*"actions"' "Notes editor header does not stack cleanly on mobile."
Assert-Contains $qaRepair 'showSidebarForLayout' "QA visibility repair has no responsive sidebar guard."
Assert-Contains $qaRepair 'matchMedia\([''"]\(max-width:\s*1024px\)[''"]\)' "QA visibility repair does not detect the off-canvas breakpoint."
Assert-Contains $qaRepair 'removeProperty\([''"]visibility[''"]\)' "QA visibility repair leaves an inline visibility override on the closed sidebar."
Assert-Contains $lazyModules '"widget-marketplace"\s*:\s*\["marketplace",\s*"widgets"\]' "Widget Marketplace cannot lazy-load from a direct route."
Assert-Contains $boot 'closedMobileSidebar' "Dashboard boot does not isolate the closed mobile sidebar."
Assert-Contains $boot 'closedMobileSidebar[\s\S]*removeProperty\([''"]visibility[''"]\)' "Dashboard boot leaves an inline visibility override on the closed mobile sidebar."
Assert-Contains $health 'Date\.now\(\)-storageEstimateAt\s*>\s*60000' "Health storage diagnostics can still trigger an unbounded render loop."
Assert-Contains $health '!hadEstimate[\s\S]*setTimeout\(renderHealthPage,0\)' "Health does not bound its initial asynchronous storage refresh."
Assert-Contains $dashboardShell 'id="sidebar-nav-main"[^>]*role="navigation"[^>]*tabindex="0"' "Sidebar navigation scroll surface is not keyboard focusable."
Assert-Contains $sidebarFinal 'closest\("#sidebar-nav-main,#sidebar-nav-account"\)\|\|sb' "Sidebar keyboard navigation is not scoped to its active header, navigation, or footer region."
Assert-Contains $sidebarFinal 'scope\.id\s*===\s*"sidebar-nav-main"[\s\S]*scope\.scrollTo' "Sidebar Home and End keys do not reach the navigation scroll boundaries."
Assert-Contains $sidebarResize 'document\.addEventListener\("pointermove",move\)' "Sidebar resize can stop tracking when pointer capture is interrupted."
Assert-Contains $sidebarResize 'document\.addEventListener\("pointerup",end\)' "Sidebar resize can leave a click-blocking dragging state after pointer release."
Assert-Contains $sidebarResize 'document\.addEventListener\("mousemove",move\)' "Hybrid pointer/mouse resize sequences can lose movement events."
Assert-Contains $sidebarResize 'document\.addEventListener\("mouseup",end\)' "Hybrid pointer/mouse resize sequences can retain pointer capture after release."
Assert-Contains $mobileSidebar 'function\s+syncMobileSidebarA11y' "Mobile sidebar visual and accessibility states are not synchronized."
Assert-Contains $mobileSidebar 'sidebar\.setAttribute\(''aria-hidden'',open\?''false'':''true''\)' "Open mobile sidebar remains hidden from assistive technology."
Assert-Contains $mobileSidebar 'button\.setAttribute\(''aria-expanded'',open\?''true'':''false''\)' "Mobile sidebar trigger does not expose its expanded state."
Assert-Contains $mobileSidebar 'function\s+checkMobileLayout\(\)[\s\S]*syncMobileSidebarA11y\(sidebar,isOpen\)' "Responsive layout changes do not synchronize the off-canvas sidebar accessibility state."
Assert-Contains $mobileSidebar 'if\(!usesOffCanvas\)[\s\S]*sidebar\.removeAttribute\(''aria-hidden''\)' "Returning to desktop does not clear the mobile sidebar accessibility state."
Assert-Contains $mobileSidebar 'DOMContentLoaded[\s\S]*checkMobileLayout\(\)[\s\S]*applyResponsiveSidebar\(\)' "Initial dashboard mount does not reconcile both visual and accessibility sidebar states."
Assert-Contains $style '@media\s*\(max-width\s*:\s*768px\)[\s\S]*\.d4-sd-orb[^{]*\{[^}]*display\s*:\s*none\s*!important' "Decorative dashboard halo still overdraws the mobile viewport."
Assert-Contains $navigation 'page\s*===\s*''dashboard''[\s\S]*ethoneDashboardV4Render' "Returning to Dashboard after a direct-route refresh can leave the page shell empty."
Assert-Contains $keyboardFirst 'function\s+handlePagedScroll' "Sidebar has no explicit Page Up/Page Down keyboard scrolling."
Assert-Contains $keyboardFirst 'function\s+closestScrollSurface' "Nested application scroll surfaces cannot be resolved consistently from keyboard focus."
Assert-Contains $keyboardFirst '#sidebar-nav-main,#page-ai,#main-content,\.modal,\.modal-content,\.modal-body,\.notif-panel-body,\.live-panel-body,\.ai-messages' "AI, modal, notification, and widget scroll surfaces are not covered by keyboard navigation."
Assert-Contains $keyboardFirst 'container\.id\s*===\s*"sidebar-nav-main"' "Home and End can bypass the sidebar roving-focus contract."
Assert-Contains $keyboardFirst 'scrollIntoView\(\{\s*block:\s*"nearest"' "Roving sidebar focus can leave the focused item outside its scroll viewport."
Assert-Contains $keyboardFirst 'explicitCard\s*&&\s*hasNestedControl[\s\S]*\?\s*"group"' "Cards with nested controls still receive an invalid button role."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ }
  throw "Layout integrity contract failed with $($failures.Count) issue(s)."
}

Write-Host "Layout integrity contract: PASS"
