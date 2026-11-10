use crate::app::{spawn, App, Page};
use crate::background::{self, DesktopPrefs};
use crate::i18n::{fr, lang, t, tr};
use crate::logic::format_bytes;
use crate::logic::settings::{interface_json, parse_settings, ACCENTS, LOOKS};
use crate::logic::time;
use crate::pages::generic::{humanize, json_fields, json_list, row_title, unwrap_config, RowAction};
use crate::pages::{first_array, form, section, set_section};
use crate::prefs;
use crate::services::{api, api_data, api_m, items_list, open_site, open_url, rest_get, svc, Fut, VERSION};
use crate::vm::*;
use serde_json::{json, Value};
use slint::ComponentHandle;
use std::rc::Rc;

const SECTION_KEY: &str = "ethone-section-settings";

#[derive(Default)]
pub struct SettingsState {
    pub autostart: Option<bool>,
    pub hdv: Option<String>,
    pub totp: Option<Value>,
    pub code: String,
    pub message: Option<(String, bool)>,
    pub busy: bool,
    pub sync: Option<Vec<(String, Result<usize, String>, u128)>>,
    pub asking_reset: bool,
    pub twitch_draft: String,
    pub connection_confirm: Option<String>,
    pub fps: Option<u32>,
}

fn side(admin: bool) -> Vec<(String, String, String, String)> {
    let mut out = Vec::new();
    let mut group = |title: String, rows: Vec<(&str, String, &str)>| {
        out.push((String::new(), title, String::new(), String::new()));
        for (id, label, icon) in rows {
            out.push((format!("settings:section:{id}"), label, icon.to_string(), String::new()));
        }
    };
    group(tr("Application", "App"), vec![("appearance", tr("Apparence", "Appearance"), "palette"), ("windows", tr("Windows et notifications", "Windows and notifications"), "bell"), ("shortcuts", tr("Raccourcis", "Shortcuts"), "keyboard"), ("storage", tr("Stockage et cache", "Storage and cache"), "hard-drive"), ("performance", "Performance".into(), "gauge"), ("accessibility", tr("Accessibilité", "Accessibility"), "accessibility"), ("workspace", tr("Espace de travail", "Workspace"), "layout-grid"), ("advanced", tr("Avancé", "Advanced"), "wrench"), ("journal", tr("Journal", "Log"), "scroll-text"), ("about", tr("À propos", "About"), "info")]);
    group(tr("Compte", "Account"), vec![("profile", tr("Profil", "Profile"), "user"), ("privacy", tr("Confidentialité", "Privacy"), "lock"), ("sync", tr("Synchronisation", "Sync"), "refresh-cw"), ("profiles", tr("Espaces de profil", "Profile spaces"), "users"), ("connections", tr("Connexions", "Connections"), "plug")]);
    group(tr("Sécurité", "Security"), vec![("devices", tr("Appareils", "Devices"), "shield"), ("twofactor", tr("Double authentification", "Two-factor"), "shield"), ("passkeys", tr("Clés d'accès", "Passkeys"), "key-round"), ("events", tr("Journal de sécurité", "Security log"), "activity")]);
    let mut services = vec![("ai", tr("Intelligence artificielle", "AI"), "sparkles")];
    if admin {
        services.push(("admin", tr("Administration", "Administration"), "crown"));
    }
    group(tr("Services", "Services"), services);
    out
}

pub fn view(app: &mut App) -> Page {
    let current = section(SECTION_KEY, "appearance");
    let admin = app.load("settings:admin", || api_data("api/admin/stats")).data.is_some();
    let main = match current.as_str() {
        "windows" => windows(app),
        "shortcuts" => shortcuts(),
        "storage" => storage(app),
        "performance" => performance(app),
        "accessibility" => accessibility(app),
        "workspace" => workspace(app),
        "advanced" => advanced(app),
        "journal" => journal(app),
        "about" => about(app),
        "profile" => profile(app),
        "privacy" => privacy(app),
        "sync" => sync(app),
        "profiles" => remote(app, &tr("Espaces de profil", "Profile spaces"), "api/profiles", "", vec![(tr("Activer", "Activate"), false, "api/profiles/activate", "id")]),
        "connections" => crate::pages::connections::view(app),
        "devices" => devices(app),
        "twofactor" => two_factor(app),
        "passkeys" => remote(app, &tr("Clés d'accès", "Passkeys"), "api/auth/passkeys", &tr("Les clés d'accès se créent sur ethone.dev, car elles sont liées à ce domaine.", "Passkeys are created on ethone.dev because they are tied to that domain."), vec![(tr("Révoquer", "Revoke"), true, "api/auth/passkey/revoke", "passkeyId")]),
        "events" => security_log(app),
        "ai" => ai(app),
        "admin" if admin => crate::pages::admin::view(app),
        _ => appearance(app),
    };
    Page { side: side(admin), side_active: format!("settings:section:{current}"), main, ..Default::default() }
}

