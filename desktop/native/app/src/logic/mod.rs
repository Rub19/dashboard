pub mod calc;
pub mod clips;
pub mod eval;
pub mod friends;
pub mod home;
pub mod lol;
pub mod mail;
pub mod navigation;
pub mod palette;
pub mod productivity;
pub mod settings;
pub mod spotify;
pub mod tft;
pub mod time;
pub mod weather;

pub fn toggle_pinned(pinned: &[String], id: &str) -> Vec<String> {
    if pinned.iter().any(|item| item == id) {
        pinned.iter().filter(|item| *item != id).cloned().collect()
    } else {
        let mut next = pinned.to_vec();
        next.push(id.to_string());
        next
    }
}

pub fn startup_targets(wanted: &[String], modules: &[(String, bool, bool)]) -> Vec<String> {
    wanted.iter().filter(|id| modules.iter().any(|(other, installed, running)| other == *id && *installed && !*running)).cloned().collect()
}

pub fn resolve_pinned<'a, T>(pinned: &[String], modules: &'a [T], id_of: impl Fn(&T) -> &str) -> Vec<&'a T> {
    let mut found = Vec::new();
    for id in pinned {
        found.extend(modules.iter().filter(|status| id_of(status) == id));
    }
    found
}

pub fn riot_reconnect_required(reason: &str) -> bool {
    matches!(reason, "riotExpired" | "riotRequired") || reason == crate::i18n::error_text("riotExpired") || reason == crate::i18n::error_text("riotRequired")
}

pub fn options(values: Vec<String>) -> Vec<String> {
    let mut unique: Vec<String> = values.into_iter().filter(|value| !value.is_empty()).collect();
    unique.sort_by_key(|value| value.to_lowercase());
    unique.dedup();
    unique
}

pub fn keep_match(result: &str, mode: &str, pick: &str, won: bool, draw: bool, line_mode: &str, line_pick: &str) -> bool {
    if result == "win" && !won {
        return false;
    }
    if result == "loss" && (won || draw) {
        return false;
    }
    if !mode.is_empty() && line_mode != mode {
        return false;
    }
    pick.is_empty() || line_pick == pick
}

pub fn format_bytes(value: f64) -> String {
    if !value.is_finite() || value <= 0.0 {
        return "0 o".into();
    }
    const UNITS: [&str; 5] = ["o", "Ko", "Mo", "Go", "To"];
    let index = ((value.ln() / 1024f64.ln()).floor() as usize).min(UNITS.len() - 1);
    let scaled = value / 1024f64.powi(index as i32);
    let text = if index == 0 { format!("{scaled:.0}") } else { format!("{scaled:.1}").replace('.', ",") };
    format!("{text} {}", UNITS[index])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pinned_toggles_and_resolves_in_pin_order() {
        let list = toggle_pinned(&[], "a");
        assert_eq!(list, vec!["a"]);
        let list = toggle_pinned(&list, "b");
        assert_eq!(list, vec!["a", "b"]);
        assert_eq!(toggle_pinned(&list, "a"), vec!["b"]);
        let modules = ["b", "x", "a"];
        let found = resolve_pinned(&list, &modules, |item| item);
        assert_eq!(found.into_iter().copied().collect::<Vec<_>>(), vec!["a", "b"]);
    }

    #[test]
    fn only_installed_idle_apps_start_with_ethone() {
        let modules = vec![("kairo".to_string(), true, false), ("argus".to_string(), true, true), ("nova".to_string(), false, false)];
        let wanted = vec!["argus".to_string(), "kairo".to_string(), "nova".to_string(), "gone".to_string()];
        assert_eq!(startup_targets(&wanted, &modules), vec!["kairo"]);
    }

    #[test]
    fn match_filters_keep_the_right_games() {
        assert!(keep_match("", "", "", false, false, "x", "y"));
        assert!(!keep_match("win", "", "", false, false, "x", "y"));
        assert!(!keep_match("loss", "", "", false, true, "x", "y"));
        assert!(keep_match("loss", "", "", false, false, "x", "y"));
        assert!(!keep_match("all", "Compétition", "", true, false, "Vélocité", "y"));
        assert!(!keep_match("all", "", "Jett", true, false, "x", "Sage"));
        assert_eq!(options(vec!["b".into(), "".into(), "a".into(), "b".into()]), ["a", "b"]);
    }

    #[test]
    fn bytes_read_like_the_interface() {
        assert_eq!(format_bytes(0.0), "0 o");
        assert_eq!(format_bytes(512.0), "512 o");
        assert_eq!(format_bytes(1536.0), "1,5 Ko");
        assert_eq!(format_bytes(1048576.0), "1,0 Mo");
    }
}
