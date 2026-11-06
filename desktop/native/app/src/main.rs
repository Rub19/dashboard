#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

slint::include_modules!();

mod app;
mod assets;
mod background;
mod cache;
mod clipboard;
mod dialogs;
#[cfg(feature = "drive")]
mod drive;
mod i18n;
mod icons_table;
mod logic;
mod net;
mod pages;
mod prefs;
mod services;
mod sounds;
mod theme;
mod vm;
mod web;
mod win;

use slint::ComponentHandle;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("--web") {
        web::child_main(&args[1..]);
        return;
    }
    let link = args.iter().find(|arg| arg.starts_with("ethone://")).cloned();
    if !background::claim_single_instance(link.as_deref()) {
        return;
    }
    let hidden = args.iter().any(|arg| arg == "--minimized");
    let _ = slint::BackendSelector::new()
        .with_winit_window_attributes_hook(|attrs| {
            use slint::winit_030::winit::platform::windows::WindowAttributesExtWindows;
            let attrs = attrs.with_undecorated_shadow(true);
            if win::offscreen() {
                attrs.with_position(slint::winit_030::winit::dpi::PhysicalPosition::new(-32000, -32000)).with_active(false)
            } else {
                attrs
            }
        })
        .select();
    let ui = AppWindow::new().expect("fenêtre");
    app::start(&ui, hidden);
    ui.show().expect("affichage");
    win::after_show(&ui, hidden);
    slint::run_event_loop_until_quit().expect("boucle");
    let _ = ui.hide();
}
