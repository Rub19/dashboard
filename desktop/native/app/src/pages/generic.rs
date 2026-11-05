use crate::app::{spawn, App};
use crate::i18n::{fr, labels, tr};
use crate::logic::format_bytes;
use crate::services::Fut;
use crate::vm::*;
use serde_json::{Map, Value};
use std::rc::Rc;

const TITLE_KEYS: [&str; 19] = ["alias", "title", "name", "label", "subject", "prize", "displayName", "device_name", "platform", "userTag", "tag", "username", "guildName", "email", "code", "event_type", "eventType", "kind", "id"];
const SUB_KEYS: [&str; 12] = ["status", "type", "category", "description", "reason", "authorTag", "action", "browser", "last_seen_at", "createdAt", "created_at", "updatedAt"];
pub const HIDDEN: [&str; 21] = ["apiToken", "accountId", "ip_hash", "success", "ok", "__v", "_id", "id", "guildId", "user_id", "userId", "profile_id", "workspace_id", "slug", "public_id", "createdAt", "updatedAt", "created_at", "updated_at", "token", "secret"];

fn phrase(key: &str) -> Option<&'static str> {
    Some(match key {
        "staffroleid" => "Rôle de l'équipe", "staffroleids" => "Rôles de l'équipe", "ignoredroleids" => "Rôles ignorés", "ignoredchannelids" => "Salons ignorés", "alloweduserids" => "Utilisateurs autorisés", "rulescount" => "Règles", "actionstoday" => "Actions aujourd'hui", "welcomechannelid" => "Salon de bienvenue", "goodbyechannelid" => "Salon de départ", "autoroleid" => "Rôle automatique", "autoroleids" => "Rôles automatiques", "retries" => "Tentatives", "enabled" => "Activé", "active" => "Actif", "online" => "En ligne", "channelid" => "Salon", "roleid" => "Rôle", "channelids" => "Salons", "roleids" => "Rôles", "logchannelid" => "Salon des journaux", "logsuccess" => "Journaliser les réussites", "botname" => "Nom du bot", "botpersonality" => "Personnalité du bot", "activepreset" => "Préréglage actif", "autodeletecommands" => "Supprimer les commandes automatiquement", "commandcooldown" => "Délai entre les commandes", "commandrules" => "Règles des commandes", "adminroles" => "Rôles administrateurs", "blacklist" => "Liste noire", "captcha" => "Captcha", "attempts" => "Tentatives", "delayminutes" => "Délai en minutes", "failaction" => "Action en cas d'échec", "givenroles" => "Rôles donnés", "removedroles" => "Rôles retirés", "mentiononjoin" => "Mentionner à l'arrivée", "panelmessageid" => "Message du panneau", "emergencycontacts" => "Contacts d'urgence", "mode" => "Mode", "userids" => "Utilisateurs", "emojis" => "Émojis", "errorcolor" => "Couleur des erreurs", "prefix" => "Préfixe", "language" => "Langue", "locale" => "Langue", "timezone" => "Fuseau horaire", "message" => "Message", "title" => "Titre", "description" => "Description", "color" => "Couleur", "name" => "Nom", "reason" => "Raison", "status" => "État", "type" => "Type", "duration" => "Durée", "threshold" => "Seuil", "action" => "Action", "membercount" => "Membres", "channelscount" => "Salons", "rolescount" => "Rôles", "totalcommands" => "Commandes au total", "commandstoday" => "Commandes aujourd'hui", "pingms" => "Latence", "uptimems" => "Temps en ligne", "count" => "Nombre", "total" => "Total", "level" => "Niveau", "xp" => "XP", "welcomemessage" => "Message de bienvenue", "goodbyemessage" => "Message de départ", "dmenabled" => "Message privé activé",
        _ => return None,
    })
}

