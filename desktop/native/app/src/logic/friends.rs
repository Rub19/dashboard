use serde_json::Value;

pub fn text<'a>(friend: &'a Value, key: &str) -> &'a str {
    friend[key].as_str().unwrap_or_default()
}

fn number(friend: &Value, key: &str) -> i64 {
    friend[key].as_i64().unwrap_or(0)
}

pub fn in_game(friend: &Value) -> bool {
    matches!(text(friend, "state"), "INGAME" | "PREGAME") || friend["playing"] == true
}

fn by_name(left: &Value, right: &Value) -> std::cmp::Ordering {
    text(left, "name").to_lowercase().cmp(&text(right, "name").to_lowercase())
}

fn by_activity(left: &Value, right: &Value) -> std::cmp::Ordering {
    in_game(right).cmp(&in_game(left)).then_with(|| by_name(left, right))
}

pub fn last_online_time(raw: &str) -> f64 {
    let value = raw.trim();
    if value.is_empty() {
        return 0.0;
    }
    if value.bytes().all(|byte| byte.is_ascii_digit()) {
        let number: f64 = value.parse().unwrap_or(0.0);
        return if number > 10_000_000_000.0 { number } else { number * 1000.0 };
    }
    let normalized = if value.len() > 10 && value.as_bytes()[10] == b' ' && value.as_bytes()[4] == b'-' { format!("{}Z", value.replacen(' ', "T", 1)) } else { value.to_string() };
    crate::logic::time::parse_ms(&normalized).unwrap_or(0.0)
}

pub struct Party {
    pub id: String,
    pub size: i64,
    pub max: i64,
    pub members: Vec<Value>,
    pub others: i64,
}

pub struct Board {
    pub parties: Vec<Party>,
    pub valorant: Vec<Value>,
    pub platforms: Vec<(String, Vec<Value>)>,
    pub offline: Vec<Value>,
}

const PLATFORM_ORDER: [&str; 5] = ["League of Legends", "Teamfight Tactics", "Legends of Runeterra", "2XKO", "Riot Client"];

fn platform(product: &str) -> &'static str {
    match product {
        "league_of_legends" => "League of Legends",
        "tft" => "Teamfight Tactics",
        "bacon" => "Legends of Runeterra",
        "lion" => "2XKO",
        _ => "Riot Client",
    }
}

pub fn board_of(friends: &[Value], query: &str) -> Board {
    let needle = query.trim().to_lowercase();
    let mut parties: Vec<(String, Vec<Value>)> = Vec::new();
    let mut valorant = Vec::new();
    let mut others: Vec<(String, Vec<Value>)> = Vec::new();
    let mut offline = Vec::new();
    for friend in friends.iter().filter(|friend| needle.is_empty() || format!("{}#{}", text(friend, "name"), text(friend, "tag")).to_lowercase().contains(&needle)) {
        if friend["online"] != true {
            offline.push(friend.clone());
        } else if text(friend, "product") == "valorant" {
            let party = text(friend, "partyId");
            if !party.is_empty() && number(friend, "partySize") > 1 {
                match parties.iter_mut().find(|(id, _)| id == party) {
                    Some((_, members)) => members.push(friend.clone()),
                    None => parties.push((party.to_string(), vec![friend.clone()])),
                }
            } else {
                valorant.push(friend.clone());
            }
        } else {
            let name = platform(text(friend, "product"));
            match others.iter_mut().find(|(known, _)| known == name) {
                Some((_, rows)) => rows.push(friend.clone()),
                None => others.push((name.to_string(), vec![friend.clone()])),
            }
        }
    }
    let mut parties: Vec<Party> = parties.into_iter().map(|(id, mut members)| {
        let size = members.iter().map(|member| number(member, "partySize")).max().unwrap_or(0);
        let max = members.iter().map(|member| number(member, "partyMax")).max().unwrap_or(0).max(size);
        members.sort_by(by_activity);
        let others = (size - members.len() as i64).max(0);
        Party { id, size, max, members, others }
    }).collect();
    parties.sort_by(|left, right| by_activity(&left.members[0], &right.members[0]));
    valorant.sort_by(by_activity);
    for (_, rows) in &mut others {
        rows.sort_by(by_activity);
    }
    others.sort_by_key(|(name, _)| PLATFORM_ORDER.iter().position(|item| item == name).unwrap_or(9));
    offline.sort_by(|left, right| last_online_time(text(right, "lastOnline")).total_cmp(&last_online_time(text(left, "lastOnline"))).then_with(|| by_name(left, right)));
    Board { parties, valorant, platforms: others, offline }
}

