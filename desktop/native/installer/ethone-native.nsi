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

!define NAME "Ethone"
!ifdef TEST
  !define APP_KEY "Software\Rub19\EthoneTest"
  !define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\EthoneTest"
  !define SHORTCUT "Ethone Test"
  !define DEFAULT_DIR "$TEMP\EthoneTest"
  !define RUN_VALUE "EthoneTest"
!else
  !define APP_KEY "Software\Rub19\Ethone"
  !define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ethone"
  !define SHORTCUT "Ethone"
  !define DEFAULT_DIR "$LOCALAPPDATA\Ethone"
  !define RUN_VALUE "Ethone"
!endif
!ifndef OUT
  !define OUT "..\target\release\Ethone_${VERSION}_x64-setup.exe"
!endif

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

Name "${NAME}"
OutFile "${OUT}"
InstallDir "${DEFAULT_DIR}"
InstallDirRegKey HKCU "${APP_KEY}" ""
BrandingText "${NAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${NAME}"
VIAddVersionKey "CompanyName" "Rub19"
VIAddVersionKey "FileDescription" "Installation d'${NAME}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Rub19"

Var Passive
Var Relaunch

!define MUI_ICON "..\app\assets\ethone.ico"
!define MUI_UNICON "..\app\assets\ethone.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\ethone.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Ouvrir ${NAME}"

!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWhenPassive
!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWhenPassive
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWhenPassive
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "English"

Function SkipWhenPassive
  ${If} $Passive == 1
    Abort
  ${EndIf}
FunctionEnd

Function .onInit
  StrCpy $Passive 0
  StrCpy $Relaunch 0
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/P" $1
  ${IfNot} ${Errors}
    StrCpy $Passive 1
  ${EndIf}
  ClearErrors
  ${GetOptions} $0 "/UPDATE" $1
  ${IfNot} ${Errors}
    StrCpy $Passive 1
  ${EndIf}
  ClearErrors
  ${GetOptions} $0 "/R" $1
  ${IfNot} ${Errors}
    StrCpy $Relaunch 1
  ${EndIf}
  ${If} ${Silent}
    StrCpy $Passive 1
  ${EndIf}
  ${If} $Passive == 1
    SetAutoClose true
  ${EndIf}
FunctionEnd

Section "Ethone" Main
  SectionIn RO
  !ifndef TEST
    nsExec::Exec 'taskkill /IM ethone.exe /F'
    nsExec::Exec 'taskkill /IM ethone-native.exe /F'
    Sleep 800
  !endif
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "/oname=ethone.exe" "${EXE}"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortCut "$SMPROGRAMS\${SHORTCUT}.lnk" "$INSTDIR\ethone.exe"
  WriteRegStr HKCU "${APP_KEY}" "" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Rub19"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "MainBinaryName" "ethone.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" '"$INSTDIR\ethone.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" '"$INSTDIR"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  ${If} $Relaunch == 1
    Exec '"$INSTDIR\ethone.exe"'
  ${EndIf}
SectionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

Section "Uninstall"
  !ifndef TEST
    nsExec::Exec 'taskkill /IM ethone.exe /F'
    Sleep 800
  !endif
  Delete "$INSTDIR\ethone.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\${SHORTCUT}.lnk"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "${APP_KEY}"
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${RUN_VALUE}"
  ${If} $0 != ""
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${RUN_VALUE}"
  ${EndIf}
SectionEnd