fn word(text: &str) -> Option<&'static str> {
    Some(match text {
        "channel" => "salon", "channels" => "salons", "role" => "rôle", "roles" => "rôles", "user" => "utilisateur", "users" => "utilisateurs", "log" => "journal", "logs" => "journaux", "message" => "message", "messages" => "messages", "enabled" => "activé", "max" => "maximum", "min" => "minimum", "per" => "par", "delay" => "délai", "time" => "durée", "days" => "jours", "hours" => "heures", "minutes" => "minutes", "seconds" => "secondes", "day" => "jour", "auto" => "automatique", "member" => "membre", "members" => "membres", "admin" => "administrateur", "staff" => "équipe", "ignored" => "ignorés", "allowed" => "autorisés", "whitelist" => "liste blanche", "blacklist" => "liste noire", "welcome" => "bienvenue", "goodbye" => "départ", "reward" => "récompense", "rewards" => "récompenses", "command" => "commande", "commands" => "commandes", "limit" => "limite", "cooldown" => "délai", "notify" => "notifier",
        _ => return None,
    })
}

pub fn humanize(key: &str) -> String {
    if fr() {
        let normalized: String = key.chars().filter(|character| !matches!(character, '_' | ' ' | '-')).collect::<String>().to_lowercase();
        if let Some(found) = phrase(&normalized).map(str::to_string).or_else(|| labels()[normalized.as_str()].as_str().map(str::to_string)) {
            return found;
        }
    }
    let mut spaced = String::new();
    let mut previous: Option<char> = None;
    for character in key.replace('_', " ").chars() {
        if character.is_uppercase() && previous.is_some_and(|before| before.is_lowercase() || before.is_ascii_digit()) {
            spaced.push(' ');
        }
        spaced.push(character);
        previous = Some(character);
    }
    let words: Vec<String> = spaced.to_lowercase().split_whitespace().filter(|part| *part != "id" && *part != "ids").map(|part| if fr() { word(part).unwrap_or(part).to_string() } else { part.to_string() }).collect();
    let text = words.join(" ");
    let mut characters = text.chars();
    characters.next().map_or(String::new(), |first| first.to_uppercase().collect::<String>() + characters.as_str())
}

fn is_empty(value: &Value) -> bool {
    match value {
        Value::Null => true,
        Value::String(text) => text.is_empty(),
        Value::Array(list) => list.is_empty(),
        Value::Object(map) => map.is_empty(),
        _ => false,
    }
}

fn is_id_like(key: &str, value: &Value) -> bool {
    key == "id" || key.ends_with("Id") || key.ends_with("_id") || value.as_str().is_some_and(|text| text.len() >= 16 && text.bytes().all(|byte| byte.is_ascii_digit()))
}

pub fn status_word(value: &str) -> Option<&'static str> {
    Some(match value {
        "online" => "En ligne",
        "idle" => "Absent",
        "dnd" => "Ne pas déranger",
        "offline" => "Hors ligne",
        "invisible" => "Invisible",
        _ => return None,
    })
}

pub fn number_text(number: f64) -> String {
    if number.fract() == 0.0 && number.abs() < 1e15 {
        let digits = (number.abs() as i64).to_string();
        let mut out = String::new();
        for (at, character) in digits.chars().enumerate() {
            if at > 0 && (digits.len() - at) % 3 == 0 {
                out.push(if fr() { '\u{202f}' } else { ',' });
            }
            out.push(character);
        }
        if number < 0.0 { format!("-{out}") } else { out }
    } else {
        let text = format!("{:.2}", number).trim_end_matches('0').trim_end_matches('.').to_string();
        if fr() { text.replace('.', ",") } else { text }
    }
}

pub fn display_value(value: &Value) -> String {
    match value {
        Value::Null => "–".into(),
        Value::Bool(flag) => if *flag { tr("Oui", "Yes") } else { tr("Non", "No") },
        Value::Number(number) => number_text(number.as_f64().unwrap_or(0.0)),
        Value::String(text) if text.is_empty() => "–".into(),
        Value::String(text) => {
            if text.len() > 11 && text.as_bytes().get(10) == Some(&b'T') {
                if let Some(date) = crate::logic::time::parse(text) {
                    return crate::logic::time::date_time(&date, fr());
                }
            }
            if fr() { status_word(text).map_or(text.clone(), str::to_string) } else { text.clone() }
        }
        Value::Array(list) => tr(&format!("{} élément{}", list.len(), if list.len() > 1 { "s" } else { "" }), &format!("{} item{}", list.len(), if list.len() > 1 { "s" } else { "" })),
        Value::Object(map) => {
            if !map.is_empty() && map.len() <= 4 && map.values().all(|item| !item.is_object() && !item.is_array()) {
                map.iter().map(|(key, item)| format!("{} : {}", humanize(key), display_value(item))).collect::<Vec<_>>().join(", ")
            } else {
                tr(&format!("{} champs", map.len()), &format!("{} fields", map.len()))
            }
        }
    }
}