pub fn presence_kind(friend: &Value) -> &'static str {
    if friend["online"] != true {
        "offline"
    } else if in_game(friend) || text(friend, "show") == "dnd" {
        "busy"
    } else if friend["idle"] == true || text(friend, "show") == "away" {
        "away"
    } else {
        "online"
    }
}

fn plural(count: i64, word: &str) -> String {
    format!("{count} {word}{}", if count > 1 { "s" } else { "" })
}

pub fn last_seen_text(raw: &str, now: f64) -> String {
    let at = last_online_time(raw);
    if at == 0.0 {
        return "Hors ligne".into();
    }
    let minutes = ((now - at) / 60000.0).floor() as i64;
    if minutes < 1 {
        return "Dernière connexion à l'instant".into();
    }
    if minutes < 60 {
        return format!("Dernière connexion il y a {}", plural(minutes, "minute"));
    }
    let hours = minutes / 60;
    if hours < 24 {
        let rest = if minutes % 60 > 0 { format!(" et {}", plural(minutes % 60, "minute")) } else { String::new() };
        return format!("Dernière connexion il y a {}{rest}", plural(hours, "heure"));
    }
    let days = hours / 24;
    if days < 30 {
        return format!("Dernière connexion il y a {}", plural(days, "jour"));
    }
    let date = crate::logic::time::from_ms(at);
    format!("Dernière connexion le {}", crate::logic::time::short_date(&date, true))
}

pub fn card_image(card: &str) -> String {
    if card.is_empty() { String::new() } else { format!("https://media.valorant-api.com/playercards/{card}/smallart.png") }
}

pub fn friend_portrait(friend: &Value, card: Option<&str>, icon: Option<&str>, lol: bool) -> String {
    let card = card_image(card.filter(|card| !card.is_empty()).unwrap_or(text(friend, "card")));
    let icon = Some(text(friend, "icon")).filter(|icon| !icon.is_empty()).or(icon).unwrap_or_default().to_string();
    if lol {
        if icon.is_empty() { card } else { icon }
    } else if card.is_empty() {
        icon
    } else {
        card
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn friend(name: &str, extra: Value) -> Value {
        let mut base = json!({ "id": name, "name": name, "tag": "EUW", "online": true, "product": "valorant", "state": "", "partySize": 1, "partyMax": 5, "partyId": "", "lastOnline": "" });
        for (key, value) in extra.as_object().unwrap() {
            base[key] = value.clone();
        }
        base
    }

    #[test]
    fn friends_are_grouped_by_party_platform_and_offline() {
        let friends = vec![
            friend("b", json!({ "partyId": "p", "partySize": 3 })),
            friend("a", json!({ "partyId": "p", "partySize": 3, "state": "INGAME" })),
            friend("solo", json!({})),
            friend("lol", json!({ "product": "league_of_legends" })),
            friend("off1", json!({ "online": false, "lastOnline": "1000" })),
            friend("off2", json!({ "online": false, "lastOnline": "2000" })),
        ];
        let board = board_of(&friends, "");
        assert_eq!(board.parties.len(), 1);
        assert_eq!(board.parties[0].members[0]["name"], "a");
        assert_eq!(board.parties[0].others, 1);
        assert_eq!(board.valorant[0]["name"], "solo");
        assert_eq!(board.platforms[0].0, "League of Legends");
        assert_eq!(board.offline[0]["name"], "off2");
        assert_eq!(board_of(&friends, "SOLO").valorant.len(), 1);
    }

    #[test]
    fn last_online_reads_seconds_milliseconds_and_dates() {
        assert_eq!(last_online_time("1700000000"), 1_700_000_000_000.0);
        assert_eq!(last_online_time("1700000000000"), 1_700_000_000_000.0);
        assert!(last_online_time("2026-11-03 10:00:00") > 0.0);
        assert_eq!(last_online_time(""), 0.0);
    }

    #[test]
    fn last_seen_is_written_in_words() {
        let now = 10_000_000_000_000.0;
        assert_eq!(last_seen_text(&((now - 90.0 * 60000.0) as i64).to_string(), now), "Dernière connexion il y a 1 heure et 30 minutes");
        assert_eq!(last_seen_text("", now), "Hors ligne");
    }

    #[test]
    fn presence_and_portraits() {
        assert_eq!(presence_kind(&friend("x", json!({ "state": "INGAME" }))), "busy");
        assert_eq!(presence_kind(&friend("x", json!({ "idle": true }))), "away");
        assert_eq!(presence_kind(&friend("x", json!({ "online": false }))), "offline");
        let row = friend("x", json!({ "card": "c", "icon": "" }));
        assert!(friend_portrait(&row, None, Some("https://i"), false).contains("playercards/c"));
        assert_eq!(friend_portrait(&row, None, Some("https://i"), true), "https://i");
    }
}
