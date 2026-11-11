use crate::app::{entry, pick_menu, post, spawn, App, Page};
use crate::i18n::{t, tr};
use crate::logic::navigation::{self, direction, page_tint, shortcut, FOOT_PAGES, GROUPS, MAIN_PAGES, PAGE_ORDER};
use crate::logic::palette::{rank, remember};
use crate::logic::time;
use crate::services::{svc, Fut};
use crate::vm::*;
use crate::{prefs, AppWindow, Item};
use ethone_engine::auth::Stage;
use serde_json::Value;
use slint::{ComponentHandle, Image, ModelRc, VecModel};

pub struct Command {
    pub id: String,
    pub label: String,
    pub hint: String,
    pub action: String,
    pub value: String,
    pub search: String,
}

pub fn page_label(page: &str) -> String {
    match page {
        "tracker" => "E:VAL".into(),
        "games" => "E:LOL".into(),
        other => t(other),
    }
}

pub fn boot() {
    let exe = std::env::current_exe().ok().and_then(|path| path.file_name().map(|name| name.to_string_lossy().to_lowercase())).unwrap_or_default();
    let old_open = exe != "ethone.exe" && ethone_engine::system::is_running("ethone.exe").unwrap_or(false);
    if old_open {
        post(|app| app.blocked = true);
        return;
    }
    post(|app| app.blocked = false);
    spawn(async { svc().auth.current().await }, |app, stage| match stage {
        Stage::SignedIn { .. } => enter(app, stage),
        other => app.stage = Some(other),
    });
}

pub fn enter(app: &mut App, stage: Stage) {
    app.stage = Some(stage);
    app.login = Default::default();
    app.with_ui(crate::win::set_app_mode);
    crate::pages::modules::load_modules(app, true);
    crate::pages::modules::check_update(app);
    crate::background::start_checks();
    app.with_ui(|ui| ui.invoke_focus_root());
    spawn(async { svc().auth.avatar_data().await }, |app, result| {
        if let Ok(Some(url)) = result {
            app.avatar = app.img(&url);
            app.set("avatar-url", &url);
        }
    });
    spotify_poll();
    run_page_rules(app);
}

pub fn sign_out(app: &mut App) {
    crate::cache::clear("");
    spawn(async { svc().auth.sign_out().await }, |app, ()| {
        app.stage = Some(Stage::SignedOut);
        app.res.clear();
        app.local.clear();
        app.modules.clear();
        app.embedded = None;
        app.with_ui(crate::win::set_login_mode);
    });
}

pub fn go(app: &mut App, next: &str) {
    if !navigation::page_exists(next) {
        return;
    }
    app.with_ui(|ui| {
        ui.set_tip_text(Default::default());
        ui.invoke_focus_root();
    });
    let current = app.page.clone();
    app.history.visit(&current, next);
    open(app, next);
}

fn open(app: &mut App, next: &str) {
    if app.page == next {
        return;
    }
    app.direction = direction(&app.page, next);
    let scroll = app.ui.upgrade().map_or(0.0, |ui| ui.get_main_scroll());
    app.scrolls.insert(app.page.clone(), scroll);
    if app.embedded.is_some() {
        crate::pages::modules::leave_embedded(app);
    }
    if app.page == "productivity" {
        crate::pages::ambience::stop_all(app);
    }
    app.page = next.to_string();
    prefs::write_json("ethone-last-page", &app.page);
    if next == "mail" {
        app.new_mail = 0;
    }
    restart_enter(app);
    let scroll = app.scrolls.get(next).copied().unwrap_or(0.0);
    let dir = app.direction as f32;
    let weak = app.ui.clone();
    let _ = slint::invoke_from_event_loop(move || {
        if let Some(ui) = weak.upgrade() {
            ui.set_direction(10.0 * dir);
            ui.set_main_scroll(scroll);
            ui.set_entered(true);
        }
    });
    run_page_rules(app);
}

pub fn restart_enter(app: &App) {
    app.with_ui(|ui| ui.set_entered(false));
}

pub fn go_back(app: &mut App) {
    let current = app.page.clone();
    if let Some(previous) = app.history.go_back(&current) {
        open(app, &previous);
    }
}

pub fn go_forward(app: &mut App) {
    let current = app.page.clone();
    if let Some(next) = app.history.go_forward(&current) {
        open(app, &next);
    }
}

fn run_page_rules(app: &mut App) {
    let rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
    let page = app.page.clone();
    for rule in rules.iter().filter(|rule| rule["enabled"] == true && rule["trigger"]["type"] == "page" && rule["trigger"]["value"] == page.as_str()) {
        run_rule(app, rule);
    }
}

