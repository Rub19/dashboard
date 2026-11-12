param([string]$Script = "ethone.txt")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot)
if (Get-Process ethone, ethone-native -ErrorAction SilentlyContinue) { "Ethone est déjà ouvert : rien n'est lancé (l'instance d'essai lui passerait la main)."; exit 2 }
$build = Start-Process cargo -ArgumentList "build","-p","ethone-native","--profile","fast","--features","e2e","-j","4" -NoNewWindow -PassThru -RedirectStandardError "$env:TEMP\ethone-e2e-build.txt"
$build.PriorityClass = "BelowNormal"
$build.WaitForExit()
if (Select-String -Path "$env:TEMP\ethone-e2e-build.txt" -Pattern "^error" -Quiet) { Get-Content "$env:TEMP\ethone-e2e-build.txt" | Select-String "^error" -Context 0,10 | Select-Object -First 3; exit 1 }
$out = Join-Path $env:TEMP "ethone-e2e"
Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
New-Item -ItemType Directory "$out\captures" | Out-Null
$env:ETHONE_DRIVE_OFFSCREEN = "1"
$env:ETHONE_E2E = Join-Path $PSScriptRoot $Script
$env:ETHONE_E2E_LOG = "$out\journal.txt"
$env:ETHONE_E2E_SNAP = "$out\captures"
New-Item -ItemType Directory "$out\exports" | Out-Null
$env:ETHONE_E2E_EXPORT = "$out\exports"
$app = Start-Process "target\fast\ethone-native.exe" -PassThru -WindowStyle Hidden
$app.PriorityClass = "BelowNormal"
$app.WaitForExit()
Get-Content "$out\journal.txt" -Encoding utf8
Get-ChildItem "$out\exports" -ErrorAction SilentlyContinue | ForEach-Object { "export : {0} ({1} octets)" -f $_.Name, $_.Length }
"Captures : $out\captures"
