use serde_json::{json, Value};

pub struct Rank {
    pub name: String,
    pub lp: i64,
    pub color: &'static str,
    pub emblem: String,
}

fn parts(text: &str) -> Option<(String, Option<String>, Option<i64>)> {
    let text = text.trim();
    let tier: String = text.chars().take_while(char::is_ascii_uppercase).collect();
    if tier.is_empty() {
        return None;
    }
    let rest = text[tier.len()..].trim_start();
    let division: String = rest.chars().take_while(|character| matches!(character, 'I' | 'V')).collect();
    let rest = rest[division.len()..].trim_start();
    let lp = rest.strip_prefix('(').and_then(|inner| inner.split_whitespace().next()).and_then(|number| number.parse().ok());
    Some((tier, (!division.is_empty()).then_some(division), lp))
}

fn tier_info(tier: &str) -> Option<(&'static str, &'static str, &'static str)> {
    Some(match tier {
        "IRON" => ("Fer", "Iron", "#8d7f78"),
        "BRONZE" => ("Bronze", "Bronze", "#b17a52"),
        "SILVER" => ("Argent", "Silver", "#a6b5c2"),
        "GOLD" => ("Or", "Gold", "#e3b341"),
        "PLATINUM" => ("Platine", "Platinum", "#3fb8a9"),
        "EMERALD" => ("Émeraude", "Emerald", "#2ecc71"),
        "DIAMOND" => ("Diamant", "Diamond", "#6fa8ff"),
        "MASTER" => ("Maître", "Master", "#b266ff"),
        "GRANDMASTER" => ("Grand Maître", "Grandmaster", "#ff5a5f"),
        "CHALLENGER" => ("Challenger", "Challenger", "#f4d35e"),
        _ => return None,
    })
}

pub fn lol_rank(text: &str, fr: bool) -> Rank {
    let found = parts(text).and_then(|(tier, division, lp)| tier_info(&tier).map(|info| (tier, division, lp, info)));
    let Some((tier, division, lp, info)) = found else {
        return Rank { name: if fr { "Non classé" } else { "Unranked" }.to_string(), lp: 0, color: "", emblem: String::new() };
    };
    let label = if fr { info.0 } else { info.1 };
    Rank {
        name: division.map_or(label.to_string(), |division| format!("{label} {division}")),
        lp: lp.unwrap_or(0),
        color: info.2,
        emblem: format!("https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/{}.svg", tier.to_lowercase()),
    }
}

const LADDER: [&str; 10] = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

pub fn lp_score(text: &str) -> Option<i64> {
    let (tier, division, lp) = parts(text)?;
    let index = LADDER.iter().position(|name| *name == tier)? as i64;
    let step = match division.as_deref() {
        Some("III") => 1,
        Some("II") => 2,
        Some("I") => 3,
        _ => 0,
    };
    Some(index * 400 + step * 100 + lp.unwrap_or(0))
}

pub fn clean_lp_points(points: &[Value]) -> Vec<Value> {
    let score = |point: &Value| point["score"].as_i64().unwrap_or(0);
    let kept: Vec<&Value> = points.iter().enumerate().filter(|(at, point)| {
        let before = at.checked_sub(1).and_then(|index| points.get(index));
        let after = points.get(at + 1);
        !matches!((before, after), (Some(before), Some(after)) if score(before) == score(after) && (score(point) - score(before)).abs() >= 100)
    }).map(|(_, point)| point).collect();
    let mut out: Vec<Value> = Vec::new();
    for point in kept {
        if out.last().map(score) != Some(score(point)) {
            out.push(point.clone());
        }
    }
    out
}

pub fn add_lp_point(points: &[Value], rank: &str, at: f64) -> Vec<Value> {
    let Some(score) = lp_score(rank) else { return points.to_vec() };
    if points.last().and_then(|point| point["score"].as_i64()) == Some(score) {
        return points.to_vec();
    }
    let mut next = points.to_vec();
    next.push(json!({ "at": at, "rank": rank, "score": score }));
    let excess = next.len().saturating_sub(200);
    next.drain(..excess);
    next
}

pub fn keep_known_matches(fresh: Option<Vec<Value>>, known: Option<Vec<Value>>) -> (Vec<Value>, bool) {
    if let Some(list) = &fresh {
        if !list.is_empty() {
            return (list.clone(), false);
        }
    }
    if let Some(list) = known.filter(|list| !list.is_empty()) {
        return (list, true);
    }
    let stale = fresh.is_none();
    (fresh.unwrap_or_default(), stale)
}

