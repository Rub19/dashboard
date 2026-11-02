use serde::Serialize;
use serde_json::Value;

pub const SETTINGS_PATH: &str = "user_settings?select=settings&limit=1";

#[derive(Debug, PartialEq, Serialize)]
pub struct RiotId {
    pub name: String,
    pub tag: String,
}

fn encode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (byte as char).to_string(),
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

fn clean(value: &str, max: usize) -> Result<&str, String> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > max || value.chars().any(char::is_control) {
        return Err("riotIdInvalid".into());
    }
    Ok(value)
}

pub fn sync_path(name: &str, tag: &str) -> Result<String, String> {
    let name = clean(name, 32)?;
    let tag = clean(tag.trim_start_matches('#'), 10)?;
    Ok(format!("api/valorant/eval/sync?name={}&tag={}", encode(name), encode(tag)))
}

pub fn matches_path(puuid: &str, limit: u32) -> Result<String, String> {
    let valid = (20..=80).contains(&puuid.len()) && puuid.chars().all(|character| character.is_ascii_alphanumeric() || character == '-');
    if !valid || !(1..=100).contains(&limit) {
        return Err("riotIdInvalid".into());
    }
    Ok(format!("ethone_valorant_matches?select=payload&puuids=cs.%7B{puuid}%7D&order=started_at.desc&limit={limit}"))
}

pub fn parse_identity(value: &Value) -> Option<RiotId> {
    let settings = value.get(0)?.get("settings")?;
    let name = settings.get("liveTrackerRiotName")?.as_str()?.trim();
    let tag = settings.get("liveTrackerRiotTag")?.as_str()?.trim();
    (!name.is_empty() && !tag.is_empty()).then(|| RiotId { name: name.into(), tag: tag.into() })
}

pub fn parse_account(value: Value) -> Result<Value, String> {
    let account = value.get("data").cloned().unwrap_or(value);
    if account.get("puuid").and_then(Value::as_str).is_some_and(|puuid| !puuid.is_empty()) {
        Ok(account)
    } else {
        Err("Réponse du service invalide".into())
    }
}

pub fn parse_matches(value: Value) -> Result<Vec<Value>, String> {
    let rows = value.as_array().ok_or("Réponse du service invalide")?;
    Ok(rows
        .iter()
        .filter_map(|row| row.get("payload"))
        .filter(|payload| payload.get("id").is_some() && payload.get("players").is_some_and(Value::is_array))
        .cloned()
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn riot_ids_are_encoded_for_the_worker() {
        assert_eq!(sync_path(" Rub Été ", "#EUW").unwrap(), "api/valorant/eval/sync?name=Rub%20%C3%89t%C3%A9&tag=EUW");
        assert_eq!(sync_path("a&admin=1", "x").unwrap(), "api/valorant/eval/sync?name=a%26admin%3D1&tag=x");
        assert!(sync_path("", "EUW").is_err());
        assert!(sync_path("Rub", "12345678901").is_err());
    }

    #[test]
    fn match_filters_refuse_anything_but_a_puuid() {
        let puuid = "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6";
        assert!(matches_path(puuid, 25).unwrap().contains(&format!("cs.%7B{puuid}%7D")));
        assert!(matches_path("x&select=*", 25).is_err());
        assert!(matches_path(puuid, 0).is_err());
        assert!(matches_path(puuid, 101).is_err());
    }

    #[test]
    fn the_identity_comes_from_the_account_settings() {
        let found = parse_identity(&json!([{ "settings": { "liveTrackerRiotName": "Rub", "liveTrackerRiotTag": "EUW" } }]));
        assert_eq!(found, Some(RiotId { name: "Rub".into(), tag: "EUW".into() }));
        assert_eq!(parse_identity(&json!([{ "settings": { "liveTrackerRiotName": "" } }])), None);
        assert_eq!(parse_identity(&json!([])), None);
    }

    #[test]
    fn worker_and_table_answers_are_checked() {
        assert_eq!(parse_account(json!({ "data": { "puuid": "p" } })).unwrap()["puuid"], "p");
        assert!(parse_account(json!({ "data": { "name": "Rub" } })).is_err());
        let rows = json!([{ "payload": { "id": "m", "players": [] } }, { "payload": { "id": "broken" } }]);
        assert_eq!(parse_matches(rows).unwrap().len(), 1);
        assert!(parse_matches(json!({ "message": "denied" })).is_err());
    }
}
