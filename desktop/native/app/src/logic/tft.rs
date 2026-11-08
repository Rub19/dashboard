use serde_json::Value;

#[derive(Debug, PartialEq)]
pub struct Summary {
    pub games: usize,
    pub average: f64,
    pub top_four: usize,
    pub wins: usize,
    pub top_four_rate: i64,
}

pub fn summary(matches: &[Value]) -> Summary {
    let placements: Vec<i64> = matches.iter().filter_map(|item| item["me"]["placement"].as_i64()).filter(|place| *place > 0).collect();
    let games = placements.len();
    let top_four = placements.iter().filter(|place| **place <= 4).count();
    Summary {
        games,
        average: if games > 0 { placements.iter().sum::<i64>() as f64 / games as f64 } else { 0.0 },
        top_four,
        wins: placements.iter().filter(|place| **place == 1).count(),
        top_four_rate: if games > 0 { (top_four as f64 / games as f64 * 100.0).round() as i64 } else { 0 },
    }
}

pub fn placement_tone(placement: Option<i64>) -> &'static str {
    match placement {
        Some(1) => "first",
        Some(place) if (2..=4).contains(&place) => "top",
        Some(place) if place > 4 => "out",
        _ => "unknown",
    }
}

pub fn duration(seconds: Option<f64>) -> String {
    match seconds.filter(|seconds| *seconds > 0.0) {
        Some(seconds) => format!("{} min {} s", (seconds / 60.0).floor() as i64, (seconds % 60.0).round() as i64),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn the_summary_uses_only_real_placements() {
        let matches = [json!({ "me": { "placement": 1 } }), json!({ "me": { "placement": 4 } }), json!({ "me": { "placement": 7 } }), json!({ "me": null })];
        assert_eq!(summary(&matches), Summary { games: 3, average: 4.0, top_four: 2, wins: 1, top_four_rate: 67 });
        assert_eq!(summary(&[]).top_four_rate, 0);
    }

    #[test]
    fn placement_tones_separate_wins_top_four_and_eliminations() {
        assert_eq!(placement_tone(Some(1)), "first");
        assert_eq!(placement_tone(Some(3)), "top");
        assert_eq!(placement_tone(Some(8)), "out");
        assert_eq!(placement_tone(None), "unknown");
    }

    #[test]
    fn durations_stay_compact() {
        assert_eq!(duration(Some(1855.0)), "30 min 55 s");
        assert_eq!(duration(Some(0.0)), "");
        assert_eq!(duration(None), "");
    }
}
