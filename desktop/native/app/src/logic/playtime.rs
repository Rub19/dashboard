use std::collections::BTreeMap;

pub type Log = BTreeMap<String, BTreeMap<String, u64>>;

pub const GAMES: [(&str, &str, &str); 3] = [("valorant", "VALORANT", "VALORANT-Win64-Shipping.exe"), ("lol", "League of Legends", "League of Legends.exe"), ("minecraft", "Minecraft (Java)", "javaw.exe")];

pub fn add(log: &mut Log, day: &str, game: &str, seconds: u64) {
    *log.entry(day.to_string()).or_default().entry(game.to_string()).or_default() += seconds;
    while log.len() > 60 {
        let oldest = log.keys().next().cloned().unwrap_or_default();
        log.remove(&oldest);
    }
}

pub fn week(log: &Log, days: &[String]) -> Vec<(&'static str, u64)> {
    GAMES
        .iter()
        .map(|(id, name, _)| (*name, days.iter().filter_map(|day| log.get(day).and_then(|games| games.get(*id))).sum::<u64>()))
        .filter(|(_, seconds)| *seconds > 0)
        .collect()
}

pub fn duration(seconds: u64) -> String {
    let minutes = seconds / 60;
    if minutes < 60 { format!("{minutes} min") } else { format!("{} h {:02}", minutes / 60, minutes % 60) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn play_time_sums_over_the_week() {
        let mut log = Log::new();
        add(&mut log, "2026-11-10", "valorant", 3600);
        add(&mut log, "2026-11-11", "valorant", 1200);
        add(&mut log, "2026-11-11", "minecraft", 60);
        add(&mut log, "2026-10-01", "lol", 999);
        let days = vec!["2026-11-10".to_string(), "2026-11-11".to_string()];
        assert_eq!(week(&log, &days), vec![("VALORANT", 4800), ("Minecraft (Java)", 60)]);
        assert_eq!(duration(4800), "1 h 20");
        assert_eq!(duration(60), "1 min");
        for n in 0..70 {
            add(&mut log, &format!("2027-01-{n:03}"), "lol", 1);
        }
        assert_eq!(log.len(), 60);
    }
}