fn save_interface(app: &mut App, change: impl FnOnce(&mut crate::logic::settings::InterfacePreferences)) {
    let mut preferences = crate::theme::interface();
    change(&mut preferences);
    prefs::write_json("ethone-interface-preferences", &interface_json(&preferences));
    app.with_ui(crate::theme::apply);
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => {
            set_section(SECTION_KEY, arg);
            app.state.settings.message = None;
        }
        "look" => app.with_ui(|ui| crate::theme::apply_look(ui, arg)),
        "accent" => {
            prefs::write("ethone-accent-choice", arg);
            if prefs::read("ethone-look").is_none() {
                prefs::write("ethone-look", "ethone");
            }
            app.with_ui(crate::theme::apply);
        }
        "language" => {
            if arg != lang() {
                prefs::write("ethone-language", arg);
                app.with_ui(crate::app::with_labels);
                app.res.clear();
            }
        }
        "density" => save_interface(app, |preferences| preferences.density = arg.into()),
        "text" => save_interface(app, |preferences| preferences.text_scale = value.parse().unwrap_or(100)),
        "motion" => save_interface(app, |preferences| preferences.motion = arg.into()),
        "transparency" => save_interface(app, |preferences| preferences.transparency = arg.into()),
        "sound" => crate::sounds::choose_pack(value),
        "reset" => {
            prefs::write_json("ethone-interface-preferences", &interface_json(&Default::default()));
            app.with_ui(|ui| crate::theme::apply_look(ui, "ethone"));
            app.toast(&tr("Apparence réinitialisée", "Appearance reset"));
        }
        "autostart" => match background::set_autostart(value == "true") {
            Ok(()) => app.state.settings.autostart = Some(value == "true"),
            Err(_) => app.toast_bad(&tr("Réglage Windows non modifié", "Windows setting not changed")),
        },
        "pref" => {
            let mut prefs_now = background::read_prefs();
            let on = value == "true";
            match arg {
                "closeToTray" => prefs_now.close_to_tray = on,
                "notifyMail" => prefs_now.notify_mail = on,
                "notifyEvents" => prefs_now.notify_events = on,
                "quiet" => prefs_now.quiet = on,
                "clipHistory" => prefs_now.clip_history = on,
                "quietFrom" => prefs_now.quiet_from = value.into(),
                "quietTo" => prefs_now.quiet_to = value.into(),
                "hdvBackground" => {
                    prefs_now.hdv_background = on;
                    spawn(async move { crate::pages::modules::hdv_background(on) }, |app, result| match result {
                        Ok(state) => app.state.settings.hdv = Some(state),
                        Err(_) => app.toast_bad(&tr("Argus n'a pas répondu", "Argus did not respond")),
                    });
                }
                _ => {}
            }
            background::save_prefs(&prefs_now);
        }
        "notify-test" => {
            if background::notify("Ethone", &tr("Les notifications fonctionnent.", "Notifications work.")).is_err() {
                app.toast_bad(&tr("Notification impossible", "Notification failed"));
            }
        }
        "export" => export(app),
        "import" => import(app),
        "contrast" => {
            prefs::write("ethone-contrast", if value == "true" { "more" } else { "normal" });
            app.with_ui(crate::theme::apply);
        }
        "reduce-motion" => save_interface(app, |preferences| preferences.motion = if value == "true" { "reduced".into() } else { "system".into() }),
        "opaque" => save_interface(app, |preferences| preferences.transparency = if value == "true" { "reduced".into() } else { "system".into() }),
        "saver" => {
            let on = value == "true";
            save_interface(app, |preferences| {
                preferences.motion = if on { "reduced".into() } else { "system".into() };
                preferences.transparency = if on { "reduced".into() } else { "system".into() };
            });
        }
        "start-page" => prefs::write_json("ethone-start-page", &value.to_string()),
        "clear-cache" => {
            crate::cache::clear("");
            app.res.clear();
            app.images.clear();
            let _ = std::fs::remove_dir_all(crate::services::data_dir().join("native-cache"));
            app.toast(&tr("Cache vidé : les données seront rechargées", "Cache cleared: data will reload"));
        }
        "clear-local" => {
            for key in arg.split(',') {
                prefs::remove(key);
            }
            app.toast(&tr("Effacé de ce PC", "Cleared from this PC"));
        }
        "copy-diagnostic" => {
            let text = diagnostic(app);
            match crate::clipboard::set(&text) {
                Ok(()) => app.toast(&tr("Diagnostic copié", "Diagnostic copied")),
                Err(_) => app.toast_bad(&tr("Impossible de copier. Sélectionne le texte à la main.", "Could not copy. Select the text by hand.")),
            }
        }
        "ask-reset" => app.state.settings.asking_reset = !app.state.settings.asking_reset,
        "reset-app" => {
            let path = crate::services::data_dir().join("native-prefs.json");
            let chat = prefs::read("ethone-brain-chat");
            let _ = std::fs::remove_file(path);
            crate::prefs::reload();
            if let Some(chat) = chat {
                prefs::write("ethone-brain-chat", &chat);
            }
            crate::cache::clear("");
            app.res.clear();
            app.state.settings.asking_reset = false;
            app.with_ui(crate::theme::apply);
            app.toast(&tr("Application réinitialisée", "App reset"));
        }
        "manage" => {
            let _ = open_site("account");
        }
        "sign-out" => crate::pages::shell::sign_out(app),
        "site" => {
            let _ = open_site(arg);
        }
        "link" => {
            let _ = open_url(&format!("https://ethone.dev/{arg}"));
        }
        "refresh" => app.forget("settings:"),
        "sync" => run_sync(app),
        "code" => app.state.settings.code = value.into(),
        "totp-setup" => {
            app.state.settings.busy = true;
            app.state.settings.message = None;
            spawn(api_data_post("api/auth/totp/setup", json!({})), |app, result| {
                app.state.settings.busy = false;
                match result {
                    Ok(setup) => app.state.settings.totp = Some(setup),
                    Err(error) => app.state.settings.message = Some((crate::i18n::error_text(&error), false)),
                }
            });
        }
        "totp-submit" | "code:submit" => {
            let code = app.state.settings.code.trim().to_string();
            if code.len() < 6 {
                return;
            }
            let enabling = app.state.settings.totp.is_some();
            let path = if enabling { "api/auth/totp/verify" } else { "api/auth/totp/disable" };
            app.state.settings.busy = true;
            spawn(api_data_post(path, json!({ "code": code })), move |app, result| {
                app.state.settings.busy = false;
                match result {
                    Ok(_) => {
                        app.state.settings.totp = None;
                        app.state.settings.code.clear();
                        app.state.settings.message = Some((if enabling { tr("Double authentification activée.", "Two-factor enabled.") } else { tr("Double authentification désactivée.", "Two-factor disabled.") }, true));
                    }
                    Err(error) => app.state.settings.message = Some((crate::i18n::error_text(&error), false)),
                }
            });
        }
        "fps" => measure_fps(app),
        _ => {}
    }
}

