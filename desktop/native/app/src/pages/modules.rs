use crate::app::{app_image, entry, spawn, App, Busy, Page};
use crate::i18n::{error_text, lang, t, tv, tr};
use crate::logic::home::first_note;
use crate::services::{self, svc, ModuleStatus};
use crate::vm::*;
use crate::AppWindow;
use ethone_engine::install::Progress;
use ethone_engine::{embed, feed, install, system};
use slint::ComponentHandle;

const UPDATE_FEED: &str = "https://github.com/Rub19/dashboard/releases/latest/download/latest.json";
const UPDATE_KEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDUzMEE0NDM5MDNCMjAxODAKUldTQUFiSURPVVFLVXp6NElHNW9VRGFjK1hmeVFkVG5tanREZ201alowYUd3bC9UOWxpZS81R0wK";

pub struct Embedded {
    pub id: String,
    pub name: String,
    pub ready: bool,
    pub error: Option<String>,
}

#[derive(Default)]
pub struct UpdateState {
    pub latest: Option<feed::Latest>,
    pub later: Option<String>,
    pub progress: Option<f32>,
    pub error: Option<String>,
}

pub fn load_modules(app: &mut App, first: bool) {
    let offline = app.offline();
    if first {
        spawn(services::modules_local(), |app, list| app.modules = list);
    }
    if offline {
        return;
    }
    app.checking = true;
    app.module_error = None;
    spawn(services::modules_remote(), |app, list| {
        app.modules = list;
        app.checking = false;
    });
}

fn progress_state(progress: &Progress) -> Busy {
    match progress {
        Progress::Downloading { received, total } => {
            let value = total.filter(|total| *total > 0).map(|total| *received as f32 / total as f32);
            let percent = value.map_or_else(|| format!("{} Mo", received / 1048576), |value| format!("{} %", (value * 100.0).round()));
            Busy { label: tv("progress.downloading", &[("percent", &percent)]), value }
        }
        Progress::Verifying => Busy { label: t("progress.verifying"), value: None },
        Progress::Installing => Busy { label: t("progress.installing"), value: None },
        Progress::Checking => Busy { label: t("progress.checking"), value: None },
    }
}

pub fn run(app: &mut App, id: &str) {
    let Some(status) = app.modules.iter().find(|status| status.module.id == id).cloned() else { return };
    app.errors.remove(id);
    let module = status.module.clone();
    let holder = id.to_string();
    match status.action_name() {
        "install" | "update" => {
            app.busy.insert(holder.clone(), Busy { label: tv("progress.downloading", &[("percent", "")]).trim().to_string(), value: None });
            spawn(
                async move {
                    let _guard = svc().installing.try_lock().map_err(|_| "Une installation est déjà en cours".to_string())?;
                    let target = module.id.clone();
                    let notify = move |progress: Progress| {
                        let target = target.clone();
                        crate::app::post(move |app| {
                            app.busy.insert(target, progress_state(&progress));
                        });
                    };
                    let result = install::run(&module, services::VERSION, &notify).await;
                    match &result {
                        Ok(outcome) => services::record(&module.id, "install", true, &format!("{} → {}", outcome.from.as_deref().unwrap_or("absent"), outcome.to)),
                        Err(error) => services::record(&module.id, "install", false, error),
                    }
                    result.map(|_| ())
                },
                move |app, result| {
                    app.busy.remove(&holder);
                    match result {
                        Ok(()) => load_modules(app, false),
                        Err(error) => fail(app, &holder, &error),
                    }
                },
            );
        }
        "releasePage" => {
            let result = module.releases_url.as_deref().ok_or("Pas de page de versions".to_string()).and_then(services::open_url);
            if let Err(error) = result {
                fail(app, id, &error);
            }
        }
        _ => {
            if let Err(error) = open_module(&module.id) {
                services::record(&module.id, "open", false, &error);
                fail(app, id, &error);
            }
        }
    }
}

fn fail(app: &mut App, id: &str, error: &str) {
    let text = error_text(error);
    app.errors.insert(id.to_string(), text.clone());
    let name = app.modules.iter().find(|status| status.module.id == id).map_or(id.to_string(), |status| status.module.name.clone());
    app.toast_bad(&format!("{name} : {text}"));
}

