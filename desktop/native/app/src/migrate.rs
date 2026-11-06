use rusty_leveldb::{LdbIterator, Options, DB};
use std::path::{Path, PathBuf};

const DONE: &str = "ethone-migrated-from-tauri";
const ORIGINS: [&str; 2] = ["_http://tauri.localhost\0", "_https://tauri.localhost\0"];

fn text(bytes: &[u8]) -> Option<String> {
    match bytes.split_first()? {
        (0, rest) => {
            let units: Vec<u16> = rest.chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).collect();
            String::from_utf16(&units).ok()
        }
        (1, rest) => Some(rest.iter().map(|byte| char::from(*byte)).collect()),
        _ => None,
    }
}

pub fn entry(key: &[u8], value: &[u8]) -> Option<(String, String)> {
    let rest = ORIGINS.iter().find_map(|origin| key.strip_prefix(origin.as_bytes()))?;
    let name = text(rest)?;
    name.starts_with("ethone-").then_some(())?;
    Some((name, text(value)?))
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for item in std::fs::read_dir(from)? {
        let item = item?;
        let name = item.file_name();
        if name == "LOCK" {
            continue;
        }
        std::fs::copy(item.path(), to.join(name))?;
    }
    Ok(())
}

pub fn read_storage(dir: &Path) -> Result<Vec<(String, String)>, String> {
    static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let copy = std::env::temp_dir().join(format!("ethone-tauri-storage-{}-{}", std::process::id(), NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)));
    let _ = std::fs::remove_dir_all(&copy);
    copy_dir(dir, &copy).map_err(|error| error.to_string())?;
    let result = (|| {
        let mut options = Options::default();
        options.create_if_missing = false;
        let mut db = DB::open(&copy, options).map_err(|error| error.to_string())?;
        let mut iter = db.new_iter().map_err(|error| error.to_string())?;
        let mut out = Vec::new();
        while iter.advance() {
            if let Some((key, value)) = iter.current() {
                out.extend(entry(&key, &value));
            }
        }
        Ok(out)
    })();
    let _ = std::fs::remove_dir_all(&copy);
    result
}

pub fn tauri_storage() -> PathBuf {
    crate::services::data_dir().join("EBWebView").join("Default").join("Local Storage").join("leveldb")
}

pub fn run() {
    if crate::prefs::read(DONE).is_some() {
        return;
    }
    let dir = tauri_storage();
    if dir.exists() {
        match read_storage(&dir) {
            Ok(entries) => {
                for (key, value) in entries {
                    crate::prefs::write(&key, &value);
                }
            }
            Err(_) => return,
        }
    }
    crate::prefs::write(DONE, "true");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn latin(text: &str) -> Vec<u8> {
        let mut out = vec![1];
        out.extend(text.bytes());
        out
    }

    fn wide(text: &str) -> Vec<u8> {
        let mut out = vec![0];
        out.extend(text.encode_utf16().flat_map(u16::to_le_bytes));
        out
    }

    #[test]
    fn chromium_entries_are_decoded() {
        let mut key = b"_http://tauri.localhost\0".to_vec();
        key.extend(latin("ethone-theme"));
        assert_eq!(entry(&key, &latin("\"aurora\"")), Some(("ethone-theme".into(), "\"aurora\"".into())));
        let mut key = b"_https://tauri.localhost\0".to_vec();
        key.extend(wide("ethone-ville"));
        assert_eq!(entry(&key, &wide("\"Évry\"")), Some(("ethone-ville".into(), "\"Évry\"".into())));
        let mut other = b"_https://tauri.localhost\0".to_vec();
        other.extend(latin("autre"));
        assert_eq!(entry(&other, &latin("1")), None);
        assert_eq!(entry(b"META:https://tauri.localhost", b"x"), None);
    }

    #[test]
    fn a_real_leveldb_is_read() {
        let dir = std::env::temp_dir().join(format!("ethone-ldb-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        {
            let mut db = DB::open(&dir, Options::default()).expect("db");
            let mut key = b"_http://tauri.localhost\0".to_vec();
            key.extend(latin("ethone-accent"));
            db.put(&key, &latin("\"blue\"")).expect("put");
            db.put(b"VERSION", b"1").expect("put");
            db.flush().expect("flush");
        }
        let entries = read_storage(&dir).expect("lecture");
        assert_eq!(entries, vec![("ethone-accent".to_string(), "\"blue\"".to_string())]);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    #[ignore]
    fn real_tauri_storage_lists_keys() {
        let dir = std::path::PathBuf::from(std::env::var("LOCALAPPDATA").expect("LOCALAPPDATA")).join("dev.ethone.desktop").join("EBWebView").join("Default").join("Local Storage").join("leveldb");
        let entries = read_storage(&dir).expect("lecture");
        let names: Vec<&str> = entries.iter().map(|(key, _)| key.as_str()).collect();
        println!("{} clés : {}", names.len(), names.join(", "));
        assert!(!names.is_empty());
    }
}
