#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod action;
mod auth;
mod bot;
mod catalog;
mod chat;
mod feed;
mod gateway;
mod install;
mod journal;
mod riot;
mod system;
mod sync;
mod tracker;
mod windowing;

use action::{decide, Action, Facts};
use catalog::Module;
use futures_util::future::join_all;
use serde::Serialize;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::Mutex;

const ETHONE_VERSION: &str = env!("CARGO_PKG_VERSION");

struct App {
    modules: Vec<Module>,
    installing: Mutex<()>,
    auth: auth::Auth,
}

static BOT: std::sync::OnceLock<bot::Bot> = std::sync::OnceLock::new();

fn bot_client() -> &'static bot::Bot {
    BOT.get_or_init(bot::Bot::new)
}

static RIOT: std::sync::OnceLock<riot::Riot> = std::sync::OnceLock::new();

fn riot_session() -> &'static riot::Riot {
    RIOT.get_or_init(riot::Riot::new)
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

async fn require_session(state: &State<'_, App>) -> Result<(), String> {
    if state.auth.is_signed_in().await {
        Ok(())
    } else {
        Err("Connexion requise".to_string())
    }
}

#[tauri::command]
async fn auth_state(state: State<'_, App>) -> Result<auth::Stage, String> {
    Ok(state.auth.current().await)
}

#[tauri::command]
async fn auth_password(email: String, password: String, remember: bool, state: State<'_, App>) -> Result<auth::Stage, String> {
    state.auth.password(email.trim(), &password, remember).await
}

#[tauri::command]
async fn auth_otp_send(email: String, state: State<'_, App>) -> Result<(), String> {
    state.auth.otp_send(email.trim()).await
}

#[tauri::command]
async fn auth_otp_verify(email: String, code: String, remember: bool, state: State<'_, App>) -> Result<auth::Stage, String> {
    state.auth.otp_verify(email.trim(), code.trim(), remember).await
}

