$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -LiteralPath (Join-Path $root "index.html")
$profileState = Get-Content -Raw -LiteralPath (Join-Path $root "state\profile.js")
$profilePassword = Get-Content -Raw -LiteralPath (Join-Path $root "pages\profile\password.js")
$profileEditor = Get-Content -Raw -LiteralPath (Join-Path $root "pages\profile\editor.js")
$settingsProfile = Get-Content -Raw -LiteralPath (Join-Path $root "pages\settings\profile.js")
$cloudSave = Get-Content -Raw -LiteralPath (Join-Path $root "services\auth\legacy\cloud-save.js")
$timeMachine = Get-Content -Raw -LiteralPath (Join-Path $root "services\time-machine.js")
$memory = Get-Content -Raw -LiteralPath (Join-Path $root "services\memory\central-memory.js")
$hardening = Get-Content -Raw -LiteralPath (Join-Path $root "core\production-hardening.js")
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Match([string]$content, [string]$pattern, [string]$message) {
  if ($content -notmatch $pattern) { $failures.Add($message) }
}

function Assert-NoMatch([string]$content, [string]$pattern, [string]$message) {
  if ($content -match $pattern) { $failures.Add($message) }
}

Assert-Match $index 'utils/security\.js\?v=' "Security runtime is not loaded."
Assert-Match $profileState 'function\s+profileEscapeHTML\s*\(' "Profile rendering does not expose an HTML escape helper."
Assert-Match $profileState 'function\s+profileSafeImageSrc\s*\(' "Profile image rendering does not sanitize image URLs."
Assert-NoMatch $profileState [regex]::Escape("'<div class=""ps-pname"">'+p.name+'</div>'+") "Profile names are still injected as raw HTML."
Assert-NoMatch $profileState 'img src="\$\{p\.avatarImg\}"|img src="\''\s*\+\s*p\.avatarImg' "Profile avatar URLs are still injected without sanitization."

Assert-Match $profilePassword 'ETHONESecurity\.verifyProfileLock' "Profile unlock does not verify hashed profile protection."
Assert-Match $profilePassword 'migrated[\s\S]*?saveStateNow' "Legacy plaintext profile locks are not migrated after successful unlock."
Assert-Match $profileEditor 'ETHONESecurity\.createProfileLock' "Profile creation still stores profile protection values directly."
Assert-Match $settingsProfile 'ETHONESecurity\.createProfileLock' "Settings profile protection still stores protection values directly."
Assert-NoMatch $profileEditor 'pwObj=\{type:\''(?:pin|text)'\'\,value:' "Profile editor still creates plaintext profile lock objects."
Assert-NoMatch $settingsProfile 'p\.password=\{type,value\}' "Settings still persists plaintext profile lock objects."

Assert-Match $profileState 'sanitizeProfilesForPersistence' "Profile persistence does not sanitize profiles before localStorage/sessionStorage."
Assert-Match $cloudSave 'sanitizeProfilesForPersistence' "Cloud save does not sanitize profiles before writing remote state/cache."
Assert-Match $timeMachine 'ETHONESecurity\.sanitizeObject' "Time Machine snapshots are not redacting sensitive fields."
Assert-Match $memory 'ETHONESecurity\.sanitizeObject' "Central Memory snapshots are not redacting sensitive fields."
Assert-Match $hardening 'ethoneSecuritySweepStorage' "Production hardening does not sweep sensitive local/session storage."

$secretRegex = '(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----)'
$files = Get-ChildItem -Path $root -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\(node_modules|artifacts|\.git|\.codex)\\' -and $_.Extension -notmatch '\.(png|jpg|jpeg|webp|gif|ico)$' }
foreach ($file in $files) {
  $content = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction SilentlyContinue
  if ($content -match $secretRegex) {
    $failures.Add("Possible private secret pattern remains in " + $file.FullName.Replace($root + "\", ""))
  }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Host ("FAIL: " + $_) -ForegroundColor Red }
  throw "Security contract failed with $($failures.Count) issue(s)."
}

Write-Host "Security contract: PASS"