fn field_value(key: &str, value: &Value) -> String {
    match value.as_f64() {
        Some(number) if key.to_lowercase().ends_with("size") => format_bytes(number),
        _ => display_value(value),
    }
}

pub fn row_title(row: &Value) -> String {
    if let Some(map) = row.as_object() {
        for key in TITLE_KEYS {
            match map.get(key) {
                Some(Value::String(text)) if !text.is_empty() => return text.clone(),
                Some(Value::Number(number)) => return number.to_string(),
                _ => {}
            }
        }
    }
    match row {
        Value::String(text) => text.clone(),
        Value::Number(number) => number.to_string(),
        _ => tr("Élément", "Item"),
    }
}

pub fn row_subtitle(row: &Value) -> String {
    let Some(map) = row.as_object() else { return String::new() };
    SUB_KEYS.iter().filter_map(|key| map.get(*key)).filter(|value| !is_empty(value)).take(2).map(display_value).collect::<Vec<_>>().join(", ")
}

pub fn unwrap_config(value: &Value) -> (Map<String, Value>, Option<&'static str>) {
    if let Some(map) = value.as_object() {
        for key in ["config", "settings", "data"] {
            if let Some(Value::Object(inner)) = map.get(key) {
                return (inner.clone(), Some(key));
            }
        }
        return (map.clone(), None);
    }
    (Map::new(), None)
}

pub fn facts_of(value: &Value) -> Vec<(String, Value)> {
    let (body, _) = unwrap_config(value);
    let mut facts = Vec::new();
    for (key, item) in body {
        if HIDDEN.contains(&key.as_str()) || is_id_like(&key, &item) || is_empty(&item) {
            continue;
        }
        if item.is_number() || item.is_boolean() || item.as_str().is_some_and(|text| text.chars().count() <= 40) {
            facts.push((key, item));
        }
        if facts.len() >= 8 {
            break;
        }
    }
    facts
}

pub fn json_fields(value: &Value, level: i32, out: &mut Vec<B>) {
    match value {
        Value::Object(map) => {
            let entries: Vec<(&String, &Value)> = map.iter().filter(|(key, item)| !HIDDEN.contains(&key.as_str()) && !is_empty(item) && !is_id_like(key, item)).collect();
            let plain: Vec<B> = entries.iter().filter(|(_, item)| !item.is_object() && !item.is_array()).map(|(key, item)| row(vec![muted(&humanize(key)), wrap(&field_value(key, item))]).level(level)).collect();
            out.extend(group(plain));
            for (key, item) in entries.iter().filter(|(_, item)| item.is_object() || item.is_array()) {
                if level >= 3 {
                    out.push(row(vec![muted(&humanize(key)), text(&display_value(item))]).level(level));
                    continue;
                }
                out.push(h2x(&humanize(key), &display_value(item), vec![]).level(level));
                json_fields(item, level + 1, out);
            }
        }
        Value::Array(list) => {
            if list.iter().all(|item| !item.is_object() && !item.is_array()) {
                out.push(prose(&list.iter().map(display_value).collect::<Vec<_>>().join(", ")).level(level));
            } else {
                for item in list.iter().take(100) {
                    if item.is_object() {
                        out.push(row(vec![strong(&row_title(item))]).level(level));
                        json_fields(item, level + 1, out);
                    } else {
                        out.push(prose(&display_value(item)).level(level));
                    }
                }
            }
        }
        other => out.push(prose(&display_value(other)).level(level)),
    }
}

pub struct RowAction {
    pub title: String,
    pub destructive: bool,
    pub prompt: Option<String>,
    pub run: Rc<dyn Fn(&Value, &str) -> Fut>,
}

#[derive(Default)]
pub struct ListState {
    pub confirm: Option<String>,
    pub asking: Option<String>,
    pub text: String,
    pub busy: bool,
    pub error: Option<String>,
}

pub struct Registered {
    pub rows: Vec<Value>,
    pub actions: Rc<dyn Fn() -> Vec<RowAction>>,
    pub changed: Rc<dyn Fn(&mut App)>,
}