pub fn run_rule(app: &mut App, rule: &Value) {
    let value = rule["action"]["value"].as_str().unwrap_or_default().to_string();
    match rule["action"]["type"].as_str() {
        Some("look") => app.with_ui(|ui| crate::theme::apply_look(ui, &value)),
        Some("density") => {
            let mut preferences = crate::theme::interface();
            preferences.density = value;
            prefs::write_json("ethone-interface-preferences", &crate::logic::settings::interface_json(&preferences));
            app.with_ui(crate::theme::apply);
        }
        _ => {}
    }
}

pub fn act(app: &mut App, scope: &str, rest: &str, value: &str) {
    match (scope, rest) {
        ("shell", "back") => go_back(app),
        ("shell", "forward") => go_forward(app),
        ("shell", "palette") => open_palette(app),
        ("shell", "sidebar") => toggle_sidebar(app),
        ("shell", "log") => open_log(app),
        ("shell", "log-clear") => app.toast_log.clear(),
        ("shell", "clips") => open_clips(app),
        ("shell", "open-item") => {
            if let Some((kind, id)) = value.split_once('|') {
                crate::pages::set_section("ethone-section-productivity", kind);
                app.forget_section("productivity");
                go(app, "productivity");
                crate::pages::work::act(app, &format!("edit:{id}"), "");
            }
        }
        ("shell", "fav-toggle") => {
            let key = current_favorite(app);
            toggle_favorite(app, &key);
        }
        ("shell", fav) if fav.starts_with("fav-remove:") => toggle_favorite(app, &fav["fav-remove:".len()..]),
        ("shell", fav) if fav.starts_with("fav-open:") => open_favorite(app, &fav["fav-open:".len()..].to_string()),
        ("shell", "clip-clear") => {
            prefs::remove(crate::background::CLIPS_KEY);
            open_clips(app);
        }
        ("shell", copy) if copy.starts_with("clip-copy:") => {
            let list: Vec<String> = prefs::read_json(crate::background::CLIPS_KEY).unwrap_or_default();
            if let Some(text) = copy["clip-copy:".len()..].parse::<usize>().ok().and_then(|at| list.get(at)) {
                match crate::clipboard::set(text) {
                    Ok(()) => app.toast(&tr("Copié", "Copied")),
                    Err(_) => app.toast_bad(&tr("Copie impossible", "Copy failed")),
                }
            }
        }
        ("shell", "dnd-hour") | ("shell", "dnd-off") => {
            let mut prefs = crate::background::read_prefs();
            prefs.quiet_until = if rest == "dnd-hour" { time::now_ms() + 3_600_000.0 } else { 0.0 };
            crate::background::save_prefs(&prefs);
            app.toast(&if rest == "dnd-hour" { tr("Ne pas déranger pendant 1 h", "Do not disturb for 1 h") } else { tr("Notifications réactivées", "Notifications back on") });
            open_log(app);
        }
        ("shell", "refresh") => crate::pages::modules::load_modules(app, false),
        ("shell", "sign-out") => sign_out(app),
        ("palette", "close") => close_palette(app),
        ("palette", "query") => {
            app.palette_query = value.to_string();
            app.palette_index = 0;
        }
        ("palette", "query:submit") => pick_palette_index(app),
        ("palette", "pick") => pick_palette(app, value),
        ("menu", "close") => app.close_menu(),
        ("menu", "pick") => pick_menu(app, value),
        ("drawer", "close") => app.close_drawer(),
        ("toast", id) => {
            if let Ok(id) = id.parse::<u64>() {
                if let Some(at) = app.toasts.iter().position(|toast| toast.id == id) {
                    let toast = app.toasts.remove(at);
                    if let Some((_, run)) = toast.action {
                        run(app);
                    }
                }
            }
        }
        ("pin", id) => crate::pages::modules::open_pinned(app, id),
        ("account", "manage") => go(app, "settings"),
        ("account", "sign-out") => sign_out(app),
        ("music", "seek") => {
            let Some(duration) = app.spotify.track.as_ref().map(|track| track.duration_ms) else { return };
            let position = (value.parse::<f64>().unwrap_or(0.0).clamp(0.0, 1.0) * duration).round();
            if let Some(track) = &mut app.spotify.track {
                track.progress_ms = position;
            }
            app.spotify.at = time::now_ms();
            music_control(app, "seek", serde_json::json!({ "positionMs": position }));
        }
        ("music", action) => music(app, action),
        _ => {}
    }
}

fn focus_page_search(app: &mut App) -> bool {
    let page = crate::pages::view(app);
    let Some(id) = page.main.iter().flat_map(|block| block.cells.iter()).find(|cell| cell.kind == "input" && !cell.id.is_empty()).map(|cell| cell.id.clone()) else { return false };
    app.with_ui(|ui| {
        let bridge = ui.global::<crate::Ui>();
        bridge.set_focus_id(id.into());
        bridge.set_focus_tick(bridge.get_focus_tick() + 1);
    });
    true
}

pub fn toggle_sidebar(app: &mut App) {
    app.compact = !app.compact;
    prefs::write_json("ethone-sidebar-compact", &app.compact);
}

