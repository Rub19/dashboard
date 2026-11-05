use serde_json::Value;
use std::collections::HashMap;

const MEDIA: &str = "https://media.valorant-api.com";

pub fn rank_name(tier: i64) -> String {
    const RANKS: [&str; 25] = ["Fer 1", "Fer 2", "Fer 3", "Bronze 1", "Bronze 2", "Bronze 3", "Argent 1", "Argent 2", "Argent 3", "Or 1", "Or 2", "Or 3", "Platine 1", "Platine 2", "Platine 3", "Diamant 1", "Diamant 2", "Diamant 3", "Ascendant 1", "Ascendant 2", "Ascendant 3", "Immortel 1", "Immortel 2", "Immortel 3", "Radiant"];
    if (3..=27).contains(&tier) { RANKS[(tier - 3) as usize].to_string() } else { "Non classé".to_string() }
}

pub fn current_tier(mmr: &Value, account_tier: Option<i64>) -> i64 {
    let tier = mmr["tier"].as_i64().or(account_tier).unwrap_or(0);
    if tier >= 27 && mmr["leaderboardRank"].as_i64().unwrap_or(0) <= 0 { 26 } else { tier }
}

pub fn tier_icon(tier: i64) -> String {
    format!("{MEDIA}/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/{tier}/largeicon.png")
}
pub fn agent_icon(id: &str) -> String {
    format!("{MEDIA}/agents/{id}/displayicon.png")
}
pub fn agent_bust(id: &str) -> String {
    format!("{MEDIA}/agents/{id}/bustportrait.png")
}
pub fn map_image(id: &str) -> String {
    format!("{MEDIA}/maps/{id}/listviewicon.png")
}
pub fn banner_image(card: &str) -> String {
    format!("{MEDIA}/playercards/{card}/wideart.png")
}
pub fn weapon_icon(id: &str) -> String {
    format!("{MEDIA}/weapons/{id}/killstreamicon.png")
}

pub fn mode_name(mode: &str) -> String {
    let key: String = mode.to_lowercase().chars().filter(|character| !matches!(character, ' ' | '_' | '-')).collect();
    match key.as_str() {
        "competitive" => "Compétition",
        "unrated" => "Non classé",
        "swiftplay" => "Vélocité",
        "spikerush" => "Spike Rush",
        "deathmatch" => "Combat à mort",
        "teamdeathmatch" => "Combat en équipe",
        "escalation" => "Escalade",
        "replication" => "Réplication",
        "premier" => "Premier",
        "custom" => "Personnalisée",
        _ => mode,
    }.to_string()
}

pub fn rank_color(tier: i64) -> &'static str {
    match tier {
        27.. => "#d4b13f",
        24..=26 => "#fd5b68",
        21..=23 => "#2dd4a0",
        18..=20 => "#c084fc",
        15..=17 => "#3fc1c9",
        12..=14 => "#e8c15a",
        9..=11 => "#c7c7cf",
        6..=8 => "#c08457",
        _ => "#8e8e93",
    }
}

pub fn split_riot_id(value: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = value.split('#').map(str::trim).collect();
    match parts[..] {
        [name, tag] if !name.is_empty() && !tag.is_empty() => Some((name.to_string(), tag.to_string())),
        _ => None,
    }
}

fn int(value: &Value) -> i64 {
    value.as_i64().or_else(|| value.as_f64().map(|number| number as i64)).unwrap_or(0)
}

fn team_of<'a>(match_data: &'a Value, team: &str) -> &'a Value {
    &match_data["teams"][team]
}

fn rounds_count(match_data: &Value) -> i64 {
    int(&team_of(match_data, "Red")["rounds"]) + int(&team_of(match_data, "Blue")["rounds"])
}

