$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Read-ProjectFile([string]$relativePath) {
  return Get-Content -Raw -LiteralPath (Join-Path $root $relativePath)
}

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

$safeMode = Read-ProjectFile "core\safe-mode.js"
$events = Read-ProjectFile "core\events.js"
$modals = Read-ProjectFile "components\modals.js"
$isolation = Read-ProjectFile "core\ui-isolation.js"
$settings = Read-ProjectFile "pages\settings\settings-v2.js"
$health = Read-ProjectFile "pages\health\index.js"
$ai = Read-ProjectFile "services\ai\core.js"
$marketplace = Read-ProjectFile "services\marketplace\runtime.js"
$discord = Read-ProjectFile "services\connections\discord.js"
$lastfm = Read-ProjectFile "services\connections\lastfm.js"
$spotify = Read-ProjectFile "services\connections\spotify.js"
$lanyard = Read-ProjectFile "services\connections\lanyard.js"
$profile = Read-ProjectFile "state\profile.js"
$serviceWorker = Read-ProjectFile "sw.js"

Assert-Match $safeMode 'removeEventListener\("ethone:page-ready"' "Deferred page-ready listeners are never removed."
Assert-Match $safeMode 'removeEventListener\("ethone:dashboard-ready"' "Deferred dashboard listeners survive polling timeout."
Assert-Match $events 'stats\s*:\s*stats' "The central event registry cannot report active ownership."
Assert-Match $events 'delete registrations\[registrationKey\]' "Disposed keyed handlers remain retained in the event registry."

Assert-Match $modals 'function closeAllModals\(' "The modal runtime has no bulk lifecycle cleanup."
Assert-Match $modals 'focusEntries' "The modal runtime cannot verify focus-reference cleanup."
Assert-Match $isolation 'closeAllModals' "UI isolation bypasses the modal cleanup API."

Assert-Match $settings 'function stopSettingsClock\(' "Settings keeps its clock timer after leaving the page."
Assert-Match $settings 'event\.detail\.page === "settings"[\s\S]*?else[\s\S]*?stopSettingsClock' "Settings does not stop page-scoped work on navigation."

Assert-Match $health 'function stopHealthSampling\(' "Health sampling has no teardown path."
Assert-Match $health '\.disconnect\(\)' "Health PerformanceObservers are never disconnected."
Assert-Match $health 'page!=="health"[\s\S]*?stopHealthSampling' "Health sampling continues after leaving Health."

Assert-Match $ai 'function deactivateAIPage\(' "ETHONE AI has no page deactivation cleanup."
Assert-Match $ai 'removeEventListener\("click",handleClick\)' "ETHONE AI keeps its delegated click handler while inactive."
Assert-Match $ai 'cancelScheduledMount\(' "ETHONE AI does not cancel delayed mounts when navigation wins the race."

Assert-Match $marketplace 'function deactivateMarketplace\(' "Marketplace has no page deactivation cleanup."
Assert-Match $marketplace 'removeEventListener\("click",handleClick\)' "Marketplace keeps document handlers while inactive."
Assert-Match $marketplace 'clearTimeout\(themePreviewTimer\)' "Marketplace theme preview timers can outlive the page."

Assert-Match $discord 'function disconnectDiscord\(\)\{[\s\S]{0,900}?stopLanyardWS\(\)' "Discord disconnect leaves its WebSocket runtime alive."
Assert-Match $lastfm 'function stopLastfmAutoRefresh\(' "Last.fm has no idempotent refresh teardown."
Assert-Match $lastfm 'function disconnectLastfm\(\)\{[\s\S]{0,900}?stopLastfmAutoRefresh\(\)' "Last.fm disconnect does not stop polling."
Assert-Match $spotify 'function disconnectSpotify\(\)\{[\s\S]{0,900}?stopSpotifyAutoRefresh\(\)' "Spotify disconnect does not stop auto refresh."
Assert-Match $lanyard 'function stopLanyardWS\(\)\s*\{[\s\S]{0,700}?_lanyardUserId\s*=\s*null' "Lanyard stop retains the disconnected user and can reconnect."
Assert-Match $profile 'function goToProfileScreen\(\)[\s\S]{0,500}?stopLanyardWS\(\)' "Returning to profiles closes Lanyard directly and can trigger reconnect."
Assert-Match $profile 'function goToProfileScreen\(\)[\s\S]{0,700}?stopLastfmAutoRefresh\(\)' "Returning to profiles leaves Last.fm polling active."
Assert-Match $profile 'function goToProfileScreen\(\)[\s\S]{0,800}?stopSpotifyPlaybackTimers\(\)' "Returning to profiles leaves music progress timers active."

Assert-Match $serviceWorker 'caches\.keys\(\)[\s\S]*?caches\.delete' "Obsolete service-worker caches are not deleted during activation."

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Memory leak contract failed with $($failures.Count) issue(s)."
}

Write-Host "Memory leak contract: PASS"