fn open_log(app: &mut App) {
    app.open_drawer(&tr("Dernières notifications", "Recent notifications"), 420.0, |app| {
        let until = crate::background::read_prefs().quiet_until;
        let dnd = if until > time::now_ms() {
            row(vec![wrap(&format!("{} {}", tr("Silence jusqu'à", "Quiet until"), time::clock(&time::from_ms(until)))), btn("shell:dnd-off", &tr("Réactiver", "Turn back on"))])
        } else {
            row(vec![wrap(&tr("Couper les notifications Windows d'Ethone", "Mute Ethone's Windows notifications")), btn("shell:dnd-hour", &tr("Ne pas déranger 1 h", "Do not disturb 1 h"))])
        };
        if app.toast_log.is_empty() {
            return vec![dnd, empty(&tr("Rien pour l'instant", "Nothing yet"), &tr("Les messages affichés depuis l'ouverture d'Ethone restent ici.", "Messages shown since Ethone opened stay here."))];
        }
        let ok = app.icon("circle-check");
        let alert = app.icon("alert-circle");
        let rows = app.toast_log.iter().map(|item| {
            let (image, tone) = if item.tone == "bad" { (alert.clone(), "bad") } else { (ok.clone(), "ok") };
            row(vec![icon(image).tone(tone), wrap(&item.message), muted(&time::clock(&time::from_ms(item.at)))])
        }).collect();
        let mut out = vec![dnd];
        out.extend(group(rows));
        out.push(row(vec![btn("shell:log-clear", &tr("Tout effacer", "Clear all"))]));
        out
    });
}

fn open_clips(app: &mut App) {
    app.open_drawer(&tr("Presse-papiers", "Clipboard"), 420.0, |_app| {
        if !crate::background::read_prefs().clip_history {
            return vec![empty(&tr("Historique désactivé", "History is off"), &tr("Active « Historique du presse-papiers » dans Réglages › Windows et notifications.", "Turn on “Clipboard history” in Settings › Windows and notifications."))];
        }
        let list: Vec<String> = prefs::read_json(crate::background::CLIPS_KEY).unwrap_or_default();
        if list.is_empty() {
            return vec![empty(&tr("Rien de copié pour l'instant", "Nothing copied yet"), &tr("Les textes que tu copies apparaîtront ici.", "Texts you copy will show up here."))];
        }
        let rows = list.iter().enumerate().map(|(at, text)| row(vec![wrap(&crate::logic::clips::preview(text)), btn(&format!("shell:clip-copy:{at}"), &tr("Copier", "Copy"))])).collect();
        let mut out = group(rows);
        out.push(row(vec![btn("shell:clip-clear", &tr("Tout effacer", "Clear all"))]));
        out
    });
}

const FAVORITES: &str = "ethone-favorites";

fn favorite_rows() -> Vec<(String, String, String)> {
    let list: Vec<String> = prefs::read_json(FAVORITES).unwrap_or_default();
    let sections = section_commands();
    list.into_iter()
        .filter_map(|key| {
            let (page, id) = key.split_once('|')?;
            let label = if id.is_empty() {
                navigation::page_exists(page).then(|| page_label(page))?
            } else {
                sections.iter().find(|(p, _, s, _, _)| *p == page && s == id).map(|(_, _, _, label, _)| label.clone())?
            };
            Some((key.clone(), page.to_string(), label))
        })
        .collect()
}

fn current_favorite(app: &App) -> String {
    let sections = section_commands();
    let current = sections.iter().find(|(p, _, _, _, _)| *p == app.page).map(|(_, key, _, _, _)| crate::pages::section(key, "")).unwrap_or_default();
    let id = if sections.iter().any(|(p, _, s, _, _)| *p == app.page && *s == current) { current } else { String::new() };
    format!("{}|{id}", app.page)
}

fn toggle_favorite(app: &mut App, key: &str) {
    let list: Vec<String> = prefs::read_json(FAVORITES).unwrap_or_default();
    let added = !list.iter().any(|item| item == key);
    prefs::write_json(FAVORITES, &crate::logic::toggle_pinned(&list, key));
    app.toast(&if added { tr("Ajouté aux favoris", "Added to favorites") } else { tr("Retiré des favoris", "Removed from favorites") });
}

fn open_favorite(app: &mut App, key: &str) {
    let Some((page, id)) = key.split_once('|') else { return };
    if !id.is_empty() {
        if let Some((_, section_key, _, _, _)) = section_commands().into_iter().find(|(p, _, s, _, _)| *p == page && s == id) {
            crate::pages::set_section(section_key, id);
            app.forget_section(page);
        }
    }
    go(app, page);
}