fn api_data_post(path: &str, body: Value) -> Fut {
    let inner = api_m("POST", path, Some(body));
    Box::pin(async move { Ok(crate::services::unwrap_data(inner.await?)) })
}

fn diagnostic(app: &App) -> String {
    let size = app.ui.upgrade().map(|ui| {
        let size = ui.window().size();
        format!("{}x{} @{}", size.width, size.height, ui.window().scale_factor())
    }).unwrap_or_default();
    [format!("Ethone {VERSION} (Rust natif)"), format!("Windows {}", std::env::var("OS").unwrap_or_default()), format!("Fenêtre {size}"), format!("Thème {}", crate::theme::current_look()), format!("Langue {}", lang())].join("\n")
}

fn export(app: &mut App) {
    let text = crate::logic::settings::export_settings(prefs::read);
    let path = crate::dialogs::downloads().join("ethone-reglages.json");
    match std::fs::write(&path, text) {
        Ok(()) => app.toast(&tr(&format!("Réglages enregistrés dans {}", path.display()), &format!("Settings saved to {}", path.display()))),
        Err(_) => app.toast_bad(&tr("Export impossible", "Export failed")),
    }
}

fn import(app: &mut App) {
    let owner = app.ui.upgrade().and_then(|ui| crate::win::hwnd(&ui));
    let Some(path) = crate::dialogs::open_files(owner, "JSON|*.json", false).into_iter().next() else { return };
    let parsed = std::fs::read_to_string(path).map_err(|error| error.to_string()).and_then(|text| parse_settings(&text));
    match parsed {
        Ok(values) => {
            for (key, value) in values {
                prefs::write(&key, &value);
            }
            app.compact = prefs::read_json("ethone-sidebar-compact").unwrap_or(false);
            app.pinned = prefs::read_json("ethone-pinned-apps").unwrap_or_default();
            app.with_ui(crate::theme::apply);
            app.with_ui(crate::app::with_labels);
            app.toast(&tr("Réglages importés", "Settings imported"));
        }
        Err(_) => app.toast_bad(&tr("Ce fichier n'est pas un export d'Ethone", "This file is not an Ethone export")),
    }
}

fn measure_fps(app: &mut App) {
    app.state.settings.fps = None;
    let counter = std::rc::Rc::new(std::cell::Cell::new(0u32));
    let started = std::time::Instant::now();
    let timer = std::rc::Rc::new(slint::Timer::default());
    let holder = timer.clone();
    let count = counter.clone();
    timer.start(slint::TimerMode::Repeated, std::time::Duration::from_millis(1), move || {
        count.set(count.get() + 1);
        if started.elapsed().as_millis() >= 1000 {
            let frames = count.get();
            holder.stop();
            crate::app::with_app(|app| app.state.settings.fps = Some(frames.min(1000)));
            crate::app::request_render();
        }
    });
    std::mem::forget(timer);
}

fn appearance(app: &mut App) -> Vec<B> {
    let look = crate::theme::current_look();
    let accent = crate::theme::current_accent();
    let preferences = crate::theme::interface();
    let check = app.icon("check");
    let mut out = vec![head(&tr("Apparence", "Appearance"), &tr("Choisis l'ambiance de toute l'application.", "Choose the mood of the whole app."), vec![])];
    let fr = fr();
    let cards: Vec<C> = LOOKS.iter().map(|item| C { kind: "theme", id: format!("settings:look:{}", item.id), title: if fr { item.fr } else { item.en }.into(), sub: if fr { item.text_fr } else { item.text_en }.into(), color: Some(hex(item.colors[0])), color2: Some(hex(item.colors[1])), icon: check.clone(), on: look == item.id, ..Default::default() }).collect();
    for chunk in cards.chunks(3) {
        out.push(row(chunk.to_vec()));
    }
    let swatches: Vec<C> = ACCENTS.iter().map(|item| C { kind: "swatch", id: format!("settings:accent:{}", item.id), color: Some(hex(item.color)), color2: Some(hex(item.on)), icon: check.clone(), on: accent == item.id, tip: item.id.into(), ..Default::default() }).collect();
    let mut accent_row = vec![strong(&t("accent")).grow()];
    accent_row.extend(swatches);
    let text_options: Vec<(String, String)> = [90, 100, 110, 125].iter().map(|value| (value.to_string(), format!("{value} %"))).collect();
    let text_pick = app.select("settings:text", &preferences.text_scale.to_string(), &text_options);
    let sound_options = vec![("off".to_string(), tr("Aucun", "None")), ("soft".to_string(), tr("Doux", "Soft")), ("crisp".to_string(), tr("Net", "Crisp")), ("retro".to_string(), tr("Rétro", "Retro"))];
    let sound_pick = app.select("settings:sound", &crate::sounds::current_pack(), &sound_options);
    let density = seg(&[("comfortable", &tr("Confortable", "Comfortable")), ("compact", &tr("Compact", "Compact"))], &preferences.density, "settings:density:");
    let motion = seg(&[("system", "Windows"), ("reduced", &tr("Réduites", "Reduced"))], &preferences.motion, "settings:motion:");
    let transparency = seg(&[("system", "Windows"), ("reduced", &tr("Opaque", "Opaque"))], &preferences.transparency, "settings:transparency:");
    let language = seg(&[("fr", "Français"), ("en", "English")], lang(), "settings:language:");
    let mut rows = vec![row(accent_row), row(vec![strong(&t("language")).grow()])];
    rows.push(language);
    rows.push(row(vec![stack(&tr("Densité", "Density"), &tr("Adapte les espacements et la hauteur des contrôles.", "Adjusts spacing and control height."))]));
    rows.push(density);
    rows.push(row(vec![stack(&tr("Taille du texte", "Text size"), &tr("Agrandit les textes sans changer le scaling Windows.", "Enlarges text without changing Windows scaling.")), text_pick]));
    rows.push(row(vec![stack(&tr("Animations", "Animations"), &tr("Suit Windows ou réduit les mouvements dans toute l'application.", "Follows Windows or reduces motion throughout the app."))]));
    rows.push(motion);
    rows.push(row(vec![stack(&tr("Transparence", "Transparency"), &tr("Suit Windows ou utilise des surfaces opaques.", "Follows Windows or uses opaque surfaces."))]));
    rows.push(transparency);
    rows.push(row(vec![stack(&tr("Sons de l'interface", "Interface sounds"), &tr("Un petit son quand tu cliques sur un bouton.", "A small sound when you click a button.")), sound_pick]));
    rows.push(row(vec![stack(&tr("Réinitialiser l'apparence", "Reset appearance"), &tr("Restaure le thème automatique et les réglages par défaut.", "Restores the automatic theme and default settings.")), btn("settings:reset", &tr("Réinitialiser", "Reset"))]));
    out.extend(rows.into_iter().map(|block| if block.kind == "row" { B { tone: "", ..block } } else { block }));
    out
}

