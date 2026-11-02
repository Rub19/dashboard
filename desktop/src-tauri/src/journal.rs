use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BYTES: usize = 512 * 1024;
const MAX_READ: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub time: u64,
    pub module: String,
    pub operation: String,
    pub ok: bool,
    pub detail: String,
}

pub fn redact(text: &str, home: Option<&str>) -> String {
    match home {
        Some(home) if !home.is_empty() => text.replace(home, "%USERPROFILE%"),
        _ => text.to_string(),
    }
}

fn trim(text: &str) -> &str {
    if text.len() <= MAX_BYTES {
        return text;
    }
    let mut start = text.len() - MAX_BYTES / 2;
    while !text.is_char_boundary(start) {
        start += 1;
    }
    let rest = &text[start..];
    rest.find('\n').map_or(rest, |line_end| &rest[line_end + 1..])
}

pub fn append(path: &Path, module: &str, operation: &str, ok: bool, detail: &str) -> Result<(), String> {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    let home = std::env::var("USERPROFILE").ok();
    let entry = Entry {
        time,
        module: module.into(),
        operation: operation.into(),
        ok,
        detail: redact(detail, home.as_deref()),
    };
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let existing = fs::read_to_string(path).unwrap_or_default();
    if existing.len() > MAX_BYTES {
        fs::write(path, trim(&existing)).map_err(|e| e.to_string())?;
    }
    let mut file = fs::OpenOptions::new().create(true).append(true).open(path).map_err(|e| e.to_string())?;
    let line = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    writeln!(file, "{line}").map_err(|e| e.to_string())
}

pub fn read(path: &Path) -> Vec<Entry> {
    let text = fs::read_to_string(path).unwrap_or_default();
    let mut entries: Vec<Entry> = text.lines().filter_map(|line| serde_json::from_str(line).ok()).collect();
    entries.reverse();
    entries.truncate(MAX_READ);
    entries
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("ethone-journal-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir.join("operations.jsonl")
    }

    #[test]
    fn hides_the_user_folder() {
        assert_eq!(redact(r"C:\Users\a\x.exe", Some(r"C:\Users\a")), r"%USERPROFILE%\x.exe");
    }

    #[test]
    fn newest_entry_comes_first_and_bad_lines_are_skipped() {
        let path = temp("order");
        append(&path, "kairo", "install", true, "un").unwrap();
        fs::OpenOptions::new().append(true).open(&path).unwrap().write_all(b"pas du json\n").unwrap();
        append(&path, "kairo", "update", false, "deux").unwrap();
        let entries = read(&path);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].detail, "deux");
    }

    #[test]
    fn stays_bounded_and_keeps_whole_lines() {
        let path = temp("bound");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let line = serde_json::to_string(&Entry { time: 1, module: "é".into(), operation: "o".into(), ok: true, detail: "x".repeat(500) }).unwrap();
        fs::write(&path, format!("{line}\n").repeat(1200)).unwrap();
        append(&path, "kairo", "install", true, "fin").unwrap();
        assert!(fs::metadata(&path).unwrap().len() < MAX_BYTES as u64);
        let entries = read(&path);
        assert_eq!(entries[0].detail, "fin");
        assert_eq!(entries.len(), MAX_READ);
    }

    #[test]
    fn a_missing_journal_is_empty() {
        assert!(read(&temp("missing")).is_empty());
    }
}
