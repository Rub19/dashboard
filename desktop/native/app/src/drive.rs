use crate::app::with_app;
use crate::AppWindow;
use slint::platform::{Key, PointerEventButton, WindowEvent};
use slint::{ComponentHandle, LogicalPosition, SharedString};
use std::io::Write;
use std::time::Duration;

fn on_ui(work: impl FnOnce(&AppWindow) + Send + 'static) {
    let _ = slint::invoke_from_event_loop(move || {
        let ui = with_app(|app| app.ui.upgrade()).flatten();
        if let Some(ui) = ui {
            work(&ui);
        }
    });
}

fn snapshot(ui: &AppWindow, path: &str) {
    let Ok(buffer) = ui.window().take_snapshot() else { return };
    let (width, height) = (buffer.width(), buffer.height());
    let bytes: Vec<u8> = buffer.as_bytes().to_vec();
    let _ = image::save_buffer(path, &bytes, width, height, image::ColorType::Rgba8);
}

fn dump(path: &str) {
    let text = with_app(|app| crate::pages::dump_blocks(app)).unwrap_or_default();
    if let Ok(mut file) = std::fs::File::create(path) {
        let _ = file.write_all(text.as_bytes());
    }
}

fn run_line(line: &str) -> bool {
    let (verb, rest) = line.split_once(' ').unwrap_or((line, ""));
    let rest = rest.trim().to_string();
    match verb {
        "wait" => std::thread::sleep(Duration::from_millis(rest.parse().unwrap_or(500))),
        "go" | "act" => {
            let (id, value) = if verb == "go" { (format!("go:{rest}"), String::new()) } else { rest.split_once(' ').map_or((rest.clone(), String::new()), |(id, value)| (id.to_string(), value.to_string())) };
            on_ui(move |_| {
                with_app(|app| app.act(&id, &value));
                crate::app::request_render();
            });
        }
        "snap" => on_ui(move |ui| snapshot(ui, &rest)),
        "dump" => {
            let _ = slint::invoke_from_event_loop(move || dump(&rest));
        }
        "size" => {
            let parts: Vec<f32> = rest.split_whitespace().filter_map(|part| part.parse().ok()).collect();
            if parts.len() == 2 {
                on_ui(move |ui| ui.window().set_size(slint::LogicalSize::new(parts[0], parts[1])));
            }
        }
        "click" => {
            let parts: Vec<f32> = rest.split_whitespace().filter_map(|part| part.parse().ok()).collect();
            if parts.len() == 2 {
                on_ui(move |ui| {
                    let position = LogicalPosition::new(parts[0], parts[1]);
                    let window = ui.window();
                    window.dispatch_event(WindowEvent::PointerMoved { position });
                    window.dispatch_event(WindowEvent::PointerPressed { position, button: PointerEventButton::Left });
                    window.dispatch_event(WindowEvent::PointerReleased { position, button: PointerEventButton::Left });
                });
            }
        }
        "type" => on_ui(move |ui| {
            for character in rest.chars() {
                let text = SharedString::from(character.to_string());
                ui.window().dispatch_event(WindowEvent::KeyPressed { text: text.clone() });
                ui.window().dispatch_event(WindowEvent::KeyReleased { text });
            }
        }),
        "key" => on_ui(move |ui| {
            let code: SharedString = match rest.as_str() {
                "esc" => Key::Escape.into(),
                "enter" => Key::Return.into(),
                "tab" => Key::Tab.into(),
                "down" => Key::DownArrow.into(),
                "up" => Key::UpArrow.into(),
                "f5" => Key::F5.into(),
                other => other.into(),
            };
            ui.window().dispatch_event(WindowEvent::KeyPressed { text: code.clone() });
            ui.window().dispatch_event(WindowEvent::KeyReleased { text: code });
        }),
        "ctrl" => on_ui(move |ui| {
            let control: SharedString = Key::Control.into();
            let letter = SharedString::from(rest.as_str());
            ui.window().dispatch_event(WindowEvent::KeyPressed { text: control.clone() });
            ui.window().dispatch_event(WindowEvent::KeyPressed { text: letter.clone() });
            ui.window().dispatch_event(WindowEvent::KeyReleased { text: letter });
            ui.window().dispatch_event(WindowEvent::KeyReleased { text: control });
        }),
        "quit" => {
            let _ = slint::invoke_from_event_loop(|| {
                let _ = slint::quit_event_loop();
            });
            return false;
        }
        _ => {}
    }
    true
}

pub fn start() {
    let Ok(path) = std::env::var("ETHONE_DRIVE") else { return };
    std::thread::spawn(move || {
        let Ok(script) = std::fs::read_to_string(path) else { return };
        for line in script.lines().map(str::trim).filter(|line| !line.is_empty() && !line.starts_with('#')) {
            if !run_line(line) {
                break;
            }
            std::thread::sleep(Duration::from_millis(60));
        }
    });
}
