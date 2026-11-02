#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod action;
mod catalog;
mod feed;
mod install;
mod journal;
mod system;

use action::{decide, Action, Facts};
use catalog::Module;
use futures_util::future::join_all;
use serde::Serialize;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tokio::sync::Mutex;

const ETHONE_VERSION: &str = env!("CARGO_PKG_VERSION");

struct App {
    modules: Vec<Module>,
    installing: Mutex<()>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModuleStatus {
    module: Module,
    installed: Option<String>,
    latest: Option<feed::Latest>,
    feed_error: Option<String>,
    running: bool,
    action: Action,
}

fn find<'a>(state: &'a State<App>, id: &str) -> Result<&'a Module, String> {
    state.modules.iter().find(|m| m.id == id).ok_or_else(|| "Module inconnu".to_string())
}

fn journal_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_log_dir().map_err(|e| e.to_string())?.join("operations.jsonl"))
}

fn record(app: &AppHandle, module: &str, operation: &str, ok: bool, detail: &str) {
    if let Ok(path) = journal_path(app) {
        let _ = journal::append(&path, module, operation, ok, detail);
    }
}

fn status(module: &Module, latest: Option<feed::Latest>, feed_error: Option<String>) -> ModuleStatus {
    let (installed, running) = match &module.detect {
        Some(detect) => (
            system::read_installed(detect).map(|i| i.version),
            system::is_running(&detect.exe).unwrap_or(false),
        ),
        None => (None, false),
    };
    let action = decide(
        module,
        &Facts {
            installed: installed.as_deref(),
            latest: latest.as_ref().map(|l| l.version.as_str()),
            running,
            ethone: ETHONE_VERSION,
        },
    );
    ModuleStatus { module: module.clone(), installed, latest, feed_error, running, action }
}

#[tauri::command]
fn modules_local(state: State<App>) -> Vec<ModuleStatus> {
    state.modules.iter().map(|m| status(m, None, None)).collect()
}

#[tauri::command]
async fn modules_remote(state: State<'_, App>) -> Result<Vec<ModuleStatus>, String> {
    let feeds = join_all(state.modules.iter().map(|m| feed::fetch(&m.feed))).await;
    Ok(state
        .modules
        .iter()
        .zip(feeds)
        .map(|(module, result)| match result {
            Ok(latest) => status(module, latest, None),
            Err(error) => status(module, None, Some(error)),
        })
        .collect())
}

#[tauri::command]
fn open_module(id: String, app: AppHandle, state: State<App>) -> Result<(), String> {
    let module = find(&state, &id)?;
    let result = if let Some(detect) = &module.detect {
        system::launch(detect)
    } else if let Some(url) = &module.launch_url {
        app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
    } else {
        Err("Ce module ne peut pas être ouvert".to_string())
    };
    if let Err(error) = &result {
        record(&app, &id, "open", false, error);
    }
    result
}

#[tauri::command]
fn open_releases(id: String, app: AppHandle, state: State<App>) -> Result<(), String> {
    let url = find(&state, &id)?.releases_url.as_ref().ok_or("Pas de page de versions")?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn install_module(
    id: String,
    on: Channel<install::Progress>,
    app: AppHandle,
    state: State<'_, App>,
) -> Result<install::Outcome, String> {
    let module = find(&state, &id)?;
    let _guard = state.installing.try_lock().map_err(|_| "Une installation est déjà en cours".to_string())?;
    let notify = |progress: install::Progress| {
        let _ = on.send(progress);
    };
    let result = install::run(module, ETHONE_VERSION, &notify).await;
    match &result {
        Ok(outcome) => {
            let detail = format!("{} → {}", outcome.from.as_deref().unwrap_or("absent"), outcome.to);
            record(&app, &id, "install", true, &detail);
        }
        Err(error) => record(&app, &id, "install", false, error),
    }
    result
}

#[tauri::command]
fn read_journal(app: AppHandle) -> Result<Vec<journal::Entry>, String> {
    Ok(journal::read(&journal_path(&app)?))
}

#[tauri::command]
fn about() -> serde_json::Value {
    serde_json::json!({ "version": ETHONE_VERSION, "catalogSchema": catalog::SCHEMA_VERSION })
}

fn main() {
    let modules = catalog::load().expect("catalogue invalide");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(App { modules, installing: Mutex::new(()) })
        .invoke_handler(tauri::generate_handler![
            modules_local,
            modules_remote,
            open_module,
            open_releases,
            install_module,
            read_journal,
            about
        ])
        .run(tauri::generate_context!())
        .expect("tauri");
}
