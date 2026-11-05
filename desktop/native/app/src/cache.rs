use crate::services::{data_dir, Fut};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::Mutex;

static MEMORY: Mutex<Option<HashMap<String, (i64, Value)>>> = Mutex::new(None);

fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn folder() -> PathBuf {
    data_dir().join("native-cache")
}

fn file_for(key: &str) -> PathBuf {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    key.hash(&mut hasher);
    folder().join(format!("{:016x}.json", hasher.finish()))
}

fn with_memory<T>(work: impl FnOnce(&mut HashMap<String, (i64, Value)>) -> T) -> T {
    let mut guard = MEMORY.lock().unwrap_or_else(|poison| poison.into_inner());
    work(guard.get_or_insert_with(HashMap::new))
}

pub fn read(key: &str) -> Option<(i64, Value)> {
    if let Some(found) = with_memory(|memory| memory.get(key).cloned()) {
        return Some(found);
    }
    let text = std::fs::read_to_string(file_for(key)).ok()?;
    let parsed: Value = serde_json::from_str(&text).ok()?;
    if parsed["key"] != key {
        return None;
    }
    let entry = (parsed["at"].as_i64()?, parsed["value"].clone());
    with_memory(|memory| memory.insert(key.to_string(), entry.clone()));
    Some(entry)
}

pub fn write(key: &str, value: &Value) {
    let at = now();
    with_memory(|memory| memory.insert(key.to_string(), (at, value.clone())));
    let _ = std::fs::create_dir_all(folder());
    let _ = std::fs::write(file_for(key), json!({ "key": key, "at": at, "value": value }).to_string());
}

pub fn clear(prefix: &str) {
    with_memory(|memory| memory.retain(|key, _| !key.starts_with(prefix)));
    let Ok(entries) = std::fs::read_dir(folder()) else { return };
    for entry in entries.flatten() {
        let stored = std::fs::read_to_string(entry.path()).ok().and_then(|text| serde_json::from_str::<Value>(&text).ok());
        if stored.as_ref().and_then(|value| value["key"].as_str()).is_none_or(|key| key.starts_with(prefix)) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

pub fn fresh(at: i64, now: i64, ttl: i64) -> bool {
    now - at < ttl
}

pub fn cached(key: String, ttl: i64, stale_on_error: bool, load: Fut) -> Fut {
    Box::pin(async move {
        let entry = read(&key);
        if let Some((at, value)) = &entry {
            if fresh(*at, now(), ttl) {
                return Ok(value.clone());
            }
        }
        match load.await {
            Ok(value) => {
                write(&key, &value);
                Ok(value)
            }
            Err(_) if stale_on_error && entry.is_some() => Ok(entry.map(|(_, value)| value).unwrap_or(Value::Null)),
            Err(error) => Err(error),
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn freshness_follows_the_ttl() {
        assert!(fresh(100, 150, 100));
        assert!(!fresh(100, 200, 100));
    }

    #[test]
    fn memory_keeps_values_and_prefix_clear_removes_them() {
        write("test:a", &json!(1));
        assert_eq!(read("test:a").map(|(_, value)| value), Some(json!(1)));
        clear("test:");
        assert_eq!(with_memory(|memory| memory.contains_key("test:a")), false);
    }

    #[tokio::test]
    async fn a_stale_value_survives_an_error_only_if_asked() {
        write("test:stale", &json!(5));
        with_memory(|memory| memory.get_mut("test:stale").unwrap().0 = 0);
        let failing = || -> Fut { Box::pin(async { Err::<Value, String>("x".to_string()) }) };
        assert_eq!(cached("test:stale".into(), 10, true, failing()).await, Ok(json!(5)));
        assert!(cached("test:stale".into(), 10, false, failing()).await.is_err());
        clear("test:");
    }
}