fn headshots(player: &Value) -> i64 {
    let shots = int(&player["hs"]) + int(&player["bs"]) + int(&player["ls"]);
    if shots == 0 { 0 } else { (int(&player["hs"]) as f64 / shots as f64 * 100.0).round() as i64 }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Line {
    pub acs: i64,
    pub adr: i64,
    pub hs: i64,
    pub kd: f64,
}

pub fn match_line(player: &Value, match_data: &Value) -> Line {
    let count = rounds_count(match_data).max(1) as f64;
    Line { acs: (int(&player["score"]) as f64 / count).round() as i64, adr: (int(&player["dmg"]) as f64 / count).round() as i64, hs: headshots(player), kd: int(&player["kills"]) as f64 / int(&player["deaths"]).max(1) as f64 }
}

pub struct Summary {
    pub me: Value,
    pub won: bool,
    pub draw: bool,
    pub score: (i64, i64),
    pub mvp: Option<&'static str>,
    pub line: Line,
}

fn players(match_data: &Value) -> &[Value] {
    match_data["players"].as_array().map_or(&[], Vec::as_slice)
}

pub fn find_me<'a>(match_data: &'a Value, puuid: &str) -> Option<&'a Value> {
    players(match_data).iter().find(|player| player["puuid"] == puuid)
}

pub fn match_summary(match_data: &Value, puuid: &str) -> Option<Summary> {
    let me = find_me(match_data, puuid)?;
    let red = me["team"] == "Red";
    let (mine, other) = if red { (team_of(match_data, "Red"), team_of(match_data, "Blue")) } else { (team_of(match_data, "Blue"), team_of(match_data, "Red")) };
    let mut sorted: Vec<&Value> = players(match_data).iter().collect();
    sorted.sort_by_key(|player| std::cmp::Reverse(int(&player["score"])));
    let mvp = if sorted.first().is_some_and(|player| player["puuid"] == puuid) {
        Some("match")
    } else if sorted.iter().find(|player| player["team"] == me["team"]).is_some_and(|player| player["puuid"] == puuid) {
        Some("team")
    } else {
        None
    };
    Some(Summary { me: me.clone(), won: mine["won"] == true, draw: int(&mine["rounds"]) == int(&other["rounds"]), score: (int(&mine["rounds"]), int(&other["rounds"])), mvp, line: match_line(me, match_data) })
}

#[derive(Debug, PartialEq, Default)]
pub struct Stats {
    pub count: usize,
    pub wins: usize,
    pub losses: usize,
    pub win_rate: f64,
    pub kd: f64,
    pub hs: i64,
    pub adr: i64,
}

pub fn stats_for(matches: &[Value], puuid: &str) -> Stats {
    let lines: Vec<(Summary, i64)> = matches.iter().filter_map(|item| match_summary(item, puuid).map(|summary| (summary, rounds_count(item)))).collect();
    let count = lines.len();
    let wins = lines.iter().filter(|(line, _)| line.won).count();
    let draws = lines.iter().filter(|(line, _)| line.draw).count();
    let sum = |pick: &dyn Fn(&(Summary, i64)) -> i64| lines.iter().map(pick).sum::<i64>();
    Stats {
        count,
        wins,
        losses: count - wins - draws,
        win_rate: if count > 0 { wins as f64 / count as f64 * 100.0 } else { 0.0 },
        kd: sum(&|line| int(&line.0.me["kills"])) as f64 / sum(&|line| int(&line.0.me["deaths"])).max(1) as f64,
        hs: if count > 0 { (sum(&|line| line.0.line.hs) as f64 / count as f64).round() as i64 } else { 0 },
        adr: (sum(&|line| int(&line.0.me["dmg"])) as f64 / sum(&|line| line.1).max(1) as f64).round() as i64,
    }
}

pub fn last_session(matches: &[Value]) -> Vec<Value> {
    let mut session: Vec<Value> = Vec::new();
    for item in matches {
        let Some(start) = item["startedAt"].as_str().and_then(crate::logic::time::parse_ms) else { break };
        if let Some(previous) = session.last().and_then(|last| last["startedAt"].as_str()).and_then(crate::logic::time::parse_ms) {
            if previous - start > 3.0 * 3600.0 * 1000.0 {
                break;
            }
        }
        session.push(item.clone());
    }
    session
}

pub struct RoundLine {
    pub n: i64,
    pub won: bool,
    pub kills: usize,
    pub died: bool,
    pub total: usize,
    pub end: String,
    pub plant: bool,
    pub site: String,
    pub defuse: bool,
}