fn open_module(id: &str) -> Result<(), String> {
    let module = svc().modules.iter().find(|module| module.id == id).ok_or("Module inconnu")?;
    if let Some(detect) = &module.detect {
        embed::detach(id);
        if system::is_running(&detect.exe).unwrap_or(false) && embed::bring_forward(&detect.exe) {
            return Ok(());
        }
        system::launch(detect)?;
        let exe = detect.exe.clone();
        svc().rt.spawn(async move {
            for _ in 0..40 {
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                if embed::bring_forward(&exe) {
                    break;
                }
            }
        });
        Ok(())
    } else if let Some(url) = &module.launch_url {
        services::open_url(url)
    } else {
        Err("Ce module ne peut pas être ouvert".into())
    }
}

pub fn open_pinned(app: &mut App, id: &str) {
    let can = app.modules.iter().find(|status| status.module.id == id).is_some_and(|status| status.can_run() && status.installed.is_some());
    if can {
        run(app, id);
    } else {
        crate::pages::shell::go(app, "modules");
    }
}

pub fn pin(app: &mut App, id: &str) {
    app.pinned = crate::logic::toggle_pinned(&app.pinned, id);
    crate::prefs::write_json("ethone-pinned-apps", &app.pinned);
    let message = if app.pinned.iter().any(|item| item == id) { tr("Application épinglée", "App pinned") } else { tr("Application désépinglée", "App unpinned") };
    app.toast(&message);
}

pub fn hdv_background(enabled: bool) -> Result<String, String> {
    let module = svc().modules.iter().find(|module| module.id == "hdv-tracker").ok_or("Module inconnu")?;
    let detect = module.detect.as_ref().ok_or("Module sans détection")?;
    let Some(installed) = system::read_installed(detect) else { return Ok("absent".into()) };
    let version = ethone_engine::action::version(&installed.version).ok_or("version")?;
    if version < semver_min() {
        return Ok("needsUpdate".into());
    }
    let running = system::is_running(&detect.exe)?;
    if enabled {
        if !running {
            system::launch_with(detect, &["--background"])?;
        }
        return Ok("running".into());
    }
    if running {
        system::launch_with(detect, &["--stop-background"])?;
    }
    Ok("off".into())
}

fn semver_min() -> ethone_engine::action::SemVersion {
    ethone_engine::action::SemVersion::new(1, 6, 0)
}

pub fn act(app: &mut App, scope: &str, rest: &str, _value: &str) {
    if scope == "embed" {
        match rest {
            "back" => leave_embedded(app),
            "apart" => {
                if let Some(target) = app.embedded.take() {
                    embed::detach(&target.id);
                }
            }
            _ => {}
        }
        return;
    }
    if scope == "update" {
        match rest {
            "install" => install_update(app),
            "later" => app.update.later = app.update.latest.as_ref().map(|latest| latest.version.clone()),
            _ => {}
        }
        return;
    }
    let (verb, id) = rest.split_once(':').unwrap_or((rest, ""));
    match verb {
        "refresh" => load_modules(app, false),
        "run" => run(app, id),
        "pin" => pin(app, id),
        "details" => {
            if !app.open_details.remove(id) {
                app.open_details.insert(id.to_string());
            }
        }
        "dismiss" => {
            app.errors.remove(id);
        }
        "embed" => open_embedded(app, id),
        _ => {}
    }
}

fn open_embedded(app: &mut App, id: &str) {
    let Some(status) = app.modules.iter().find(|status| status.module.id == id).cloned() else { return };
    app.embedded = Some(Embedded { id: id.to_string(), name: status.module.name.clone(), ready: false, error: None });
    let Some(detect) = status.module.detect.clone() else { return };
    let holder = id.to_string();
    let weak = app.ui.clone();
    let _ = slint::invoke_from_event_loop(move || {
        crate::app::with_app(|_| {});
        if let Some(ui) = weak.upgrade() {
            place_embedded(&ui);
        }
    });
    spawn(
        async move {
            let mut found = embed::find_window(&detect.exe);
            if found.is_none() {
                system::launch(&detect)?;
                for _ in 0..80 {
                    tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                    found = embed::find_window(&detect.exe);
                    if found.is_some() {
                        break;
                    }
                }
            }
            found.ok_or("La fenêtre de l'application n'est pas apparue".to_string())
        },
        move |app, result| {
            let Some(target) = app.embedded.as_mut().filter(|target| target.id == holder) else { return };
            match result {
                Ok(child) => {
                    target.ready = true;
                    app.with_ui(|ui| {
                        if let Some(parent) = crate::win::hwnd(ui) {
                            let (x, y, width, height) = area(ui);
                            if !embed::reopen(&holder, x, y, width, height) {
                                embed::attach(&holder, child, parent as usize, x, y, width, height);
                            }
                        }
                    });
                    watch_embedded(holder.clone());
                }
                Err(error) => target.error = Some(error),
            }
        },
    );
}