fn switch_row(id: &str, title: &str, text: &str, on: bool) -> B {
    row(vec![stack(title, text), switch(id, on, title)])
}

fn windows(app: &mut App) -> Vec<B> {
    if app.state.settings.autostart.is_none() {
        app.state.settings.autostart = Some(background::autostart_enabled());
        let enabled = background::read_prefs().hdv_background;
        spawn(async move { crate::pages::modules::hdv_background(enabled) }, |app, result| app.state.settings.hdv = result.ok());
    }
    let prefs_now: DesktopPrefs = background::read_prefs();
    let hdv_text = match app.state.settings.hdv.as_deref() {
        Some("absent") => tr("Argus n'est pas installé.", "Argus is not installed."),
        Some("needsUpdate") => tr("Mets à jour Argus en version 1.6 pour l'activer.", "Update Argus to version 1.6 to enable this."),
        Some("running") => tr("Actif : les prix sont relevés tant qu'Ethone est ouvert.", "Active: prices are tracked while Ethone is open."),
        _ => tr("Relève les prix sans fenêtre tant qu'Ethone est ouvert.", "Tracks prices with no window while Ethone is open."),
    };
    let mut rows = vec![
        switch_row("settings:autostart", &tr("Lancer avec Windows", "Start with Windows"), &tr("Ethone démarre réduit dans la zone de notification.", "Ethone starts minimized to the notification area."), app.state.settings.autostart.unwrap_or(false)),
        switch_row("settings:pref:closeToTray", &tr("Réduire à la fermeture", "Minimize on close"), &tr("La croix garde Ethone actif dans la zone de notification.", "The close button keeps Ethone running in the notification area."), prefs_now.close_to_tray),
        switch_row("settings:pref:hdvBackground", &tr("Argus en arrière-plan", "Argus in the background"), &hdv_text, prefs_now.hdv_background),
        switch_row("settings:pref:notifyMail", &tr("Notifier les nouveaux mails", "Notify new mail"), &tr("Vérifié toutes les 2 minutes tant qu'Ethone est ouvert.", "Checked every 2 minutes while Ethone is open."), prefs_now.notify_mail),
        switch_row("settings:pref:quiet", &tr("Ne pas déranger", "Do not disturb"), &tr("Aucune notification sur cette plage horaire.", "No notifications during these hours."), prefs_now.quiet),
    ];
    if prefs_now.quiet {
        rows.push(row(vec![stack(&tr("Plage de silence (HH:MM)", "Quiet hours (HH:MM)"), &tr("Passe minuit si besoin.", "Can run past midnight.")), input("settings:pref:quietFrom", &prefs_now.quiet_from, "22:00"), input("settings:pref:quietTo", &prefs_now.quiet_to, "08:00")]));
    }
    rows.push(switch_row("settings:pref:clipHistory", &tr("Historique du presse-papiers", "Clipboard history"), &tr("Garde les 25 derniers textes copiés sur ce PC, accessibles depuis Ctrl+K. Les mots de passe marqués privés par ton gestionnaire sont ignorés. Désactiver efface tout.", "Keeps the last 25 copied texts on this PC, available from Ctrl+K. Passwords marked private by your manager are skipped. Turning off clears everything."), prefs_now.clip_history));
    rows.push(switch_row("settings:pref:notifyEvents", &tr("Rappeler les événements", "Remind events"), &tr("Une notification 10 minutes avant le début.", "A notification 10 minutes before the start."), prefs_now.notify_events));
    rows.push(row(vec![stack(&tr("Tester les notifications", "Test notifications"), &tr("Envoie une notification Windows.", "Sends a Windows notification.")), btn("settings:notify-test", &tr("Tester", "Test"))]));
    rows.push(row(vec![stack(&tr("Sauvegarder les réglages", "Back up settings"), &tr("Exporte tes préférences dans Téléchargements, ou les restaure depuis un fichier.", "Exports your preferences to Downloads, or restores them from a file.")), btn("settings:export", &tr("Exporter", "Export")), btn("settings:import", &tr("Importer", "Import"))]));
    let mut out = vec![head(&tr("Windows et notifications", "Windows and notifications"), &tr("Comment Ethone se comporte sur ce PC.", "How Ethone behaves on this PC."), vec![])];
    out.extend(group(rows));
    out
}

