use crate::catalog::Detect;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
use winreg::RegKey;

const UNINSTALL_ROOT: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";
const UNINSTALL_ROOT_32: &str = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Installed {
    pub version: String,
    pub dir: Option<PathBuf>,
}

fn unquote(text: &str) -> &str {
    text.trim().trim_matches('"')
}

pub fn read_installed(detect: &Detect) -> Option<Installed> {
    let path = format!(r"{UNINSTALL_ROOT}\{}", detect.uninstall_key);
    let path_32 = format!(r"{UNINSTALL_ROOT_32}\{}", detect.uninstall_key);
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(&path)
        .or_else(|_| RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(&path))
        .or_else(|_| RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(&path_32))
        .ok()?;
    let version: String = key.get_value("DisplayVersion").ok()?;
    let location = key
        .get_value::<String, _>("InstallLocation")
        .ok()
        .map(|text| PathBuf::from(unquote(&text)))
        .filter(|path| !path.as_os_str().is_empty());
    let icon = key
        .get_value::<String, _>("DisplayIcon")
        .ok()
        .and_then(|text| Path::new(unquote(&text)).parent().map(Path::to_path_buf));
    Some(Installed { version, dir: location.or(icon) })
}

pub fn is_listed(output: &str, exe: &str) -> bool {
    let needle = format!("\"{}\"", exe.to_lowercase());
    output.lines().any(|line| line.to_lowercase().starts_with(&needle))
}

pub fn is_running(exe: &str) -> Result<bool, String> {
    let output = Command::new("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {exe}"), "/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err("Impossible de lister les programmes en cours".into());
    }
    Ok(is_listed(&String::from_utf8_lossy(&output.stdout), exe))
}

pub fn launch(detect: &Detect) -> Result<(), String> {
    launch_with(detect, &[])
}

const BLOCKED_BY_ANTIVIRUS: i32 = 225;

fn launch_error(error: &std::io::Error) -> String {
    if error.raw_os_error() == Some(BLOCKED_BY_ANTIVIRUS) {
        "Windows Defender bloque ce fichier. Va dans Sécurité Windows, Historique de protection, pour voir la détection.".to_string()
    } else {
        error.to_string()
    }
}

pub fn launch_with(detect: &Detect, args: &[&str]) -> Result<(), String> {
    let installed = read_installed(detect).ok_or("Application introuvable dans Windows")?;
    let dir = installed.dir.ok_or("Dossier d'installation inconnu")?;
    let exe = dir.join(&detect.exe);
    if !exe.is_file() {
        return Err(format!("Fichier manquant : {}", exe.display()));
    }
    Command::new(&exe)
        .args(args)
        .current_dir(&dir)
        .spawn()
        .map(|_| ())
        .map_err(|e| launch_error(&e))
}

pub fn run_installer(path: &Path, args: &[String]) -> Result<(), String> {
    let status = Command::new(path).args(args).status().map_err(|e| launch_error(&e))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("L'installeur a échoué (code {})", status.code().unwrap_or(-1)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_antivirus_block_is_explained() {
        assert!(launch_error(&std::io::Error::from_raw_os_error(225)).contains("Windows Defender"));
        assert!(!launch_error(&std::io::Error::from_raw_os_error(2)).contains("Windows Defender"));
    }

    #[test]
    fn removes_registry_quotes() {
        assert_eq!(unquote("\"C:\\A B\\\""), "C:\\A B\\");
        assert_eq!(unquote("C:\\A"), "C:\\A");
    }

    #[test]
    fn matches_the_exact_process_name_in_any_language() {
        assert!(is_listed("\"ethra.exe\",\"1\",\"Console\",\"1\",\"1 Ko\"\r\n", "ethra.exe"));
        assert!(is_listed("\"Ethra.EXE\",\"1\"", "ethra.exe"));
        assert!(!is_listed("INFO : aucune tâche en cours.", "ethra.exe"));
        assert!(!is_listed("\"not-ethra.exe\",\"1\"", "ethra.exe"));
    }

    #[test]
    fn a_missing_key_means_not_installed() {
        let detect = Detect { uninstall_key: "Ethone-Clé-Inexistante".into(), exe: "x.exe".into() };
        assert_eq!(read_installed(&detect), None);
    }

    #[test]
    fn this_test_process_is_seen_as_running() {
        let exe = std::env::current_exe().unwrap();
        let name = exe.file_name().unwrap().to_str().unwrap();
        assert!(is_running(name).unwrap());
        assert!(!is_running("ethone-programme-absent.exe").unwrap());
    }
}
