pub fn normalize(text: &str) -> String {
    let mut out = String::new();
    for character in text.chars() {
        let base = match character {
            'à' | 'á' | 'â' | 'ä' | 'ã' | 'å' | 'À' | 'Á' | 'Â' | 'Ä' => 'a',
            'ç' | 'Ç' => 'c',
            'è' | 'é' | 'ê' | 'ë' | 'È' | 'É' | 'Ê' | 'Ë' => 'e',
            'ì' | 'í' | 'î' | 'ï' | 'Î' | 'Ï' => 'i',
            'ñ' | 'Ñ' => 'n',
            'ò' | 'ó' | 'ô' | 'ö' | 'õ' | 'Ô' | 'Ö' => 'o',
            'ù' | 'ú' | 'û' | 'ü' | 'Ù' | 'Û' | 'Ü' => 'u',
            'ÿ' | 'Ÿ' => 'y',
            other => other,
        };
        out.extend(base.to_lowercase());
    }
    out
}

pub fn score(label: &str, query: &str) -> Option<u8> {
    let query = normalize(query);
    let words: Vec<&str> = query.split_whitespace().collect();
    if words.is_empty() {
        return Some(0);
    }
    let hay = normalize(label);
    if !words.iter().all(|word| hay.contains(word)) {
        return None;
    }
    if hay.starts_with(words[0]) {
        return Some(0);
    }
    let at_boundary = hay.match_indices(words[0]).any(|(at, _)| !hay[..at].chars().last().is_some_and(char::is_alphanumeric));
    Some(if at_boundary { 1 } else { 2 })
}

pub struct Ranked<'a, T> {
    pub list: Vec<&'a T>,
    pub recent_count: usize,
}

pub fn rank<'a, T>(items: &'a [T], query: &str, recent: &[String], id_of: impl Fn(&T) -> &str, label_of: impl Fn(&T) -> &str) -> Ranked<'a, T> {
    if query.trim().is_empty() {
        let first: Vec<&T> = recent.iter().filter_map(|id| items.iter().find(|item| id_of(item) == id)).collect();
        let rest = items.iter().filter(|item| !first.iter().any(|seen| std::ptr::eq(*seen, *item)));
        let count = first.len();
        return Ranked { list: first.iter().copied().chain(rest).collect(), recent_count: count };
    }
    let mut scored: Vec<(u8, &T)> = items.iter().filter_map(|item| score(label_of(item), query).map(|value| (value, item))).collect();
    scored.sort_by_key(|(value, _)| *value);
    Ranked { list: scored.into_iter().map(|(_, item)| item).collect(), recent_count: 0 }
}

pub fn remember(recent: &[String], id: &str, limit: usize) -> Vec<String> {
    std::iter::once(id.to_string()).chain(recent.iter().filter(|other| *other != id).cloned()).take(limit).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accents_and_case_do_not_matter() {
        assert_eq!(score("Réglages", "reglage"), Some(0));
        assert_eq!(score("Mes RÉGLAGES", "réglages"), Some(1));
        assert_eq!(score("Préférences", "feren"), Some(2));
        assert_eq!(score("Mail", "tâches"), None);
    }

    #[test]
    fn all_words_must_match() {
        assert_eq!(score("Réglages › Apparence", "appar reg"), Some(1));
        assert_eq!(score("Réglages › Apparence", "appar zzz"), None);
    }

    #[test]
    fn an_empty_query_puts_recent_first() {
        let items = ["a", "b", "c"];
        let ranked = rank(&items, "", &["c".to_string(), "x".to_string()], |item| item, |item| item);
        assert_eq!(ranked.recent_count, 1);
        assert_eq!(ranked.list.into_iter().copied().collect::<Vec<_>>(), vec!["c", "a", "b"]);
    }

    #[test]
    fn a_query_sorts_by_score() {
        let items = ["zmail", "mail", "le mail"];
        let ranked = rank(&items, "mail", &[], |item| item, |item| item);
        assert_eq!(ranked.list.into_iter().copied().collect::<Vec<_>>(), vec!["mail", "le mail", "zmail"]);
        assert_eq!(ranked.recent_count, 0);
    }

    #[test]
    fn remember_keeps_the_last_five_without_duplicates() {
        let recent: Vec<String> = ["a", "b", "c", "d", "e"].map(String::from).to_vec();
        assert_eq!(remember(&recent, "c", 5), ["c", "a", "b", "d", "e"]);
        assert_eq!(remember(&recent, "z", 5), ["z", "a", "b", "c", "d"]);
    }
}
