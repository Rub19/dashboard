Unicode true
ManifestDPIAware true
RequestExecutionLevel user
SetCompressor /SOLID lzma

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef EXE
  !define EXE "..\target\release\ethone-native.exe"
!endif
!ifndef OUT
  !define OUT "..\target\release\Ethone-Native-${VERSION}-setup.exe"
!endif

!define NAME "Ethone"
!define FOLDER "Ethone Native"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\EthoneNative"

!include "MUI2.nsh"

Name "${NAME}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\${FOLDER}"
InstallDirRegKey HKCU "${UNINSTALL_KEY}" "InstallLocation"
BrandingText "${NAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${NAME}"
VIAddVersionKey "CompanyName" "Rub19"
VIAddVersionKey "FileDescription" "Installation d'${NAME}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Rub19"

!define MUI_ICON "..\..\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\..\src-tauri\icons\icon.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\ethone-native.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Ouvrir ${NAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function CloseRunning
  nsExec::Exec 'taskkill /IM ethone-native.exe /T'
  Sleep 800
FunctionEnd

Section "Ethone" Main
  SectionIn RO
  Call CloseRunning
  SetOutPath "$INSTDIR"
  File "/oname=ethone-native.exe" "${EXE}"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortCut "$SMPROGRAMS\${NAME}.lnk" "$INSTDIR\ethone-native.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Rub19"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\ethone-native.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM ethone-native.exe /T'
  Sleep 800
  Delete "$INSTDIR\ethone-native.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\${NAME}.lnk"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ethone"
  StrCmp $0 "" done
  StrCpy $1 $0 "" 1
  StrCmp $1 '$INSTDIR\ethone-native.exe" --minimized' 0 done
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ethone"
  done:
SectionEnd
