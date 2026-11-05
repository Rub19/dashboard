use crate::app::{spawn, App};
use crate::i18n::tr;
use crate::pages::generic::{humanize, to_hex, HIDDEN};
use crate::services::Fut;
use crate::vm::*;
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::rc::Rc;

pub struct Form {
    pub original: Value,
    pub draft: Value,
    pub saving: bool,
    pub error: Option<String>,
    pub save: Rc<dyn Fn(Value) -> Fut>,
    pub after: Rc<dyn Fn(&mut App)>,
    pub channels: Vec<(String, String)>,
    pub roles: Vec<(String, String)>,
    pub advanced_open: bool,
}

thread_local! {
    static FORMS: std::cell::RefCell<HashMap<String, Form>> = std::cell::RefCell::new(HashMap::new());
}

fn read_only(key: &str) -> bool {
    let starts = ["last", "total", "current", "next", "high", "started", "published"].iter().any(|prefix| key.strip_prefix(prefix).is_some_and(|rest| rest.chars().next().is_some_and(char::is_uppercase)));
    starts || ["At", "Count", "Today", "Masked"].iter().any(|suffix| key.ends_with(suffix))
}

fn is_color_key(key: &str) -> bool {
    let lower = key.to_lowercase();
    let trimmed = lower.trim_end_matches(|character: char| character.is_ascii_digit());
    trimmed.ends_with("color") || trimmed.ends_with("colour")
}

fn advanced(key: &str, value: &Value) -> bool {
    if value.is_object() {
        return true;
    }
    if value.is_boolean() || is_color_key(key) {
        return false;
    }
    let lower = key.to_lowercase();
    ["threshold", "interval", "retention", "window", "burst", "strategy", "regex", "webhook", "template", "cooldown", "seconds", "minutes", "hours", "percent", "multiplier", "maximum"].iter().any(|word| lower.contains(word)) || lower.starts_with("max") || lower.starts_with("min")
}

pub fn enum_choices(key: &str) -> Option<Vec<(&'static str, &'static str)>> {
    Some(match key {
        "botpersonality" => vec![("FRIENDLY", "Amical"), ("PROFESSIONAL", "Professionnel"), ("HUMOROUS", "Humoristique"), ("CONCISE", "Concis"), ("CYBER", "Cyber")],
        "themepreset" => vec![("DEFAULT", "Par défaut"), ("CYBERPUNK", "Cyberpunk"), ("EMERALD", "Émeraude"), ("SUNSET", "Coucher de soleil"), ("DARK", "Sombre")],
        "responsevisibility" => vec![("PUBLIC", "Visible par tous"), ("EPHEMERAL", "Visible par l'auteur seulement")],
        "activepreset" => vec![("PRESET_BALANCED", "Équilibré"), ("PRESET_STRICT", "Strict"), ("PRESET_COMMUNITY", "Communauté")],
        "language" => vec![("fr", "Français"), ("en", "English"), ("es", "Español"), ("de", "Deutsch")],
        "preferredlocale" => vec![("fr", "Français"), ("en-US", "English (US)"), ("en-GB", "English (UK)"), ("es-ES", "Español"), ("de", "Deutsch")],
        "loglevel" => vec![("debug", "Détaillé"), ("info", "Normal"), ("warn", "Avertissements"), ("error", "Erreurs seulement")],
        "defaultsafetylevel" => vec![("SAFE", "Prudent"), ("STANDARD", "Standard"), ("DESTRUCTIVE", "Complet, peut supprimer")],
        "risksensitivity" => vec![("low", "Faible"), ("standard", "Normale"), ("high", "Élevée")],
        "verificationlevel" => vec![("0", "Aucun"), ("1", "Faible, e-mail vérifié"), ("2", "Moyen, inscrit depuis 5 minutes"), ("3", "Élevé, membre depuis 10 minutes"), ("4", "Maximum, téléphone vérifié")],
        "explicitcontentfilter" => vec![("0", "Désactivé"), ("1", "Membres sans rôle"), ("2", "Tous les membres")],
        "defaultmessagenotifications" => vec![("0", "Tous les messages"), ("1", "Mentions seulement")],
        "timezone" => vec![("Europe/Paris", "Europe/Paris"), ("Europe/London", "Europe/London"), ("Europe/Brussels", "Europe/Brussels"), ("Europe/Zurich", "Europe/Zurich"), ("America/Montreal", "America/Montreal"), ("America/New_York", "America/New_York"), ("America/Los_Angeles", "America/Los_Angeles"), ("UTC", "UTC")],
        _ => return None,
    })
}