fn shortcuts() -> Vec<B> {
    let mut out = vec![head(&tr("Raccourcis", "Shortcuts"), &tr("Les raccourcis clavier de l'application.", "The app's keyboard shortcuts."), vec![])];
    let groups = [
        (tr("Navigation", "Navigation"), vec![("Ctrl+K", tr("Rechercher une application ou une action", "Search an app or action")), ("Ctrl+1 à 9", tr("Ouvrir une page de la barre latérale", "Open a sidebar page")), ("Ctrl+,", tr("Ouvrir les réglages", "Open settings")), ("Alt+←", tr("Revenir en arrière", "Go back")), ("Alt+→", tr("Aller en avant", "Go forward"))]),
        (tr("Fenêtre", "Window"), vec![("Ctrl+Alt+E", tr("Ouvrir Ethone et la recherche depuis n'importe où", "Open Ethone and search from anywhere")), ("Ctrl+F", tr("Aller au champ de recherche de la page", "Go to the page search field")), ("Ctrl+B", tr("Afficher ou réduire la barre latérale", "Show or collapse the sidebar")), ("F5", tr("Actualiser la page", "Refresh the page")), ("Échap", tr("Fermer un panneau", "Close a panel"))]),
        ("Brain".into(), vec![(if fr() { "Entrée" } else { "Enter" }, tr("Envoyer le message", "Send the message")), (if fr() { "Maj+Entrée" } else { "Shift+Enter" }, tr("Aller à la ligne", "New line"))]),
    ];
    for (title, rows) in groups {
        out.push(h2(&title));
        out.extend(group(rows.into_iter().map(|(keys, label)| row(vec![text(&label).grow(), kbd(keys)])).collect()));
    }
    out
}

fn folder_size(path: &std::path::Path) -> u64 {
    std::fs::read_dir(path).map(|entries| entries.flatten().map(|entry| {
        let path = entry.path();
        if path.is_dir() { folder_size(&path) } else { entry.metadata().map_or(0, |meta| meta.len()) }
    }).sum()).unwrap_or(0)
}

fn free_space(path: &std::path::Path) -> Option<u64> {
    use std::os::windows::ffi::OsStrExt;
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut free = 0u64;
    let done = unsafe { windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW(wide.as_ptr(), &mut free, std::ptr::null_mut(), std::ptr::null_mut()) };
    (done != 0).then_some(free)
}

fn storage(app: &mut App) -> Vec<B> {
    let base = crate::services::data_dir();
    let cache = folder_size(&base.join("native-cache"));
    let preferences = std::fs::metadata(base.join("native-prefs.json")).map_or(0, |meta| meta.len());
    let total = folder_size(&base);
    let _ = app;
    vec![
        head(&tr("Stockage et cache", "Storage and cache"), &tr("La place utilisée par Ethone sur ce PC.", "The space Ethone uses on this PC."), vec![]),
        row(vec![stat(&tr("Espace utilisé", "Space used"), &format_bytes(total as f64), ""), stat(&tr("Préférences", "Preferences"), &format_bytes(preferences as f64), ""), stat(&tr("Cache", "Cache"), &format_bytes(cache as f64), ""), stat(&tr("Espace disponible", "Space available"), &free_space(&base).map_or("–".to_string(), |free| format_bytes(free as f64)), "")]),
        B { corners: 0, tone: "card", ..row(vec![stack(&tr("Vider le cache", "Clear the cache"), &tr("Efface les données de jeu, les images et les matchs mémorisés. Tes réglages restent.", "Clears remembered game data, images and matches. Your settings stay.")), btn("settings:clear-cache", &tr("Vider", "Clear"))]) },
    ]
}

fn process_memory() -> Option<u64> {
    use windows_sys::Win32::System::ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows_sys::Win32::System::Threading::GetCurrentProcess;
    let mut counters: PROCESS_MEMORY_COUNTERS = unsafe { std::mem::zeroed() };
    counters.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
    let ok = unsafe { GetProcessMemoryInfo(GetCurrentProcess(), &mut counters, counters.cb) };
    (ok != 0).then_some(counters.WorkingSetSize as u64)
}

fn performance(app: &mut App) -> Vec<B> {
    let preferences = crate::theme::interface();
    let saving = preferences.motion == "reduced" && preferences.transparency == "reduced";
    let refresh = app.icon("refresh-cw");
    vec![
        head(&tr("Performance", "Performance"), &tr("Mesures prises maintenant dans cette fenêtre.", "Measured now in this window."), vec![btn("settings:fps", &tr("Mesurer", "Measure")).icon(refresh)]),
        row(vec![stat(&tr("Rafraîchissements par seconde", "Refreshes per second"), &app.state.settings.fps.map_or("…".into(), |fps| fps.to_string()), ""), stat(&tr("Mémoire d'Ethone", "Ethone memory"), &process_memory().map_or("—".into(), |bytes| format_bytes(bytes as f64)), "")]),
        B { tone: "card", ..row(vec![stack(&tr("Mode économique", "Saver mode"), &tr("Réduit les animations et retire la transparence.", "Reduces animations and removes transparency.")), switch("settings:saver", saving, &tr("Mode économique", "Saver mode"))]) },
    ]
}

fn accessibility(app: &mut App) -> Vec<B> {
    let preferences = crate::theme::interface();
    let contrast = prefs::read("ethone-contrast").as_deref() == Some("more");
    let _ = app;
    let mut out = vec![head(&tr("Accessibilité", "Accessibility"), &tr("Rendre l'application plus lisible et plus calme.", "Make the app easier to read and calmer."), vec![])];
    out.extend(group(vec![
        switch_row("settings:contrast", &tr("Contraste renforcé", "Higher contrast"), &tr("Textes plus nets et bordures plus visibles.", "Sharper text and stronger borders."), contrast),
        switch_row("settings:reduce-motion", &tr("Réduire les animations", "Reduce motion"), &tr("Retire les mouvements de toute l'application.", "Removes movement across the app."), preferences.motion == "reduced"),
        switch_row("settings:opaque", &tr("Surfaces opaques", "Opaque surfaces"), &tr("Retire les effets de transparence.", "Removes transparency effects."), preferences.transparency == "reduced"),
    ]));
    out
}