#[tauri::command]
async fn auth_oauth_start(provider: String, app: AppHandle, state: State<'_, App>) -> Result<(), String> {
    let url = state.auth.oauth_url(&provider).await?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn auth_oauth_cancel(state: State<'_, App>) -> Result<(), String> {
    state.auth.oauth_cancel().await;
    Ok(())
}

#[tauri::command]
async fn auth_mfa(code: Option<String>, backup_code: Option<String>, state: State<'_, App>) -> Result<auth::Stage, String> {
    state.auth.mfa(code, backup_code).await
}

#[tauri::command]
async fn auth_sign_out(state: State<'_, App>) -> Result<(), String> {
    state.auth.sign_out().await;
    Ok(())
}

#[tauri::command]
async fn profile_avatar(state: State<'_, App>) -> Result<Option<String>, String> {
    state.auth.avatar_data().await
}

#[tauri::command]
fn open_site(page: String, app: AppHandle) -> Result<(), String> {
    let path = match page.as_str() {
        "register" => "register",
        "recovery" => "password-recovery",
        "terms" => "terms",
        "privacy" => "privacy",
        "cookies" => "cookies",
        "legal" => "legal",
        "account" => "profile",
        _ => return Err("Page inconnue".to_string()),
    };
    app.opener().open_url(format!("https://ethone.dev/{path}"), None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn modules_local(state: State<'_, App>) -> Result<Vec<ModuleStatus>, String> {
    require_session(&state).await?;
    Ok(state.modules.iter().map(|m| status(m, None, None)).collect())
}

#[tauri::command]
async fn modules_remote(state: State<'_, App>) -> Result<Vec<ModuleStatus>, String> {
    require_session(&state).await?;
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
async fn items_list(kind: String, state: State<'_, App>) -> Result<Vec<sync::Item>, String> {
    let kind = sync::ItemKind::try_from(kind.as_str())?;
    sync::parse_list(state.auth.worker_get(kind.path()).await?)
}

#[tauri::command]
async fn items_create(kind: String, mut input: sync::ItemInput, state: State<'_, App>) -> Result<String, String> {
    let kind = sync::ItemKind::try_from(kind.as_str())?;
    kind.validate(&input)?;
    input.title = input.title.trim().to_string();
    let body = serde_json::to_value(input).map_err(|_| "Donnée invalide".to_string())?;
    sync::parse_created(state.auth.worker_json(reqwest::Method::POST, kind.path(), Some(body)).await?)
}

#[tauri::command]
async fn items_update(kind: String, id: String, mut input: sync::ItemInput, state: State<'_, App>) -> Result<(), String> {
    let kind = sync::ItemKind::try_from(kind.as_str())?;
    sync::validate_id(&id)?;
    kind.validate(&input)?;
    input.title = input.title.trim().to_string();
    let mut body = serde_json::to_value(input).map_err(|_| "Donnée invalide".to_string())?;
    body.as_object_mut().ok_or("Donnée invalide")?.insert("id".into(), serde_json::Value::String(id));
    sync::parse_mutated(state.auth.worker_json(reqwest::Method::PATCH, kind.path(), Some(body)).await?)
}

#[tauri::command]
async fn api_call(method: String, path: String, body: Option<serde_json::Value>, state: State<'_, App>) -> Result<serde_json::Value, String> {
    let method = gateway::method(&method)?;
    state.auth.worker_json(method, gateway::worker_path(&path)?, body).await
}

#[tauri::command]
async fn rest_call(method: String, path: String, body: Option<serde_json::Value>, prefer: Option<String>, state: State<'_, App>) -> Result<serde_json::Value, String> {
    let method = gateway::method(&method)?;
    let path = gateway::table_path(&path)?;
    let body = match body {
        Some(mut value) if method == reqwest::Method::POST && value.is_object() => {
            let owner = state.auth.user_id().await?;
            value["user_id"] = serde_json::Value::String(owner);
            Some(value)
        }
        other => other,
    };
    state.auth.rest_call(method, path, body, prefer.as_deref()).await
}

#[tauri::command]
async fn catalog_get(path: String, state: State<'_, App>) -> Result<serde_json::Value, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().catalog(&gateway::catalog_url(&path)?).await
}

#[tauri::command]
async fn riot_friends(app: tauri::AppHandle, state: State<'_, App>) -> Result<Vec<chat::Friend>, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().friends(&app).await
}

#[tauri::command]
async fn lineups_get(state: State<'_, App>) -> Result<serde_json::Value, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().catalog(gateway::LINEUPS_URL).await
}

#[tauri::command]
async fn riot_call(host: String, path: String, method: String, body: Option<serde_json::Value>, app: tauri::AppHandle, state: State<'_, App>) -> Result<serde_json::Value, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    let method = gateway::method(&method)?;
    riot_session().call(&app, &host, gateway::riot_path(&path)?, method, body).await
}

#[tauri::command]
async fn open_external(url: String, app: tauri::AppHandle) -> Result<(), String> {
    if !url.starts_with("https://") || url.chars().any(char::is_control) {
        return Err("Requête refusée".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
async fn bot_status(state: State<'_, App>) -> Result<bool, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    Ok(bot::linked())
}

#[tauri::command]
async fn bot_login(app: tauri::AppHandle, state: State<'_, App>) -> Result<(), String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    app.opener().open_url(bot::LOGIN_URL, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
fn bot_logout() {
    bot::sign_out();
}

#[tauri::command]
async fn bot_call(method: String, path: String, body: Option<serde_json::Value>, state: State<'_, App>) -> Result<serde_json::Value, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    let method = gateway::method(&method)?;
    bot_client().call(method, bot::clean_path(&path)?, body).await
}

#[tauri::command]
async fn riot_status(state: State<'_, App>) -> Result<Option<riot::Identity>, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    Ok(riot::load_identity())
}

#[tauri::command]
async fn riot_login(app: tauri::AppHandle, state: State<'_, App>) -> Result<(), String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().login(app).await
}

#[tauri::command]
async fn riot_open_browser(app: tauri::AppHandle, state: State<'_, App>) -> Result<(), String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    app.opener().open_url(riot::AUTHORIZE, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
async fn riot_link_url(url: String, state: State<'_, App>) -> Result<riot::Identity, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().link_url(&url).await
}

#[tauri::command]
async fn riot_logout(app: tauri::AppHandle) -> Result<(), String> {
    riot_session().logout(&app).await
}

#[tauri::command]
async fn riot_rank(app: tauri::AppHandle, state: State<'_, App>) -> Result<riot::Rank, String> {
    if !state.auth.is_signed_in().await {
        return Err("sessionRequired".into());
    }
    riot_session().rank(&app).await
}

#[tauri::command]
async fn tracker_identity(state: State<'_, App>) -> Result<Option<tracker::RiotId>, String> {
    Ok(tracker::parse_identity(&state.auth.rest_get(tracker::SETTINGS_PATH).await?))
}

#[tauri::command]
async fn tracker_sync(name: String, tag: String, state: State<'_, App>) -> Result<serde_json::Value, String> {
    let path = tracker::sync_path(&name, &tag)?;
    tracker::parse_account(state.auth.worker_get(&path).await?)
}

#[tauri::command]
async fn tracker_matches(puuid: String, limit: u32, state: State<'_, App>) -> Result<Vec<serde_json::Value>, String> {
    let path = tracker::matches_path(&puuid, limit)?;
    tracker::parse_matches(state.auth.rest_get(&path).await?)
}

#[tauri::command]
async fn items_delete(kind: String, id: String, state: State<'_, App>) -> Result<(), String> {
    let kind = sync::ItemKind::try_from(kind.as_str())?;
    sync::validate_id(&id)?;
    let body = serde_json::json!({ "id": id });
    sync::parse_mutated(state.auth.worker_json(reqwest::Method::DELETE, kind.path(), Some(body)).await?)
}

#[tauri::command]
async fn open_module(id: String, app: AppHandle, state: State<'_, App>) -> Result<(), String> {
    require_session(&state).await?;
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
async fn open_releases(id: String, app: AppHandle, state: State<'_, App>) -> Result<(), String> {
    require_session(&state).await?;
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
    require_session(&state).await?;
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
async fn read_journal(app: AppHandle, state: State<'_, App>) -> Result<Vec<journal::Entry>, String> {
    require_session(&state).await?;
    Ok(journal::read(&journal_path(&app)?))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EthoneUpdate {
    version: String,
    notes: Option<String>,
}

#[tauri::command]
async fn ethone_update_check(app: AppHandle, state: State<'_, App>) -> Result<Option<EthoneUpdate>, String> {
    require_session(&state).await?;
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|update| EthoneUpdate { version: update.version.clone(), notes: update.body.clone() }))
}

#[tauri::command]
async fn ethone_update_install(on: Channel<f64>, app: AppHandle, state: State<'_, App>) -> Result<(), String> {
    require_session(&state).await?;
    let _guard = state.installing.try_lock().map_err(|_| "Une installation est déjà en cours".to_string())?;
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?.ok_or("Aucune mise à jour")?;
    let mut received = 0u64;
    let result = update
        .download_and_install(
            |chunk, total| {
                received += chunk as u64;
                if let Some(total) = total.filter(|total| *total > 0) {
                    let _ = on.send(received as f64 / total as f64);
                }
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string());
    record(&app, "ethone", "update", result.is_ok(), result.as_ref().err().map_or(update.version.as_str(), String::as_str));
    result?;
    app.restart()
}

#[tauri::command]
fn window_setup(window: WebviewWindow) -> bool {
    windowing::apply_mica(&window)
}

#[tauri::command]
async fn window_mode(mode: String, width: f64, height: f64, x: Option<i32>, y: Option<i32>, maximized: bool, animate: bool, window: WebviewWindow) -> Result<(), String> {
    windowing::set_mode(&window, mode == "login", width, height, x.zip(y), maximized, animate)
}

#[tauri::command]
fn window_theme(theme: String, window: WebviewWindow) -> Result<(), String> {
    windowing::set_theme(&window, &theme)
}

#[tauri::command]
fn about() -> serde_json::Value {
    serde_json::json!({ "version": ETHONE_VERSION, "catalogSchema": catalog::SCHEMA_VERSION })
}

fn focus_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn handle_callback(app: AppHandle, url: String) {
    focus_main(&app);
    if url.starts_with("ethone://discord-auth") {
        tauri::async_runtime::spawn(async move {
            let result = match bot::code_from_url(&url) {
                Some(code) => bot_client().exchange(&code).await,
                None => Err("discordLoginFailed".to_string()),
            };
            let payload = match result {
                Ok(()) => serde_json::json!({ "ok": true }),
                Err(error) => serde_json::json!({ "ok": false, "error": error }),
            };
            let _ = app.emit_to("main", "discord-login", payload);
        });
        return;
    }
    tauri::async_runtime::spawn(async move {
        let result = app.state::<App>().auth.oauth_finish(&url).await;
        let payload = match result {
            Ok(stage) => serde_json::json!({ "stage": stage }),
            Err(error) => serde_json::json!({ "error": error }),
        };
        let _ = app.emit("auth-callback", payload);
    });
}

fn main() {
    let modules = catalog::load().expect("catalogue invalide");
    let api = auth::Api::production().expect("client HTTP");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| focus_main(app)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(App { modules, installing: Mutex::new(()), auth: auth::Auth::new(api) })
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            let _ = app.deep_link().register("ethone");
            let fallback = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                if let Some(window) = fallback.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(true) {
                        let _ = window.show();
                    }
                }
            });
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_callback(handle.clone(), url.to_string());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth_state,
            auth_password,
            auth_otp_send,
            auth_otp_verify,
            auth_oauth_start,
            auth_oauth_cancel,
            auth_mfa,
            auth_sign_out,
            profile_avatar,
            open_site,
            modules_local,
            modules_remote,
            items_list,
            items_create,
            items_update,
            items_delete,
            open_external,
            bot_status,
            bot_login,
            bot_logout,
            bot_call,
            api_call,
            rest_call,
            catalog_get,
            riot_call,
            lineups_get,
            riot_friends,
            riot_status,
            riot_login,
            riot_open_browser,
            riot_link_url,
            riot_logout,
            riot_rank,
            tracker_identity,
            tracker_sync,
            tracker_matches,
            open_module,
            open_releases,
            install_module,
            read_journal,
            ethone_update_check,
            ethone_update_install,
            window_setup,
            window_mode,
            window_theme,
            about
        ])
        .run(tauri::generate_context!())
        .expect("tauri");
}
