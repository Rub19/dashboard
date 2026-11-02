param([string]$Folder)
$ErrorActionPreference = "Continue"
$log = Join-Path $Folder "result.txt"
$setup = Join-Path $Folder "Ethone-Setup.exe"
$root = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall"
$custom = Join-Path $env:USERPROFILE "Mes Apps\Ethone"
Add-Type -AssemblyName System.Drawing, System.Windows.Forms

function Say($text) { Add-Content -Path $log -Value $text -Encoding UTF8 }
function Key($name) {
  $item = Get-ItemProperty -Path "$root\$name" -ErrorAction SilentlyContinue
  if ($item) { "$($item.DisplayVersion) @ $($item.InstallLocation)" } else { "absent" }
}
function Run($label, $arguments) {
  $process = Start-Process -FilePath $setup -ArgumentList $arguments -Wait -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $Folder "out.txt")
  Say "[$label] exit $($process.ExitCode) : $((Get-Content (Join-Path $Folder 'out.txt') -ErrorAction SilentlyContinue) -join ' | ')"
}
function Shot($name) {
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  [System.Drawing.Graphics]::FromImage($bitmap).CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $Folder "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
}
function Gui($name, $exe) {
  $process = Start-Process -FilePath $exe -PassThru
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Seconds 2
    $webviews = (Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Measure-Object).Count
  } while ($webviews -eq 0 -and -not $process.HasExited -and (Get-Date) -lt $deadline)
  Start-Sleep -Seconds 6
  $process.Refresh()
  $title = if ($process.HasExited) { "exited $($process.ExitCode)" } else { $process.MainWindowTitle }
  $ok = (-not $process.HasExited) -and ($title -ne "Error") -and ($webviews -gt 0)
  Say "[$name] window ok: $ok (title '$title', webview2 processes $webviews)"
  Shot $name
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

$webviewKey = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$webviewRoot = "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application"
$registered = (Get-ItemProperty $webviewKey -ErrorAction SilentlyContinue).pv
Say "webview2 registered: $registered, present: $(Test-Path (Join-Path $webviewRoot "$registered\msedgewebview2.exe"))"
Gui "welcome" $setup

Run "install" @("/S", "/MODULES=kairo,hdv-tracker", "`"/DIR=$custom`"", "/NODESKTOP")
Say "ethone: $(Key 'Ethone')"
Say "kairo: $(Key 'Kairo')"
Say "hdv: $(Key 'HDV Tracker')"
Say "custom exe: $(Test-Path (Join-Path $custom 'ethone.exe'))"
Say "desktop shortcut: $(Test-Path (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Ethone.lnk'))"
Say "journal: $((Get-Content (Join-Path $env:LOCALAPPDATA 'dev.ethone.desktop\logs\operations.jsonl') -ErrorAction SilentlyContinue | Measure-Object -Line).Lines) lines"

Run "again" @("/S", "/MODULES=kairo")
Run "unknown" @("/S", "/MODULES=inconnu")
Run "repair" @("/S", "/NODESKTOP")
Say "ethone after repair: $(Key 'Ethone')"

Gui "maintenance" $setup
Gui "app" (Join-Path $custom "ethone.exe")

$running = Start-Process -FilePath (Join-Path $custom "ethone.exe") -PassThru
Start-Sleep -Seconds 6
Run "uninstall-while-running" @("/S", "/UNINSTALL")
Say "ethone while running: $(Key 'Ethone')"
Stop-Process -Id $running.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Run "uninstall" @("/S", "/UNINSTALL")
Say "ethone after uninstall: $(Key 'Ethone')"
Say "kairo after uninstall: $(Key 'Kairo')"
Say "hdv after uninstall: $(Key 'HDV Tracker')"
Say "custom exe after uninstall: $(Test-Path (Join-Path $custom 'ethone.exe'))"
Say "done"
Set-Content -Path (Join-Path $Folder "done.txt") -Value "done"
shutdown /s /t 5