thread_local! {
    static LISTS: std::cell::RefCell<std::collections::HashMap<String, Registered>> = std::cell::RefCell::new(std::collections::HashMap::new());
    static OPEN: std::cell::RefCell<Option<(String, Value, Vec<RowAction>, Rc<dyn Fn(&mut App)>)>> = const { std::cell::RefCell::new(None) };
    static STATE: std::cell::RefCell<ListState> = std::cell::RefCell::new(ListState::default());
}

pub fn json_list(app: &mut App, key: &str, rows: &[Value], actions: Rc<dyn Fn() -> Vec<RowAction>>, changed: Rc<dyn Fn(&mut App)>, empty_title: Option<&str>, empty_text: Option<&str>) -> Vec<B> {
    LISTS.with(|lists| lists.borrow_mut().insert(key.to_string(), Registered { rows: rows.to_vec(), actions, changed }));
    if rows.is_empty() {
        return vec![empty(empty_title.map_or_else(|| tr("Rien pour l'instant", "Nothing yet"), str::to_string).as_str(), empty_text.unwrap_or(""))];
    }
    let chevron = app.icon("chevron-right");
    group(rows.iter().take(300).enumerate().map(|(at, item)| row(vec![stack(&row_title(item), &row_subtitle(item)), icon(chevron.clone())]).id(&format!("generic:open:{key}:{at}"))).collect())
}

pub fn open_row(app: &mut App, key: &str, value: Value, actions: Vec<RowAction>, changed: Rc<dyn Fn(&mut App)>) {
    let title = row_title(&value);
    OPEN.with(|cell| *cell.borrow_mut() = Some((key.to_string(), value, actions, changed)));
    STATE.with(|cell| *cell.borrow_mut() = ListState::default());
    app.open_drawer(&title, 560.0, drawer_view);
}

fn drawer_view(app: &mut App) -> Vec<B> {
    let mut out = Vec::new();
    OPEN.with(|cell| {
        let open = cell.borrow();
        let Some((_, value, actions, _)) = open.as_ref() else { return };
        json_fields(value, 0, &mut out);
        STATE.with(|state| {
            let state = state.borrow();
            if let Some(error) = &state.error {
                out.push(error_block(error));
            }
            let mut cells = Vec::new();
            for action in actions {
                if state.asking.as_deref() == Some(action.title.as_str()) {
                    let prompt = action.prompt.clone().unwrap_or_default();
                    out.push(row(vec![input("generic:text", &state.text, &prompt).focus(), primary("generic:run", &action.title).off(state.busy || state.text.trim().is_empty()), btn("generic:cancel", &tr("Annuler", "Cancel"))]));
                } else if state.confirm.as_deref() == Some(action.title.as_str()) {
                    out.push(row(vec![text(&tr("Confirmer ?", "Confirm?")).tone("bad"), btn("generic:cancel", &tr("Annuler", "Cancel")), danger("generic:run", &action.title).off(state.busy)]));
                } else {
                    let mut button = btn(&format!("generic:action:{}", action.title), &action.title).off(state.busy);
                    if action.destructive {
                        button.tone = "danger";
                    }
                    cells.push(button);
                }
            }
            if !cells.is_empty() {
                out.push(row(cells));
            }
        });
    });
    let _ = app;
    out
}

fn error_block(text: &str) -> B {
    error(text, vec![])
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, rest) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "text" => STATE.with(|state| state.borrow_mut().text = value.to_string()),
        "text:submit" => run(app),
        "cancel" => STATE.with(|state| {
            let mut state = state.borrow_mut();
            state.confirm = None;
            state.asking = None;
        }),
        "action" => {
            let (destructive, prompt) = OPEN.with(|cell| cell.borrow().as_ref().and_then(|(_, _, actions, _)| actions.iter().find(|action| action.title == rest).map(|action| (action.destructive, action.prompt.is_some())))).unwrap_or((false, false));
            STATE.with(|state| {
                let mut state = state.borrow_mut();
                state.error = None;
                if prompt {
                    state.asking = Some(rest.to_string());
                } else if destructive {
                    state.confirm = Some(rest.to_string());
                } else {
                    state.confirm = Some(rest.to_string());
                }
            });
            if !prompt && !destructive {
                run(app);
            }
        }
        "run" => run(app),
        "open" => {
            let Some((key, at)) = rest.rsplit_once(':') else { return };
            let found = LISTS.with(|lists| lists.borrow().get(key).and_then(|list| at.parse::<usize>().ok().and_then(|at| list.rows.get(at).cloned()).map(|row| (row, (list.actions)(), list.changed.clone()))));
            if let Some((row, actions, changed)) = found {
                open_row(app, key, row, actions, changed);
            }
        }
        _ => {}
    }
}

