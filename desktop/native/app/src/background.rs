use crate::app::post;
use crate::services::svc;
use crate::{logic, prefs};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::windows::named_pipe::{ClientOptions, ServerOptions};
use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE};
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN_VALUE: &str = "Ethone";
const PIPE: &str = r"\\.\pipe\ethone-native-link";
static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(false);
static CLIP_HISTORY: AtomicBool = AtomicBool::new(false);
pub const CLIPS_KEY: &str = "ethone-clipboard-history";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct DesktopPrefs {
    pub close_to_tray: bool,
    pub notify_mail: bool,
    pub notify_events: bool,
    pub hdv_background: bool,
    pub quiet: bool,
    pub quiet_from: String,
    pub quiet_to: String,
    pub quiet_until: f64,
    pub clip_history: bool,
    pub notify_tasks: bool,
    pub morning: bool,
}

impl Default for DesktopPrefs {
    fn default() -> Self {
        Self { close_to_tray: false, notify_mail: true, notify_events: true, hdv_background: true, quiet: false, quiet_from: "22:00".into(), quiet_to: "08:00".into(), quiet_until: 0.0, clip_history: false, notify_tasks: true, morning: true }
    }
}

pub fn read_prefs() -> DesktopPrefs {
    prefs::read_json("ethone-desktop-prefs").unwrap_or_default()
}

pub fn save_prefs(next: &DesktopPrefs) {
    prefs::write_json("ethone-desktop-prefs", next);
    CLOSE_TO_TRAY.store(next.close_to_tray, Ordering::SeqCst);
    CLIP_HISTORY.store(next.clip_history, Ordering::SeqCst);
    if !next.clip_history {
        prefs::remove(CLIPS_KEY);
    }
}

pub fn close_to_tray() -> bool {
    CLOSE_TO_TRAY.load(Ordering::SeqCst)
}

pub fn autostart_enabled() -> bool {
    RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(RUN_KEY, KEY_READ).and_then(|key| key.get_value::<String, _>(RUN_VALUE)).is_ok()
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let key = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE).map_err(|error| error.to_string())?;
    if !enabled {
        return match key.delete_value(RUN_VALUE) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error.to_string()),
            _ => Ok(()),
        };
    }
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    key.set_value(RUN_VALUE, &format!("\"{}\" --minimized", exe.display())).map_err(|error| error.to_string())
}

pub fn notify(title: &str, body: &str) -> Result<(), String> {
    notify_rust::Notification::new().summary(title).body(body).appname("Ethone").show().map(|_| ()).map_err(|error| error.to_string())
}

pub fn register_protocol() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let (root, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(r"Software\Classes\ethone").map_err(|error| error.to_string())?;
    root.set_value("", &"URL:Ethone").map_err(|error| error.to_string())?;
    root.set_value("URL Protocol", &"").map_err(|error| error.to_string())?;
    let (command, _) = root.create_subkey(r"shell\open\command").map_err(|error| error.to_string())?;
    command.set_value("", &format!("\"{}\" \"%1\"", exe.display())).map_err(|error| error.to_string())
}

pub fn claim_single_instance(link: Option<&str>) -> bool {
    use windows_sys::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS};
    use windows_sys::Win32::System::Threading::CreateMutexW;
    let name: Vec<u16> = "Local\\EthoneNative".encode_utf16().chain(std::iter::once(0)).collect();
    let handle = unsafe { CreateMutexW(std::ptr::null(), 0, name.as_ptr()) };
    if handle.is_null() || unsafe { GetLastError() } != ERROR_ALREADY_EXISTS {
        return true;
    }
    let message = link.unwrap_or("focus").to_string();
    if let Ok(runtime) = tokio::runtime::Builder::new_current_thread().enable_all().build() {
        runtime.block_on(async move {
            if let Ok(mut pipe) = ClientOptions::new().open(PIPE) {
                let _ = pipe.write_all(message.as_bytes()).await;
            }
        });
    }
    false
}

