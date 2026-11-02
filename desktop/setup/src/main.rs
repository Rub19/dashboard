#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[allow(dead_code)]
#[path = "../../src-tauri/src/action.rs"]
mod action;
#[allow(dead_code)]
#[path = "../../src-tauri/src/catalog.rs"]
mod catalog;
#[allow(dead_code)]
#[path = "../../src-tauri/src/feed.rs"]
mod feed;
#[allow(dead_code)]
#[path = "../../src-tauri/src/install.rs"]
mod install;
#[allow(dead_code)]
#[path = "../../src-tauri/src/journal.rs"]
mod journal;
#[allow(dead_code)]
#[path = "../../src-tauri/src/system.rs"]
mod system;
#[allow(dead_code)]
#[path = "../../src-tauri/src/windowing.rs"]
mod windowing;

mod engine;

use catalog::Module;
use engine::{Event, Plan};
use futures_util::future::join_all;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

struct App {
    modules: Vec<Module>,
}

#[tauri::command]
fn window_setup(window: WebviewWindow) -> bool {
    windowing::apply_mica(&window)
}

#[tauri::command]
fn window_theme(theme: String, window: WebviewWindow) -> Result<(), String> {
    windowing::set_theme(&window, &theme)
}

#[tauri::command]
fn window_ready(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
fn setup_state() -> Result<engine::State, String> {
    engine::state()
}

#[tauri::command]
async fn setup_modules(state: State<'_, App>) -> Result<Vec<engine::Row>, String> {
    Ok(join_all(state.modules.iter().map(engine::row)).await)
}

#[tauri::command]
async fn setup_pick_folder(current: String, app: AppHandle) -> Result<Option<String>, String> {
    let picked = tauri::async_runtime::spawn_blocking(move || app.dialog().file().set_directory(current).blocking_pick_folder())
        .await
        .map_err(|e| e.to_string())?;
    Ok(picked.map(|path| path.to_string()))
}

#[tauri::command]
async fn setup_run(plan: Plan, on: Channel<Event>, state: State<'_, App>) -> Result<bool, String> {
    let emit = |event: Event| {
        let _ = on.send(event);
    };
    Ok(engine::run_plan(&state.modules, &plan, &emit).await)
}

#[tauri::command]
async fn setup_uninstall() -> Result<(), String> {
    engine::uninstall().await
}

#[tauri::command]
fn setup_launch(app: AppHandle) -> Result<(), String> {
    engine::launch()?;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn setup_link(page: String, app: AppHandle) -> Result<(), String> {
    let url = match page.as_str() {
        "terms" => "https://ethone.dev/terms",
        "privacy" => "https://ethone.dev/privacy",
        "notes" => "https://github.com/Rub19/dashboard/releases",
        _ => return Err("Page inconnue".to_string()),
    };
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

fn silent(modules: Vec<Module>, args: &[String]) -> i32 {
    if args.iter().any(|arg| arg == "/UNINSTALL") {
        let runtime = tokio::runtime::Runtime::new().expect("runtime");
        let result = runtime.block_on(engine::uninstall());
        println!("uninstall {}", result.as_ref().map_or_else(|e| e.as_str(), |_| "ok"));
        return i32::from(result.is_err());
    }
    let selected = args
        .iter()
        .find_map(|arg| arg.strip_prefix("/MODULES="))
        .map(|list| list.split(',').filter(|id| !id.is_empty()).map(str::to_string).collect())
        .unwrap_or_default();
    let plan = Plan {
        ethone: true,
        dir: args.iter().find_map(|arg| arg.strip_prefix("/DIR=")).map(str::to_string),
        desktop: !args.iter().any(|arg| arg == "/NODESKTOP"),
        modules: selected,
    };
    let runtime = tokio::runtime::Runtime::new().expect("runtime");
    let ok = runtime.block_on(engine::run_plan(&modules, &plan, &|event| {
        if let Event::Done { id, ok, detail } = event {
            println!("{id} {} {detail}", if ok { "ok" } else { "failed" });
        }
    }));
    i32::from(!ok)
}

fn main() {
    let modules = catalog::load().expect("catalogue invalide");
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.iter().any(|arg| arg == "/S") {
        std::process::exit(silent(modules, &args));
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(App { modules })
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                if let Some(window) = handle.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(true) {
                        let _ = window.show();
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_setup,
            window_theme,
            window_ready,
            setup_state,
            setup_modules,
            setup_pick_folder,
            setup_run,
            setup_uninstall,
            setup_launch,
            setup_link
        ])
        .run(tauri::generate_context!())
        .expect("tauri");
}