pub fn prepare_menu(app: &mut App, id: &str) {
    if let Some(key) = id.strip_prefix("pin-menu:fav:") {
        app.menu_for(id, vec![entry(&format!("shell:fav-remove:{key}"), &tr("Retirer des favoris", "Remove from favorites"))]);
        return;
    }
    if id == "account" {
        app.menu_for("account", vec![entry("account:manage", &t("manageAccount")), entry("account:sign-out", &t("signOut"))]);
    } else if let Some(module) = id.strip_prefix("pin-menu:") {
        app.menu_for(id, vec![entry(&format!("modules:pin:{module}"), &tr("Désépingler", "Unpin"))]);
    }
}

pub fn open_palette(app: &mut App) {
    app.palette_open = true;
    app.palette_query.clear();
    app.palette_index = 0;
    crate::pages::work::warm(app);
    app.palette_commands = commands(app);
    let weak = app.ui.clone();
    let _ = slint::invoke_from_event_loop(move || {
        if let Some(ui) = weak.upgrade() {
            ui.invoke_focus_palette();
        }
    });
}

fn close_palette(app: &mut App) {
    app.palette_open = false;
    app.with_ui(|ui| ui.invoke_focus_root());
}

fn calc_answer(app: &App) -> Option<String> {
    crate::logic::calc::answer(&app.palette_query)
}

fn copy_calc(app: &mut App) {
    let Some(value) = calc_answer(app) else { return };
    let number = value.split(' ').next().unwrap_or(&value).to_string();
    close_palette(app);
    match crate::clipboard::set(&number) {
        Ok(()) => app.toast(&format!("{} {number}", tr("Copié :", "Copied:"))),
        Err(_) => app.toast_bad(&tr("Copie impossible", "Copy failed")),
    }
}

fn haystack(command: &Command) -> &str {
    if command.search.is_empty() { &command.label } else { &command.search }
}

fn ranked_ids(app: &App) -> Vec<usize> {
    let recent: Vec<String> = prefs::read_json("ethone-palette-recent").unwrap_or_default();
    let ranked = rank(&app.palette_commands, &app.palette_query, &recent, |command| command.id.as_str(), haystack);
    ranked.list.iter().map(|command| app.palette_commands.iter().position(|other| std::ptr::eq(other, *command)).unwrap_or(0)).collect()
}

pub fn render_palette(app: &mut App, ui: &AppWindow) {
    app.palette_commands = commands(app);
    let recent: Vec<String> = prefs::read_json("ethone-palette-recent").unwrap_or_default();
    let ranked = rank(&app.palette_commands, &app.palette_query, &recent, |command| command.id.as_str(), haystack);
    let mut items = Vec::new();
    let offset = match calc_answer(app) {
        Some(value) => {
            items.push(Item { id: "calc".into(), label: format!("= {value}").into(), hint: tr("Entrée pour copier", "Enter to copy").into(), on: app.palette_index == 0, ..Default::default() });
            1
        }
        None => 0,
    };
    for (at, command) in ranked.list.iter().enumerate() {
        if ranked.recent_count > 0 && at == 0 {
            items.push(Item { kind: "head".into(), label: tr("Récents", "Recent").into(), ..Default::default() });
        }
        if ranked.recent_count > 0 && at == ranked.recent_count {
            items.push(Item { kind: "head".into(), label: tr("Tout", "All").into(), ..Default::default() });
        }
        items.push(Item { id: command.id.clone().into(), label: command.label.clone().into(), hint: command.hint.clone().into(), on: at + offset == app.palette_index, ..Default::default() });
    }
    ui.set_palette_items(ModelRc::new(VecModel::from(items)));
    ui.set_palette_index(app.palette_index as i32);
    ui.set_palette_query(app.palette_query.clone().into());
}

fn pick_palette_index(app: &mut App) {
    let offset = calc_answer(app).is_some() as usize;
    if offset == 1 && app.palette_index == 0 {
        return copy_calc(app);
    }
    let list = ranked_ids(app);
    if let Some(at) = list.get(app.palette_index - offset) {
        let id = app.palette_commands[*at].id.clone();
        pick_palette(app, &id);
    }
}

fn pick_palette(app: &mut App, id: &str) {
    if id == "calc" {
        return copy_calc(app);
    }
    let Some(command) = app.palette_commands.iter().find(|command| command.id == id) else { return };
    let (action, value) = (command.action.clone(), command.value.clone());
    let recent: Vec<String> = prefs::read_json("ethone-palette-recent").unwrap_or_default();
    prefs::write_json("ethone-palette-recent", &remember(&recent, id, 5));
    close_palette(app);
    if let Some(rest) = action.strip_prefix("section:") {
        if let Some((key, page)) = rest.split_once('|') {
            crate::pages::set_section(key, &value);
            app.forget_section(page);
            go(app, page);
        }
    } else {
        app.act(&action, &value);
    }
}

impl App {
    pub fn forget_section(&mut self, _page: &str) {}
}