fn workspace(app: &mut App) -> Vec<B> {
    let start = prefs::read_json::<String>("ethone-start-page").unwrap_or_else(|| "last".into());
    let mut options = vec![("last".to_string(), tr("Dernière page ouverte", "Last opened page"))];
    options.extend(crate::logic::navigation::MAIN_PAGES.iter().map(|page| (page.to_string(), crate::pages::shell::page_label(page))));
    let pick = app.select("settings:start-page", &start, &options);
    let mut out = vec![head(&tr("Espace de travail", "Workspace"), &tr("Ce que tu retrouves en ouvrant Ethone.", "What you see when opening Ethone."), vec![])];
    out.extend(group(vec![row(vec![stack(&tr("Page d'ouverture", "Start page"), &tr("La page affichée au lancement.", "The page shown at launch.")), pick]), row(vec![stack(&tr("Blocs de l'Accueil", "Home blocks"), &tr("Choisis-les avec le bouton de réglage en haut de l'Accueil.", "Pick them with the settings button at the top of Home."))])]));
    out
}

fn advanced(app: &mut App) -> Vec<B> {
    let asking = app.state.settings.asking_reset;
    let mut reset = vec![stack(&tr("Réinitialiser l'application", "Reset the app"), &tr("Efface les préférences et le cache de ce PC. Ton compte, tes données en ligne et la conversation Brain restent.", "Clears preferences and cache on this PC. Your account, online data and Brain chat stay."))];
    if asking {
        reset.push(btn("settings:ask-reset", &tr("Annuler", "Cancel")));
        reset.push(danger("settings:reset-app", &tr("Confirmer", "Confirm")));
    } else {
        reset.push(danger("settings:ask-reset", &tr("Réinitialiser", "Reset")));
    }
    let mut out = vec![head(&tr("Avancé", "Advanced"), &tr("Maintenance de l'application sur ce PC.", "App maintenance on this PC."), vec![])];
    out.extend(group(vec![
        row(vec![stack(&tr("Copier le diagnostic", "Copy diagnostic"), &tr("Version, système et écran, sans donnée personnelle.", "Version, system and screen, no personal data.")), btn("settings:copy-diagnostic", &tr("Copier", "Copy"))]),
        row(vec![stack(&tr("Exporter les réglages", "Export settings"), &tr("Dans ton dossier Téléchargements.", "To your Downloads folder.")), btn("settings:export", &tr("Exporter", "Export"))]),
        row(reset),
    ]));
    out
}

fn journal(app: &mut App) -> Vec<B> {
    let entries = ethone_engine::journal::read(&crate::services::journal_path());
    let (ok, bad) = (app.icon("circle-check"), app.icon("xcircle"));
    let mut out = vec![head(&t("journal"), "", vec![])];
    if entries.is_empty() {
        out.push(empty(&t("emptyJournal"), ""));
        return out;
    }
    let fr = fr();
    out.extend(group(entries.iter().map(|entry| {
        let value = serde_json::to_value(entry).unwrap_or(Value::Null);
        let operation = value["operation"].as_str().unwrap_or_default();
        let label = if operation == "install" || operation == "open" { t(&format!("operation.{operation}")) } else { operation.to_string() };
        let stamp = value["time"].as_f64().map(|seconds| time::date_time(&time::from_ms(seconds * 1000.0), fr)).unwrap_or_default();
        let success = value["ok"] == true;
        row(vec![icon(if success { ok.clone() } else { bad.clone() }).tone(if success { "ok" } else { "bad" }), stack(crate::services::svc().modules.iter().find(|module| Some(module.id.as_str()) == value["module"].as_str()).map_or(value["module"].as_str().unwrap_or_default(), |module| module.name.as_str()), &format!("{label} : {}", value["detail"].as_str().unwrap_or_default())), muted(&stamp)])
    }).collect()));
    out
}

fn about(app: &mut App) -> Vec<B> {
    let _ = app;
    let mut out = vec![head(&t("about"), "", vec![]), prose(&t("aboutText"))];
    out.extend(group(vec![
        row(vec![text(&t("version")).grow(), muted(&format!("{VERSION} (Rust natif)"))]),
        row(vec![text(&t("catalog")).grow(), muted(&ethone_engine::catalog::SCHEMA_VERSION.to_string())]),
        row(vec![text(&t("legalLinks")).grow(), link("settings:site:terms", &t("terms")), link("settings:site:privacy", &t("privacy")), link("settings:site:cookies", &t("cookies")), link("settings:site:legal", &t("legal"))]),
    ]));
    out.push(h2(&tr("Fait avec Slint", "Made with Slint")));
    out.push(B { kind: "aboutslint", ..Default::default() });
    out.push(note(&tr("L'interface d'Ethone est faite avec Slint, sous licence Royalty-free.", "Ethone's interface is built with Slint, under the Royalty-free license.")));
    out
}

fn profile(app: &mut App) -> Vec<B> {
    let profile = app.profile();
    let (name, email) = profile.map_or((String::new(), String::new()), |profile| (profile.name, profile.email));
    let logout = app.icon("log-out");
    let mut out = vec![card(vec![stack(&name, &email), btn("settings:manage", &t("manageAccount")), btn("settings:sign-out", &t("signOut")).icon(logout)])];
    out.push(head(&tr("Profil", "Profile"), &tr("Ton identité sur Ethone, partagée avec le site et l'iPhone.", "Your Ethone identity, shared with the website and iPhone."), vec![]));
    let res = app.load("settings:profile", || api_data("api/profile"));
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![btn("settings:refresh", &t("retry"))]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(2, 120.0));
        }
        return out;
    };
    let (body, _) = unwrap_config(&data);
    let editable_keys = ["display_name", "username", "bio", "status_text", "pronouns", "location", "website"];
    let hidden = ["avatar_url", "banner_url", "user_id", "id", "public_id", "avatar_frame_id", "banner_frame_id", "profile_background_id"];
    let editable: serde_json::Map<String, Value> = body.iter().filter(|(key, _)| editable_keys.contains(&key.as_str())).map(|(key, value)| (key.clone(), value.clone())).collect();
    if !editable.is_empty() {
        form::ensure("profile", &Value::Object(editable.clone()), Rc::new(|next: Value| api_m("PATCH", "api/profile", Some(next))), Rc::new(|app: &mut App| app.forget("settings:profile")), Vec::new(), Vec::new());
        out.extend(form::view(app, "profile"));
    }
    let rest: serde_json::Map<String, Value> = body.into_iter().filter(|(key, _)| !editable.contains_key(key) && !hidden.contains(&key.as_str())).collect();
    json_fields(&Value::Object(rest), 0, &mut out);
    out
}