pub fn at_path_mut<'a>(value: &'a mut Value, path: &[String]) -> Option<&'a mut Value> {
    let mut current = value;
    for segment in path {
        current = current.as_object_mut()?.get_mut(segment)?;
    }
    Some(current)
}

pub fn ensure(app_key: &str, value: &Value, save: Rc<dyn Fn(Value) -> Fut>, after: Rc<dyn Fn(&mut App)>, channels: Vec<(String, String)>, roles: Vec<(String, String)>) {
    FORMS.with(|forms| {
        let mut forms = forms.borrow_mut();
        let same = forms.get(app_key).is_some_and(|form| form.original == *value);
        if !same {
            forms.insert(app_key.to_string(), Form { original: value.clone(), draft: value.clone(), saving: false, error: None, save, after, channels, roles, advanced_open: false });
        } else if let Some(form) = forms.get_mut(app_key) {
            form.channels = channels;
            form.roles = roles;
        }
    });
}

fn path_id(form: &str, path: &[String]) -> String {
    format!("form:{form}|{}", path.join("."))
}

fn fields(app: &mut App, form_key: &str, form: &Form, node: &Map<String, Value>, path: &[String], out: &mut Vec<B>, filter: &dyn Fn(&str, &Value) -> bool) {
    let mut entries: Vec<(&String, &Value)> = node.iter().filter(|(key, item)| !HIDDEN.contains(&key.as_str()) && !read_only(key) && filter(key, item)).collect();
    let rank = |key: &str, item: &Value| if item.is_boolean() { 0 } else if is_color_key(key) { 1 } else if item.is_object() { 3 } else { 2 };
    entries.sort_by_key(|(key, item)| rank(key, item));
    let chevron = app.icon("chevron-down");
    for (key, item) in entries {
        let mut next = path.to_vec();
        next.push(key.clone());
        let id = path_id(form_key, &next);
        let lower = key.to_lowercase();
        let label = humanize(key);
        if is_color_key(key) && (item.is_string() || item.is_number() || item.is_null()) {
            let current = to_hex(item);
            out.push(row(vec![C { kind: "swatch", color: Some(hex(current.as_deref().unwrap_or("#5865f2"))), tip: label.clone(), ..Default::default() }, text(&label).grow(), input(&id, current.as_deref().unwrap_or(""), &tr("Par défaut", "Default")).tip(&label)]));
            continue;
        }
        if let (Some(choices), true) = (enum_choices(&lower), item.is_string() || item.is_number() || item.is_null()) {
            let current = match item { Value::Null => String::new(), Value::String(text) => text.clone(), other => other.to_string() };
            let mut options: Vec<(String, String)> = choices.iter().map(|(value, label)| (value.to_string(), label.to_string())).collect();
            if !options.iter().any(|(value, _)| *value == current) {
                options.insert(0, (current.clone(), if current.is_empty() { tr("Par défaut", "Default") } else { current.clone() }));
            }
            let pick = app.select(&id, &current, &options);
            out.push(field(&label, vec![pick]));
            continue;
        }
        match item {
            Value::Bool(on) => out.push(row(vec![text(&label).grow(), switch(&id, *on, &label)])),
            Value::Number(number) => out.push(field(&label, vec![input(&id, &number.to_string(), "")])),
            Value::String(_) | Value::Null => {
                let current = item.as_str().unwrap_or_default().to_string();
                let directory = if lower.ends_with("channelid") { Some((&form.channels, "#")) } else if lower.ends_with("roleid") { Some((&form.roles, "@")) } else { None };
                match directory {
                    Some((entries, sign)) if !entries.is_empty() => {
                        let mut options = vec![(String::new(), tr("Aucun", "None"))];
                        if !current.is_empty() && !entries.iter().any(|(entry, _)| *entry == current) {
                            options.push((current.clone(), current.clone()));
                        }
                        options.extend(entries.iter().map(|(entry, name)| (entry.clone(), format!("{sign}{name}"))));
                        let pick = app.select(&id, &current, &options);
                        out.push(field(&label, vec![pick]));
                    }
                    _ if current.chars().count() > 80 => out.push(field(&label, vec![area(&id, &current, "", 96.0)])),
                    _ => out.push(field(&label, vec![input(&id, &current, "")])),
                }
            }
            Value::Array(list) if list.iter().all(|entry| entry.is_string() || entry.is_number()) => {
                let values: Vec<String> = list.iter().map(|entry| entry.as_str().map_or(entry.to_string(), str::to_string)).collect();
                let directory = if lower.ends_with("channels") || lower.ends_with("channelids") || lower.ends_with("channel") { Some((&form.channels, "#")) } else if lower.ends_with("roles") || lower.ends_with("roleids") || lower.ends_with("role") { Some((&form.roles, "@")) } else { None };
                match directory {
                    Some((entries, sign)) if !entries.is_empty() => {
                        let mut cells: Vec<C> = values.iter().map(|value| chip(&format!("{id}|remove|{value}"), &format!("{sign}{} ×", entries.iter().find(|(entry, _)| entry == value).map_or(value.as_str(), |(_, name)| name.as_str())))).collect();
                        let options: Vec<(String, String)> = entries.iter().filter(|(entry, _)| !values.contains(entry)).map(|(entry, name)| (entry.clone(), format!("{sign}{name}"))).collect();
                        let pick_id = format!("{id}|add");
                        let mut pick = app.select(&pick_id, "", &options);
                        pick.title = tr("Ajouter…", "Add…");
                        cells.push(pick);
                        out.push(field(&label, cells));
                    }
                    _ => out.push(field(&label, vec![area(&format!("{id}|lines"), &values.join("\n"), &tr("Une valeur par ligne", "One value per line"), 64.0)])),
                }
            }
            Value::Array(_) => {}
            Value::Object(inner) => {
                out.push(h2x(&label, "", vec![icon(chevron.clone())]).level(path.len() as i32));
                let before = out.len();
                fields(app, form_key, form, inner, &next, out, &|_, _| true);
                for block in &mut out[before..] {
                    block.level = block.level.max(path.len() as i32 + 1);
                }
            }
        }
    }
}

