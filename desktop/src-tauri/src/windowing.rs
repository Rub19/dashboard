use std::time::Duration;
use tauri::utils::config::WindowEffectsConfig;
use tauri::utils::{WindowEffect, WindowEffectState};
use tauri::{LogicalSize, PhysicalPosition, PhysicalSize, Theme, WebviewWindow};
use winreg::enums::HKEY_LOCAL_MACHINE;
use winreg::RegKey;

const LOGIN_SIZE: (f64, f64) = (440.0, 660.0);
const APP_MIN: (f64, f64) = (900.0, 600.0);
const FRAMES: u32 = 14;
const FRAME: Duration = Duration::from_millis(16);
const FIRST_MICA_BUILD: u32 = 22000;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn centered_on(current: Rect, width: f64, height: f64) -> Rect {
    Rect {
        x: current.x + (current.width - width) / 2.0,
        y: current.y + (current.height - height) / 2.0,
        width,
        height,
    }
}

pub fn keep_inside(rect: Rect, area: Rect) -> Rect {
    let width = rect.width.min(area.width);
    let height = rect.height.min(area.height);
    Rect {
        x: rect.x.clamp(area.x, area.x + area.width - width),
        y: rect.y.clamp(area.y, area.y + area.height - height),
        width,
        height,
    }
}

pub fn frame(start: Rect, target: Rect, progress: f64) -> Rect {
    let eased = 1.0 - (1.0 - progress.clamp(0.0, 1.0)).powi(3);
    let mix = |from: f64, to: f64| from + (to - from) * eased;
    Rect {
        x: mix(start.x, target.x),
        y: mix(start.y, target.y),
        width: mix(start.width, target.width),
        height: mix(start.height, target.height),
    }
}

fn apply(window: &WebviewWindow, rect: Rect) {
    let _ = window.set_size(PhysicalSize::new(rect.width.round() as u32, rect.height.round() as u32));
    let _ = window.set_position(PhysicalPosition::new(rect.x.round() as i32, rect.y.round() as i32));
}

fn work_area(window: &WebviewWindow) -> Option<Rect> {
    let monitor = window.current_monitor().ok().flatten()?;
    let area = monitor.work_area();
    Some(Rect {
        x: area.position.x as f64,
        y: area.position.y as f64,
        width: area.size.width as f64,
        height: area.size.height as f64,
    })
}

pub fn set_mode(window: &WebviewWindow, login: bool, width: f64, height: f64, maximized: bool, animate: bool) -> Result<(), String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let (logical_width, logical_height) = if login { LOGIN_SIZE } else { (width.max(APP_MIN.0), height.max(APP_MIN.1)) };
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    }
    let _ = window.set_min_size(None::<LogicalSize<f64>>);
    let _ = window.set_resizable(true);

    let size = window.outer_size().map_err(|e| e.to_string())?;
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let start = Rect { x: position.x as f64, y: position.y as f64, width: size.width as f64, height: size.height as f64 };
    let mut target = centered_on(start, logical_width * scale, logical_height * scale);
    if let Some(area) = work_area(window) {
        target = keep_inside(target, area);
    }

    let visible = window.is_visible().unwrap_or(false);
    if animate && visible {
        for step in 1..=FRAMES {
            apply(window, frame(start, target, f64::from(step) / f64::from(FRAMES)));
            std::thread::sleep(FRAME);
        }
    }
    apply(window, target);

    let _ = window.set_resizable(!login);
    let _ = window.set_maximizable(!login);
    if !login {
        let _ = window.set_min_size(Some(LogicalSize::new(APP_MIN.0, APP_MIN.1)));
        if maximized {
            let _ = window.maximize();
        }
    }
    if !visible {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

pub fn supports_mica() -> bool {
    RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
        .and_then(|key| key.get_value::<String, _>("CurrentBuildNumber"))
        .ok()
        .and_then(|build| build.parse::<u32>().ok())
        .is_some_and(|build| build >= FIRST_MICA_BUILD)
}

pub fn apply_mica(window: &WebviewWindow) -> bool {
    if !supports_mica() {
        return false;
    }
    let effects = WindowEffectsConfig {
        effects: vec![WindowEffect::Mica],
        state: Some(WindowEffectState::Active),
        radius: None,
        color: None,
        interactive: false,
    };
    window.set_effects(effects).is_ok()
}

pub fn set_theme(window: &WebviewWindow, theme: &str) -> Result<(), String> {
    let native = match theme {
        "dark" => Some(Theme::Dark),
        "light" => Some(Theme::Light),
        _ => None,
    };
    window.set_theme(native).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const AREA: Rect = Rect { x: 0.0, y: 0.0, width: 1920.0, height: 1040.0 };

    #[test]
    fn growing_keeps_the_window_center() {
        let login = Rect { x: 700.0, y: 200.0, width: 440.0, height: 660.0 };
        let app = centered_on(login, 1280.0, 820.0);
        assert_eq!(app.x + app.width / 2.0, login.x + login.width / 2.0);
        assert_eq!(app.y + app.height / 2.0, login.y + login.height / 2.0);
    }

    #[test]
    fn a_window_near_an_edge_stays_on_screen() {
        let rect = keep_inside(Rect { x: -200.0, y: 900.0, width: 1280.0, height: 820.0 }, AREA);
        assert_eq!((rect.x, rect.y), (0.0, 220.0));
        let right = keep_inside(Rect { x: 1500.0, y: 0.0, width: 1280.0, height: 820.0 }, AREA);
        assert_eq!(right.x, 640.0);
    }

    #[test]
    fn a_window_larger_than_the_screen_is_reduced() {
        let rect = keep_inside(Rect { x: 0.0, y: 0.0, width: 3000.0, height: 2000.0 }, AREA);
        assert_eq!((rect.width, rect.height), (1920.0, 1040.0));
    }

    #[test]
    fn frames_start_and_end_exactly_and_ease_out() {
        let a = Rect { x: 0.0, y: 0.0, width: 100.0, height: 100.0 };
        let b = Rect { x: 100.0, y: 100.0, width: 200.0, height: 200.0 };
        assert_eq!(frame(a, b, 0.0), a);
        assert_eq!(frame(a, b, 1.0), b);
        assert!(frame(a, b, 0.5).x > 50.0);
    }
}
