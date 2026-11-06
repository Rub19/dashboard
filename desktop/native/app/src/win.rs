use crate::{prefs, AppWindow};
use slint::winit_030::winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
use serde::{Deserialize, Serialize};
use slint::winit_030::winit::dpi::{PhysicalPosition, LogicalSize as WinitLogical};
use slint::winit_030::winit::window::ResizeDirection;
use slint::winit_030::WinitWindowAccessor;
use slint::{ComponentHandle, LogicalSize};
use std::cell::Cell;
use windows_sys::Win32::Graphics::Dwm::{DwmExtendFrameIntoClientArea, DwmSetWindowAttribute, DWMWA_SYSTEMBACKDROP_TYPE, DWMWA_USE_IMMERSIVE_DARK_MODE};
use windows_sys::Win32::UI::Controls::MARGINS;

pub const LOGIN_SIZE: (f32, f32) = (440.0, 660.0);
pub const APP_MIN: (f32, f32) = (900.0, 600.0);
const DEFAULT_APP: Saved = Saved { width: 1180.0, height: 760.0, maximized: false, x: None, y: None };

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
pub struct Saved {
    pub width: f32,
    pub height: f32,
    #[serde(default)]
    pub maximized: bool,
    pub x: Option<i32>,
    pub y: Option<i32>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn is_on_a_screen(rect: Rect, screens: &[Rect]) -> bool {
    let (x, y) = (rect.x + rect.width / 2.0, rect.y + rect.height / 2.0);
    screens.iter().any(|screen| x >= screen.x && x < screen.x + screen.width && y >= screen.y && y < screen.y + screen.height)
}

pub fn keep_inside(rect: Rect, area: Rect) -> Rect {
    let width = rect.width.min(area.width);
    let height = rect.height.min(area.height);
    Rect { x: rect.x.clamp(area.x, area.x + area.width - width), y: rect.y.clamp(area.y, area.y + area.height - height), width, height }
}

thread_local! {
    static HIDDEN_START: Cell<bool> = const { Cell::new(false) };
}

pub fn hwnd(ui: &AppWindow) -> Option<isize> {
    ui.window().with_winit_window(|window| match window.window_handle().ok()?.as_raw() {
        RawWindowHandle::Win32(win) => Some(win.hwnd.get()),
        _ => None,
    }).flatten()
}

pub fn wire(ui: &AppWindow) {
    let weak = ui.as_weak();
    ui.on_drag(move || {
        if let Some(ui) = weak.upgrade() {
            ui.window().with_winit_window(|window| {
                let _ = window.drag_window();
            });
        }
    });
    let weak = ui.as_weak();
    ui.on_minimize(move || {
        if let Some(ui) = weak.upgrade() {
            ui.window().with_winit_window(|window| window.set_minimized(true));
        }
    });
    let weak = ui.as_weak();
    ui.on_toggle_maximize(move || {
        if let Some(ui) = weak.upgrade() {
            ui.window().with_winit_window(|window| window.set_maximized(!window.is_maximized()));
            save_later(&ui);
        }
    });
    ui.on_close_window(request_close);
    ui.window().on_close_requested(|| {
        request_close();
        slint::CloseRequestResponse::KeepWindowShown
    });
    let weak = ui.as_weak();
    ui.on_resize_from(move |edge| {
        if let Some(ui) = weak.upgrade() {
            let direction = match edge.as_str() {
                "w" => ResizeDirection::West,
                "e" => ResizeDirection::East,
                "n" => ResizeDirection::North,
                "s" => ResizeDirection::South,
                _ => ResizeDirection::SouthEast,
            };
            ui.window().with_winit_window(|window| {
                let _ = window.drag_resize_window(direction);
            });
            save_later(&ui);
        }
    });
    let weak = ui.as_weak();
    ui.on_embed_moved(move || {
        if let Some(ui) = weak.upgrade() {
            crate::pages::modules::place_embedded(&ui);
            save_later(&ui);
        }
    });
    ui.window().on_winit_window_event(|_, event| {
        use slint::winit_030::winit::event::{ElementState, MouseButton, WindowEvent};
        use slint::winit_030::EventResult;
        if let WindowEvent::MouseInput { state: ElementState::Pressed, button, .. } = event {
            match button {
                MouseButton::Back => {
                    crate::app::post(|app| crate::pages::shell::go_back(app));
                }
                MouseButton::Forward => {
                    crate::app::post(|app| crate::pages::shell::go_forward(app));
                }
                _ => {}
            }
        }
        if matches!(event, WindowEvent::Resized(_) | WindowEvent::Moved(_)) {
            crate::app::post(|app| {
                app.close_menu();
                app.with_ui(save_later);
            });
        }
        EventResult::Propagate
    });
}

pub fn request_close() {
    let tray = crate::background::close_to_tray();
    crate::app::post(move |app| {
        app.with_ui(|ui| {
            if tray {
                ui.window().with_winit_window(|window| window.set_visible(false));
            } else {
                save_now(ui);
                let _ = slint::quit_event_loop();
            }
        });
    });
}

pub fn offscreen() -> bool {
    cfg!(feature = "drive") && std::env::var_os("ETHONE_DRIVE_OFFSCREEN").is_some()
}

pub fn show_main(ui: &AppWindow) {
    ui.window().with_winit_window(|window| {
        window.set_visible(true);
        window.set_minimized(false);
        if !offscreen() {
            window.focus_window();
        }
    });
}

pub fn after_show(ui: &AppWindow, hidden: bool) {
    HIDDEN_START.with(|cell| cell.set(hidden));
    if let Some(window) = hwnd(ui) {
        ethone_engine::embed::apply_exe_icon(window as usize);
    }
    if hidden {
        ui.window().with_winit_window(|window| window.set_visible(false));
    }
    set_login_mode(ui);
}

pub fn set_login_mode(ui: &AppWindow) {
    ui.window().with_winit_window(|window| {
        window.set_min_inner_size(Some(WinitLogical::new(LOGIN_SIZE.0 as f64, 600.0)));
        window.set_resizable(false);
    });
    ui.window().set_size(LogicalSize::new(LOGIN_SIZE.0, LOGIN_SIZE.1));
    center(ui);
}

fn center(ui: &AppWindow) {
    if offscreen() {
        ui.window().with_winit_window(|window| window.set_outer_position(PhysicalPosition::new(-10000, -10000)));
        return;
    }
    ui.window().with_winit_window(|window| {
        let Some(monitor) = window.current_monitor() else { return };
        let (area, size) = (monitor.size(), window.outer_size());
        let origin = monitor.position();
        window.set_outer_position(PhysicalPosition::new(origin.x + (area.width as i32 - size.width as i32) / 2, origin.y + (area.height as i32 - size.height as i32) / 2));
    });
}

pub fn set_app_mode(ui: &AppWindow) {
    let saved = prefs::read_json::<Saved>("ethone-window").unwrap_or(DEFAULT_APP);
    ui.window().with_winit_window(|window| {
        window.set_resizable(true);
        window.set_min_inner_size(Some(WinitLogical::new(APP_MIN.0 as f64, APP_MIN.1 as f64)));
    });
    ui.window().set_size(LogicalSize::new(saved.width.max(APP_MIN.0), saved.height.max(APP_MIN.1)));
    let placed = ui.window().with_winit_window(|window| {
        let (Some(x), Some(y)) = (saved.x, saved.y) else { return false };
        let scale = window.scale_factor();
        let rect = Rect { x: x as f64, y: y as f64, width: saved.width as f64 * scale, height: saved.height as f64 * scale };
        let screens: Vec<Rect> = window.available_monitors().map(|monitor| {
            let (origin, size) = (monitor.position(), monitor.size());
            Rect { x: origin.x as f64, y: origin.y as f64, width: size.width as f64, height: size.height as f64 }
        }).collect();
        if is_on_a_screen(rect, &screens) {
            window.set_outer_position(PhysicalPosition::new(x, y));
            return true;
        }
        false
    }).unwrap_or(false);
    if !placed || offscreen() {
        center(ui);
    }
    if saved.maximized && !offscreen() {
        ui.window().with_winit_window(|window| window.set_maximized(true));
    }
    if !HIDDEN_START.with(Cell::get) {
        show_main(ui);
    }
    HIDDEN_START.with(|cell| cell.set(false));
}

thread_local! {
    static SAVE_TIMER: slint::Timer = slint::Timer::default();
}

pub fn save_later(ui: &AppWindow) {
    if ui.get_mode() != "shell" {
        return;
    }
    let weak = ui.as_weak();
    SAVE_TIMER.with(|timer| {
        timer.start(slint::TimerMode::SingleShot, std::time::Duration::from_millis(400), move || {
            if let Some(ui) = weak.upgrade() {
                save_now(&ui);
            }
        });
    });
}

pub fn save_now(ui: &AppWindow) {
    if ui.get_mode() != "shell" || offscreen() {
        return;
    }
    let previous = prefs::read_json::<Saved>("ethone-window").unwrap_or(DEFAULT_APP);
    let next = ui.window().with_winit_window(|window| {
        if window.is_minimized().unwrap_or(false) {
            return None;
        }
        if window.is_maximized() {
            return Some(Saved { maximized: true, ..previous });
        }
        let size = window.inner_size().to_logical::<f32>(window.scale_factor());
        let position = window.outer_position().ok()?;
        if size.width < APP_MIN.0 || size.height < APP_MIN.1 {
            return None;
        }
        Some(Saved { width: size.width, height: size.height, maximized: false, x: Some(position.x), y: Some(position.y) })
    }).flatten();
    if let Some(next) = next {
        prefs::write_json("ethone-window", &next);
    }
}

pub fn apply_backdrop(ui: &AppWindow, mica: bool, light: bool) {
    ui.set_see_through(false);
    let Some(window) = hwnd(ui) else { return };
    let dark: i32 = if light { 0 } else { 1 };
    let backdrop: i32 = if mica { 2 } else { 1 };
    unsafe {
        DwmSetWindowAttribute(window as _, DWMWA_USE_IMMERSIVE_DARK_MODE as u32, &dark as *const i32 as *const _, 4);
        DwmSetWindowAttribute(window as _, DWMWA_SYSTEMBACKDROP_TYPE as u32, &backdrop as *const i32 as *const _, 4);
        if mica {
            let margins = MARGINS { cxLeftWidth: -1, cxRightWidth: -1, cyTopHeight: -1, cyBottomHeight: -1 };
            DwmExtendFrameIntoClientArea(window as _, &margins);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_window_on_a_missing_screen_is_detected() {
        let screen = Rect { x: 0.0, y: 0.0, width: 1920.0, height: 1080.0 };
        assert!(is_on_a_screen(Rect { x: 100.0, y: 100.0, width: 800.0, height: 600.0 }, &[screen]));
        assert!(!is_on_a_screen(Rect { x: 3000.0, y: 100.0, width: 800.0, height: 600.0 }, &[screen]));
    }

    #[test]
    fn keep_inside_moves_and_shrinks() {
        let area = Rect { x: 0.0, y: 0.0, width: 1000.0, height: 800.0 };
        let kept = keep_inside(Rect { x: 900.0, y: -50.0, width: 400.0, height: 900.0 }, area);
        assert_eq!(kept, Rect { x: 600.0, y: 0.0, width: 400.0, height: 800.0 });
    }

    #[test]
    fn old_window_values_still_read() {
        let saved: Saved = serde_json::from_str(r#"{"width":1200,"height":800,"maximized":true}"#).unwrap();
        assert!(saved.maximized);
        assert_eq!(saved.x, None);
    }
}