fn watch_embedded(id: String) {
    svc().rt.spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            if !embed::alive(&id) {
                let target = id.clone();
                crate::app::post(move |app| {
                    if app.embedded.as_ref().is_some_and(|embedded| embedded.id == target) {
                        app.embedded = None;
                    }
                });
                return;
            }
        }
    });
}

pub fn leave_embedded(app: &mut App) {
    if let Some(target) = app.embedded.take() {
        embed::hide(&target.id);
    }
}

fn area(ui: &AppWindow) -> (i32, i32, i32, i32) {
    let scale = ui.window().scale_factor();
    let number = |value: f32| (value * scale).round() as i32;
    (number(ui.get_embed_x()), number(ui.get_embed_y()), number(ui.get_embed_w()), number(ui.get_embed_h()))
}

pub fn place_embedded(ui: &AppWindow) {
    let id = crate::app::with_app(|app| app.embedded.as_ref().filter(|target| target.ready).map(|target| target.id.clone())).flatten();
    if let Some(id) = id {
        let (x, y, width, height) = area(ui);
        embed::resize(&id, x, y, width, height);
    }
}

pub fn render_embed(app: &mut App, ui: &AppWindow) {
    ui.set_embed_on(app.embedded.is_some());
    if let Some(target) = &app.embedded {
        ui.set_embed_title(target.name.clone().into());
        ui.set_embed_ready(target.ready);
        ui.set_embed_note(match (&target.error, target.ready) {
            (Some(error), _) => error_text(error).into(),
            (None, false) => tr(&format!("Ouverture de {}…", target.name), &format!("Opening {}…", target.name)).into(),
            _ => "".into(),
        });
    }
}