fn run(app: &mut App) {
    let chosen = STATE.with(|state| {
        let state = state.borrow();
        (state.asking.clone().or(state.confirm.clone()), state.text.trim().to_string())
    });
    let (Some(title), text) = chosen else { return };
    let work = OPEN.with(|cell| cell.borrow().as_ref().and_then(|(_, value, actions, _)| actions.iter().find(|action| action.title == title).map(|action| (action.run)(value, &text))));
    let Some(work) = work else { return };
    STATE.with(|state| state.borrow_mut().busy = true);
    spawn(work, move |app, result| {
        STATE.with(|state| state.borrow_mut().busy = false);
        match result {
            Ok(_) => {
                app.toast(&tr(&format!("Fait : {title}"), &format!("Done: {title}")));
                let changed = OPEN.with(|cell| cell.borrow_mut().take().map(|(_, _, _, changed)| changed));
                app.close_drawer();
                if let Some(changed) = changed {
                    changed(app);
                }
            }
            Err(error) => STATE.with(|state| state.borrow_mut().error = Some(crate::i18n::error_text(&error))),
        }
    });
}

pub fn activity_label(kind: &str) -> String {
    if fr() {
        let found = match kind { "shared" => "Partage", "uploaded" => "Envoi", "downloaded" => "Téléchargement", "deleted" => "Suppression", "renamed" => "Renommage", "moved" => "Déplacement", "restored" => "Restauration", "viewed" => "Consultation", "revoked" => "Révocation", _ => "" };
        if !found.is_empty() {
            return found.to_string();
        }
    }
    humanize(kind)
}

pub fn to_hex(value: &Value) -> Option<String> {
    if let Some(number) = value.as_i64() {
        return Some(format!("#{:06x}", number.max(0) & 0xffffff));
    }
    let text = value.as_str()?.trim_start_matches('#');
    if text.len() == 3 && text.chars().all(|character| character.is_ascii_hexdigit()) {
        return Some(format!("#{}", text.chars().flat_map(|character| [character, character]).collect::<String>().to_lowercase()));
    }
    (text.len() >= 6 && text[..6].chars().all(|character| character.is_ascii_hexdigit())).then(|| format!("#{}", text[..6].to_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn keys_become_readable_labels() {
        assert_eq!(humanize("welcomeChannelId"), "Salon de bienvenue");
        assert_eq!(humanize("critical"), "Critique");
        assert_eq!(humanize("max_members_per_role"), "Maximum membres par rôle");
    }

    #[test]
    fn titles_and_subtitles_pick_known_keys() {
        assert_eq!(row_title(&json!({ "name": "Alpha", "id": "1" })), "Alpha");
        assert_eq!(row_title(&json!({ "count": 3 })), "Élément");
        assert_eq!(row_subtitle(&json!({ "status": "online", "type": "x", "reason": "y" })), "En ligne, x");
    }

    #[test]
    fn facts_skip_ids_and_long_text() {
        let facts = facts_of(&json!({ "config": { "enabled": true, "channelId": "123", "note": "x".repeat(60), "level": 3 } }));
        assert_eq!(facts.iter().map(|(key, _)| key.as_str()).collect::<Vec<_>>(), ["enabled", "level"]);
    }

    #[test]
    fn colors_read_in_every_form() {
        assert_eq!(to_hex(&json!(16711680)).as_deref(), Some("#ff0000"));
        assert_eq!(to_hex(&json!("#abc")).as_deref(), Some("#aabbcc"));
        assert_eq!(to_hex(&json!("12345678")).as_deref(), Some("#123456"));
        assert_eq!(to_hex(&json!("rouge")), None);
    }

    #[test]
    fn values_display_cleanly() {
        assert_eq!(display_value(&json!(null)), "–");
        assert_eq!(display_value(&json!([1, 2])), "2 éléments");
        assert_eq!(display_value(&json!({ "a": 1 })), "A : 1");
    }
}
