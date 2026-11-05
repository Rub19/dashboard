pub mod admin;
pub mod ambience;
pub mod brain;
pub mod brain_extras;
pub mod connections;
pub mod daily;
pub mod eval;
pub mod eval_game;
pub mod eval_hub;
pub mod eval_more;
pub mod files;
pub mod form;
pub mod discord;
pub mod generic;
pub mod home;
pub mod insights;
pub mod login;
pub mod lol;
pub mod mail;
pub mod modules;
pub mod settings;
pub mod shell;
pub mod team;
pub mod work;

use crate::app::{App, Page};
use crate::i18n::tr;
use crate::prefs;
use crate::vm::*;
use serde_json::Value;

#[derive(Default)]
pub struct PageStates {
    pub work: work::WorkState,
    pub mail: mail::MailState,
    pub files: files::FilesState,
    pub team: team::TeamState,
    pub settings: settings::SettingsState,
    pub insights: insights::InsightsState,
    pub brain: brain::BrainState,
    pub extras: brain_extras::ExtrasState,
    pub eval: eval::EvalState,
    pub game: eval_game::GameState,
    pub hub: eval_hub::HubState,
    pub lol: lol::LolState,
    pub discord: discord::DiscordState,
}

pub fn encode(text: &str) -> String {
    let mut out = String::new();
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

pub fn at_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = value;
    for part in path.split('.') {
        current = current.as_object()?.get(part)?;
    }
    Some(current)
}

pub fn first_array(value: &Value, key: Option<&str>) -> Vec<Value> {
    if let Some(key) = key.filter(|key| !key.is_empty()) {
        return at_path(value, key).and_then(Value::as_array).cloned().unwrap_or_default();
    }
    if let Some(list) = value.as_array() {
        return list.clone();
    }
    if let Some(map) = value.as_object() {
        for name in ["data", "items", "results", "list", "rows"] {
            match map.get(name) {
                Some(Value::Array(list)) => return list.clone(),
                Some(inner @ Value::Object(_)) => {
                    let nested = first_array(inner, None);
                    if !nested.is_empty() {
                        return nested;
                    }
                }
                _ => {}
            }
        }
        for inner in map.values() {
            if let Value::Array(list) = inner {
                return list.clone();
            }
        }
    }
    Vec::new()
}

pub fn refresh_current(app: &mut App) {
    match app.page.as_str() {
        "home" => home::reload_all(app),
        "tracker" => eval::act(app, "refresh", ""),
        "games" => lol::act(app, "refresh", ""),
        "modules" => modules::load_modules(app, false),
        page => {
            let prefix = format!("{page}:");
            app.forget(&prefix);
        }
    }
}

pub fn discord_login(app: &mut App, result: Result<(), String>) {
    discord::login_done(app, &result);
    match result {
        Ok(()) => app.forget("discord:"),
        Err(error) => {
            let text = crate::i18n::error_text(&error);
            app.toast_bad(&text);
        }
    }
}

pub fn section(key: &str, fallback: &str) -> String {
    prefs::text(key, fallback)
}

pub fn set_section(key: &str, value: &str) {
    prefs::write_json(key, &value.to_string());
}

pub fn view(app: &mut App) -> Page {
    let page = app.page.clone();
    match page.as_str() {
        "home" => home::view(app),
        "modules" => modules::view(app),
        "productivity" => work::view(app),
        "mail" => mail::view(app),
        "files" => files::view(app),
        "team" => team::view(app),
        "settings" => settings::view(app),
        "insights" => insights::view(app),
        "brain" => brain::view(app),
        "tracker" => eval::view(app),
        "games" => lol::view(app),
        "discord" => discord::view(app),
        other => Page { main: vec![head(&shell::page_label(other), "", vec![]), empty(&tr("Page en cours de portage", "Page being ported"), "")], ..Default::default() },
    }
}

pub fn dispatch(app: &mut App, id: &str, value: &str) {
    let (scope, rest) = id.split_once(':').unwrap_or((id, ""));
    match scope {
        "go" => shell::go(app, rest),
        "shell" | "palette" | "menu" | "drawer" | "toast" | "pin" | "pin-menu" | "account" | "music" => shell::act(app, scope, rest, value),
        "login" => login::act(app, rest, value),
        "home" => home::act(app, rest, value),
        "work" => work::act(app, rest, value),
        "mail" => mail::act(app, rest, value),
        "files" => files::act(app, rest, value),
        "filedrawer" => files::drawer_act(app, rest),
        "team" => team::act(app, rest, value),
        "settings" => settings::act(app, rest, value),
        "insights" => insights::act(app, rest, value),
        "brain" => brain::act(app, rest, value),
        "eval" => eval::act(app, rest, value),
        "lol" => lol::act(app, rest, value),
        "discord" => discord::act(app, rest, value),
        "connections" => connections::act(app, rest, value),
        "admin" => admin::act(app, rest),
        "form" => form::act(app, rest, value),
        "generic" => generic::act(app, rest, value),
        "ambience" => ambience::act(app, rest, value),
        "modules" | "embed" | "update" => modules::act(app, scope, rest, value),
        _ => {}
    }
}

#[cfg(feature = "drive")]
pub fn dump_blocks(app: &mut App) -> String {
    let page = view(app);
    let line = |block: &B| {
        let cells: Vec<String> = block.cells.iter().map(|cell| format!("{}[{}|{}|{}]", cell.kind, cell.title, cell.sub, cell.value)).collect();
        format!("{} {} | {} | {} {}\n", block.kind, block.id, block.title, block.sub, cells.join(" "))
    };
    let mut out = format!("PAGE {}\n", app.page);
    out.extend(page.main.iter().map(line));
    out.push_str("ASIDE\n");
    out.extend(page.aside.iter().map(line));
    out
}