async fn serve_links() {
    let mut first = true;
    loop {
        let Ok(mut server) = ServerOptions::new().first_pipe_instance(first).create(PIPE) else { return };
        first = false;
        if server.connect().await.is_err() {
            continue;
        }
        let mut buffer = vec![0u8; 8192];
        let mut text = Vec::new();
        while let Ok(count) = server.read(&mut buffer).await {
            if count == 0 {
                break;
            }
            text.extend_from_slice(&buffer[..count]);
            if text.len() > 16384 {
                break;
            }
        }
        let message = String::from_utf8_lossy(&text).to_string();
        post(move |app| crate::pages::shell::handle_link(app, &message));
    }
}

fn build_tray() -> Option<tray_icon::TrayIcon> {
    use tray_icon::menu::{Menu, MenuEvent, MenuItem};
    use tray_icon::{Icon, MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    let menu = Menu::new();
    let open = MenuItem::new("Ouvrir Ethone", true, None);
    let quit = MenuItem::new("Quitter", true, None);
    menu.append(&open).ok()?;
    menu.append(&quit).ok()?;
    let (open_id, quit_id) = (open.id().clone(), quit.id().clone());
    MenuEvent::set_event_handler(Some(move |event: MenuEvent| {
        if event.id == open_id {
            post(|app| app.with_ui(crate::win::show_main));
        } else if event.id == quit_id {
            let _ = slint::invoke_from_event_loop(|| {
                let _ = slint::quit_event_loop();
            });
        }
    }));
    TrayIconEvent::set_event_handler(Some(|event: TrayIconEvent| {
        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
            post(|app| app.with_ui(crate::win::show_main));
        }
    }));
    let decoded = image::load_from_memory(include_bytes!("../assets/ethone-logo.png")).ok()?.resize(32, 32, image::imageops::FilterType::Triangle).to_rgba8();
    let icon = Icon::from_rgba(decoded.as_raw().clone(), decoded.width(), decoded.height()).ok()?;
    TrayIconBuilder::new().with_tooltip("Ethone").with_menu(Box::new(menu)).with_menu_on_left_click(false).with_icon(icon).build().ok()
}

thread_local! {
    static TRAY: std::cell::RefCell<Option<tray_icon::TrayIcon>> = const { std::cell::RefCell::new(None) };
}

pub fn start(_hidden: bool) {
    CLOSE_TO_TRAY.store(read_prefs().close_to_tray, Ordering::SeqCst);
    CLIP_HISTORY.store(read_prefs().clip_history, Ordering::SeqCst);
    start_clip_watch();
    TRAY.with(|cell| *cell.borrow_mut() = build_tray());
    if !crate::win::offscreen() {
        start_hotkey();
    }
    svc().rt.spawn(serve_links());
    if !crate::win::offscreen() {
        std::thread::spawn(|| loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
            let playing: Vec<&str> = logic::playtime::GAMES.iter().filter(|(_, _, exe)| !ethone_engine::embed::process_ids(exe).is_empty()).map(|(id, _, _)| *id).collect();
            if playing.is_empty() {
                continue;
            }
            let day = logic::time::day_key(&chrono::Local::now());
            post(move |_| {
                let mut log: logic::playtime::Log = prefs::read_json("ethone-play-time").unwrap_or_default();
                for game in &playing {
                    logic::playtime::add(&mut log, &day, game, 60);
                }
                prefs::write_json("ethone-play-time", &log);
            });
        });
    }
    svc().rt.spawn(async {
        let mut was = crate::theme::effective_look();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            let now = crate::theme::effective_look();
            if now != was {
                was = now;
                post(|app| app.with_ui(crate::theme::apply));
            }
        }
    });
    svc().rt.spawn(async {
        let mut was = true;
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let now = crate::net::online();
            if now != was {
                was = now;
                post(move |app| crate::pages::shell::online_changed(app, now));
            }
        }
    });
}

fn start_clip_watch() {
    std::thread::spawn(|| {
        let mut seen = crate::clipboard::sequence();
        loop {
            std::thread::sleep(std::time::Duration::from_secs(1));
            let now = crate::clipboard::sequence();
            if now == seen {
                continue;
            }
            seen = now;
            if !CLIP_HISTORY.load(Ordering::SeqCst) {
                continue;
            }
            if let Some(text) = crate::clipboard::shareable_text() {
                post(move |_| {
                    let list: Vec<String> = prefs::read_json(CLIPS_KEY).unwrap_or_default();
                    prefs::write_json(CLIPS_KEY, &logic::clips::push(&list, &text));
                });
            }
        }
    });
}