fn section_commands() -> Vec<(&'static str, &'static str, String, String, String)> {
    let mut out = Vec::new();
    let mut group = |page: &'static str, key: &'static str, title: String, rows: Vec<(&str, String)>| {
        for (id, label) in rows {
            out.push((page, key, id.to_string(), format!("{title} › {label}"), String::new()));
        }
    };
    group("settings", "ethone-section-settings", tr("Réglages", "Settings"), vec![("appearance", tr("Apparence", "Appearance")), ("windows", tr("Windows et notifications", "Windows and notifications")), ("shortcuts", tr("Raccourcis", "Shortcuts")), ("privacy", tr("Confidentialité", "Privacy")), ("sync", tr("Synchronisation", "Sync")), ("storage", tr("Stockage et cache", "Storage and cache")), ("performance", "Performance".into()), ("accessibility", tr("Accessibilité", "Accessibility")), ("workspace", tr("Espace de travail", "Workspace")), ("advanced", tr("Avancé", "Advanced")), ("profile", tr("Profil", "Profile")), ("connections", tr("Connexions", "Connections")), ("devices", tr("Appareils", "Devices")), ("twofactor", tr("Double authentification", "Two-factor")), ("passkeys", tr("Clés d'accès", "Passkeys")), ("events", tr("Journal de sécurité", "Security log")), ("ai", tr("Intelligence artificielle", "Artificial intelligence")), ("about", tr("À propos", "About"))]);
    group("productivity", "ethone-section-productivity", tr("Productivité", "Productivity"), vec![("tasks", tr("Tâches", "Tasks")), ("events", tr("Calendrier", "Calendar")), ("notes", "Notes".into()), ("scratchpad", tr("Mémo", "Scratchpad")), ("capture", tr("Capture rapide", "Quick capture")), ("habits", tr("Habitudes", "Habits")), ("focus", tr("Concentration et ambiance", "Focus and ambience")), ("bills", tr("Factures", "Bills"))]);
    group("tracker", "ethone-section-eval", "E:VAL".into(), vec![("profile", tr("Profil", "Profile")), ("live", tr("En direct", "Live")), ("game", tr("Jeu et boutique", "Game and store")), ("hub", "Hub".into())]);
    group("insights", "ethone-section-insights", tr("Analyses", "Insights"), vec![("activity", tr("Activité", "Activity")), ("mail", tr("Statistiques mail", "Mail stats")), ("weather", tr("Météo", "Weather")), ("rss", tr("Flux RSS", "RSS feeds")), ("diagnostic", tr("Diagnostic", "Diagnostics"))]);
    group("games", "ethone-section-games", "E:LOL".into(), vec![("profile", tr("Profil", "Profile")), ("live", tr("En direct", "Live")), ("tft", "Teamfight Tactics".into()), ("rotation", tr("Rotation LoL", "LoL rotation")), ("hub", tr("Amis", "Friends"))]);
    out
}

fn commands(app: &App) -> Vec<Command> {
    let mut out = Vec::new();
    for status in &app.modules {
        let id = &status.module.id;
        if status.can_run() {
            out.push(Command { id: format!("run-{id}"), label: format!("{} : {}", t(&format!("action.{}", status.action_name())), status.module.name), hint: String::new(), action: format!("modules:run:{id}"), value: String::new(), search: String::new() });
        } else {
            out.push(Command { id: format!("see-{id}"), label: format!("{} : {}", tr("Voir", "See"), status.module.name), hint: String::new(), action: "go:modules".into(), value: String::new(), search: String::new() });
        }
    }
    for page in MAIN_PAGES.iter().chain(FOOT_PAGES.iter()) {
        let hint = if PAGE_ORDER.contains(page) || *page == "settings" { shortcut(page).unwrap_or_default() } else { String::new() };
        out.push(Command { id: format!("page-{page}"), label: page_label(page), hint, action: format!("go:{page}"), value: String::new(), search: String::new() });
    }
    for (page, key, id, label, _) in section_commands() {
        out.push(Command { id: format!("section-{page}-{id}"), label, hint: String::new(), action: format!("section:{key}|{page}"), value: id, search: String::new() });
    }
    let favorite = current_favorite(app);
    let is_favorite = prefs::read_json::<Vec<String>>(FAVORITES).unwrap_or_default().contains(&favorite);
    out.push(Command { id: "fav-toggle".into(), label: if is_favorite { tr("Retirer cette page des favoris", "Remove this page from favorites") } else { tr("Ajouter cette page aux favoris", "Add this page to favorites") }, hint: String::new(), action: "shell:fav-toggle".into(), value: String::new(), search: String::new() });
    out.push(Command { id: "clips".into(), label: tr("Historique du presse-papiers", "Clipboard history"), hint: String::new(), action: "shell:clips".into(), value: String::new(), search: String::new() });
    for kind in ["notes", "tasks"] {
        let list = app.res.get(&format!("productivity:{kind}")).and_then(|res| res.data.clone()).and_then(|data| data.as_array().cloned()).unwrap_or_default();
        for item in list {
            let Some(id) = item["id"].as_str() else { continue };
            let title = item["title"].as_str().unwrap_or_default();
            let label = format!("{} : {}", if kind == "notes" { "Note".to_string() } else { tr("Tâche", "Task") }, if title.trim().is_empty() { tr("Sans titre", "Untitled") } else { title.to_string() });
            let body: String = item["body"].as_str().unwrap_or_default().chars().take(2000).collect();
            out.push(Command { id: format!("item-{kind}-{id}"), search: format!("{label} {body}"), label, hint: String::new(), action: "shell:open-item".into(), value: format!("{kind}|{id}") });
        }
    }
    out.push(Command { id: "sidebar".into(), label: tr("Afficher ou réduire la barre latérale", "Show or collapse the sidebar"), hint: "Ctrl+B".into(), action: "shell:sidebar".into(), value: String::new(), search: String::new() });
    out.push(Command { id: "refresh".into(), label: tr("Actualiser les applications", "Refresh apps"), hint: String::new(), action: "shell:refresh".into(), value: String::new(), search: String::new() });
    out.push(Command { id: "toast-log".into(), label: tr("Voir les dernières notifications", "See recent notifications"), hint: String::new(), action: "shell:log".into(), value: String::new(), search: String::new() });
    out.push(Command { id: "signout".into(), label: t("signOut"), hint: String::new(), action: "shell:sign-out".into(), value: String::new(), search: String::new() });
    out
}