pub fn rounds_for(match_data: &Value, puuid: &str) -> Vec<RoundLine> {
    let me_team = find_me(match_data, puuid).map(|me| me["team"].clone()).unwrap_or(Value::Null);
    let kills: &[Value] = match_data["kills"].as_array().map_or(&[], Vec::as_slice);
    match_data["rounds"].as_array().into_iter().flatten().map(|round| {
        let n = int(&round["n"]);
        let inside: Vec<&Value> = kills.iter().filter(|kill| int(&kill["r"]) == n).collect();
        RoundLine {
            n,
            won: round["winner"] == me_team,
            kills: inside.iter().filter(|kill| kill["k"] == puuid).count(),
            died: inside.iter().any(|kill| kill["v"] == puuid),
            total: inside.len(),
            end: round["end"].as_str().unwrap_or_default().to_string(),
            plant: round["plant"].as_str().is_some_and(|text| !text.is_empty()),
            site: round["site"].as_str().unwrap_or_default().to_string(),
            defuse: round["defuse"].as_str().is_some_and(|text| !text.is_empty()),
        }
    }).collect()
}

#[derive(Debug, PartialEq, Default)]
pub struct Analysis {
    pub kast: i64,
    pub first_kills: usize,
    pub first_deaths: usize,
    pub plants: usize,
    pub defuses: usize,
}

pub fn match_analysis(match_data: &Value, puuid: &str) -> Analysis {
    let rounds: &[Value] = match_data["rounds"].as_array().map_or(&[], Vec::as_slice);
    let kills: &[Value] = match_data["kills"].as_array().map_or(&[], Vec::as_slice);
    let team: HashMap<&str, &Value> = players(match_data).iter().filter_map(|player| player["puuid"].as_str().map(|id| (id, &player["team"]))).collect();
    let me = team.get(puuid).copied();
    let mut analysis = Analysis::default();
    let mut good = 0;
    for round in rounds {
        let mut inside: Vec<&Value> = kills.iter().filter(|kill| kill["r"] == round["n"]).collect();
        inside.sort_by_key(|kill| int(&kill["t"]));
        if inside.first().is_some_and(|kill| kill["k"] == puuid) {
            analysis.first_kills += 1;
        }
        if inside.first().is_some_and(|kill| kill["v"] == puuid) {
            analysis.first_deaths += 1;
        }
        let death = inside.iter().find(|kill| kill["v"] == puuid);
        let involved = inside.iter().any(|kill| kill["k"] == puuid || kill["a"].as_array().is_some_and(|list| list.iter().any(|item| item == puuid)));
        let traded = death.is_some_and(|death| inside.iter().any(|kill| {
            kill["v"] == death["k"] && int(&kill["t"]) >= int(&death["t"]) && int(&kill["t"]) - int(&death["t"]) <= 5000 && kill["k"].as_str().and_then(|id| team.get(id).copied()) == me
        }));
        if involved || death.is_none() || traded {
            good += 1;
        }
    }
    if !rounds.is_empty() {
        analysis.kast = (good as f64 / rounds.len() as f64 * 100.0).round() as i64;
    }
    analysis.plants = rounds.iter().filter(|round| round["plant"] == puuid).count();
    analysis.defuses = rounds.iter().filter(|round| round["defuse"] == puuid).count();
    analysis
}

pub struct TeamBoard {
    pub team: String,
    pub won: bool,
    pub rounds: i64,
    pub players: Vec<Value>,
}