pub fn view(app: &mut App, form_key: &str) -> Vec<B> {
    let taken = FORMS.with(|forms| forms.borrow_mut().remove(form_key));
    let Some(form) = taken else { return Vec::new() };
    let mut out = Vec::new();
    let draft = form.draft.as_object().cloned().unwrap_or_default();
    let visible = |key: &str, item: &Value| !(item.as_array().is_some_and(|list| list.iter().any(|entry| entry.is_object())));
    let any_visible = draft.iter().any(|(key, item)| !HIDDEN.contains(&key.as_str()) && !read_only(key) && visible(key, item));
    if !any_visible {
        out.push(note(&tr("Aucun réglage disponible.", "No settings available.")));
    } else {
        fields(app, form_key, &form, &draft, &[], &mut out, &|key, item| visible(key, item) && !advanced(key, item));
        let more = draft.iter().filter(|(key, item)| !HIDDEN.contains(&key.as_str()) && !read_only(key) && visible(key, item) && advanced(key, item)).count();
        if more > 0 {
            let chevron = app.icon(if form.advanced_open { "chevron-down" } else { "chevron-right" });
            out.push(row(vec![icon(chevron), strong(&tr(&format!("Options avancées ({more})"), &format!("Advanced options ({more})"))).grow()]).id(&format!("form:{form_key}|!advanced")));
            if form.advanced_open || more < 3 {
                fields(app, form_key, &form, &draft, &[], &mut out, &|key, item| visible(key, item) && advanced(key, item));
            }
        }
    }
    if let Some(message) = &form.error {
        out.push(error(message, vec![]));
    }
    if form.draft != form.original {
        out.push(card(vec![text(&tr("Modifications non enregistrées", "Unsaved changes")).grow(), btn(&format!("form:{form_key}|!discard"), &tr("Annuler", "Discard")).off(form.saving), primary(&format!("form:{form_key}|!save"), &if form.saving { tr("Enregistrement…", "Saving…") } else { tr("Enregistrer", "Save") }).off(form.saving)]));
    }
    FORMS.with(|forms| forms.borrow_mut().insert(form_key.to_string(), form));
    out
}