pub fn key(app: &mut App, text: &str, ctrl: bool, alt: bool, _shift: bool) -> bool {
    let lower = text.to_lowercase();
    if app.menu_open.is_some() {
        let count = app.menu_open.as_ref().and_then(|id| app.menus.get(id)).map_or(0, Vec::len) as i32;
        match lower.as_str() {
            "esc" => {
                app.close_menu();
                return true;
            }
            "down" | "up" if count > 0 => {
                let step = if lower == "down" { 1 } else { count - 1 };
                app.with_ui(|ui| ui.set_menu_index((ui.get_menu_index().max(0) + step) % count));
                return true;
            }
            "enter" => {
                let index = app.ui.upgrade().map_or(-1, |ui| ui.get_menu_index());
                if index >= 0 {
                    pick_menu(app, &index.to_string());
                }
                return true;
            }
            _ => {}
        }
    }
    if app.palette_open {
        let count = ranked_ids(app).len() + calc_answer(app).is_some() as usize;
        match lower.as_str() {
            "esc" => close_palette(app),
            "down" => app.palette_index = (app.palette_index + 1).min(count.saturating_sub(1)),
            "up" => app.palette_index = app.palette_index.saturating_sub(1),
            "enter" => pick_palette_index(app),
            _ if ctrl && lower == "k" => close_palette(app),
            _ => return false,
        }
        return true;
    }
    if lower == "esc" && app.drawer.is_some() {
        app.close_drawer();
        return true;
    }
    if !matches!(app.stage, Some(Stage::SignedIn { .. })) {
        return false;
    }
    if ctrl {
        match lower.as_str() {
            "k" => open_palette(app),
            "," => go(app, "settings"),
            "b" => toggle_sidebar(app),
            "f" => return focus_page_search(app),
            digit if digit.len() == 1 && digit.as_bytes()[0].is_ascii_digit() && digit != "0" => {
                if let Some(page) = PAGE_ORDER.get(digit.parse::<usize>().unwrap_or(1) - 1) {
                    go(app, page);
                }
            }
            _ => return false,
        }
        return true;
    }
    if alt && lower == "left" {
        go_back(app);
        return true;
    }
    if alt && lower == "right" {
        go_forward(app);
        return true;
    }
    if lower == "f5" {
        crate::pages::refresh_current(app);
        return true;
    }
    false
}

