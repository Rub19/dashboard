use crate::i18n::{error_text, t, tr};
use crate::logic::navigation::{self, History};
use crate::pages;
use crate::services::{self, svc, ModuleStatus};
use crate::vm::{Sync as Blocks, B, C};
use crate::{prefs, AppWindow, Cell, Item, Ui};
use futures_util::future::BoxFuture;
use serde_json::Value;
use slint::{ComponentHandle, Image, Model, ModelRc, SharedPixelBuffer, Rgba8Pixel, SharedString, VecModel};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::rc::Rc;


thread_local! {
    pub static APP: RefCell<Option<App>> = const { RefCell::new(None) };
    static RENDER_QUEUED: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

#[derive(Clone, Default)]
pub struct Res {
    pub data: Option<Rc<Value>>,
    pub loading: bool,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct Entry {
    pub id: String,
    pub value: String,
    pub label: String,
    pub danger: bool,
    pub on: bool,
}

pub fn entry(id: &str, label: &str) -> Entry {
    Entry { id: id.into(), value: String::new(), label: label.into(), danger: false, on: false }
}

pub fn danger_entry(id: &str, label: &str) -> Entry {
    Entry { danger: true, ..entry(id, label) }
}

pub struct Toast {
    pub id: u64,
    pub message: String,
    pub tone: &'static str,
    pub action: Option<(String, Box<dyn FnOnce(&mut App)>)>,
}

pub struct LoggedToast {
    pub at: f64,
    pub message: String,
    pub tone: &'static str,
}

pub struct Busy {
    pub label: String,
    pub value: Option<f32>,
}

#[derive(Default)]
pub struct Page {
    pub side: Vec<(String, String, String, String)>,
    pub side_active: String,
    pub main: Vec<B>,
    pub aside: Vec<B>,
    pub aside_width: f32,
}

pub struct Drawer {
    pub title: String,
    pub width: f32,
    pub view: Box<dyn Fn(&mut App) -> Vec<B>>,
}

pub struct App {
    pub ui: slint::Weak<AppWindow>,
    pub stage: Option<ethone_engine::auth::Stage>,
    pub login: pages::login::LoginState,
    pub blocked: bool,
    pub page: String,
    pub direction: i32,
    pub history: History,
    pub scrolls: HashMap<String, f32>,
    pub compact: bool,
    pub pinned: Vec<String>,
    pub modules: Vec<ModuleStatus>,
    pub checking: bool,
    pub module_error: Option<String>,
    pub busy: HashMap<String, Busy>,
    pub errors: HashMap<String, String>,
    pub open_details: HashSet<String>,
    pub online: bool,
    pub new_mail: usize,
    pub seen_mail: Option<HashSet<String>>,
    pub res: HashMap<String, Res>,
    pub local: HashMap<String, String>,
    pub images: HashMap<String, Image>,
    pub image_failed: HashSet<String>,
    pub image_pending: HashSet<String>,
    pub icons: HashMap<&'static str, Image>,
    pub avatar: Image,
    pub toasts: Vec<Toast>,
    pub toast_next: u64,
    pub toast_log: Vec<LoggedToast>,
    pub menus: HashMap<String, Vec<Entry>>,
    pub menu_open: Option<String>,
    pub palette_open: bool,
    pub palette_query: String,
    pub palette_index: usize,
    pub palette_commands: Vec<pages::shell::Command>,
    pub drawer: Option<Drawer>,
    pub embedded: Option<pages::modules::Embedded>,
    pub spotify: crate::logic::spotify::State,
    pub update: pages::modules::UpdateState,
    pub rendered_shell: bool,
    pub state: pages::PageStates,
    main: Blocks,
    aside: Blocks,
    login_blocks: Blocks,
    banner: Blocks,
    drawer_blocks: Blocks,
    pub tip_text: String,
}

pub fn with_app<T>(work: impl FnOnce(&mut App) -> T) -> Option<T> {
    APP.with(|cell| cell.borrow_mut().as_mut().map(work))
}

pub fn request_render() {
    if RENDER_QUEUED.with(|queued| queued.replace(true)) {
        return;
    }
    let _ = slint::invoke_from_event_loop(|| {
        RENDER_QUEUED.with(|queued| queued.set(false));
        with_app(|app| app.render());
    });
}

pub fn post(work: impl FnOnce(&mut App) + Send + 'static) {
    let _ = slint::invoke_from_event_loop(move || {
        with_app(|app| work(app));
        request_render();
    });
}

pub fn spawn<F, T>(future: F, done: impl FnOnce(&mut App, T) + Send + 'static)
where
    F: Future<Output = T> + Send + 'static,
    T: Send + 'static,
{
    svc().rt.spawn(async move {
        let value = future.await;
        post(move |app| done(app, value));
    });
}

fn model<T: Clone + 'static>(items: Vec<T>) -> ModelRc<T> {
    ModelRc::new(VecModel::from(items))
}

pub fn start(ui: &AppWindow, hidden: bool) {
    let runtime = tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().expect("runtime");
    services::init(runtime.handle().clone());
    std::mem::forget(runtime);
    let _ = ethone_engine::safety::backup_identities();
    let app = App::new(ui);
    APP.with(|cell| *cell.borrow_mut() = Some(app));
    crate::theme::apply(ui);
    crate::win::wire(ui);
    let bridge = ui.global::<Ui>();
    bridge.on_act(|id, value| {
        if value.is_empty() || value == "true" || value == "false" {
            crate::sounds::click();
        }
        with_app(|app| app.act(&id, &value));
        request_render();
    });
    bridge.on_menu(|id, x, y, width| {
        with_app(|app| open_menu_at(app, &id, x, y, width));
        request_render();
    });
    let weak = ui.as_weak();
    bridge.on_tip(move |text, x, y| {
        if let Some(ui) = weak.upgrade() {
            ui.set_tip_text(text);
            ui.set_tip_x(x);
            ui.set_tip_y(y);
        }
    });
    let weak = ui.as_weak();
    bridge.on_tip_off(move || {
        if let Some(ui) = weak.upgrade() {
            ui.set_tip_text(SharedString::default());
        }
    });
    ui.on_key(|text, ctrl, alt, shift| {
        let handled = with_app(|app| pages::shell::key(app, &text, ctrl, alt, shift)).unwrap_or(false);
        request_render();
        handled
    });
    crate::background::start(hidden);
    pages::shell::boot();
    #[cfg(feature = "drive")]
    crate::drive::start();
    request_render();
}

impl App {
    fn new(ui: &AppWindow) -> Self {
        let page = prefs::read_json::<String>("ethone-start-page").filter(|start| start != "last" && navigation::page_exists(start)).or_else(|| prefs::read_json::<String>("ethone-last-page")).filter(|page| navigation::page_exists(page)).unwrap_or_else(|| "home".into());
        let mut app = Self {
            ui: ui.as_weak(),
            stage: None,
            login: Default::default(),
            blocked: false,
            page,
            direction: 1,
            history: History::default(),
            scrolls: HashMap::new(),
            compact: prefs::read_json::<bool>("ethone-sidebar-compact").unwrap_or(false),
            pinned: prefs::read_json("ethone-pinned-apps").unwrap_or_default(),
            modules: Vec::new(),
            checking: false,
            module_error: None,
            busy: HashMap::new(),
            errors: HashMap::new(),
            open_details: HashSet::new(),
            online: true,
            new_mail: 0,
            seen_mail: None,
            res: HashMap::new(),
            local: HashMap::new(),
            images: HashMap::new(),
            image_failed: HashSet::new(),
            image_pending: HashSet::new(),
            icons: HashMap::new(),
            avatar: Image::default(),
            toasts: Vec::new(),
            toast_next: 1,
            toast_log: Vec::new(),
            menus: HashMap::new(),
            menu_open: None,
            palette_open: false,
            palette_query: String::new(),
            palette_index: 0,
            palette_commands: Vec::new(),
            drawer: None,
            embedded: None,
            spotify: Default::default(),
            update: Default::default(),
            rendered_shell: false,
            state: Default::default(),
            main: Blocks::new(),
            aside: Blocks::new(),
            login_blocks: Blocks::new(),
            banner: Blocks::new(),
            drawer_blocks: Blocks::new(),
            tip_text: String::new(),
        };
        ui.set_main_blocks(app.main.rc());
        ui.set_aside_blocks(app.aside.rc());
        ui.set_login_blocks(app.login_blocks.rc());
        ui.set_banner(app.banner.rc());
        ui.set_drawer_blocks(app.drawer_blocks.rc());
        ui.set_min_icon(app.icon("minus"));
        ui.set_max_icon(app.icon("square"));
        ui.set_close_icon(app.icon("x"));
        ui.set_back_icon(app.icon("arrow-left"));
        ui.set_forward_icon(app.icon("arrow-right"));
        ui.set_bell_icon(app.icon("bell"));
        ui.set_search_icon(app.icon("search"));
        ui.set_offline_icon(app.icon("wifi-off"));
        ui.set_music_prev(app.icon("skip-back"));
        ui.set_music_next(app.icon("skip-forward"));
        app.refresh_labels(ui);
        app
    }

    pub fn refresh_labels(&mut self, ui: &AppWindow) {
        ui.set_min_label(t("minimize").into());
        ui.set_max_label(t("maximize").into());
        ui.set_close_label(t("close").into());
        ui.set_search_label(t("searchPlaceholder").into());
        ui.set_back_label(format!("{} (Alt+←)", tr("Page précédente", "Previous page")).into());
        ui.set_forward_label(format!("{} (Alt+→)", tr("Page suivante", "Next page")).into());
        ui.set_bell_label(tr("Dernières notifications", "Recent notifications").into());
        ui.set_palette_none(t("noResult").into());
        ui.set_embed_back(tr("Revenir à Ethone", "Back to Ethone").into());
        ui.set_embed_apart(tr("Ouvrir à part", "Open separately").into());
    }

    pub fn with_ui(&self, work: impl FnOnce(&AppWindow)) {
        if let Some(ui) = self.ui.upgrade() {
            work(&ui);
        }
    }

    pub fn icon(&mut self, name: &'static str) -> Image {
        self.icons.entry(name).or_insert_with(|| crate::assets::icon(name)).clone()
    }

    pub fn profile(&self) -> Option<ethone_engine::auth::Profile> {
        match &self.stage {
            Some(ethone_engine::auth::Stage::SignedIn { profile, .. }) => Some(profile.clone()),
            _ => None,
        }
    }

    pub fn offline(&self) -> bool {
        matches!(&self.stage, Some(ethone_engine::auth::Stage::SignedIn { offline: true, .. }))
    }

    pub fn load(&mut self, key: &str, make: impl FnOnce() -> BoxFuture<'static, Result<Value, String>>) -> Res {
        if let Some(found) = self.res.get(key) {
            return found.clone();
        }
        let holder = key.to_string();
        self.res.insert(holder.clone(), Res { data: None, loading: true, error: None });
        spawn(make(), move |app, result| app.finish(&holder, result));
        Res { data: None, loading: true, error: None }
    }

    pub fn finish(&mut self, key: &str, result: Result<Value, String>) {
        let old = self.res.get(key).and_then(|res| res.data.clone());
        let next = match result {
            Ok(value) => Res { data: Some(Rc::new(value)), loading: false, error: None },
            Err(error) => Res { data: old, loading: false, error: Some(error_text(&error)) },
        };
        self.res.insert(key.to_string(), next);
    }

    pub fn reload(&mut self, key: &str, make: impl FnOnce() -> BoxFuture<'static, Result<Value, String>>) {
        let old = self.res.get(key).and_then(|res| res.data.clone());
        let holder = key.to_string();
        self.res.insert(holder.clone(), Res { data: old, loading: true, error: None });
        spawn(make(), move |app, result| app.finish(&holder, result));
    }

    pub fn forget(&mut self, prefix: &str) {
        self.res.retain(|key, _| !key.starts_with(prefix));
    }

    pub fn get(&self, key: &str) -> String {
        self.local.get(key).cloned().unwrap_or_default()
    }

    pub fn set(&mut self, key: &str, value: &str) {
        self.local.insert(key.to_string(), value.to_string());
    }

    pub fn flag(&self, key: &str) -> bool {
        self.local.get(key).is_some_and(|value| value == "1")
    }

    pub fn set_flag(&mut self, key: &str, on: bool) {
        if on {
            self.set(key, "1");
        } else {
            self.local.remove(key);
        }
    }

    pub fn img(&mut self, url: &str) -> Image {
        if url.is_empty() {
            return Image::default();
        }
        if let Some(found) = self.images.get(url) {
            return found.clone();
        }
        if self.image_failed.contains(url) || self.image_pending.contains(url) {
            return Image::default();
        }
        if self.image_pending.len() > 24 {
            return Image::default();
        }
        self.image_pending.insert(url.to_string());
        let target = url.to_string();
        svc().rt.spawn(async move {
            let decoded = crate::net::fetch_image(&target).await;
            let _ = slint::invoke_from_event_loop(move || {
                with_app(|app| {
                    app.image_pending.remove(&target);
                    match decoded {
                        Ok(crate::net::Decoded::Pixels(width, height, pixels)) => {
                            if app.images.len() >= 800 {
                                app.images.clear();
                            }
                            let buffer = SharedPixelBuffer::<Rgba8Pixel>::clone_from_slice(&pixels, width, height);
                            app.images.insert(target, Image::from_rgba8(buffer));
                        }
                        Ok(crate::net::Decoded::Svg(bytes)) => match Image::load_from_svg_data(&bytes) {
                            Ok(image) => {
                                app.images.insert(target, image);
                            }
                            Err(_) => {
                                app.image_failed.insert(target);
                            }
                        },
                        Err(_) => {
                            app.image_failed.insert(target);
                        }
                    }
                });
                request_render();
            });
        });
        Image::default()
    }

    pub fn toast(&mut self, message: &str) {
        self.push_toast(message, "ok", None, 2600);
    }

    pub fn toast_bad(&mut self, message: &str) {
        self.push_toast(message, "bad", None, 2600);
    }

    pub fn toast_plain(&mut self, message: &str) {
        self.push_toast(message, "plain", None, 2600);
    }

    pub fn push_toast(&mut self, message: &str, tone: &'static str, action: Option<(String, Box<dyn FnOnce(&mut App)>)>, duration: u64) {
        self.toast_log.insert(0, LoggedToast { at: crate::logic::time::now_ms(), message: message.into(), tone });
        self.toast_log.truncate(30);
        let id = self.toast_next;
        self.toast_next += 1;
        self.toasts.push(Toast { id, message: message.into(), tone, action });
        while self.toasts.len() > 3 {
            self.toasts.remove(0);
        }
        svc().rt.spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(duration)).await;
            post(move |app| app.toasts.retain(|toast| toast.id != id));
        });
    }

    pub fn undoable(&mut self, message: &str, commit: BoxFuture<'static, Result<Value, String>>, undo: Box<dyn FnOnce(&mut App)>, after: impl FnOnce(&mut App, Result<Value, String>) + Send + 'static) {
        let cancelled = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let flag = cancelled.clone();
        self.push_toast(
            message,
            "plain",
            Some((tr("Annuler", "Undo"), Box::new(move |app: &mut App| {
                flag.store(true, std::sync::atomic::Ordering::SeqCst);
                undo(app);
            }))),
            6000,
        );
        svc().rt.spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(6000)).await;
            if cancelled.load(std::sync::atomic::Ordering::SeqCst) {
                return;
            }
            let result = commit.await;
            post(move |app| after(app, result));
        });
    }

    pub fn select(&mut self, id: &str, current: &str, options: &[(String, String)]) -> C {
        let label = options.iter().find(|(value, _)| value == current).map_or(current, |(_, label)| label.as_str()).to_string();
        let entries = options.iter().map(|(value, label)| Entry { id: id.to_string(), value: value.clone(), label: label.clone(), danger: false, on: value == current }).collect();
        self.menus.insert(id.to_string(), entries);
        let chevron = self.icon("chevron-down");
        crate::vm::select(id, &label, chevron).tip(&label)
    }

    pub fn menu_for(&mut self, id: &str, entries: Vec<Entry>) {
        self.menus.insert(id.to_string(), entries);
    }

    pub fn close_menu(&mut self) {
        self.menu_open = None;
        self.with_ui(|ui| ui.set_menu_open(false));
    }

    pub fn open_drawer(&mut self, title: &str, width: f32, view: impl Fn(&mut App) -> Vec<B> + 'static) {
        self.drawer = Some(Drawer { title: title.into(), width, view: Box::new(view) });
        self.with_ui(|ui| ui.set_drawer_scroll(0.0));
    }

    pub fn close_drawer(&mut self) {
        self.drawer = None;
    }

    pub fn act(&mut self, id: &str, value: &str) {
        pages::dispatch(self, id, value);
    }

    pub fn render(&mut self) {
        let Some(ui) = self.ui.upgrade() else { return };
        self.menus.retain(|key, _| key == "account" || self.menu_open.as_deref() == Some(key));
        if self.blocked || self.stage.is_none() || !matches!(self.stage, Some(ethone_engine::auth::Stage::SignedIn { .. })) {
            ui.set_mode(if self.stage.is_none() && !self.blocked { "boot" } else { "login" }.into());
            let blocks = pages::login::view(self);
            self.login_blocks.apply(blocks);
            ui.set_login_done(self.login.done);
            self.render_overlays(&ui);
            return;
        }
        ui.set_mode("shell".into());
        pages::shell::render_chrome(self, &ui);
        if self.embedded.is_none() {
            let page = pages::view(self);
            let items: Vec<Item> = pages::shell::side_items(self, &page);
            let side_active = items.iter().position(|item| item.on);
            let y = side_active.map_or(0.0, |at| items[..at].iter().map(|item| if item.kind == "head" { 28.0 } else { 32.0 }).sum::<f32>() + 8.0);
            ui.set_side_active(side_active.is_some());
            ui.set_side_y(y);
            ui.set_side(model(items));
            self.main.apply(page.main);
            self.aside.apply(page.aside);
            ui.set_aside_width(if page.aside_width > 0.0 { page.aside_width } else { 340.0 });
        }
        let banner = pages::modules::update_banner(self);
        self.banner.apply(banner);
        self.render_overlays(&ui);
    }

    fn render_overlays(&mut self, ui: &AppWindow) {
        let view = self.drawer.take();
        if let Some(drawer) = view {
            let blocks = (drawer.view)(self);
            self.drawer_blocks.apply(blocks);
            ui.set_drawer_open(true);
            ui.set_drawer_title(drawer.title.clone().into());
            ui.set_drawer_width(drawer.width);
            if self.drawer.is_none() {
                self.drawer = Some(drawer);
            }
        } else {
            ui.set_drawer_open(false);
        }
        let check = self.icon("circle-check");
        let alert = self.icon("alert-circle");
        let toasts: Vec<Cell> = self.toasts.iter().map(|toast| Cell {
            id: format!("toast:{}", toast.id).into(),
            title: toast.message.clone().into(),
            value: toast.action.as_ref().map_or(String::new(), |(label, _)| label.clone()).into(),
            tone: toast.tone.into(),
            icon: match toast.tone { "ok" => check.clone(), "bad" => alert.clone(), _ => Image::default() },
            ..Default::default()
        }).collect();
        let current = ui.get_toasts();
        let same = current.row_count() == toasts.len() && toasts.iter().enumerate().all(|(at, toast)| current.row_data(at).is_some_and(|old| old.id == toast.id));
        if !same {
            ui.set_toasts(model(toasts));
        }
        if self.palette_open {
            pages::shell::render_palette(self, ui);
        }
        ui.set_palette_open(self.palette_open);
    }
}