fn privacy(app: &mut App) -> Vec<B> {
    let _ = app;
    let items = [
        (tr("Conversation Brain", "Brain conversation"), tr("Tes messages avec Brain, gardés sur ce PC.", "Your Brain messages, kept on this PC."), "ethone-brain-chat"),
        (tr("Mémo", "Scratchpad"), tr("Le texte de ton mémo.", "Your scratchpad text."), "ethone-scratchpad"),
        (tr("Séances de concentration", "Focus sessions"), tr("L'historique de tes séances.", "Your session history."), "ethone-focus-history"),
        (tr("Photos des amis", "Friend pictures"), tr("Les images d'amis mémorisées.", "Remembered friend pictures."), "ethone-friend-cards,ethone-friend-icons"),
    ];
    let mut rows: Vec<B> = items.iter().map(|(label, text, keys)| {
        let size: usize = keys.split(',').map(|key| prefs::read(key).map_or(0, |value| value.len())).sum();
        row(vec![stack(label, &format!("{text} {}", format_bytes(size as f64))), btn(&format!("settings:clear-local:{keys}"), &tr("Effacer", "Clear")).off(size == 0)])
    }).collect();
    rows.push(row(vec![stack(&tr("Tes données en ligne", "Your online data"), &tr("Export et suppression du compte se font sur ethone.dev.", "Export and account deletion are on ethone.dev.")), btn("settings:site:privacy", &tr("Politique", "Policy")), btn("settings:site:account", &tr("Mon compte", "My account"))]));
    let mut out = vec![head(&tr("Confidentialité", "Privacy"), &tr("Ce qu'Ethone garde sur ce PC, et comment l'effacer.", "What Ethone keeps on this PC, and how to clear it."), vec![])];
    out.extend(group(rows));
    out
}

fn run_sync(app: &mut App) {
    app.state.settings.busy = true;
    spawn(
        async {
            let checks: Vec<(String, Fut)> = vec![
                (tr("Tâches", "Tasks"), crate::pages::daily::tasks_list()),
                ("Notes".into(), items_list("notes")),
                (tr("Calendrier", "Calendar"), items_list("events")),
                (tr("Habitudes", "Habits"), rest_get("ethone_habits?select=id&archived=eq.false")),
                ("Mail".into(), api("api/mail/inbox?folder=inbox&limit=50")),
                (tr("Fichiers", "Files"), api("api/cloud/files?limit=500")),
            ];
            let mut out = Vec::new();
            for (label, work) in checks {
                let started = std::time::Instant::now();
                let result = work.await.map(|value| first_array(&value, None).len()).map_err(|error| crate::i18n::error_text(&error));
                out.push((label, result, started.elapsed().as_millis()));
            }
            out
        },
        |app, rows| {
            app.state.settings.busy = false;
            app.state.settings.sync = Some(rows);
        },
    );
}

fn sync(app: &mut App) -> Vec<B> {
    if app.state.settings.sync.is_none() && !app.state.settings.busy {
        run_sync(app);
    }
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Synchronisation", "Sync"), &tr("Chaque ligne interroge ton compte Ethone maintenant.", "Each row asks your Ethone account right now."), vec![btn("settings:sync", &t("refresh")).icon(refresh).off(app.state.settings.busy)])];
    match &app.state.settings.sync {
        None => out.extend(skeletons(6, 46.0)),
        Some(rows) => out.extend(group(rows.iter().map(|(label, result, ms)| match result {
            Ok(count) => row(vec![stack(label, &tr(&format!("{count} élément(s), {ms} ms"), &format!("{count} item(s), {ms} ms"))), text(&tr("À jour", "Up to date")).tone("ok")]),
            Err(error) => row(vec![stack(label, error), text(&tr("Erreur", "Error")).tone("bad")]),
        }).collect())),
    }
    out
}

fn remote(app: &mut App, title: &str, path: &'static str, note_text: &str, actions: Vec<(String, bool, &'static str, &'static str)>) -> Vec<B> {
    let res = app.load(&format!("settings:remote:{path}"), move || api(path));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(title, note_text, vec![btn("settings:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![btn("settings:refresh", &t("retry"))]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 52.0));
        }
        return out;
    };
    let actions = Rc::new(actions);
    let make: Rc<dyn Fn() -> Vec<RowAction>> = Rc::new(move || actions.iter().map(|(label, destructive, target, key)| {
        let (target, key) = (*target, *key);
        RowAction { title: label.clone(), destructive: *destructive, prompt: None, run: Rc::new(move |row: &Value, _: &str| api_m("POST", target, Some(json!({ key: row["id"] })))) }
    }).collect());
    let changed: Rc<dyn Fn(&mut App)> = Rc::new(move |app: &mut App| app.forget(&format!("settings:remote:{path}")));
    out.extend(json_list(app, &format!("settings-{path}"), &first_array(&data, None), make, changed, None, None));
    out
}

fn devices(app: &mut App) -> Vec<B> {
    let res = app.load("settings:devices", || api("api/auth/devices"));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Appareils", "Devices"), "", vec![btn("settings:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 52.0));
        }
        return out;
    };
    let mut groups: Vec<(String, Vec<Value>)> = Vec::new();
    for row_data in first_array(&data, None) {
        let name = row_title(&row_data);
        match groups.iter_mut().find(|(known, _)| *known == name) {
            Some((_, rows)) => rows.push(row_data),
            None => groups.push((name, vec![row_data])),
        }
    }
    for (name, rows) in groups {
        out.push(h2x(&name, &tr(&format!("{} connexion{}", rows.len(), if rows.len() > 1 { "s" } else { "" }), &format!("{} session{}", rows.len(), if rows.len() > 1 { "s" } else { "" })), vec![]));
        let make: Rc<dyn Fn() -> Vec<RowAction>> = Rc::new(|| vec![RowAction { title: tr("Révoquer", "Revoke"), destructive: true, prompt: None, run: Rc::new(|row: &Value, _: &str| api_m("POST", "api/auth/device/revoke", Some(json!({ "deviceId": row["id"] })))) }]);
        let changed: Rc<dyn Fn(&mut App)> = Rc::new(|app: &mut App| app.forget("settings:devices"));
        out.extend(json_list(app, &format!("devices-{name}"), &rows, make, changed, None, None));
    }
    out
}

