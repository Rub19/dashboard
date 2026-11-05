use serde_json::Value;

pub fn has_module_update(action: &str, installed: bool) -> bool {
    matches!(action, "update" | "closeToUpdate" | "openToUpdate") || (action == "releasePage" && installed)
}

pub fn day_progress(hour: u32, minute: u32) -> f32 {
    (hour * 60 + minute) as f32 / (24.0 * 60.0)
}

pub fn clean_subject(subject: &str) -> String {
    let trimmed = subject.trim_end();
    let bytes = trimmed.as_bytes();
    let digit = |at: usize| bytes.get(at).is_some_and(u8::is_ascii_digit);
    let stamp_at = |start: usize| -> bool {
        digit(start) && digit(start + 1) && digit(start + 2) && digit(start + 3) && bytes.get(start + 4) == Some(&b'-') && digit(start + 5) && digit(start + 6) && bytes.get(start + 7) == Some(&b'-') && digit(start + 8) && digit(start + 9) && matches!(bytes.get(start + 10), Some(b' ' | b'T')) && digit(start + 11) && digit(start + 12) && bytes.get(start + 13) == Some(&b':') && digit(start + 14) && digit(start + 15)
    };
    let length = bytes.len();
    for tail in [16usize, 19] {
        if length >= tail && trimmed.is_char_boundary(length - tail) && stamp_at(length - tail) {
            if tail == 19 && !(bytes[length - 3] == b':' && digit(length - 2) && digit(length - 1)) {
                continue;
            }
            return trimmed[..length - tail].trim_end_matches(|character: char| character.is_whitespace() || matches!(character, '|' | '–' | '-')).to_string();
        }
    }
    subject.to_string()
}

#[derive(Clone, Debug, PartialEq)]
pub struct MailGroup {
    pub id: String,
    pub from: String,
    pub subject: String,
    pub count: usize,
}

pub fn group_mail(mail: &[Value], limit: usize) -> Vec<MailGroup> {
    let mut groups: Vec<(String, MailGroup)> = Vec::new();
    for item in mail {
        let address = item["from_address"].as_str().unwrap_or_default();
        let subject = clean_subject(item["subject"].as_str().unwrap_or_default());
        let key = format!("{address}\n{subject}");
        if let Some((_, found)) = groups.iter_mut().find(|(known, _)| *known == key) {
            found.count += 1;
        } else {
            let from = item["from_name"].as_str().filter(|name| !name.is_empty()).unwrap_or(address).to_string();
            groups.push((key, MailGroup { id: item["id"].as_str().unwrap_or_default().to_string(), from, subject, count: 1 }));
        }
    }
    groups.into_iter().take(limit).map(|(_, group)| group).collect()
}

pub fn connection_status(offline: bool, error: bool) -> &'static str {
    if error {
        "degraded"
    } else if offline {
        "offline"
    } else {
        "online"
    }
}

pub const EVENT_LEAD_MS: f64 = 600_000.0;

pub fn unseen_mail<'a>(seen: Option<&std::collections::HashSet<String>>, mail: &'a [Value]) -> Vec<&'a Value> {
    match seen {
        Some(seen) => mail.iter().filter(|item| !seen.contains(item["id"].as_str().unwrap_or_default())).collect(),
        None => Vec::new(),
    }
}

pub fn is_due(start: Option<f64>, id: &str, notified: &[String], now: f64) -> bool {
    let Some(start) = start else { return false };
    if notified.iter().any(|item| item == id) {
        return false;
    }
    let left = start - now;
    left > 0.0 && left <= EVENT_LEAD_MS
}

pub fn first_note(notes: Option<&str>) -> String {
    notes
        .unwrap_or_default()
        .lines()
        .filter(|line| !line.trim_start().starts_with('#'))
        .map(|line| line.trim_start_matches(|character: char| matches!(character, '*' | '-' | '>') || character.is_whitespace()).trim().to_string())
        .find(|line| !line.is_empty())
        .unwrap_or_default()
}

pub fn in_quiet_hours(now_minutes: u32, enabled: bool, from: &str, to: &str) -> bool {
    if !enabled {
        return false;
    }
    let minutes = |text: &str| -> Option<u32> {
        let (hour, minute) = text.split_once(':')?;
        Some(hour.parse::<u32>().ok()? * 60 + minute.parse::<u32>().ok()?)
    };
    let (Some(start), Some(end)) = (minutes(from), minutes(to)) else { return false };
    if start == end {
        return false;
    }
    if start < end {
        now_minutes >= start && now_minutes < end
    } else {
        now_minutes >= start || now_minutes < end
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn module_updates_are_detected() {
        assert!(has_module_update("update", true));
        assert!(has_module_update("closeToUpdate", true));
        assert!(has_module_update("releasePage", true));
        assert!(!has_module_update("releasePage", false));
        assert!(!has_module_update("open", true));
    }

    #[test]
    fn same_mails_group_even_with_a_date_in_the_subject() {
        let mail = vec![
            json!({ "id": "1", "from_address": "a@x", "subject": "Alerte - 2026-11-03 10:00" }),
            json!({ "id": "2", "from_address": "a@x", "subject": "Alerte - 2026-11-03 11:00:12" }),
            json!({ "id": "3", "from_address": "b@x", "from_name": "Bob", "subject": "Salut" }),
        ];
        let groups = group_mail(&mail, 5);
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0], MailGroup { id: "1".into(), from: "a@x".into(), subject: "Alerte".into(), count: 2 });
        assert_eq!(groups[1].from, "Bob");
        assert_eq!(group_mail(&mail, 1).len(), 1);
    }

    #[test]
    fn events_are_due_only_in_the_ten_last_minutes_and_once() {
        let now = 1_000_000.0;
        assert!(is_due(Some(now + 300_000.0), "a", &[], now));
        assert!(!is_due(Some(now + 900_000.0), "a", &[], now));
        assert!(!is_due(Some(now - 1.0), "a", &[], now));
        assert!(!is_due(Some(now + 300_000.0), "a", &["a".to_string()], now));
        assert!(!is_due(None, "a", &[], now));
    }

    #[test]
    fn unseen_mail_is_empty_on_the_first_check() {
        let mail = vec![json!({ "id": "1" }), json!({ "id": "2" })];
        assert!(unseen_mail(None, &mail).is_empty());
        let seen: std::collections::HashSet<String> = ["1".to_string()].into();
        assert_eq!(unseen_mail(Some(&seen), &mail).len(), 1);
    }

    #[test]
    fn first_note_skips_titles_and_bullets() {
        assert_eq!(first_note(Some("# Titre\n\n* Corrige le bug\n- autre")), "Corrige le bug");
        assert_eq!(first_note(None), "");
    }

    #[test]
    fn quiet_hours_can_cross_midnight() {
        assert!(in_quiet_hours(23 * 60, true, "22:00", "08:00"));
        assert!(in_quiet_hours(60, true, "22:00", "08:00"));
        assert!(!in_quiet_hours(12 * 60, true, "22:00", "08:00"));
        assert!(!in_quiet_hours(23 * 60, false, "22:00", "08:00"));
        assert!(in_quiet_hours(9 * 60, true, "08:00", "10:00"));
    }

    #[test]
    fn connection_reads_the_right_state() {
        assert_eq!(connection_status(false, true), "degraded");
        assert_eq!(connection_status(true, false), "offline");
        assert_eq!(connection_status(false, false), "online");
    }
}