pub fn live_mode(mode: &str, queue: i64, fr: bool) -> String {
    let found = match queue {
        420 => Some(("Classée Solo", "Ranked Solo")),
        440 => Some(("Classée Flex", "Ranked Flex")),
        400 | 430 => Some(("Normale", "Normal")),
        490 => Some(("Partie rapide", "Quickplay")),
        450 => Some(("ARAM", "ARAM")),
        700 => Some(("Clash", "Clash")),
        900 => Some(("ARURF", "ARURF")),
        1700 => Some(("Arena", "Arena")),
        _ => match mode {
            "CLASSIC" => Some(("Faille de l'invocateur", "Summoner's Rift")),
            "ARAM" => Some(("ARAM", "ARAM")),
            "CHERRY" => Some(("Arena", "Arena")),
            _ => None,
        },
    };
    found.map_or(mode.to_string(), |(french, english)| if fr { french } else { english }.to_string())
}

pub fn mode_label(mode: &str, fr: bool) -> String {
    if !fr {
        return mode.to_string();
    }
    match mode {
        "Normal Draft Pick" => "Normale",
        "Ranked Solo" => "Classée Solo",
        "Ranked Flex" => "Classée Flex",
        "Custom" => "Personnalisée",
        other => other,
    }.to_string()
}

pub fn champion_splash(image: &str) -> String {
    image.rsplit_once("/champion/").and_then(|(_, tail)| tail.strip_suffix(".png")).filter(|name| !name.is_empty() && !name.contains(['/', '.'])).map_or(String::new(), |name| format!("https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{name}_0.jpg"))
}

pub struct Line {
    pub me: Option<Value>,
    pub won: bool,
    pub remake: bool,
    pub kills: f64,
    pub deaths: f64,
    pub assists: f64,
    pub kda: f64,
    pub cs: f64,
    pub cs_per_min: f64,
    pub damage_per_min: f64,
    pub items: Vec<Value>,
    pub score: (i64, i64),
    pub minutes: i64,
}

pub fn lol_line(item: &Value) -> Line {
    let me = item["scoreboard"]["players"].as_array().and_then(|list| list.iter().find(|player| player["isMe"] == true)).cloned();
    let segment = &item["segments"][0]["stats"];
    let value = |key: &str| me.as_ref().and_then(|me| me["stats"][key].as_f64()).or_else(|| segment[key]["value"].as_f64()).unwrap_or(0.0);
    let (kills, deaths, assists) = (value("kills"), value("deaths"), value("assists"));
    let duration = item["scoreboard"]["duration"].as_f64();
    let result = item["metadata"]["result"].as_str();
    let remake = result == Some("Remake") || duration.is_some_and(|length| length > 0.0 && length < 300.0);
    let items = me.as_ref().and_then(|me| me["items"].as_array()).map_or(Vec::new(), |list| list.iter().filter(|entry| entry["image"].as_str().is_some_and(|text| !text.is_empty())).cloned().collect());
    Line {
        won: !remake && result == Some("Victory"),
        remake,
        kills,
        deaths,
        assists,
        kda: (kills + assists) / deaths.max(1.0),
        cs: value("cs"),
        cs_per_min: value("csPerMin"),
        damage_per_min: value("damagePerMin").round(),
        items,
        score: (item["metadata"]["score"]["team"].as_i64().unwrap_or(0), item["metadata"]["score"]["opponent"].as_i64().unwrap_or(0)),
        minutes: (duration.unwrap_or(0.0) / 60.0).round() as i64,
        me,
    }
}

#[derive(Debug, Default, PartialEq)]
pub struct Stats {
    pub count: usize,
    pub wins: usize,
    pub losses: usize,
    pub win_rate: f64,
    pub kda: f64,
    pub cs_per_min: f64,
    pub damage_per_min: f64,
}

fn stats_of(lines: &[Line]) -> Stats {
    let count = lines.len();
    let wins = lines.iter().filter(|line| line.won).count();
    let average = |pick: &dyn Fn(&Line) -> f64| if count > 0 { lines.iter().map(pick).sum::<f64>() / count as f64 } else { 0.0 };
    Stats {
        count,
        wins,
        losses: count - wins,
        win_rate: if count > 0 { wins as f64 / count as f64 * 100.0 } else { 0.0 },
        kda: (lines.iter().map(|line| line.kills).sum::<f64>() + lines.iter().map(|line| line.assists).sum::<f64>()) / lines.iter().map(|line| line.deaths).sum::<f64>().max(1.0),
        cs_per_min: average(&|line| line.cs_per_min),
        damage_per_min: average(&|line| line.damage_per_min).round(),
    }
}

