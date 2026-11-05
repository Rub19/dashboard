pub mod eval;
pub mod home;
pub mod lol;
pub mod mail;
pub mod navigation;
pub mod palette;
pub mod productivity;
pub mod settings;
pub mod spotify;
pub mod time;

pub fn toggle_pinned(pinned: &[String], id: &str) -> Vec<String> {
    if pinned.iter().any(|item| item == id) {
        pinned.iter().filter(|item| *item != id).cloned().collect()
    } else {
        let mut next = pinned.to_vec();
        next.push(id.to_string());
        next
    }
}

pub fn resolve_pinned<'a, T>(pinned: &[String], modules: &'a [T], id_of: impl Fn(&T) -> &str) -> Vec<&'a T> {
    let mut found = Vec::new();
    for id in pinned {
        found.extend(modules.iter().filter(|status| id_of(status) == id));
    }
    found
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
    fn bytes_read_like_the_interface() {
        assert_eq!(format_bytes(0.0), "0 o");
        assert_eq!(format_bytes(512.0), "512 o");
        assert_eq!(format_bytes(1536.0), "1,5 Ko");
        assert_eq!(format_bytes(1048576.0), "1,0 Mo");
    }
}