fn start_hotkey() {
    std::thread::spawn(|| unsafe {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT};
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetMessageW, MSG, WM_HOTKEY};
        if RegisterHotKey(std::ptr::null_mut(), 1, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, u32::from(b'E')) == 0 {
            return;
        }
        let mut message: MSG = std::mem::zeroed();
        while GetMessageW(&mut message, std::ptr::null_mut(), 0, 0) > 0 {
            if message.message == WM_HOTKEY {
                post(|app| {
                    app.with_ui(crate::win::show_main);
                    if matches!(app.stage, Some(ethone_engine::auth::Stage::SignedIn { .. })) {
                        crate::pages::shell::open_palette(app);
                    }
                });
            }
        }
    });
}

pub fn start_checks() {
    svc().rt.spawn(async {
        loop {
            let prefs = read_prefs();
            if prefs.hdv_background {
                let _ = crate::pages::modules::hdv_background(true);
            }
            if prefs.notify_mail {
                if let Ok(answer) = crate::services::api("api/mail/inbox?folder=inbox&limit=10").await {
                    post(move |app| crate::pages::shell::mail_checked(app, answer));
                }
            }
            if prefs.notify_events {
                if let Ok(events) = crate::services::items_list("events").await {
                    events_checked(&prefs, events);
                }
            }
            if prefs.notify_tasks {
                tasks_check(&prefs).await;
            }
            tokio::time::sleep(std::time::Duration::from_secs(120)).await;
        }
    });
}

async fn tasks_check(prefs: &DesktopPrefs) {
    use chrono::Timelike;
    let now = chrono::Local::now();
    let today = logic::time::day_key(&now);
    if now.hour() < 9 || crate::prefs::read_json::<String>("ethone-task-reminder-day").as_deref() == Some(today.as_str()) || quiet_now(prefs) {
        return;
    }
    let Ok(answer) = crate::pages::daily::tasks_list().await else { return };
    let list = crate::pages::first_array(&answer, None);
    crate::prefs::write_json("ethone-task-reminder-day", &today);
    if let Some(text) = logic::productivity::task_reminder(&list, &today, crate::i18n::fr()) {
        let _ = notify(&crate::i18n::tr("Tes tâches", "Your tasks"), &text);
    }
}

pub fn quiet_now(prefs: &DesktopPrefs) -> bool {
    use chrono::Timelike;
    let now = chrono::Local::now();
    logic::time::now_ms() < prefs.quiet_until || logic::home::in_quiet_hours(now.hour() * 60 + now.minute(), prefs.quiet, &prefs.quiet_from, &prefs.quiet_to)
}

fn events_checked(prefs: &DesktopPrefs, events: Value) {
    let mut notified: Vec<String> = crate::prefs::read_json("ethone-notified-events").unwrap_or_default();
    let now = logic::time::now_ms();
    let mut changed = false;
    for event in events.as_array().into_iter().flatten() {
        let id = event["id"].as_str().unwrap_or_default().to_string();
        let start = event["startAt"].as_str().and_then(logic::time::parse_ms);
        if logic::home::is_due(start, &id, &notified, now) {
            if !quiet_now(prefs) {
                let _ = notify(event["title"].as_str().unwrap_or_default(), &crate::i18n::tr("Commence dans moins de 10 minutes", "Starts in less than 10 minutes"));
            }
            notified.push(id);
            changed = true;
        }
    }
    if changed {
        let keep = notified.len().saturating_sub(200);
        crate::prefs::write_json("ethone-notified-events", &notified[keep..].to_vec());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_preferences_take_their_defaults() {
        let parsed: DesktopPrefs = serde_json::from_str(r#"{"closeToTray":true}"#).unwrap();
        assert!(parsed.close_to_tray);
        assert!(parsed.notify_mail);
        assert_eq!(parsed.quiet_from, "22:00");
    }
}