pub fn app_image(app: &mut App, id: &str) -> Image {
    let key = format!("asset:{id}");
    if let Some(found) = app.images.get(&key) {
        return found.clone();
    }
    let image = crate::assets::app_icon(id).unwrap_or_else(|| crate::assets::icon("gamepad2"));
    app.images.insert(key, image.clone());
    image
}

pub fn with_labels(ui: &AppWindow) {
    with_app(|app| app.refresh_labels(ui));
}

pub fn open_menu_at(app: &mut App, id: &str, x: f32, y: f32, width: f32) {
    pages::shell::prepare_menu(app, id);
    let Some(entries) = app.menus.get(id) else { return };
    let items: Vec<Item> = entries.iter().enumerate().map(|(at, entry)| Item {
        id: format!("{at}").into(),
        label: entry.label.clone().into(),
        kind: if entry.danger { "danger" } else { "" }.into(),
        on: entry.on,
        ..Default::default()
    }).collect();
    app.menu_open = Some(id.to_string());
    let account = id == "account";
    let (head, sub) = if account { app.profile().map_or((String::new(), String::new()), |profile| (profile.name, profile.email)) } else { (String::new(), String::new()) };
    let height = items.len() as f32 * 30.0 + 12.0 + if account { 48.0 } else { 0.0 };
    app.with_ui(|ui| {
        ui.set_menu_items(model(items));
        ui.set_menu_x(x);
        ui.set_menu_y(if account { y - height } else { y });
        ui.set_menu_w(if width > 0.0 { width } else { 220.0 });
        ui.set_menu_head(head.into());
        ui.set_menu_sub(sub.into());
        ui.set_menu_index(-1);
        ui.set_menu_open(true);
    });
}

pub fn pick_menu(app: &mut App, index: &str) {
    let Some(open) = app.menu_open.clone() else { return };
    let chosen = index.parse::<usize>().ok().and_then(|at| app.menus.get(&open).and_then(|entries| entries.get(at).cloned()));
    app.close_menu();
    if let Some(entry) = chosen {
        app.act(&entry.id, &entry.value);
    }
}