pub fn lol_stats(matches: &[Value]) -> Stats {
    let lines: Vec<Line> = matches.iter().filter(|item| item["metadata"]["modeName"] != "Custom").map(lol_line).filter(|line| !line.remake).collect();
    stats_of(&lines)
}

fn start_of(item: &Value) -> f64 {
    item["metadata"]["timestamp"].as_str().and_then(crate::logic::time::parse_ms).unwrap_or(0.0)
}

pub fn lol_session(matches: &[Value]) -> Vec<Value> {
    let mut sorted = matches.to_vec();
    sorted.sort_by(|left, right| start_of(right).total_cmp(&start_of(left)));
    let mut session: Vec<Value> = Vec::new();
    for item in sorted {
        if session.last().is_some_and(|previous| start_of(previous) - start_of(&item) > 7_200_000.0) {
            break;
        }
        session.push(item);
    }
    session
}

pub struct Champion {
    pub name: String,
    pub image: String,
    pub games: usize,
    pub win_rate: i64,
    pub kda: f64,
}

pub fn top_champions(matches: &[Value], limit: usize) -> Vec<Champion> {
    let mut groups: Vec<(String, Vec<Value>)> = Vec::new();
    for item in matches {
        let Some(name) = item["metadata"]["agentName"].as_str().filter(|name| !name.is_empty()) else { continue };
        match groups.iter_mut().find(|(known, _)| known == name) {
            Some((_, rows)) => rows.push(item.clone()),
            None => groups.push((name.to_string(), vec![item.clone()])),
        }
    }
    let mut out: Vec<Champion> = groups.into_iter().map(|(name, rows)| {
        let stats = lol_stats(&rows);
        let stats = if stats.count == 0 { stats_of(&rows.iter().map(lol_line).filter(|line| !line.remake).collect::<Vec<_>>()) } else { stats };
        Champion { name, image: rows[0]["metadata"]["agentImageUrl"].as_str().unwrap_or_default().to_string(), games: rows.len(), win_rate: stats.win_rate.round() as i64, kda: stats.kda }
    }).collect();
    out.sort_by(|left, right| right.games.cmp(&left.games).then(right.win_rate.cmp(&left.win_rate)));
    out.truncate(limit);
    out
}

pub struct Team {
    pub team: String,
    pub players: Vec<Value>,
    pub won: bool,
    pub kills: i64,
}

pub fn lol_teams(item: &Value) -> Vec<Team> {
    let players: &[Value] = item["scoreboard"]["players"].as_array().map_or(&[], Vec::as_slice);
    let team_of = |player: &Value| player["team"].as_str().unwrap_or_default().to_string();
    let mine = players.iter().find(|player| player["isMe"] == true).map(team_of);
    let mut names: Vec<String> = Vec::new();
    for player in players {
        let name = team_of(player);
        if !names.contains(&name) {
            names.push(name);
        }
    }
    names.sort_by_key(|name| Some(name) != mine.as_ref());
    names.into_iter().map(|team| {
        let rows: Vec<Value> = players.iter().filter(|player| team_of(player) == team).cloned().collect();
        Team { won: rows.first().is_some_and(|row| row["win"] == true), kills: rows.iter().map(|row| row["stats"]["kills"].as_i64().unwrap_or(0)).sum(), players: rows, team }
    }).collect()
}

