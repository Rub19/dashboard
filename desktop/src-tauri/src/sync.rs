use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemKind {
    Notes,
    Tasks,
    Events,
}

impl TryFrom<&str> for ItemKind {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "notes" => Ok(Self::Notes),
            "tasks" => Ok(Self::Tasks),
            "events" => Ok(Self::Events),
            _ => Err("Type de donnée inconnu".into()),
        }
    }
}

impl ItemKind {
    pub fn path(self) -> &'static str {
        match self {
            Self::Notes => "api/notes",
            Self::Tasks => "api/tasks",
            Self::Events => "api/events",
        }
    }

    pub fn validate(self, input: &ItemInput) -> Result<(), String> {
        validate_input(input)?;
        if self == Self::Events {
            let start = input.start_at.as_deref().filter(|value| valid_date(value)).ok_or("Date invalide")?;
            if !start.contains('T') || input.end_at.as_deref().is_some_and(|value| !valid_date(value) || !value.contains('T')) {
                return Err("Date invalide".into());
            }
        }
        Ok(())
    }
}

fn valid_date(value: &str) -> bool {
    (16..=64).contains(&value.len()) && value.chars().all(|character| character.is_ascii_digit() || matches!(character, '-' | ':' | 'T' | 'Z' | '+' | '.'))
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub title: String,
    pub body: String,
    pub done: bool,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub data: Value,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemInput {
    pub title: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub start_at: Option<String>,
    #[serde(default)]
    pub end_at: Option<String>,
    #[serde(default = "empty_data")]
    pub data: Value,
}

fn empty_data() -> Value {
    Value::Object(Default::default())
}

pub fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 128 || !id.chars().all(|value| value.is_ascii_alphanumeric() || value == '-' || value == '_') {
        return Err("Identifiant invalide".into());
    }
    Ok(())
}

pub fn validate_input(input: &ItemInput) -> Result<(), String> {
    if input.title.trim().is_empty() || input.title.chars().count() > 200 || input.body.chars().count() > 10_000 {
        return Err("Donnée invalide".into());
    }
    if !input.data.is_object() || serde_json::to_vec(&input.data).map_or(true, |data| data.len() > 8192) {
        return Err("Donnée invalide".into());
    }
    if input.start_at.as_ref().is_some_and(|value| value.len() > 64) || input.end_at.as_ref().is_some_and(|value| value.len() > 64) {
        return Err("Donnée invalide".into());
    }
    Ok(())
}

#[derive(Deserialize)]
struct ListResponse {
    data: Vec<Item>,
}

#[derive(Deserialize)]
struct CreatedResponse {
    data: Created,
}

#[derive(Deserialize)]
struct Created {
    id: String,
}

#[derive(Deserialize)]
struct MutatedResponse {
    data: Mutated,
}

#[derive(Deserialize)]
struct Mutated {
    ok: bool,
}

pub fn parse_list(value: Value) -> Result<Vec<Item>, String> {
    let response: ListResponse = serde_json::from_value(value).map_err(|_| "Réponse du service invalide".to_string())?;
    if response.data.iter().any(|item| {
        item.id.is_empty()
            || item.id.len() > 128
            || item.title.len() > 200
            || item.body.len() > 10_000
            || !item.data.is_object()
            || item.start_at.as_ref().is_some_and(|value| value.len() > 64)
            || item.end_at.as_ref().is_some_and(|value| value.len() > 64)
            || item.created_at.as_ref().is_some_and(|value| value.len() > 64)
            || item.updated_at.as_ref().is_some_and(|value| value.len() > 64)
    }) {
        return Err("Réponse du service invalide".into());
    }
    Ok(response.data)
}

pub fn parse_created(value: Value) -> Result<String, String> {
    let response: CreatedResponse = serde_json::from_value(value).map_err(|_| "Réponse du service invalide".to_string())?;
    validate_id(&response.data.id)?;
    Ok(response.data.id)
}

pub fn parse_mutated(value: Value) -> Result<(), String> {
    let response: MutatedResponse = serde_json::from_value(value).map_err(|_| "Réponse du service invalide".to_string())?;
    if response.data.ok {
        Ok(())
    } else {
        Err("Réponse du service invalide".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn only_known_item_kinds_are_allowed() {
        assert_eq!(ItemKind::try_from("notes").unwrap().path(), "api/notes");
        assert_eq!(ItemKind::try_from("tasks").unwrap().path(), "api/tasks");
        assert_eq!(ItemKind::try_from("events").unwrap().path(), "api/events");
        assert!(ItemKind::try_from("https://example.com").is_err());
    }

    #[test]
    fn a_valid_worker_list_is_deserialized() {
        let items = parse_list(json!({
            "data": [{
                "id": "item-1",
                "title": "À faire",
                "body": "Texte",
                "done": false,
                "startAt": null,
                "endAt": null,
                "data": {},
                "createdAt": "2026-11-02T10:00:00Z",
                "updatedAt": "2026-11-02T11:00:00Z"
            }]
        })).unwrap();

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "item-1");
        assert_eq!(items[0].title, "À faire");
    }

    #[test]
    fn a_malformed_worker_list_is_rejected() {
        assert!(parse_list(json!({ "data": "invalid" })).is_err());
        assert!(parse_list(json!({ "data": [{ "id": "", "title": "Titre" }] })).is_err());
    }

    #[test]
    fn item_input_is_bounded_before_leaving_the_app() {
        let valid = ItemInput { title: "Titre".into(), body: "Texte".into(), done: false, start_at: None, end_at: None, data: json!({}) };
        assert!(validate_input(&valid).is_ok());
        assert!(validate_input(&ItemInput { title: "   ".into(), ..valid.clone() }).is_err());
        assert!(validate_input(&ItemInput { body: "x".repeat(10_001), ..valid.clone() }).is_err());
        assert!(validate_input(&ItemInput { data: json!([]), ..valid }).is_err());
    }

    #[test]
    fn item_ids_and_mutation_answers_are_validated() {
        assert!(validate_id("a0b1-c2").is_ok());
        assert!(validate_id("").is_err());
        assert!(validate_id("../item").is_err());
        assert_eq!(parse_created(json!({ "data": { "id": "a0b1-c2" } })).unwrap(), "a0b1-c2");
        assert!(parse_created(json!({ "data": {} })).is_err());
        assert!(parse_mutated(json!({ "data": { "ok": true } })).is_ok());
        assert!(parse_mutated(json!({ "data": { "ok": false } })).is_err());
    }

    #[test]
    fn events_require_a_bounded_date() {
        let valid = ItemInput {
            title: "Rendez-vous".into(),
            body: String::new(),
            done: false,
            start_at: Some("2026-11-02T17:30".into()),
            end_at: None,
            data: json!({}),
        };
        assert!(ItemKind::Events.validate(&valid).is_ok());
        assert!(ItemKind::Events.validate(&ItemInput { start_at: None, ..valid.clone() }).is_err());
        assert!(ItemKind::Events.validate(&ItemInput { start_at: Some("demain".into()), ..valid }).is_err());
    }
}
