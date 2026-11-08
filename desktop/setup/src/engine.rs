use crate::action::{decide, Action, Facts};
use crate::catalog::{Detect, Module};
use crate::{feed, install, journal, system};
use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
const PAYLOAD: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/payload.exe"));
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn ethone() -> Detect {
    Detect { uninstall_key: "Ethone".into(), exe: "ethone.exe".into(), legacy: None }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RowStatus {
    Available,
    Update,
    Installed,
    Running,
    Manual,
    Web,
    Unavailable,
}

pub fn row_status(action: Action) -> RowStatus {
    match action {
        Action::Install => RowStatus::Available,
        Action::Update => RowStatus::Update,
        Action::Open | Action::OpenToUpdate => RowStatus::Installed,
        Action::CloseToUpdate => RowStatus::Running,
        Action::ReleasePage => RowStatus::Manual,
        Action::OpenWeb => RowStatus::Web,
        Action::NeedsEthoneUpdate | Action::Unavailable => RowStatus::Unavailable,
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Row {
    pub id: String,
    pub name: String,
    pub summary: std::collections::BTreeMap<String, String>,
    pub installed: Option<String>,
    pub latest: Option<String>,
    pub size: Option<u64>,
    pub status: RowStatus,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub version: &'static str,
    pub installed: Option<String>,
    pub running: bool,
    pub default_dir: String,
    pub free_bytes: Option<u64>,
    pub payload_bytes: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub ethone: bool,
    pub dir: Option<String>,
    pub desktop: bool,
    pub modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Event {
    Start { id: String },
    Progress { id: String, progress: install::Progress },
    Done { id: String, ok: bool, detail: String },
}

fn hidden(program: &str) -> Command {
    let mut command = Command::new(program);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

pub fn default_dir() -> PathBuf {
    PathBuf::from(std::env::var("LOCALAPPDATA").unwrap_or_default()).join("Ethone")
}

pub fn journal_path() -> PathBuf {
    PathBuf::from(std::env::var("LOCALAPPDATA").unwrap_or_default()).join("dev.ethone.desktop").join("logs").join("operations.jsonl")
}

pub fn valid_dir(dir: &str) -> bool {
    let path = Path::new(dir);
    path.is_absolute() && !dir.contains(['"', '<', '>', '|', '*', '?']) && path.components().count() > 2
}

fn free_bytes(dir: &Path) -> Option<u64> {
    let drive = dir.components().next()?.as_os_str().to_str()?.trim_end_matches(':').chars().next()?;
    if !drive.is_ascii_alphabetic() {
        return None;
    }
    let script = format!("(Get-PSDrive -Name {drive}).Free");
    let output = hidden("powershell").args(["-NoProfile", "-Command", &script]).output().ok()?;
    String::from_utf8_lossy(&output.stdout).trim().parse().ok()
}

pub fn state() -> Result<State, String> {
    let detect = ethone();
    let dir = default_dir();
    Ok(State {
        version: VERSION,
        installed: system::read_installed(&detect).map(|i| i.version),
        running: system::is_running(&detect.exe)?,
        free_bytes: free_bytes(&dir),
        default_dir: dir.display().to_string(),
        payload_bytes: PAYLOAD.len() as u64,
    })
}

async fn package_size(url: &str) -> Option<u64> {
    let response = feed::client().ok()?.head(url).timeout(Duration::from_secs(10)).send().await.ok()?;
    response.status().is_success().then(|| response.content_length()).flatten().filter(|size| *size > 0)
}

pub async fn row(module: &Module) -> Row {
    let installed = module.detect.as_ref().and_then(system::read_installed).map(|i| i.version);
    let running = module.detect.as_ref().is_some_and(|detect| system::is_running(&detect.exe).unwrap_or(false));
    let latest = feed::fetch(&module.feed).await.ok().flatten();
    let action = decide(
        module,
        &Facts { installed: installed.as_deref(), latest: latest.as_ref().map(|l| l.version.as_str()), running, ethone: VERSION },
    );
    let size = match latest.as_ref().and_then(|l| l.url.as_deref()) {
        Some(url) => package_size(url).await,
        None => None,
    };
    Row {
        id: module.id.clone(),
        name: module.name.clone(),
        summary: module.summary.clone(),
        installed,
        latest: latest.map(|l| l.version),
        size,
        status: row_status(action),
    }
}

fn desktop_shortcut() -> Option<PathBuf> {
    let output = hidden("powershell").args(["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"]).output().ok()?;
    let folder = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!folder.is_empty()).then(|| PathBuf::from(folder).join("Ethone.lnk"))
}

fn install_ethone(dir: Option<&str>, desktop: bool) -> Result<String, String> {
    if PAYLOAD.is_empty() {
        return Err("payloadMissing".into());
    }
    let detect = ethone();
    if system::is_running(&detect.exe)? {
        return Err("closeEthone".into());
    }
    if let Some(dir) = dir {
        if !valid_dir(dir) {
            return Err("badFolder".into());
        }
    }
    let had_shortcut = desktop_shortcut().is_some_and(|path| path.exists());
    let folder = std::env::temp_dir().join(format!("ethone-setup-{}", std::process::id()));
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let file = folder.join("ethone-setup.exe");
    std::fs::write(&file, PAYLOAD).map_err(|e| e.to_string())?;
    let mut command = hidden(file.to_str().unwrap_or_default());
    command.arg("/S");
    if let Some(dir) = dir {
        command.raw_arg(format!("/D={dir}"));
    }
    let status = command.status();
    let _ = std::fs::remove_dir_all(&folder);
    let status = status.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("code {}", status.code().unwrap_or(-1)));
    }
    let installed = system::read_installed(&detect).ok_or("notDetected")?;
    if installed.version != VERSION {
        return Err("notDetected".into());
    }
    if !desktop && !had_shortcut {
        if let Some(shortcut) = desktop_shortcut() {
            let _ = std::fs::remove_file(shortcut);
        }
    }
    Ok(installed.version)
}

pub async fn run_plan(modules: &[Module], plan: &Plan, emit: &(dyn Fn(Event) + Send + Sync)) -> bool {
    let log = journal_path();
    let mut all_ok = true;
    if plan.ethone {
        let id = "ethone".to_string();
        emit(Event::Start { id: id.clone() });
        emit(Event::Progress { id: id.clone(), progress: install::Progress::Installing });
        let dir = plan.dir.clone();
        let desktop = plan.desktop;
        let result = tokio::task::spawn_blocking(move || install_ethone(dir.as_deref(), desktop))
            .await
            .unwrap_or_else(|e| Err(e.to_string()));
        let _ = journal::append(&log, "ethone", "install", result.is_ok(), result.as_deref().unwrap_or_else(|e| e));
        all_ok &= result.is_ok();
        let stop = result.is_err();
        emit(Event::Done { ok: result.is_ok(), detail: result.unwrap_or_else(|e| e), id });
        if stop {
            return false;
        }
    }
    for id in &plan.modules {
        let Some(module) = modules.iter().find(|m| &m.id == id) else {
            all_ok = false;
            emit(Event::Done { id: id.clone(), ok: false, detail: "unknownModule".into() });
            continue;
        };
        emit(Event::Start { id: id.clone() });
        let current = row(module).await;
        if current.status == RowStatus::Installed {
            emit(Event::Done { id: id.clone(), ok: true, detail: current.installed.unwrap_or_default() });
            continue;
        }
        let notify = |progress: install::Progress| emit(Event::Progress { id: id.clone(), progress });
        let result = install::run(module, VERSION, &notify).await;
        let detail = match &result {
            Ok(outcome) => format!("{} → {}", outcome.from.as_deref().unwrap_or("absent"), outcome.to),
            Err(error) => error.clone(),
        };
        let _ = journal::append(&log, id, "install", result.is_ok(), &detail);
        all_ok &= result.is_ok();
        emit(Event::Done { id: id.clone(), ok: result.is_ok(), detail });
    }
    all_ok
}

fn uninstaller(dir: &Path) -> PathBuf {
    dir.join("uninstall.exe")
}

pub async fn uninstall() -> Result<(), String> {
    let detect = ethone();
    if system::is_running(&detect.exe)? {
        return Err("closeEthone".into());
    }
    let installed = system::read_installed(&detect).ok_or("notDetected")?;
    let dir = installed.dir.ok_or("notDetected")?;
    let status = hidden(uninstaller(&dir).to_str().unwrap_or_default()).arg("/S").status().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("code {}", status.code().unwrap_or(-1)));
    }
    for _ in 0..60 {
        if system::read_installed(&detect).is_none() {
            if let Ok(entry) = keyring::Entry::new("dev.ethone.desktop", "session") {
                let _ = entry.delete_credential();
            }
            let _ = journal::append(&journal_path(), "ethone", "uninstall", true, VERSION);
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    Err("uninstallTimeout".into())
}

pub fn launch() -> Result<(), String> {
    system::launch(&ethone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_signed_install_or_update_can_be_selected() {
        assert_eq!(row_status(Action::Install), RowStatus::Available);
        assert_eq!(row_status(Action::Update), RowStatus::Update);
        assert_eq!(row_status(Action::OpenToUpdate), RowStatus::Installed);
        assert_eq!(row_status(Action::ReleasePage), RowStatus::Manual);
        assert_eq!(row_status(Action::OpenWeb), RowStatus::Web);
        assert_eq!(row_status(Action::CloseToUpdate), RowStatus::Running);
    }

    #[test]
    fn install_folder_must_be_safe() {
        assert!(valid_dir(r"C:\Users\a\AppData\Local\Ethone"));
        assert!(valid_dir(r"D:\Mes applications\Ethone"));
        assert!(!valid_dir("Ethone"));
        assert!(!valid_dir(r"C:\"));
        assert!(!valid_dir(r#"C:\a" /S"#));
        assert!(!valid_dir(r"C:\a?b"));
    }
}