pub fn parse_assets(summoner: &Value, runes: &Value, champions: &Value) -> Value {
    let dragon = "https://ddragon.leagueoflegends.com/cdn";
    let table = |file: &Value, folder: &str| -> serde_json::Map<String, Value> {
        let version = file["version"].as_str().unwrap_or_default();
        file["data"].as_object().into_iter().flatten().filter_map(|(_, item)| {
            let (key, image) = (item["key"].as_str()?, item["image"]["full"].as_str()?);
            Some((key.to_string(), json!({ "name": item["name"], "image": format!("{dragon}/{version}/img/{folder}/{image}") })))
        }).collect()
    };
    let mut rune_table = serde_json::Map::new();
    let mut add = |rune: &Value| {
        if let (Some(id), Some(icon)) = (rune["id"].as_i64(), rune["icon"].as_str()) {
            rune_table.insert(id.to_string(), json!({ "name": rune["name"], "image": format!("{dragon}/img/{icon}") }));
        }
    };
    for path in runes.as_array().into_iter().flatten() {
        add(path);
        for slot in path["slots"].as_array().into_iter().flatten() {
            for rune in slot["runes"].as_array().into_iter().flatten() {
                add(rune);
            }
        }
    }
    json!({ "spells": table(summoner, "spell"), "runes": rune_table, "champions": table(champions, "champion") })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ranks_read_with_and_without_division() {
        let rank = lol_rank("GOLD II (45 LP)", true);
        assert_eq!((rank.name.as_str(), rank.lp), ("Or II", 45));
        assert!(rank.emblem.ends_with("gold.svg"));
        assert_eq!(lol_rank("MASTER (120 LP)", false).name, "Master");
        assert_eq!(lol_rank("", true).name, "Non classé");
        assert_eq!(lol_rank("WOOD", false).name, "Unranked");
    }

    #[test]
    fn lp_scores_order_the_ladder() {
        assert_eq!(lp_score("IRON IV (0 LP)"), Some(0));
        assert_eq!(lp_score("BRONZE I (50 LP)"), Some(400 + 300 + 50));
        assert_eq!(lp_score("nope"), None);
    }

    #[test]
    fn lp_spikes_and_duplicates_are_removed() {
        let points: Vec<Value> = [100, 900, 100, 100, 150].iter().map(|score| json!({ "score": score })).collect();
        let cleaned: Vec<i64> = clean_lp_points(&points).iter().map(|point| point["score"].as_i64().unwrap()).collect();
        assert_eq!(cleaned, [100, 150]);
    }

    #[test]
    fn a_new_lp_point_is_added_once() {
        let once = add_lp_point(&[], "GOLD I (10 LP)", 1.0);
        assert_eq!(once.len(), 1);
        assert_eq!(add_lp_point(&once, "GOLD I (10 LP)", 2.0).len(), 1);
        assert_eq!(add_lp_point(&once, "pas un rang", 2.0).len(), 1);
    }

    #[test]
    fn known_matches_stay_when_the_service_fails() {
        let known = Some(vec![json!(1)]);
        assert_eq!(keep_known_matches(None, known.clone()), (vec![json!(1)], true));
        assert_eq!(keep_known_matches(Some(vec![json!(2)]), known), (vec![json!(2)], false));
        assert_eq!(keep_known_matches(None, None), (vec![], true));
        assert_eq!(keep_known_matches(Some(vec![]), None), (vec![], false));
    }

    #[test]
    fn remakes_are_excluded_from_stats() {
        let win = json!({ "metadata": { "result": "Victory" }, "scoreboard": { "duration": 1800, "players": [{ "isMe": true, "stats": { "kills": 5, "deaths": 2, "assists": 3 } }] } });
        let remake = json!({ "metadata": { "result": "Defeat" }, "scoreboard": { "duration": 120, "players": [{ "isMe": true, "stats": { "kills": 9 } }] } });
        assert!(lol_line(&remake).remake);
        let stats = lol_stats(&[win, remake]);
        assert_eq!((stats.count, stats.wins), (1, 1));
        assert_eq!(stats.kda, 4.0);
    }

    #[test]
    fn splash_comes_from_the_champion_image() {
        assert_eq!(champion_splash("https://x/img/champion/Ahri.png"), "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg");
        assert_eq!(champion_splash("https://x/autre.png"), "");
    }

    #[test]
    fn my_team_is_first() {
        let item = json!({ "scoreboard": { "players": [{ "team": "A", "win": false }, { "team": "B", "isMe": true, "win": true, "stats": { "kills": 4 } }] } });
        let teams = lol_teams(&item);
        assert_eq!(teams[0].team, "B");
        assert!(teams[0].won);
        assert_eq!(teams[0].kills, 4);
    }

    #[test]
    fn assets_build_full_urls() {
        let assets = parse_assets(&json!({ "version": "1", "data": { "x": { "key": "4", "name": "Flash", "image": { "full": "f.png" } } } }), &json!([{ "id": 8000, "icon": "p.png", "slots": [{ "runes": [{ "id": 8005, "name": "R", "icon": "r.png" }] }] }]), &json!({}));
        assert_eq!(assets["spells"]["4"]["image"], "https://ddragon.leagueoflegends.com/cdn/1/img/spell/f.png");
        assert_eq!(assets["runes"]["8005"]["image"], "https://ddragon.leagueoflegends.com/cdn/img/r.png");
    }

    #[test]
    fn modes_translate() {
        assert_eq!(live_mode("CLASSIC", 420, true), "Classée Solo");
        assert_eq!(live_mode("CHERRY", 0, false), "Arena");
        assert_eq!(live_mode("X", 0, true), "X");
        assert_eq!(mode_label("Custom", true), "Personnalisée");
    }
}