pub fn render_chrome(app: &mut App, ui: &AppWindow) {
    let page = app.page.clone();
    let compact = app.compact || ui.window().size().to_logical(ui.window().scale_factor()).width < 1100.0;
    let mut nav: Vec<Item> = Vec::new();
    let mut y = 0.0f32;
    let mut active: Option<f32> = None;
    let badge_mail = app.new_mail as i32;
    let favorites = favorite_rows();
    if !favorites.is_empty() {
        nav.push(Item { kind: "head".into(), label: tr("Favoris", "Favorites").into(), ..Default::default() });
        y += if compact { 12.0 } else { 30.0 };
        for (key, page, label) in favorites {
            nav.push(Item { id: format!("shell:fav-open:{key}").into(), label: label.into(), icon: app.icon(navigation::page_icon(&page)), hint: format!("fav:{key}").into(), kind: "fav".into(), ..Default::default() });
            y += 34.0;
        }
    }
    for (label, pages) in GROUPS {
        if let Some((fr, en)) = label {
            nav.push(Item { kind: "head".into(), label: tr(fr, en).into(), ..Default::default() });
            y += if compact { 12.0 } else { 30.0 };
        }
        for id in pages {
            if *id == page {
                active = Some(y);
            }
            let on = *id == page;
            nav.push(Item { id: format!("go:{id}").into(), label: page_label(id).into(), icon: app.icon(navigation::page_icon(id)), on, badge: if *id == "mail" { badge_mail } else { 0 }, hint: shortcut(id).unwrap_or_default().into(), ..Default::default() });
            y += 34.0;
        }
    }
    let pins = crate::logic::resolve_pinned(&app.pinned, &app.modules, |status| status.module.id.as_str()).into_iter().map(|status| (status.module.id.clone(), status.module.name.clone(), status.running)).collect::<Vec<_>>();
    if !pins.is_empty() {
        nav.push(Item { kind: "head".into(), label: tr("Épinglées", "Pinned").into(), ..Default::default() });
        for (id, name, running) in pins {
            let image = crate::app::app_image(app, &id);
            nav.push(Item { id: format!("pin:{id}").into(), label: name.into(), hint: id.into(), icon: image, kind: "pin".into(), dot: running, ..Default::default() });
        }
    }
    if let Some(fresh) = crate::app::keep_rows(ui.get_nav(), nav) {
        ui.set_nav(fresh);
    }
    let settings_icon = app.icon("settings");
    if let Some(fresh) = crate::app::keep_rows(ui.get_foot(), vec![Item { id: "go:settings".into(), label: page_label("settings").into(), icon: settings_icon, on: page == "settings", ..Default::default() }]) {
        ui.set_foot(fresh);
    }
    ui.set_has_active(active.is_some());
    ui.set_active_y(active.unwrap_or(0.0));
    ui.set_active_tint(hex(page_tint(&page)));
    ui.global::<crate::Theme>().set_tint(hex(page_tint(&page)));
    ui.set_compact(compact);
    let (brand, name, mono) = match page.as_str() {
        "tracker" => (app.icon("valorant"), "E:VAL", true),
        "games" => (app.icon("league"), "E:LOL", true),
        _ => (app.logo_image(), "Ethone", false),
    };
    ui.set_brand(brand);
    ui.set_brand_name(name.into());
    ui.set_brand_mono(mono);
    let profile = app.profile();
    let user = profile.as_ref().map_or(String::new(), |profile| profile.name.clone());
    ui.set_user_initial(user.chars().next().map_or(String::new(), |first| first.to_uppercase().to_string()).into());
    ui.set_user_name(user.into());
    let avatar_url = app.get("avatar-url");
    let avatar = app.img(&avatar_url);
    ui.set_user_image(avatar);
    ui.set_collapse_icon(app.icon(if app.compact { "panel-left-open" } else { "panel-left-close" }));
    ui.set_collapse_label(if app.compact { tr("Agrandir la barre", "Expand the sidebar") } else { tr("Réduire la barre", "Collapse the sidebar") }.into());
    ui.set_offline_label(if !app.online || app.offline() { t("offline") } else { String::new() }.into());
    ui.set_can_back(!app.history.back.is_empty());
    ui.set_can_forward(!app.history.forward.is_empty());
    render_capsule(app, ui);
    crate::pages::modules::render_embed(app, ui);
}

impl App {
    pub fn logo_image(&mut self) -> Image {
        self.images.entry("asset:logo".into()).or_insert_with(crate::assets::logo).clone()
    }
}

fn render_capsule(app: &mut App, ui: &AppWindow) {
    let state = app.spotify.clone();
    let show = app.page != "home" && state.track.is_some();
    ui.set_capsule_on(show);
    if let Some(track) = state.track.clone() {
        let now = time::now_ms();
        let position = crate::logic::spotify::live_progress(&state, now);
        let image = app.img(track.cover_small.as_deref().unwrap_or_default());
        ui.set_capsule(crate::Cell {
            title: track.title.into(),
            sub: track.artist.unwrap_or_default().into(),
            image,
            value: crate::logic::spotify::clock(position).into(),
            extra: crate::logic::spotify::clock(track.duration_ms).into(),
            progress: if track.duration_ms > 0.0 { (position / track.duration_ms) as f32 } else { 0.0 },
            ..Default::default()
        });
        ui.set_music_play(app.icon(if state.playing { "pause" } else { "play" }));
    }
}

pub fn spotify_refresh() -> Fut {
    crate::services::api_data(&format!("api/spotify/now-playing?clientId={}", crate::logic::spotify::CLIENT))
}

fn apply_spotify(app: &mut App, result: Result<Value, String>) {
    use crate::logic::spotify::{parse_track, State};
    match result {
        Ok(data) => {
            app.spotify = State { linked: true, playing: data["playing"].as_bool().unwrap_or(false), track: parse_track(&data["track"]), at: time::now_ms() };
        }
        Err(error) if error == "sessionExpired" => {
            app.spotify = State { linked: false, playing: false, track: None, at: time::now_ms() };
        }
        Err(_) => {}
    }
}

