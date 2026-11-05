use crate::services::data_dir;
use serde::de::DeserializeOwned;
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Mutex;

static STORE: Mutex<Option<BTreeMap<String, String>>> = Mutex::new(None);

fn file() -> PathBuf {
    data_dir().join("native-prefs.json")
}

fn with<T>(work: impl FnOnce(&mut BTreeMap<String, String>) -> T) -> T {
    let mut guard = STORE.lock().unwrap_or_else(|poison| poison.into_inner());
    let store = guard.get_or_insert_with(|| std::fs::read_to_string(file()).ok().and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default());
    work(store)
}

pub fn reload() {
    let mut guard = STORE.lock().unwrap_or_else(|poison| poison.into_inner());
    *guard = None;
}

pub fn read(key: &str) -> Option<String> {
    with(|store| store.get(key).cloned())
}

pub fn write(key: &str, value: &str) {
    let text = with(|store| {
        store.insert(key.to_string(), value.to_string());
        serde_json::to_string_pretty(store).unwrap_or_default()
    });
    let path = file();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let temp = path.with_extension("tmp");
    if std::fs::write(&temp, text).is_ok() {
        let _ = std::fs::rename(&temp, &path);
    }
}

pub fn remove(key: &str) {
    let text = with(|store| {
        store.remove(key);
        serde_json::to_string_pretty(store).unwrap_or_default()
    });
    let _ = std::fs::write(file(), text);
}

pub fn read_json<T: DeserializeOwned>(key: &str) -> Option<T> {
    serde_json::from_str(&read(key)?).ok()
}

pub fn write_json<T: serde::Serialize>(key: &str, value: &T) {
    if let Ok(text) = serde_json::to_string(value) {
        write(key, &text);
    }
}

pub fn text(key: &str, fallback: &str) -> String {
    read_json::<String>(key).unwrap_or_else(|| fallback.to_string())
}