pub fn scoreboard(match_data: &Value, puuid: &str) -> Vec<TeamBoard> {
    let blue_first = find_me(match_data, puuid).is_some_and(|me| me["team"] == "Blue");
    let order = if blue_first { ["Blue", "Red"] } else { ["Red", "Blue"] };
    order.iter().map(|team| {
        let mut list: Vec<Value> = players(match_data).iter().filter(|player| player["team"] == *team).cloned().collect();
        list.sort_by_key(|player| std::cmp::Reverse(int(&player["score"])));
        TeamBoard { team: team.to_string(), won: team_of(match_data, team)["won"] == true, rounds: int(&team_of(match_data, team)["rounds"]), players: list }
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample() -> Value {
        json!({
            "id": "m", "startedAt": "2026-11-03T10:00:00Z",
            "teams": { "Red": { "won": true, "rounds": 13 }, "Blue": { "won": false, "rounds": 7 } },
            "players": [
                { "puuid": "me", "team": "Red", "score": 6000, "kills": 20, "deaths": 10, "assists": 2, "hs": 5, "bs": 15, "ls": 0, "dmg": 3000 },
                { "puuid": "ally", "team": "Red", "score": 2000, "kills": 5, "deaths": 15, "assists": 2, "hs": 0, "bs": 0, "ls": 0, "dmg": 900 },
                { "puuid": "foe", "team": "Blue", "score": 5000, "kills": 15, "deaths": 15, "assists": 0, "hs": 0, "bs": 0, "ls": 0, "dmg": 2000 }
            ],
            "rounds": [
                { "n": 1, "winner": "Red", "plant": "me", "defuse": "" },
                { "n": 2, "winner": "Blue", "plant": "", "defuse": "foe" }
            ],
            "kills": [
                { "r": 1, "t": 1000, "k": "me", "v": "foe", "w": "", "a": [] },
                { "r": 2, "t": 1000, "k": "foe", "v": "me", "w": "", "a": [] },
                { "r": 2, "t": 3000, "k": "ally", "v": "foe", "w": "", "a": [] }
            ]
        })
    }

    #[test]
    fn rank_names_and_radiant_needs_a_place() {
        assert_eq!(rank_name(27), "Radiant");
        assert_eq!(rank_name(0), "Non classé");
        assert_eq!(current_tier(&json!({ "tier": 27 }), None), 26);
        assert_eq!(current_tier(&json!({ "tier": 27, "leaderboardRank": 12 }), None), 27);
        assert_eq!(current_tier(&Value::Null, Some(10)), 10);
    }

    #[test]
    fn riot_ids_split_cleanly() {
        assert_eq!(split_riot_id("Nom # EUW"), Some(("Nom".into(), "EUW".into())));
        assert_eq!(split_riot_id("Nom"), None);
        assert_eq!(split_riot_id("a#b#c"), None);
    }

    #[test]
    fn summary_computes_the_line_and_mvp() {
        let summary = match_summary(&sample(), "me").unwrap();
        assert!(summary.won);
        assert_eq!(summary.score, (13, 7));
        assert_eq!(summary.mvp, Some("match"));
        assert_eq!(summary.line, Line { acs: 300, adr: 150, hs: 25, kd: 2.0 });
        assert_eq!(match_summary(&sample(), "foe").unwrap().mvp, Some("team"));
        assert!(match_summary(&sample(), "nope").is_none());
    }

    #[test]
    fn stats_add_up() {
        let stats = stats_for(&[sample(), sample()], "me");
        assert_eq!((stats.count, stats.wins, stats.losses), (2, 2, 0));
        assert_eq!(stats.win_rate, 100.0);
        assert_eq!(stats.kd, 2.0);
        assert_eq!(stats.adr, 150);
    }

    #[test]
    fn a_session_stops_at_a_three_hour_gap() {
        let matches = [json!({ "startedAt": "2026-11-03T10:00:00Z" }), json!({ "startedAt": "2026-11-03T08:00:00Z" }), json!({ "startedAt": "2026-11-03T02:00:00Z" })];
        assert_eq!(last_session(&matches).len(), 2);
    }

    #[test]
    fn rounds_and_analysis_read_the_kills() {
        let rounds = rounds_for(&sample(), "me");
        assert!(rounds[0].won && rounds[1].died);
        assert_eq!(rounds[0].kills, 1);
        let analysis = match_analysis(&sample(), "me");
        assert_eq!(analysis, Analysis { kast: 100, first_kills: 1, first_deaths: 1, plants: 1, defuses: 0 });
    }

    #[test]
    fn my_team_comes_first_on_the_board() {
        assert_eq!(scoreboard(&sample(), "foe")[0].team, "Blue");
        assert_eq!(scoreboard(&sample(), "me")[0].players[0]["puuid"], "me");
    }
}