fn coerce(old: &Value, text: &str) -> Value {
    match old {
        Value::Bool(_) => Value::Bool(text == "true"),
        Value::Number(_) => text.trim().replace(',', ".").parse::<f64>().ok().and_then(serde_json::Number::from_f64).map(|number| if number.as_f64().is_some_and(|value| value.fract() == 0.0) { Value::from(number.as_f64().unwrap_or(0.0) as i64) } else { Value::Number(number) }).unwrap_or_else(|| old.clone()),
        Value::Null if text.is_empty() => Value::Null,
        _ => Value::String(text.to_string()),
    }
}

pub fn act(app: &mut App, rest: &str, value: &str) {
    let Some((form_key, path)) = rest.split_once('|') else { return };
    let form_key = form_key.to_string();
    if path == "!save" {
        let job = FORMS.with(|forms| forms.borrow_mut().get_mut(&form_key).map(|form| {
            form.saving = true;
            form.error = None;
            (form.save)(form.draft.clone())
        }));
        if let Some(work) = job {
            let key = form_key.clone();
            spawn(work, move |app, result| {
                FORMS.with(|forms| {
                    if let Some(form) = forms.borrow_mut().get_mut(&key) {
                        form.saving = false;
                        match &result {
                            Ok(_) => form.original = form.draft.clone(),
                            Err(error) => form.error = Some(crate::i18n::error_text(error)),
                        }
                    }
                });
                if result.is_ok() {
                    app.toast(&tr("Réglages enregistrés", "Settings saved"));
                    let after = FORMS.with(|forms| forms.borrow().get(&key).map(|form| form.after.clone()));
                    if let Some(after) = after {
                        after(app);
                    }
                }
            });
        }
        return;
    }
    FORMS.with(|forms| {
        let mut forms = forms.borrow_mut();
        let Some(form) = forms.get_mut(&form_key) else { return };
        match path {
            "!discard" => form.draft = form.original.clone(),
            "!advanced" => form.advanced_open = !form.advanced_open,
            _ => {
                let mut parts = path.split('|');
                let segments: Vec<String> = parts.next().unwrap_or_default().split('.').map(str::to_string).collect();
                let mode = parts.next();
                let extra = parts.next();
                let Some(slot) = at_path_mut(&mut form.draft, &segments) else { return };
                match (mode, extra) {
                    (Some("remove"), Some(item)) => {
                        if let Some(list) = slot.as_array_mut() {
                            list.retain(|entry| entry.as_str().map_or(entry.to_string(), str::to_string) != item);
                        }
                    }
                    (Some("add"), _) if !value.is_empty() => {
                        if let Some(list) = slot.as_array_mut() {
                            list.push(Value::String(value.to_string()));
                        }
                    }
                    (Some("lines"), _) => *slot = Value::Array(value.lines().map(str::trim).filter(|line| !line.is_empty()).map(|line| Value::String(line.to_string())).collect()),
                    _ => {
                        let key = segments.last().cloned().unwrap_or_default();
                        if is_color_key(&key) {
                            if let Some(color) = to_hex(&Value::String(value.to_string())) {
                                *slot = if slot.is_number() { Value::from(i64::from_str_radix(&color[1..], 16).unwrap_or(0)) } else { Value::String(color) };
                            } else if value.is_empty() {
                                *slot = Value::Null;
                            }
                        } else {
                            *slot = coerce(slot, value);
                        }
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn read_only_and_advanced_keys_are_recognized() {
        assert!(read_only("lastRunAt"));
        assert!(read_only("membersCount"));
        assert!(!read_only("lastly"));
        assert!(advanced("cooldownSeconds", &json!(5)));
        assert!(!advanced("enabled", &json!(true)));
        assert!(is_color_key("embedColor2"));
    }

    #[test]
    fn edits_keep_the_original_type() {
        assert_eq!(coerce(&json!(3), "12"), json!(12));
        assert_eq!(coerce(&json!(3), "1,5"), json!(1.5));
        assert_eq!(coerce(&json!(3), "abc"), json!(3));
        assert_eq!(coerce(&json!(false), "true"), json!(true));
        assert_eq!(coerce(&json!("x"), "y"), json!("y"));
    }

    #[test]
    fn nested_paths_are_reachable() {
        let mut value = json!({ "a": { "b": 1 } });
        *at_path_mut(&mut value, &["a".into(), "b".into()]).unwrap() = json!(2);
        assert_eq!(value["a"]["b"], 2);
        assert!(at_path_mut(&mut value, &["x".into()]).is_none());
    }
}
