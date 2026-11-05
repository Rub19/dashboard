use serde_json::Value;
use std::sync::OnceLock;

static TABLE: OnceLock<Value> = OnceLock::new();
static LABELS: OnceLock<Value> = OnceLock::new();

fn table() -> &'static Value {
    TABLE.get_or_init(|| serde_json::from_str(include_str!("../data/i18n.json")).unwrap_or(Value::Null))
}

pub fn labels() -> &'static Value {
    LABELS.get_or_init(|| serde_json::from_str(include_str!("../data/labels.json")).unwrap_or(Value::Null))
}

pub fn fr() -> bool {
    crate::prefs::read("ethone-language").as_deref() != Some("en")
}

pub fn lang() -> &'static str {
    if fr() { "fr" } else { "en" }
}

pub fn tr(french: &str, english: &str) -> String {
    if fr() { french.to_string() } else { english.to_string() }
}

pub fn t(key: &str) -> String {
    let language = lang();
    table()[language][key].as_str().or_else(|| table()["fr"][key].as_str()).unwrap_or(key).to_string()
}

pub fn tv(key: &str, values: &[(&str, &str)]) -> String {
    let mut text = t(key);
    for (name, value) in values {
        text = text.replace(&format!("{{{name}}}"), value);
    }
    text
}

pub fn has(key: &str) -> bool {
    table()["fr"][key].is_string()
}

pub fn error_text(error: &str) -> String {
    let key = format!("error.{error}");
    if has(&key) { t(&key) } else { error.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn both_languages_have_the_same_keys() {
        let root = table();
        let fr = root["fr"].as_object().unwrap();
        let en = root["en"].as_object().unwrap();
        assert!(fr.len() > 200);
        for key in fr.keys() {
            assert!(en.contains_key(key), "{key}");
        }
    }

    #[test]
    fn unknown_errors_stay_readable() {
        assert_eq!(error_text("quelque chose"), "quelque chose");
    }

    #[test]
    fn labels_are_loaded() {
        assert_eq!(labels()["critical"], "Critique");
    }
}