fn spotify_poll() {
    svc().rt.spawn(async {
        loop {
            let result = spotify_refresh().await;
            let (sender, receiver) = tokio::sync::oneshot::channel();
            post(move |app| {
                apply_spotify(app, result);
                let _ = sender.send(crate::logic::spotify::poll_delay(&app.spotify));
            });
            let delay = receiver.await.unwrap_or(20000);
            tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
        }
    });
    svc().rt.spawn(async {
        let mut last = String::new();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let clock = time::clock(&chrono::Local::now());
            if clock != last {
                last = clock.clone();
                post(move |app| crate::pages::brain_extras::run_time_rules(app, &clock));
            } else {
                post(|_| {});
            }
        }
    });
}

pub fn music(app: &mut App, action: &str) {
    let action = match action {
        "toggle" => if app.spotify.playing { "pause" } else { "play" },
        other => other,
    }.to_string();
    music_control(app, &action, serde_json::json!({}));
}

pub fn music_control(app: &mut App, action: &str, extra: Value) {
    let mut body = serde_json::json!({ "action": action, "clientId": crate::logic::spotify::CLIENT });
    if let (Some(target), Some(source)) = (body.as_object_mut(), extra.as_object()) {
        target.extend(source.clone());
    }
    let action = action.to_string();
    if action == "play" || action == "pause" {
        let now = time::now_ms();
        let position = crate::logic::spotify::live_progress(&app.spotify, now);
        if let Some(track) = &mut app.spotify.track {
            track.progress_ms = position;
        }
        app.spotify.playing = action == "play";
        app.spotify.at = now;
    }
    let call = crate::services::api_m("POST", "api/spotify/control", Some(body));
    spawn(
        async move {
            let result = call.await;
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            (result, spotify_refresh().await)
        },
        |app, (result, fresh)| {
            if result.is_err() {
                app.toast_bad(&tr("Spotify refuse : il faut Premium et un appareil actif", "Spotify refused: Premium and an active device are required"));
            }
            apply_spotify(app, fresh);
        },
    );
}

pub fn handle_link(app: &mut App, message: &str) {
    app.with_ui(crate::win::show_main);
    if message.starts_with("ethone://discord-auth") {
        let url = message.to_string();
        spawn(
            async move {
                match ethone_engine::bot::code_from_url(&url) {
                    Some(code) => svc().bot.exchange(&code).await,
                    None => Err("discordLoginFailed".to_string()),
                }
            },
            |app, result| crate::pages::discord_login(app, result),
        );
    } else if message.starts_with("ethone://") {
        let url = message.to_string();
        spawn(async move { svc().auth.oauth_finish(&url).await }, crate::pages::login::callback_result);
    }
}

pub fn online_changed(app: &mut App, online: bool) {
    app.online = online;
    if app.offline() {
        return;
    }
    if online {
        app.toast(&tr("Connexion rétablie", "Back online"));
        crate::pages::modules::load_modules(app, false);
    } else {
        app.toast_bad(&tr("Connexion perdue. Ce qui demande Internet reprendra au retour du réseau.", "Connection lost. Online features resume when the network returns."));
    }
}

pub fn mail_checked(app: &mut App, answer: Value) {
    let list = crate::pages::first_array(&answer, None);
    let prefs = crate::background::read_prefs();
    let fresh: Vec<Value> = crate::logic::home::unseen_mail(app.seen_mail.as_ref(), &list).into_iter().cloned().collect();
    let seen = app.seen_mail.get_or_insert_with(Default::default);
    for item in &list {
        seen.insert(item["id"].as_str().unwrap_or_default().to_string());
    }
    if !fresh.is_empty() && app.page != "mail" {
        app.new_mail += fresh.len();
    }
    if crate::background::quiet_now(&prefs) {
        return;
    }
    if fresh.len() == 1 {
        let item = &fresh[0];
        let from = item["from_name"].as_str().filter(|name| !name.is_empty()).or(item["from_address"].as_str()).unwrap_or_default();
        let subject = item["subject"].as_str().filter(|text| !text.is_empty()).map_or_else(|| tr("Nouveau mail", "New mail"), str::to_string);
        let _ = crate::background::notify(from, &subject);
    } else if fresh.len() > 1 {
        let _ = crate::background::notify("Ethone", &tr(&format!("{} nouveaux mails", fresh.len()), &format!("{} new emails", fresh.len())));
    }
}

pub fn side_items(app: &mut App, page: &Page) -> Vec<Item> {
    page.side.iter().map(|(id, label, icon_name, group)| {
        let is_head = id.is_empty();
        let image = if icon_name.is_empty() { Image::default() } else { crate::assets::icon(icon_name) };
        let _ = (&app.page, group);
        Item { id: id.clone().into(), label: label.clone().into(), icon: image, kind: if is_head { "head" } else { "" }.into(), on: !is_head && *id == page.side_active, ..Default::default() }
    }).collect()
}