pub fn check_update(app: &mut App) {
    if app.offline() {
        return;
    }
    let _ = app;
    svc().rt.spawn(async {
        loop {
            let found = feed::fetch(&ethone_engine::catalog::Feed::Tauri { url: UPDATE_FEED.into() }).await;
            if let Ok(Some(latest)) = found {
                let newer = ethone_engine::action::version(&latest.version).zip(ethone_engine::action::version(services::VERSION)).is_some_and(|(next, current)| next > current);
                if newer {
                    crate::app::post(move |app| app.update.latest = Some(latest));
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    });
}

fn install_update(app: &mut App) {
    let Some(latest) = app.update.latest.clone() else { return };
    app.update.error = None;
    app.update.progress = Some(0.0);
    let module = ethone_engine::catalog::Module {
        id: "ethone".into(),
        name: "Ethone".into(),
        summary: Default::default(),
        repo: "Rub19/dashboard".into(),
        feed: ethone_engine::catalog::Feed::Tauri { url: UPDATE_FEED.into() },
        pubkey: Some(UPDATE_KEY.into()),
        detect: None,
        update_policy: ethone_engine::catalog::UpdatePolicy::Delegated,
        install_args: vec!["/P".into()],
        update_args: vec!["/P".into()],
        min_ethone: "0.1.0".into(),
        blocked_versions: Vec::new(),
        releases_url: None,
        launch_url: None,
        platforms: Default::default(),
    };
    let version = latest.version.clone();
    spawn(
        async move {
            let _guard = svc().installing.try_lock().map_err(|_| "Une installation est déjà en cours".to_string())?;
            let notify = |progress: Progress| {
                if let Progress::Downloading { received, total: Some(total) } = progress {
                    if total > 0 {
                        crate::app::post(move |app| app.update.progress = Some(received as f32 / total as f32));
                    }
                }
            };
            let path = install::fetch_and_verify(&module, &latest, &notify).await?;
            system::run_installer(&path, &module.update_args)?;
            Ok::<(), String>(())
        },
        move |app, result| {
            services::record("ethone", "update", result.is_ok(), result.as_ref().err().map_or(version.as_str(), String::as_str));
            match result {
                Ok(()) => {
                    let _ = slint::quit_event_loop();
                }
                Err(error) => {
                    app.update.progress = None;
                    app.update.error = Some(error_text(&error));
                }
            }
        },
    );
}

pub fn update_banner(app: &mut App) -> Vec<B> {
    let Some(latest) = app.update.latest.clone() else { return Vec::new() };
    if app.update.later.as_deref() == Some(latest.version.as_str()) {
        return Vec::new();
    }
    let download = app.icon("download");
    let close = app.icon("x");
    let note_text = app.update.error.clone().unwrap_or_else(|| {
        let note = first_note(latest.notes.as_deref());
        if note.is_empty() { t("updateEthoneText") } else { note }
    });
    let mut cells = vec![icon(download), stack(&tv("updateEthone", &[("version", &latest.version)]), &note_text)];
    match app.update.progress {
        None => {
            cells.push(primary("update:install", &if app.update.error.is_some() { t("retry") } else { t("action.update") }));
            cells.push(ibtn("update:later", close, &tr("Plus tard", "Later")));
        }
        Some(progress) => {
            let percent = (progress * 100.0).round();
            let label = if percent >= 100.0 { tr("Installation…", "Installing…") } else { tv("progress.downloading", &[("percent", &format!("{percent} %"))]) };
            cells.push(muted(&label));
            cells.push(bar(progress));
        }
    }
    vec![card(cells)]
}

fn version_line(status: &ModuleStatus) -> (String, &'static str) {
    if status.policy_name() == "web" {
        return (t("webOnly"), "");
    }
    if status.has_update() {
        return (tv("newVersionLine", &[("version", status.latest_version.as_deref().unwrap_or(""))]), "accent");
    }
    if let Some(installed) = &status.installed {
        return (tv("versionLine", &[("version", installed)]), "");
    }
    if let Some(latest) = &status.latest_version {
        return (tv("latestLine", &[("version", latest)]), "");
    }
    (t("notInstalledLine"), "")
}

fn summary(app: &App, name: &str) -> String {
    let count = app.modules.iter().filter(|status| status.has_update()).count();
    let state = if count > 1 { tv("manyUpdates", &[("count", &count.to_string())]) } else if count == 1 { t("oneUpdate") } else if app.checking { t("checking") } else { t("allUpToDate") };
    format!("{} {state}", tv("hello", &[("name", name)]))
}

pub fn clean_notes(notes: &str) -> String {
    notes.lines().map(|line| line.trim_start_matches('#').trim_start()).collect::<Vec<_>>().join("\n").replace(['`', '*'], "")
}

pub fn view(app: &mut App) -> Page {
    let name = app.profile().map_or(String::new(), |profile| profile.name);
    let refresh = app.icon("refresh-cw");
    let mut main = vec![head(&t("modules"), &summary(app, &name), vec![btn("modules:refresh", &t("refresh")).icon(refresh).off(app.checking).tip("F5")])];
    if let Some(error) = app.module_error.clone() {
        main.push(error_with_retry(&error, "modules:refresh"));
    }
    if app.modules.is_empty() {
        main.extend(skeletons(5, 64.0));
        return Page { main, ..Default::default() };
    }
    let statuses = app.modules.clone();
    for status in statuses {
        let id = status.module.id.clone();
        let line = version_line(&status);
        let primary_action = matches!(status.action_name(), "update" | "install");
        let working = app.busy.get(&id).map(|busy| (busy.label.clone(), busy.value));
        let image = app_image(app, &id);
        let summary_text = status.module.summary.get(lang()).cloned().unwrap_or_default();
        let mut cells = vec![img(image, 40.0), stack(&status.module.name, &summary_text)];
        let mut state = C { kind: "stack", title: line.0.clone(), sub: if status.running { t("running") } else { String::new() }, extra: "right".into(), ..Default::default() };
        state.tone = if line.1 == "accent" { "ok" } else { "" };
        cells.push(state);
        if working.is_none() && status.installed.is_some() {
            let window_icon = app.icon("app-window");
            cells.push(btn(&format!("modules:embed:{id}"), &tr("Dans Ethone", "In Ethone")).icon(window_icon));
        }
        match &working {
            Some((label, _)) => cells.push(muted(label)),
            None if status.can_run() => {
                let label = t(&format!("action.{}", status.action_name()));
                let mut button = if primary_action { primary(&format!("modules:run:{id}"), &label).icon(app.icon("download")) } else { btn(&format!("modules:run:{id}"), &label) };
                button.id = format!("modules:run:{id}");
                cells.push(button);
            }
            None => cells.push(muted(&t(&format!("action.{}", status.action_name())))),
        }
        let pinned = app.pinned.iter().any(|item| *item == id);
        let pin_icon = app.icon(if pinned { "pin-off" } else { "pin" });
        cells.push(ibtn(&format!("modules:pin:{id}"), pin_icon, &if pinned { tr("Désépingler", "Unpin") } else { tr("Épingler dans la barre", "Pin to the sidebar") }).on(pinned));
        let open = app.open_details.contains(&id);
        let chevron = app.icon(if open { "chevron-down" } else { "chevron-right" });
        cells.push(icon(chevron));
        let menu_id = format!("module-menu:{id}");
        let mut entries = Vec::new();
        if status.can_run() {
            entries.push(entry(&format!("modules:run:{id}"), &t(&format!("action.{}", status.action_name()))));
        }
        entries.push(entry(&format!("modules:details:{id}"), &if open { tr("Masquer les détails", "Hide details") } else { tr("Voir les détails", "Show details") }));
        entries.push(entry(&format!("modules:pin:{id}"), &if pinned { tr("Désépingler", "Unpin") } else { tr("Épingler dans la barre", "Pin to the sidebar") }));
        app.menu_for(&menu_id, entries);
        main.push(card(cells).id(&format!("modules:details:{id}")).menu(&menu_id));
        if let Some((_, value)) = &working {
            main.push(row(vec![bar(value.unwrap_or(1.0))]));
        }
        if let Some(error) = app.errors.get(&id) {
            main.push(error_cells(error, vec![btn(&format!("modules:run:{id}"), &t("retry")), btn(&format!("modules:dismiss:{id}"), &t("dismiss"))]));
        }
        if open {
            let mut rows = vec![
                row(vec![muted(&t("source")), text(&status.module.repo).grow()]),
                row(vec![muted(&t("policy")), text(&t(&format!("policy.{}", status.policy_name()))).grow()]),
                row(vec![muted(&t("platforms")), text(&status.module.platforms.iter().map(|(platform, level)| format!("{} : {}", t(&format!("platformName.{platform}")), t(&format!("platform.{level}")))).collect::<Vec<_>>().join(", ")).grow()]),
            ];
            if let (Some(installed), true) = (&status.installed, status.has_update()) {
                rows.push(row(vec![muted(&t("installed")), text(installed).grow()]));
            }
            main.extend(group(rows));
            let hint = match status.action_name() {
                "openToUpdate" => Some("hint.openToUpdate"),
                "releasePage" => Some("hint.releasePage"),
                "closeToUpdate" => Some("hint.closeToUpdate"),
                _ => None,
            };
            if let Some(key) = hint {
                main.push(prose(&t(key)));
            }
            if let Some(error) = &status.feed_error {
                main.push(note(&tv("feedDown", &[("error", error)])));
            }
            if let Some(notes) = &status.latest_notes {
                main.push(h2(&t("releaseNotes")));
                main.push(read(&clean_notes(notes)));
            }
        }
    }
    Page { main, ..Default::default() }
}

pub fn error_with_retry(message: &str, id: &str) -> B {
    error(message, vec![btn(id, &t("retry"))])
}

pub fn error_cells(message: &str, cells: Vec<C>) -> B {
    error(message, cells)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn notes_lose_their_markup() {
        assert_eq!(clean_notes("## Titre\n* `code`"), "Titre\n code");
    }
}
