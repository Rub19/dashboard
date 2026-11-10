use crate::logic::settings::{self, InterfacePreferences, ACCENTS, LOOKS};
use crate::prefs;
use crate::vm::hex;
use crate::{AppWindow, Theme};
use slint::{Color, ComponentHandle};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

pub fn current_look() -> String {
    let saved = prefs::read("ethone-look").unwrap_or_default();
    LOOKS.iter().find(|look| look.id == saved).map_or("ethone", |look| look.id).to_string()
}

pub fn schedule_on() -> bool {
    prefs::read("ethone-theme-schedule").as_deref() == Some("on")
}

pub fn effective_look() -> String {
    use chrono::Timelike;
    settings::scheduled_look(&current_look(), schedule_on(), chrono::Local::now().hour()).to_string()
}

pub fn current_accent() -> String {
    let saved = prefs::read("ethone-accent-choice").unwrap_or_default();
    ACCENTS.iter().find(|accent| accent.id == saved).map_or("ocean", |accent| accent.id).to_string()
}

pub fn interface() -> InterfacePreferences {
    settings::normalize_interface(&prefs::read_json::<serde_json::Value>("ethone-interface-preferences").unwrap_or_default())
}

pub fn system_is_light() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
        .and_then(|key| key.get_value::<u32, _>("AppsUseLightTheme"))
        .is_ok_and(|value| value == 1)
}

fn system_reduces_motion() -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETCLIENTAREAANIMATION};
    let mut enabled = 1i32;
    let done = unsafe { SystemParametersInfoW(SPI_GETCLIENTAREAANIMATION, 0, &mut enabled as *mut i32 as *mut _, 0) };
    done != 0 && enabled == 0
}

pub fn reduced_motion() -> bool {
    interface().motion == "reduced" || system_reduces_motion()
}

fn with_alpha(color: Color, alpha: u8) -> Color {
    Color::from_argb_u8(alpha, color.red(), color.green(), color.blue())
}

pub fn apply(ui: &AppWindow) {
    let look_id = effective_look();
    let look = LOOKS.iter().find(|look| look.id == look_id).unwrap_or(&LOOKS[0]);
    let accent_id = if prefs::read("ethone-look").is_some() { current_accent() } else { look.accent.to_string() };
    let accent = ACCENTS.iter().find(|accent| accent.id == accent_id).unwrap_or(&ACCENTS[1]);
    let light = look.theme == "light" || (look.theme == "system" && system_is_light());
    let surface = settings::surface(look.id, light);
    let preferences = interface();
    let theme = ui.global::<Theme>();
    let contrast = prefs::read("ethone-contrast").as_deref() == Some("more");
    let opaque = preferences.transparency == "reduced";
    theme.set_window(hex(surface.window));
    theme.set_sidebar(if opaque { hex(surface.row_solid) } else { hex(surface.sidebar) });
    theme.set_sidebar_edge(hex(surface.sidebar_edge));
    theme.set_row(hex(surface.row));
    theme.set_row_hover(hex(surface.row_hover));
    theme.set_row_solid(hex(surface.row_solid));
    theme.set_control(hex(surface.control));
    theme.set_control_hover(hex(surface.control_hover));
    theme.set_control_solid(hex(surface.control_solid));
    let fg = hex(surface.fg);
    theme.set_fg(fg);
    theme.set_muted(if contrast { with_alpha(fg, 219) } else { hex(surface.muted) });
    theme.set_faint(if contrast { with_alpha(fg, 178) } else { hex(surface.faint) });
    theme.set_line(if contrast { with_alpha(fg, 87) } else { hex(surface.line) });
    theme.set_input_edge(if contrast { with_alpha(fg, 140) } else { hex(surface.input_edge) });
    theme.set_accent(hex(if light { accent.dim } else { accent.color }));
    theme.set_on_accent(hex(accent.on));
    theme.set_accent_text(hex(if light { accent.text_dim } else { accent.text }));
    theme.set_success(hex(if light { "#1a7f37" } else { "#30d158" }));
    theme.set_warning(hex(if light { "#b25000" } else { "#ff9f0a" }));
    theme.set_danger(hex(if light { "#d70015" } else { "#ff453a" }));
    theme.set_danger_bg(hex(if light { "#d7001517" } else { "#ff453a26" }));
    theme.set_switch_on(hex(if light { "#34c759" } else { "#30d158" }));
    theme.set_popup(if opaque { hex(surface.row_solid) } else { hex(surface.popup) });
    theme.set_scrim(hex(if light { "#0000002e" } else { "#00000080" }));
    theme.set_glow_a(hex(surface.glow_a));
    theme.set_glow_b(hex(surface.glow_b));
    theme.set_reduced(reduced_motion());
    theme.set_text_scale(preferences.text_scale as f32 / 100.0);
    theme.set_density(if preferences.density == "compact" { 0.86 } else { 1.0 });
    crate::win::apply_backdrop(ui, look.id == "windows" && !opaque, light);
}

pub fn apply_look(ui: &AppWindow, id: &str) {
    let look = LOOKS.iter().find(|look| look.id == id).unwrap_or(&LOOKS[0]);
    prefs::write("ethone-look", look.id);
    prefs::write("ethone-theme", look.theme);
    prefs::write("ethone-accent-choice", look.accent);
    apply(ui);
}
