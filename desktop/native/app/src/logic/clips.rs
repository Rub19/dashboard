pub const KEEP: usize = 25;

pub fn push(list: &[String], text: &str) -> Vec<String> {
    if text.trim().is_empty() || text.chars().count() > 5000 {
        return list.to_vec();
    }
    let mut next = vec![text.to_string()];
    next.extend(list.iter().filter(|item| *item != text).take(KEEP - 1).cloned());
    next
}

pub fn link(text: &str) -> Option<String> {
    let text = text.trim();
    let rest = text.strip_prefix("https://").or_else(|| text.strip_prefix("http://"))?;
    (rest.contains('.') && !rest.starts_with('.') && !text.chars().any(char::is_whitespace)).then(|| text.to_string())
}

pub fn keep_link(list: &[String], url: &str) -> Vec<String> {
    let mut next = vec![url.to_string()];
    next.extend(list.iter().filter(|item| *item != url).take(199).cloned());
    next
}

pub fn preview(text: &str) -> String {
    let line = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if line.chars().count() > 80 { format!("{}…", line.chars().take(80).collect::<String>()) } else { line }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_real_links_are_kept_for_later() {
        assert_eq!(link(" https://ethone.dev/a "), Some("https://ethone.dev/a".into()));
        assert_eq!(link("http://x.fr"), Some("http://x.fr".into()));
        assert_eq!(link("ethone.dev"), None);
        assert_eq!(link("https://pas un lien.fr"), None);
        assert_eq!(link("https://localhost"), None);
        let list = keep_link(&["https://a.fr".into()], "https://b.fr");
        assert_eq!(keep_link(&list, "https://a.fr"), vec!["https://a.fr", "https://b.fr"]);
    }

    #[test]
    fn history_keeps_recent_unique_entries() {
        let list = push(&[], "a");
        let list = push(&list, "b");
        assert_eq!(push(&list, "a"), vec!["a", "b"]);
        assert_eq!(push(&list, "   "), list);
        let many: Vec<String> = (0..40).map(|n| n.to_string()).collect();
        assert_eq!(push(&many, "x").len(), KEEP);
        assert_eq!(preview("un\n  deux"), "un deux");
        assert!(preview(&"x".repeat(100)).ends_with('…'));
    }
}
