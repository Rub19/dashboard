pub const MAIN_PAGES: [&str; 11] = ["home", "modules", "productivity", "files", "mail", "tracker", "games", "discord", "brain", "team", "insights"];
pub const FOOT_PAGES: [&str; 1] = ["settings"];
pub const PAGE_ORDER: [&str; 9] = ["home", "modules", "productivity", "files", "mail", "team", "tracker", "games", "discord"];
pub const GROUPS: [(Option<(&str, &str)>, &[&str]); 4] = [
    (None, &["home", "modules"]),
    (Some(("Travail", "Work")), &["productivity", "files", "mail", "team"]),
    (Some(("Jeux", "Gaming")), &["tracker", "games", "discord"]),
    (Some(("Intelligence", "Intelligence")), &["brain", "insights"]),
];

const MACRO_PAGES: [(&str, &str, &str); 13] = [
    ("/", "Accueil", "home"),
    ("/tasks", "Tâches", "productivity"),
    ("/calendar", "Calendrier", "productivity"),
    ("/notes", "Notes", "productivity"),
    ("/files", "Fichiers", "files"),
    ("/mail", "Mail", "mail"),
    ("/team", "Équipe", "team"),
    ("/tracker", "E:VAL", "tracker"),
    ("/games", "E:LOL", "games"),
    ("/discord", "Discord", "discord"),
    ("/brain", "Brain", "brain"),
    ("/activity", "Analyses", "insights"),
    ("/settings", "Réglages", "settings"),
];

pub fn page_exists(value: &str) -> bool {
    MAIN_PAGES.contains(&value) || FOOT_PAGES.contains(&value)
}

pub fn page_for_href(href: &str) -> Option<&'static str> {
    MACRO_PAGES.iter().find(|(path, _, _)| *path == href).map(|(_, _, page)| *page)
}

pub fn macro_targets() -> Vec<(&'static str, &'static str)> {
    MACRO_PAGES.iter().map(|(path, label, _)| (*path, *label)).collect()
}

pub fn page_tint(page: &str) -> &'static str {
    match page {
        "home" => "#5aa9ff",
        "modules" => "#a78bfa",
        "productivity" => "#2fd08a",
        "files" => "#f0a92b",
        "mail" => "#35bfe0",
        "tracker" => "#ff4655",
        "games" => "#c89b3c",
        "discord" => "#7c86ff",
        "brain" => "#c084fc",
        "team" => "#2dd4a0",
        "insights" => "#fb923c",
        _ => "#94a3b8",
    }
}

pub fn page_icon(page: &str) -> &'static str {
    match page {
        "home" => "house",
        "modules" => "layout-grid",
        "productivity" => "list-checks",
        "files" => "folder",
        "mail" => "mail",
        "tracker" => "valorant",
        "games" => "league",
        "discord" => "messages-square",
        "brain" => "brain-circuit",
        "team" => "users",
        "insights" => "activity",
        _ => "settings",
    }
}

pub fn shortcut(page: &str) -> Option<String> {
    if page == "settings" {
        return Some("Ctrl+,".into());
    }
    PAGE_ORDER.iter().position(|item| *item == page).map(|at| format!("Ctrl+{}", at + 1))
}

pub fn direction(from: &str, to: &str) -> i32 {
    let order = |page: &str| MAIN_PAGES.iter().chain(FOOT_PAGES.iter()).position(|item| *item == page).unwrap_or(0);
    if order(to) >= order(from) { 1 } else { -1 }
}

#[derive(Default)]
pub struct History {
    pub back: Vec<String>,
    pub forward: Vec<String>,
}

impl History {
    pub fn visit(&mut self, from: &str, to: &str) {
        if from != to {
            self.back.push(from.into());
            let excess = self.back.len().saturating_sub(21);
            self.back.drain(..excess);
            self.forward.clear();
        }
    }

    pub fn go_back(&mut self, current: &str) -> Option<String> {
        let previous = self.back.pop()?;
        self.forward.insert(0, current.into());
        self.forward.truncate(21);
        Some(previous)
    }

    pub fn go_forward(&mut self, current: &str) -> Option<String> {
        if self.forward.is_empty() {
            return None;
        }
        let next = self.forward.remove(0);
        self.back.push(current.into());
        let excess = self.back.len().saturating_sub(21);
        self.back.drain(..excess);
        Some(next)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_pages_exist_and_unknown_ones_do_not() {
        assert!(page_exists("home"));
        assert!(page_exists("settings"));
        assert!(!page_exists("plugins"));
    }

    #[test]
    fn macro_targets_lead_to_real_pages() {
        for (href, _) in macro_targets() {
            assert!(page_exists(page_for_href(href).unwrap()));
        }
        assert_eq!(page_for_href("/activity"), Some("insights"));
        assert_eq!(page_for_href("/nope"), None);
    }

    #[test]
    fn back_then_forward_returns_to_the_same_page() {
        let mut history = History::default();
        history.visit("home", "mail");
        history.visit("mail", "team");
        assert_eq!(history.go_back("team").as_deref(), Some("mail"));
        assert_eq!(history.go_forward("mail").as_deref(), Some("team"));
        history.visit("team", "home");
        assert!(history.go_forward("home").is_none());
    }

    #[test]
    fn history_stays_bounded() {
        let mut history = History::default();
        for at in 0..60 {
            history.visit(&format!("p{at}"), &format!("p{}", at + 1));
        }
        assert_eq!(history.back.len(), 21);
    }

    #[test]
    fn shortcuts_follow_the_order() {
        assert_eq!(shortcut("home").as_deref(), Some("Ctrl+1"));
        assert_eq!(shortcut("discord").as_deref(), Some("Ctrl+9"));
        assert_eq!(shortcut("settings").as_deref(), Some("Ctrl+,"));
        assert_eq!(shortcut("brain"), None);
    }
}