fn two_factor(app: &mut App) -> Vec<B> {
    let state = &app.state.settings;
    let (setup, code, busy, message) = (state.totp.clone(), state.code.clone(), state.busy, state.message.clone());
    let mut out = vec![head(&tr("Double authentification", "Two-factor authentication"), &tr("Une application comme Google Authenticator te donne un code à chaque connexion.", "An app such as Google Authenticator gives you a code at each sign-in."), vec![])];
    match &setup {
        None => out.push(row(vec![primary("settings:totp-setup", &tr("Activer", "Enable")).off(busy)])),
        Some(value) => {
            out.push(prose(&tr("Ajoute cette clé dans ton application d'authentification, puis saisis le code affiché.", "Add this key to your authenticator app, then enter the code shown.")));
            out.push(read(value["secret"].as_str().unwrap_or_default()));
        }
    }
    let mut submit = if setup.is_some() { primary("settings:totp-submit", &tr("Confirmer", "Confirm")) } else { danger("settings:totp-submit", &tr("Désactiver", "Disable")) };
    submit.disabled = busy || code.trim().len() < 6;
    out.push(row(vec![input("settings:code", &code, &tr("Code à 6 chiffres", "6-digit code")).tip(&tr("Code d'authentification", "Authentication code")), submit]));
    if let Some((text, ok)) = message {
        out.push(B { tone: if ok { "ok" } else { "bad" }, ..prose(&text) });
    }
    out
}

fn security_label(kind: &str) -> String {
    if fr() {
        let found = match kind { "device_added" => "Nouvel appareil connecté", "device_revoked" => "Appareil révoqué", "signed_in" => "Connexion", "signed_out" => "Déconnexion", "password_changed" => "Mot de passe modifié", "mfa_enabled" => "Double authentification activée", "mfa_disabled" => "Double authentification désactivée", "passkey_added" => "Clé d'accès ajoutée", "passkey_removed" => "Clé d'accès retirée", _ => "" };
        if !found.is_empty() {
            return found.into();
        }
    }
    humanize(kind)
}

fn security_log(app: &mut App) -> Vec<B> {
    let res = app.load("settings:security", || api_data("api/auth/security-events?limit=20"));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Journal de sécurité", "Security log"), &tr("Les 20 derniers événements.", "The last 20 events."), vec![btn("settings:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(4, 46.0));
        }
        return out;
    };
    let rows = first_array(&data, None);
    if rows.is_empty() {
        out.push(empty(&tr("Aucun événement", "No events"), ""));
        return out;
    }
    let fr = fr();
    out.extend(group(rows.iter().map(|row_data| row(vec![strong(&security_label(row_data["kind"].as_str().unwrap_or_default())).grow(), muted(&row_data["created_at"].as_str().and_then(time::parse).map(|date| time::date_time(&date, fr)).unwrap_or_default())])).collect()));
    out
}

fn ai(app: &mut App) -> Vec<B> {
    let status = app.load("settings:ai-status", || api_data("api/ai/status"));
    let quota = app.load("settings:ai-quota", || api_data("api/ai/quota"));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Intelligence artificielle", "Artificial intelligence"), &tr("Ce que Brain a consommé aujourd'hui.", "What Brain used today."), vec![btn("settings:refresh", &t("refresh")).icon(refresh).off(status.loading || quota.loading)])];
    if let Some(message) = status.error.clone().or(quota.error.clone()) {
        out.push(error(&message, vec![]));
    }
    let (Some(status), Some(quota)) = (status.data, quota.data) else {
        out.extend(skeletons(2, 70.0));
        return out;
    };
    let used = quota["used"].as_f64().unwrap_or(0.0);
    let budget = quota["budget"].as_f64().unwrap_or(0.0);
    let share = if budget > 0.0 { (used / budget).min(1.0) } else { 0.0 };
    let number = |value: f64| crate::pages::generic::number_text(value);
    out.push(row(vec![bar(share as f32)]));
    out.push(row(vec![
        stat(&tr("Quota utilisé", "Quota used"), &format!("{} %", (share * 100.0).round()), &format!("{} / {}", number(used), number(budget))),
        stat(&tr("Requêtes", "Requests"), &number(quota["requests"].as_f64().unwrap_or(0.0)), ""),
        stat(&tr("Erreurs", "Errors"), &number(quota["errors"].as_f64().unwrap_or(0.0)), ""),
        stat(&tr("Service", "Service"), &humanize(status["primary"].as_str().unwrap_or("–")), &status["fallback"].as_str().map_or(String::new(), |fallback| tr(&format!("Secours : {}", humanize(fallback)), &format!("Fallback: {}", humanize(fallback))))),
    ]));
    let _ = svc;
    out
}
