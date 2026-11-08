use crate::app::{spawn, App, Page};
use crate::i18n::{error_text, fr, tr};
use crate::logic::time;
use crate::pages::generic::{display_value, facts_of, flatten_entries, humanize, number_text, unwrap_config, RowAction};
use crate::pages::{encode, form, section, set_section};
use crate::prefs;
use crate::services::{bot, bot_cached, Fut};
use crate::vm::*;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::OnceLock;

const GUILD_KEY: &str = "ethone-discord-guild";
const MODULE_KEY: &str = "ethone-discord-module";
const SECTION_KEY: &str = "ethone-section-discord";

#[derive(Default)]
pub struct DiscordState {
    pub linked: Option<bool>,
    pub waiting: bool,
    pub error: Option<String>,
    pub query: String,
    pub pane: String,
    pub confirm: Option<String>,
    pub busy: bool,
    pub message: Option<(String, bool)>,
    pub members_page: u32,
    pub members_filter: String,
    pub audit_filter: String,
    pub music_query: String,
    pub music_results: Vec<Value>,
    pub music_searching: bool,
    pub music_at: f64,
    pub ticket: Option<Value>,
    pub create: Option<(String, usize)>,
    pub values: HashMap<String, String>,
    pub create_busy: bool,
    pub create_error: Option<String>,
}

fn modules() -> &'static Vec<Value> {
    static ALL: OnceLock<Vec<Value>> = OnceLock::new();
    ALL.get_or_init(|| {
        let spec: Value = serde_json::from_str(include_str!("../../data/discord.json")).unwrap_or_default();
        let groups: Vec<String> = spec["groups"].as_array().into_iter().flatten().filter_map(|group| group.as_str().map(str::to_string)).collect();
        let group = |at: usize| groups.get(at).cloned().unwrap_or_default();
        let (moderation, community, media) = (group(0), group(1), group(4));
        let reason = "Action depuis Ethone";
        let mut list = vec![
            json!({ "id": "moderation", "title": "Modération et sanctions", "group": moderation, "overview": null }),
            json!({ "id": "members", "title": "Membres", "group": moderation, "base": "guilds/{g}/server", "overview": null }),
            json!({ "id": "anti-raid", "title": "Anti-raid", "group": moderation, "overview": null, "configs": [{ "title": "Réglages", "get": "/config", "put": "/config" }], "actions": [
                { "title": "Activer le mode raid", "path": "/raid-mode", "body": { "active": true, "reason": reason } },
                { "title": "Désactiver le mode raid", "path": "/raid-mode", "body": { "active": false, "reason": reason } },
                { "title": "Verrouiller le serveur", "path": "/lockdown", "destructive": true, "body": { "active": true, "reason": reason } },
                { "title": "Déverrouiller le serveur", "path": "/lockdown", "body": { "active": false, "reason": reason } },
            ] }),
            json!({ "id": "anti-nuke", "title": "Anti-nuke", "group": moderation, "overview": null, "configs": [{ "title": "Réglages", "get": "/config", "put": "/config" }] }),
            json!({ "id": "audit-log", "title": "Journal d'audit", "group": moderation, "base": "guilds/{g}/logs", "overview": null }),
            json!({ "id": "tickets", "title": "Tickets", "group": community, "overview": null }),
            json!({ "id": "giveaways", "title": "Concours", "group": community, "overview": null }),
            json!({ "id": "suggestions", "title": "Suggestions", "group": community, "overview": null }),
            json!({ "id": "music", "title": "Musique", "group": media, "overview": "/state" }),
        ];
        let custom: Vec<String> = list.iter().filter_map(|item| item["id"].as_str().map(str::to_string)).collect();
        list.extend(spec["modules"].as_array().into_iter().flatten().filter(|item| !custom.iter().any(|id| item["id"].as_str() == Some(id))).cloned());
        list
    })
}

fn groups() -> Vec<String> {
    let spec: Value = serde_json::from_str(include_str!("../../data/discord.json")).unwrap_or_default();
    spec["groups"].as_array().into_iter().flatten().filter_map(|group| group.as_str().map(str::to_string)).collect()
}

fn group_label(group: &str) -> String {
    match group {
        "Modération et sécurité" => tr("Modération", "Moderation"),
        "IA, musique et vocal" => tr("IA et musique", "AI and music"),
        "Bot (propriétaire)" => "Bot".into(),
        other => other.into(),
    }
}

fn spec_of(id: &str) -> Option<&'static Value> {
    modules().iter().find(|item| item["id"] == id)
}

pub fn module_url(spec: &Value, guild: &str, sub: &str) -> String {
    let root = spec["base"].as_str().map_or_else(|| format!("guilds/{{g}}/{}", spec["id"].as_str().unwrap_or_default()), str::to_string).replace("{g}", guild);
    format!("api/{root}{}", if sub == "/" { "" } else { sub })
}

fn text_of(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Number(number) => number.to_string(),
        _ => String::new(),
    }
}

fn when(value: &Value) -> String {
    time::parse(&text_of(value)).map(|date| time::date_time(&date, fr())).unwrap_or_default()
}

fn label(value: &Value) -> String {
    let raw = text_of(value);
    if !fr() {
        return raw;
    }
    match raw.to_lowercase().as_str() {
        "pending" => "En attente", "under_review" => "À l'étude", "planned" => "Planifiée", "accepted" => "Acceptée", "in_progress" => "En cours", "completed" => "Terminée", "rejected" => "Refusée", "duplicate" => "Doublon", "open" | "opened" => "Ouvert", "closed" => "Fermé", "claimed" => "Pris en charge", "active" | "running" | "ongoing" => "En cours", "ended" => "Terminé", "cancelled" => "Annulé", "reverted" => "Annulée", "high" => "Haute", "urgent" => "Urgente", "medium" => "Moyenne", "normal" => "Normale", "low" => "Basse",
        _ => return raw,
    }
    .to_string()
}

fn guild() -> Option<String> {
    prefs::read_json::<String>(GUILD_KEY).filter(|id| !id.is_empty())
}

fn current_module() -> Option<&'static Value> {
    let id = section(MODULE_KEY, "");
    if id.is_empty() { None } else { spec_of(&id) }
}

fn set_module(app: &mut App, id: &str) {
    set_section(MODULE_KEY, id);
    let state = &mut app.state.discord;
    state.pane.clear();
    state.confirm = None;
    state.message = None;
    state.error = None;
    state.members_page = 1;
    state.ticket = None;
}

fn run(app: &mut App, work: Fut, refresh: String) {
    app.state.discord.busy = true;
    app.state.discord.message = None;
    spawn(work, move |app, result| {
        let state = &mut app.state.discord;
        state.busy = false;
        state.confirm = None;
        match result {
            Ok(_) => {
                state.message = Some((tr("Action effectuée.", "Done."), true));
                app.forget(&refresh);
            }
            Err(error) => state.message = Some((error_text(&error), false)),
        }
    });
}

fn confirm_cells(app: &App, key: &str, title: &str) -> Vec<C> {
    let state = &app.state.discord;
    if state.confirm.as_deref() == Some(key) {
        vec![text(&format!("{title} ?")).tone("bad"), btn("discord:cancel", &tr("Annuler", "Cancel")), danger(&format!("discord:yes:{key}"), &tr("Confirmer", "Confirm")).off(state.busy)]
    } else {
        vec![danger(&format!("discord:ask:{key}"), title).off(state.busy)]
    }
}

fn message_block(app: &App, out: &mut Vec<B>) {
    if let Some((message, good)) = &app.state.discord.message {
        out.push(if *good { note(message) } else { bad(message) });
    }
}

fn directory(app: &mut App, guild: &str) -> (Vec<(String, String)>, Vec<(String, String)>) {
    let channels = app.load(&format!("discord:{guild}:channels"), || bot_cached(&format!("api/guilds/{guild}/server/channels")));
    let roles = app.load(&format!("discord:{guild}:roles"), || bot_cached(&format!("api/guilds/{guild}/server/roles")));
    (channels.data.map(|data| flatten_entries(&data, "")).unwrap_or_default(), roles.data.map(|data| flatten_entries(&data, "")).unwrap_or_default())
}

struct Field {
    key: &'static str,
    label: &'static str,
    kind: &'static str,
    choices: &'static [(&'static str, &'static str)],
    optional: bool,
    initial: &'static str,
    hint: &'static str,
}

const fn fld(key: &'static str, label: &'static str) -> Field {
    Field { key, label, kind: "text", choices: &[], optional: false, initial: "", hint: "" }
}

impl Field {
    const fn kind(mut self, kind: &'static str) -> Self {
        self.kind = kind;
        self
    }
    const fn optional(mut self) -> Self {
        self.optional = true;
        self
    }
    const fn initial(mut self, initial: &'static str) -> Self {
        self.initial = initial;
        self
    }
    const fn hint(mut self, hint: &'static str) -> Self {
        self.hint = hint;
        self
    }
    const fn choices(mut self, choices: &'static [(&'static str, &'static str)]) -> Self {
        self.choices = choices;
        self
    }
}

pub struct Ctx<'a> {
    values: &'a HashMap<String, String>,
    roles: &'a [(String, String)],
}

impl Ctx<'_> {
    pub fn text(&self, key: &str) -> String {
        self.values.get(key).map(|value| value.trim().to_string()).unwrap_or_default()
    }
    pub fn number(&self, key: &str) -> f64 {
        self.text(key).replace(',', ".").parse::<f64>().ok().filter(|value| value.is_finite()).unwrap_or(0.0)
    }
    pub fn flag(&self, key: &str) -> bool {
        self.values.get(key).is_some_and(|value| value == "true")
    }
    pub fn role_name(&self, id: &str) -> String {
        self.roles.iter().find(|(role, _)| role == id).map_or_else(|| "Rôle".to_string(), |(_, name)| name.clone())
    }
}

struct Creator {
    title: &'static str,
    path: &'static str,
    method: &'static str,
    fields: Vec<Field>,
    build: fn(&Ctx) -> Value,
}

fn uuid() -> String {
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|elapsed| elapsed.as_nanos()).unwrap_or(0);
    let mixed = nanos ^ (std::process::id() as u128) << 64;
    format!("{:08x}-{:04x}-4{:03x}-a{:03x}-{:012x}", (mixed >> 96) as u32 ^ mixed as u32, (mixed >> 16) as u16, (mixed >> 4) as u16 & 0xfff, (mixed >> 40) as u16 & 0xfff, mixed as u64 & 0xffff_ffff_ffff)
}

pub fn build_command(c: &Ctx) -> Value {
    let mut response = Map::new();
    if !c.text("response").is_empty() {
        response.insert("content".into(), c.text("response").into());
    }
    if ["embedTitle", "embedDescription", "embedImage", "embedFields"].iter().any(|key| !c.text(key).is_empty()) {
        let color = c.text("embedColor");
        let mut embed = Map::new();
        embed.insert("color".into(), if color.is_empty() { "#6366F1".into() } else { color.into() });
        for (from, to) in [("embedTitle", "title"), ("embedDescription", "description"), ("embedImage", "imageUrl"), ("embedFooter", "footerText")] {
            if !c.text(from).is_empty() {
                embed.insert(to.into(), c.text(from).into());
            }
        }
        let fields: Vec<Value> = c.text("embedFields").lines().filter_map(|line| {
            let mut parts = line.split('|').map(str::trim);
            let name = parts.next().unwrap_or_default().to_string();
            let value = parts.collect::<Vec<_>>().join("|");
            (!name.is_empty() && !value.is_empty()).then(|| json!({ "name": name, "value": value, "inline": false }))
        }).collect();
        if !fields.is_empty() {
            embed.insert("fields".into(), fields.into());
        }
        response.insert("embed".into(), embed.into());
    }
    if !c.text("buttonLabel").is_empty() && c.text("buttonUrl").to_lowercase().starts_with("http") {
        response.insert("buttons".into(), json!([{ "label": c.text("buttonLabel"), "url": c.text("buttonUrl"), "style": "link" }]));
    }
    if response.is_empty() {
        response.insert("content".into(), "(réponse vide)".into());
    }
    let description = c.text("description");
    json!({ "name": c.text("name"), "description": if description.is_empty() { "Commande personnalisée".to_string() } else { description }, "triggerType": "both", "enabled": true, "defaultActions": [{ "type": "send_response", "response": response }] })
}

pub fn build_event(c: &Ctx) -> Value {
    let raw = c.text("startDate").replace('T', " ");
    let start = chrono::NaiveDateTime::parse_from_str(&raw, "%Y-%m-%d %H:%M").ok().and_then(|naive| naive.and_local_timezone(chrono::Local).single()).map(|date| date.with_timezone(&chrono::Utc));
    let minutes = c.number("durationMinutes").max(15.0);
    match start {
        Some(start) => json!({ "title": c.text("title"), "description": c.text("description"), "startDate": start.to_rfc3339_opts(chrono::SecondsFormat::Millis, true), "endDate": (start + chrono::Duration::minutes(minutes as i64)).to_rfc3339_opts(chrono::SecondsFormat::Millis, true), "durationMinutes": minutes, "syncToDiscord": c.flag("syncToDiscord") }),
        None => Value::Null,
    }
}

const EMBED_COLORS: &[(&str, &str)] = &[("#6366F1", "Indigo"), ("#EF4444", "Rouge"), ("#F59E0B", "Ambre"), ("#10B981", "Vert"), ("#3B82F6", "Bleu"), ("#EC4899", "Rose"), ("#FFFFFF", "Blanc")];
const ROLE_COLORS: &[(&str, &str)] = &[("#99AAB5", "Gris"), ("#EF4444", "Rouge"), ("#F59E0B", "Ambre"), ("#10B981", "Vert"), ("#3B82F6", "Bleu"), ("#8B5CF6", "Violet"), ("#EC4899", "Rose")];

fn creators(id: &str) -> Vec<Creator> {
    let post = "POST";
    match id {
        "streamers" => vec![Creator { title: "Suivre un streamer", path: "", method: post, fields: vec![
            fld("platform", "Plateforme").choices(&[("twitch", "Twitch"), ("youtube", "YouTube"), ("kick", "Kick")]).initial("twitch"),
            fld("username", "Pseudo du streamer"),
            fld("channelId", "Salon d'annonce").kind("channel"),
            fld("pingMode", "Notification").choices(&[("default", "Par défaut du serveur"), ("none", "Aucun ping"), ("here", "@here"), ("everyone", "@everyone"), ("role", "Rôle spécifique")]).initial("default"),
            fld("pingRoleId", "Rôle à notifier").kind("role").optional(),
            fld("minViewers", "Spectateurs minimum").kind("number").optional().initial("0"),
        ], build: |c| {
            let mut body = json!({ "platform": c.text("platform"), "username": c.text("username"), "channelId": if c.text("channelId").is_empty() { Value::Null } else { c.text("channelId").into() }, "pingMode": c.text("pingMode") });
            if !c.text("pingRoleId").is_empty() {
                body["pingRoleId"] = c.text("pingRoleId").into();
            }
            if c.number("minViewers") > 0.0 {
                body["minViewers"] = c.number("minViewers").into();
            }
            body
        } }],
        "secure-roles" => vec![Creator { title: "Sécuriser un rôle", path: "/roles", method: post, fields: vec![fld("roleId", "Rôle à sécuriser").kind("role")], build: |c| json!({ "roleId": c.text("roleId") }) }],
        "reminders" => vec![Creator { title: "Nouveau rappel", path: "/", method: post, fields: vec![
            fld("in", "Dans combien de temps ?").initial("1h").hint("Ex. 10m, 2h, 1d, 1h30m"),
            fld("message", "Message").kind("multiline"),
            fld("channelId", "Salon").kind("channel"),
            fld("recurrence", "Répétition").choices(&[("none", "Aucune"), ("daily", "Tous les jours"), ("weekly", "Toutes les semaines")]).initial("none"),
        ], build: |c| json!({ "in": c.text("in"), "message": c.text("message"), "channelId": c.text("channelId"), "recurrence": c.text("recurrence") }) }],
        "tags" => vec![Creator { title: "Nouveau tag", path: "/{name}", method: "PUT", fields: vec![fld("name", "Nom").hint("Minuscules, chiffres, _ et - (32 max.)"), fld("content", "Contenu").kind("multiline")], build: |c| json!({ "content": c.text("content") }) }],
        "custom-commands" => vec![Creator { title: "Nouvelle commande", path: "/create", method: post, fields: vec![
            fld("name", "Nom de la commande").hint("Lettres, chiffres, _ et -"),
            fld("description", "Description").optional().initial("Commande personnalisée"),
            fld("response", "Message (facultatif si embed)").kind("multiline").optional(),
            fld("embedTitle", "Embed : titre").optional(),
            fld("embedDescription", "Embed : texte").kind("multiline").optional(),
            fld("embedColor", "Embed : couleur").choices(EMBED_COLORS).optional().initial("#6366F1"),
            fld("embedImage", "Embed : image (lien)").optional(),
            fld("embedFooter", "Embed : pied de page").optional(),
            fld("embedFields", "Embed : champs (un par ligne, Nom | Valeur)").kind("multiline").optional(),
            fld("buttonLabel", "Bouton lien : texte").optional(),
            fld("buttonUrl", "Bouton lien : adresse (https://…)").optional(),
        ], build: build_command }],
        "events" => vec![Creator { title: "Nouvel événement", path: "/", method: post, fields: vec![
            fld("title", "Titre"),
            fld("description", "Description").kind("multiline").optional(),
            fld("startDate", "Début").kind("dateTime").hint("AAAA-MM-JJ HH:MM"),
            fld("durationMinutes", "Durée (minutes)").kind("number").initial("120"),
            fld("syncToDiscord", "Créer aussi l'événement Discord").kind("toggle").optional(),
        ], build: build_event }],
        "economy" => vec![Creator { title: "Nouvel article", path: "/shop", method: post, fields: vec![fld("roleId", "Rôle vendu").kind("role"), fld("label", "Nom de l'article"), fld("description", "Description").optional(), fld("price", "Prix").kind("number").initial("100")], build: |c| json!({ "roleId": c.text("roleId"), "roleName": c.role_name(&c.text("roleId")), "label": c.text("label"), "description": c.text("description"), "price": c.number("price").max(0.0), "enabled": true }) }],
        "leveling" => vec![Creator { title: "Nouvelle récompense", path: "/rewards", method: post, fields: vec![fld("level", "Niveau").kind("number").initial("5"), fld("roleId", "Rôle attribué").kind("role"), fld("message", "Message").kind("multiline").optional()], build: |c| json!({ "id": format!("reward-{}", &uuid()[..8]), "level": c.number("level").max(1.0), "roleId": c.text("roleId"), "message": if c.text("message").is_empty() { Value::Null } else { c.text("message").into() }, "enabled": true }) }],
        "invites" => vec![Creator { title: "Nouvelle récompense d'invitations", path: "/rewards", method: post, fields: vec![fld("name", "Nom de la récompense"), fld("requiredValidInvites", "Invitations valides requises").kind("number").initial("5"), fld("roleId", "Rôle attribué").kind("role").optional(), fld("xpAmount", "XP offerts").kind("number").optional().initial("0"), fld("message", "Message").kind("multiline").optional()], build: |c| {
            let mut body = json!({ "name": c.text("name"), "requiredValidInvites": c.number("requiredValidInvites").max(1.0), "xpAmount": c.number("xpAmount").max(0.0) });
            if !c.text("roleId").is_empty() {
                body["roleId"] = c.text("roleId").into();
                body["roleName"] = c.role_name(&c.text("roleId")).into();
            }
            if !c.text("message").is_empty() {
                body["message"] = c.text("message").into();
            }
            body
        } }],
        "server" => vec![
            Creator { title: "Nouveau salon", path: "/channels", method: post, fields: vec![fld("name", "Nom du salon"), fld("type", "Type").choices(&[("0", "Textuel"), ("2", "Vocal"), ("4", "Catégorie"), ("5", "Annonces"), ("13", "Scène"), ("15", "Forum")]).initial("0"), fld("topic", "Sujet").optional(), fld("isPrivate", "Salon privé (invisible pour @everyone)").kind("toggle").optional(), fld("nsfw", "Contenu sensible (NSFW)").kind("toggle").optional()], build: |c| json!({ "name": c.text("name").to_lowercase().replace(' ', "-"), "type": c.number("type"), "topic": c.text("topic"), "isPrivate": c.flag("isPrivate"), "nsfw": c.flag("nsfw") }) },
            Creator { title: "Nouveau rôle", path: "/roles", method: post, fields: vec![fld("name", "Nom du rôle"), fld("color", "Couleur").choices(ROLE_COLORS).initial("#99AAB5"), fld("hoist", "Afficher séparément dans la liste des membres").kind("toggle").optional(), fld("mentionable", "Mentionnable par tous").kind("toggle").optional()], build: |c| json!({ "name": c.text("name"), "color": c.text("color"), "hoist": c.flag("hoist"), "mentionable": c.flag("mentionable") }) },
        ],
        "backups" => vec![Creator { title: "Nouvelle sauvegarde", path: "/", method: post, fields: vec![fld("name", "Nom de la sauvegarde"), fld("description", "Description").optional(), fld("isProtected", "Protéger contre la suppression").kind("toggle").optional()], build: |c| json!({ "name": c.text("name"), "description": c.text("description"), "type": "FULL", "isProtected": c.flag("isProtected"), "idempotencyKey": uuid() }) }],
        "giveaways" => vec![Creator { title: "Nouveau concours", path: "/create", method: post, fields: vec![fld("channelId", "Salon").kind("channel"), fld("prize", "Lot"), fld("description", "Description").kind("multiline").optional(), fld("winnerCount", "Nombre de gagnants").kind("number").initial("1"), fld("durationMinutes", "Durée").choices(&[("60", "1 heure"), ("360", "6 heures"), ("1440", "1 jour"), ("4320", "3 jours"), ("10080", "7 jours")]).initial("1440")], build: |c| json!({ "channelId": c.text("channelId"), "prize": c.text("prize"), "description": c.text("description"), "winnerCount": c.number("winnerCount").max(1.0), "durationMinutes": c.number("durationMinutes") }) }],
        _ => Vec::new(),
    }
}

fn create_buttons(app: &mut App, id: &str) -> Vec<C> {
    let plus = app.icon("plus");
    creators(id).iter().enumerate().map(|(at, creator)| primary(&format!("discord:create:{id}:{at}"), creator.title).icon(plus.clone())).collect()
}

fn open_create(app: &mut App, id: &str, at: usize) {
    let list = creators(id);
    let Some(creator) = list.get(at) else { return };
    let state = &mut app.state.discord;
    state.values = creator.fields.iter().map(|field| (field.key.to_string(), field.initial.to_string())).collect();
    state.create = Some((id.to_string(), at));
    state.create_busy = false;
    state.create_error = None;
    app.open_drawer(creator.title, 520.0, create_view);
}

fn create_view(app: &mut App) -> Vec<B> {
    let Some((id, at)) = app.state.discord.create.clone() else { return Vec::new() };
    let list = creators(&id);
    let Some(creator) = list.get(at) else { return Vec::new() };
    let guild = guild().unwrap_or_default();
    let (channels, roles) = directory(app, &guild);
    let values = app.state.discord.values.clone();
    let mut out = Vec::new();
    for item in &creator.fields {
        let value = values.get(item.key).cloned().unwrap_or_default();
        let field_id = format!("discord:value:{}", item.key);
        let cell = match item.kind {
            "toggle" => {
                out.push(row(vec![text(item.label).grow(), switch(&field_id, value == "true", item.label)]));
                continue;
            }
            "channel" | "role" => {
                let mark = if item.kind == "channel" { "#" } else { "@" };
                let source = if item.kind == "channel" { &channels } else { &roles };
                let mut options = vec![(String::new(), tr("Choisir…", "Choose…"))];
                options.extend(source.iter().map(|(entry, name)| (entry.clone(), format!("{mark}{name}"))));
                app.select(&field_id, &value, &options)
            }
            "multiline" => area(&field_id, &value, item.hint, 80.0),
            _ if !item.choices.is_empty() => {
                let options: Vec<(String, String)> = item.choices.iter().map(|(key, name)| (key.to_string(), name.to_string())).collect();
                app.select(&field_id, &value, &options)
            }
            _ => input(&field_id, &value, item.hint),
        };
        out.push(field(item.label, vec![cell.grow()]));
    }
    let plus = app.icon("plus");
    let state = &app.state.discord;
    if let Some(message) = &state.create_error {
        out.push(error(message, vec![]));
    }
    let missing = creator.fields.iter().any(|item| !item.optional && item.kind != "toggle" && values.get(item.key).is_none_or(|value| value.trim().is_empty()));
    out.push(row(vec![primary("discord:create-submit", &tr("Créer", "Create")).icon(plus).off(state.create_busy || missing)]));
    out
}

fn submit_create(app: &mut App) {
    let Some((id, at)) = app.state.discord.create.clone() else { return };
    let Some(spec) = spec_of(&id) else { return };
    let list = creators(&id);
    let Some(creator) = list.get(at) else { return };
    let guild = guild().unwrap_or_default();
    let (_, roles) = directory(app, &guild);
    let values = app.state.discord.values.clone();
    let context = Ctx { values: &values, roles: &roles };
    let body = (creator.build)(&context);
    if body.is_null() {
        app.state.discord.create_error = Some(tr("Écris la date sous la forme AAAA-MM-JJ HH:MM.", "Write the date as YYYY-MM-DD HH:MM."));
        return;
    }
    let mut path = creator.path.to_string();
    for item in &creator.fields {
        path = path.replace(&format!("{{{}}}", item.key), &encode(&context.text(item.key)));
    }
    let url = format!("{}{}", module_url(spec, &guild, "/"), if path == "/" { "" } else { path.as_str() });
    app.state.discord.create_busy = true;
    app.state.discord.create_error = None;
    let refresh = format!("discord:{guild}:m:{id}");
    spawn(bot(creator.method, &url, Some(body)), move |app, result| {
        app.state.discord.create_busy = false;
        match result {
            Ok(_) => {
                app.state.discord.create = None;
                app.close_drawer();
                app.toast(&tr("Créé.", "Created."));
                app.forget(&refresh);
            }
            Err(error) => app.state.discord.create_error = Some(error_text(&error)),
        }
    });
}

fn load(app: &mut App, guild: &str, module: &str, path: &str) -> crate::app::Res {
    let url = path.to_string();
    app.load(&format!("discord:{guild}:m:{module}:{path}"), move || bot("GET", &url, None))
}

fn status_blocks(res: &crate::app::Res, height: f32, out: &mut Vec<B>) -> Option<Rc<Value>> {
    if let Some(message) = &res.error {
        out.push(error(message, vec![btn("discord:refresh", &tr("Réessayer", "Retry"))]));
    }
    if res.data.is_none() && res.loading {
        out.extend(skeletons(3, height));
    }
    res.data.clone()
}

fn moderation(app: &mut App, guild: &str) -> Vec<B> {
    let spec = spec_of("moderation").cloned().unwrap_or_default();
    let view = if app.state.discord.pane == "bans" { "bans" } else { "cases" };
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Modération", "Moderation"), "", vec![btn("discord:refresh", &tr("Actualiser", "Refresh")).icon(refresh)]), tabs(&[("cases", &tr("Sanctions", "Cases")), ("bans", &tr("Bannis", "Bans"))], view, "discord:pane:")];
    message_block(app, &mut out);
    let res = load(app, guild, "moderation", &module_url(&spec, guild, &format!("/{view}")));
    let Some(data) = status_blocks(&res, 48.0, &mut out) else { return out };
    let rows = data[view].as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&if view == "cases" { tr("Aucune sanction", "No cases") } else { tr("Aucun membre banni", "No banned members") }, ""));
        return out;
    }
    let lines: Vec<B> = rows.iter().map(|item| {
        if view == "cases" {
            let number = text_of(&item["caseNumber"]);
            let action = text_of(&item["action"]);
            let heavy = ["ban", "kick"].iter().any(|word| action.to_lowercase().contains(word));
            let who = Some(text_of(&item["userTag"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["userId"]));
            let mut cells = vec![muted(&format!("#{number}")), stack(&who, &text_of(&item["reason"])).grow(), chip("", &action).tone(if heavy { "bad" } else { "warn" }), C { kind: "stack", title: text_of(&item["moderatorTag"]), sub: when(&item["createdAt"]), extra: "right".into(), ..Default::default() }];
            if text_of(&item["status"]) != "reverted" {
                cells.extend(confirm_cells(app, &format!("revert|{number}"), &tr("Annuler", "Revert")));
            }
            row(cells)
        } else {
            let user = text_of(&item["userId"]);
            let who = [&item["userTag"], &item["username"], &item["userId"]].iter().map(|value| text_of(value)).find(|value| !value.is_empty()).unwrap_or_default();
            let mut cells = vec![stack(&who, &text_of(&item["reason"])).grow()];
            cells.extend(confirm_cells(app, &format!("unban|{user}"), &tr("Débannir", "Unban")));
            row(cells)
        }
    }).collect();
    out.extend(group(lines));
    out
}

fn members(app: &mut App, guild: &str) -> Vec<B> {
    let page = app.state.discord.members_page.max(1);
    let mut rows = Vec::new();
    let mut last = None;
    let mut loading = false;
    let mut failure = None;
    for at in 1..=page {
        let res = load(app, guild, "members", &format!("api/guilds/{guild}/server/members?page={at}"));
        loading |= res.loading;
        failure = failure.or(res.error.clone());
        if let Some(data) = res.data {
            rows.extend(data["members"].as_array().cloned().unwrap_or_default());
            last = Some(data);
        }
    }
    let total = last.as_ref().and_then(|data| data["total"].as_f64()).map(|total| tr(&format!("{} membres", number_text(total)), &format!("{} members", number_text(total)))).unwrap_or_default();
    let filter_text = app.state.discord.members_filter.clone();
    let search = app.icon("search");
    let mut out = vec![head(&tr("Membres", "Members"), &total, vec![]), row(vec![icon(search), input("discord:members-filter", &filter_text, &tr("Filtrer les membres chargés", "Filter loaded members")).grow()])];
    if let Some(message) = failure {
        out.push(error(&message, vec![btn("discord:refresh", &tr("Réessayer", "Retry"))]));
    }
    if rows.is_empty() && loading {
        out.extend(skeletons(6, 48.0));
        return out;
    }
    let filter = filter_text.trim().to_lowercase();
    let lines: Vec<B> = rows.iter().filter(|item| filter.is_empty() || format!("{} {}", text_of(&item["displayName"]), text_of(&item["username"])).to_lowercase().contains(&filter)).map(|item| {
        let name = Some(text_of(&item["displayName"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["username"]));
        let picture = text_of(&item["avatar"]);
        let image = if picture.is_empty() { Default::default() } else { app.img(&picture) };
        let mut cells = vec![avatar(&name.chars().next().map(String::from).unwrap_or_default(), image, 34.0), stack(&name, &text_of(&item["username"])).grow()];
        if item["bot"] == true {
            cells.push(chip("", "BOT"));
        }
        if !text_of(&item["communicationDisabledUntil"]).is_empty() {
            cells.push(chip("", &tr("Exclu temporairement", "Timed out")).tone("warn"));
        }
        row(cells)
    }).collect();
    out.extend(group(lines));
    if (page as f64) < last.as_ref().and_then(|data| data["totalPages"].as_f64()).unwrap_or(1.0) {
        out.push(row(vec![btn("discord:members-more", &tr("Charger plus", "Load more")).off(loading)]));
    }
    out
}

fn tickets(app: &mut App, guild: &str) -> Vec<B> {
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head("Tickets", "", vec![btn("discord:refresh", &tr("Actualiser", "Refresh")).icon(refresh)])];
    message_block(app, &mut out);
    let res = load(app, guild, "tickets", &format!("api/guilds/{guild}/tickets/list"));
    let Some(data) = status_blocks(&res, 56.0, &mut out) else { return out };
    let rows = data["tickets"].as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun ticket", "No tickets"), ""));
        return out;
    }
    let lines: Vec<B> = rows.iter().enumerate().map(|(at, item)| {
        let mut title = Some(text_of(&item["categoryName"])).filter(|value| !value.is_empty()).unwrap_or_else(|| tr("Ticket", "Ticket"));
        if !text_of(&item["tag"]).is_empty() {
            title.push_str(&format!(" {}", text_of(&item["tag"])));
        }
        let mut sub = Some(text_of(&item["userTag"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["authorTag"]));
        let date = when(&item["createdAt"]);
        if !date.is_empty() {
            sub.push_str(&format!(", {date}"));
        }
        let mut cells = vec![stack(&title, &sub).grow()];
        let priority = text_of(&item["priority"]);
        if !priority.is_empty() {
            let urgent = ["high", "urgent"].contains(&priority.to_lowercase().as_str());
            cells.push(chip("", &label(&item["priority"])).tone(if urgent { "bad" } else { "" }));
        }
        let closed = text_of(&item["status"]).to_lowercase();
        cells.push(chip("", &label(&item["status"])).tone(if closed.contains("closed") || closed.contains("ferm") { "" } else { "ok" }));
        row(cells).id(&format!("discord:ticket:{at}"))
    }).collect();
    out.extend(group(lines));
    out
}

fn ticket_view(app: &mut App) -> Vec<B> {
    let Some(item) = app.state.discord.ticket.clone() else { return Vec::new() };
    let who = Some(text_of(&item["userTag"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["authorTag"]));
    let mut out = vec![note(&who)];
    if !text_of(&item["description"]).is_empty() {
        out.push(prose(&text_of(&item["description"])));
    }
    message_block(app, &mut out);
    let id = text_of(&item["id"]);
    let mut cells = vec![btn(&format!("discord:ticket-claim:{id}"), &tr("Prendre en charge", "Claim")).off(app.state.discord.busy)];
    cells.extend(confirm_cells(app, &format!("ticket-close|{id}"), &tr("Fermer le ticket", "Close ticket")));
    out.push(row(cells));
    out
}

fn giveaways(app: &mut App, guild: &str) -> Vec<B> {
    let refresh = app.icon("refresh-cw");
    let mut actions = create_buttons(app, "giveaways");
    actions.push(btn("discord:refresh", &tr("Actualiser", "Refresh")).icon(refresh));
    let mut out = vec![head(&tr("Concours", "Giveaways"), "", actions)];
    message_block(app, &mut out);
    let res = load(app, guild, "giveaways", &format!("api/guilds/{guild}/giveaways/list"));
    let Some(data) = status_blocks(&res, 56.0, &mut out) else { return out };
    let rows = data["giveaways"].as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun concours", "No giveaways"), ""));
        return out;
    }
    let lines: Vec<B> = rows.iter().map(|item| {
        let id = text_of(&item["id"]);
        let status = text_of(&item["status"]).to_lowercase();
        let active = ["active", "running", "ongoing"].iter().any(|word| status.contains(word));
        let entries = item["participants"].as_array().map_or_else(|| item["participants"].as_f64().unwrap_or(0.0), |list| list.len() as f64);
        let winners = text_of(&item["winnerCount"]);
        let mut sub = tr(&format!("{} participants, {winners} gagnant(s)", number_text(entries)), &format!("{} entries, {winners} winner(s)", number_text(entries)));
        let ends = when(&item["endsAt"]);
        if !ends.is_empty() {
            sub.push_str(&format!(", {ends}"));
        }
        let mut cells = vec![stack(&text_of(&item["prize"]), &sub).grow(), chip("", &label(&item["status"])).tone(if active { "ok" } else { "" })];
        if active {
            cells.extend(confirm_cells(app, &format!("giveaway|{id}|end"), &tr("Terminer", "End")));
        } else {
            cells.push(btn(&format!("discord:giveaway-reroll:{id}"), &tr("Retirer un gagnant", "Reroll")).off(app.state.discord.busy));
        }
        row(cells)
    }).collect();
    out.extend(group(lines));
    out
}

fn suggestions(app: &mut App, guild: &str) -> Vec<B> {
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Suggestions", "Suggestions"), "", vec![btn("discord:refresh", &tr("Actualiser", "Refresh")).icon(refresh)])];
    message_block(app, &mut out);
    let res = load(app, guild, "suggestions", &format!("api/guilds/{guild}/suggestions/list"));
    let Some(data) = status_blocks(&res, 56.0, &mut out) else { return out };
    let rows = data["suggestions"].as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucune suggestion", "No suggestions"), ""));
        return out;
    }
    let busy = app.state.discord.busy;
    let lines: Vec<B> = rows.iter().map(|item| {
        let id = text_of(&item["id"]);
        let title = Some(text_of(&item["title"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["suggestion"]));
        let votes = |key: &str| Some(text_of(&item[key])).filter(|value| !value.is_empty()).unwrap_or_else(|| "0".into());
        let status = text_of(&item["status"]);
        row(vec![stack(&title, &format!("{}, ▲ {}, ▼ {}", text_of(&item["authorTag"]), votes("upvotesCount"), votes("downvotesCount"))).grow(), chip("", &label(&item["status"])).tone(if status == "accepted" { "ok" } else if status == "rejected" { "bad" } else { "" }), btn(&format!("discord:suggestion:{id}:accepted"), &tr("Accepter", "Accept")).off(busy), danger(&format!("discord:suggestion:{id}:rejected"), &tr("Refuser", "Reject")).off(busy)])
    }).collect();
    out.extend(group(lines));
    out
}

fn audit_log(app: &mut App, guild: &str) -> Vec<B> {
    let refresh = app.icon("refresh-cw");
    let search = app.icon("search");
    let filter_text = app.state.discord.audit_filter.clone();
    let mut out = vec![head(&tr("Journal d'audit", "Audit log"), "", vec![btn("discord:refresh", &tr("Actualiser", "Refresh")).icon(refresh)]), row(vec![icon(search), input("discord:audit-filter", &filter_text, &tr("Filtrer", "Filter")).grow()])];
    let res = load(app, guild, "audit-log", &format!("api/guilds/{guild}/logs/events"));
    let Some(data) = status_blocks(&res, 48.0, &mut out) else { return out };
    let filter = filter_text.trim().to_lowercase();
    let rows: Vec<Value> = data["events"].as_array().into_iter().flatten().filter(|item| filter.is_empty() || item.to_string().to_lowercase().contains(&filter)).take(200).cloned().collect();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun événement", "No events"), ""));
        return out;
    }
    let name = |value: &Value| if value.is_object() { text_of(&value["tag"]) } else { text_of(value) };
    let lines: Vec<B> = rows.iter().map(|item| {
        let severe = ["high", "critical"].contains(&text_of(&item["severity"]).to_lowercase().as_str());
        let who = [name(&item["actor"]), name(&item["target"])].into_iter().filter(|value| !value.is_empty()).collect::<Vec<_>>().join(" → ");
        row(vec![chip("", &text_of(&item["type"])).tone(if severe { "bad" } else { "" }), stack(&who, &text_of(&item["reason"])).grow(), muted(&when(&item["timestamp"]))])
    }).collect();
    out.extend(group(lines));
    out
}

fn music(app: &mut App, guild: &str) -> Vec<B> {
    let key = format!("discord:{guild}:m:music:state");
    let now = time::now_ms();
    if now - app.state.discord.music_at > 8000.0 {
        app.state.discord.music_at = now;
        let url = format!("api/guilds/{guild}/music/state");
        app.reload(&key, move || bot("GET", &url, None));
    }
    let url = format!("api/guilds/{guild}/music/state");
    let res = app.load(&key, move || bot("GET", &url, None));
    let mut out = vec![head(&tr("Musique", "Music"), "", vec![])];
    message_block(app, &mut out);
    if let Some(message) = &res.error {
        out.push(error(message, vec![]));
    }
    let state = res.data.as_ref().map(|data| data["state"].clone()).unwrap_or_default();
    let current = ["currentTrack", "current", "nowPlaying", "track"].iter().map(|key| &state[*key]).find(|value| value.is_object()).cloned();
    let paused = state["paused"].as_bool().or(state["isPaused"].as_bool()).unwrap_or(false);
    let author = |item: &Value| Some(text_of(&item["author"])).filter(|value| !value.is_empty()).unwrap_or_else(|| text_of(&item["artist"]));
    let (back, play, pause, next, shuffle, stop) = (app.icon("skip-back"), app.icon("play"), app.icon("pause"), app.icon("skip-forward"), app.icon("shuffle"), app.icon("square"));
    let (title, sub) = match &current {
        Some(track) => (text_of(&track["title"]), author(track)),
        None => (tr("Rien en lecture", "Nothing playing"), tr("Lance une musique depuis la recherche.", "Start a track from search.")),
    };
    let busy = app.state.discord.busy;
    out.push(card(vec![stack(&title, &sub).grow(), ibtn("discord:music:previous", back, &tr("Précédent", "Previous")).off(busy), ibtn(if paused { "discord:music:resume" } else { "discord:music:pause" }, if paused { play.clone() } else { pause }, &if paused { tr("Reprendre", "Resume") } else { tr("Pause", "Pause") }).off(busy), ibtn("discord:music:skip", next, &tr("Suivant", "Next")).off(busy), ibtn("discord:music:shuffle", shuffle, &tr("Mélanger", "Shuffle")).off(busy), ibtn("discord:music:stop", stop, &tr("Arrêter", "Stop")).off(busy)]));
    let query = app.state.discord.music_query.clone();
    let search = app.icon("search");
    out.push(row(vec![input("discord:music-query", &query, &tr("Chercher une musique", "Search for a track")).grow(), btn("discord:music-search", &tr("Chercher", "Search")).icon(search).off(app.state.discord.music_searching || query.trim().is_empty())]));
    let results = app.state.discord.music_results.clone();
    if !results.is_empty() {
        out.extend(group(results.iter().take(10).enumerate().map(|(at, item)| row(vec![stack(&text_of(&item["title"]), &author(item)).grow(), btn(&format!("discord:music-play:{at}"), &tr("Lire", "Play")).icon(play.clone()).off(busy)])).collect()));
    }
    let queue = state["queue"].as_array().cloned().unwrap_or_default();
    out.push(h2(&if queue.is_empty() { tr("File d'attente", "Queue") } else { tr(&format!("File d'attente ({})", queue.len()), &format!("Queue ({})", queue.len())) }));
    if queue.is_empty() {
        out.push(note(&tr("La file est vide.", "The queue is empty.")));
    } else {
        let trash = app.icon("trash2");
        out.extend(group(queue.iter().enumerate().map(|(at, item)| row(vec![stack(&text_of(&item["title"]), &author(item)).grow(), ibtn(&format!("discord:music-remove:{at}"), trash.clone(), &tr(&format!("Retirer {}", text_of(&item["title"])), &format!("Remove {}", text_of(&item["title"])))).off(busy)])).collect()));
    }
    out
}

fn overview_facts(app: &mut App, spec: &Value, guild: &str, out: &mut Vec<B>) {
    let Some(path) = spec["overview"].as_str() else { return };
    let id = spec["id"].as_str().unwrap_or_default();
    let res = load(app, guild, id, &module_url(spec, guild, path));
    if res.error.is_some() {
        return;
    }
    let Some(data) = res.data else {
        out.extend(skeletons(1, 28.0));
        return;
    };
    let wanted = |key: &str| ["total", "active", "pending", "live", "open"].iter().any(|start| key.starts_with(start)) || ["Count", "Today", "Rate", "Score"].iter().any(|end| key.ends_with(end));
    let facts: Vec<C> = facts_of(&data).into_iter().filter(|(key, _)| wanted(key)).map(|(key, value)| stat(&humanize(&key), &display_value(&value), "")).collect();
    for chunk in facts.chunks(4) {
        out.push(row(chunk.to_vec()));
    }
    if !spec["configs"].is_array() && !spec["lists"].is_array() {
        crate::pages::generic::json_fields(&data, 0, out);
    }
}

fn module_view(app: &mut App, spec: &'static Value, guild: &str) -> Vec<B> {
    let id = spec["id"].as_str().unwrap_or_default();
    match id {
        "moderation" => return moderation(app, guild),
        "members" => return members(app, guild),
        "tickets" => return tickets(app, guild),
        "giveaways" => return giveaways(app, guild),
        "suggestions" => return suggestions(app, guild),
        "audit-log" => return audit_log(app, guild),
        "music" => return music(app, guild),
        _ => {}
    }
    let mut actions: Vec<C> = Vec::new();
    for (at, action) in spec["actions"].as_array().into_iter().flatten().enumerate() {
        let title = action["title"].as_str().unwrap_or_default();
        if action["destructive"] == true {
            actions.extend(confirm_cells(app, &format!("action|{at}"), title));
        } else {
            actions.push(btn(&format!("discord:action:{at}"), title).off(app.state.discord.busy));
        }
    }
    actions.extend(create_buttons(app, id));
    let crowded = actions.len() > 2;
    let mut out = if crowded { vec![head(spec["title"].as_str().unwrap_or_default(), "", vec![]), row(actions)] } else { vec![head(spec["title"].as_str().unwrap_or_default(), "", actions)] };
    message_block(app, &mut out);
    overview_facts(app, spec, guild, &mut out);
    let mut panes: Vec<(String, String)> = spec["configs"].as_array().into_iter().flatten().enumerate().map(|(at, config)| (at.to_string(), config["title"].as_str().unwrap_or_default().to_string())).collect();
    panes.extend(spec["lists"].as_array().into_iter().flatten().enumerate().map(|(at, list)| (format!("l{at}"), list["title"].as_str().unwrap_or_default().to_string())));
    let active = panes.iter().find(|(pane, _)| *pane == app.state.discord.pane).or(panes.first()).map(|(pane, _)| pane.clone()).unwrap_or_default();
    if panes.len() > 4 {
        let options: Vec<(String, String)> = panes.clone();
        let picker = app.select("discord:pane-select", &active, &options);
        out.push(row(vec![muted(&tr("Section", "Section")), picker, gap()]));
    } else if panes.len() > 1 {
        let items: Vec<(&str, &str)> = panes.iter().map(|(pane, title)| (pane.as_str(), title.as_str())).collect();
        out.push(tabs(&items, &active, "discord:pane:"));
    }
    if let Some(at) = active.strip_prefix('l').and_then(|at| at.parse::<usize>().ok()) {
        let list = &spec["lists"][at];
        let res = load(app, guild, id, &module_url(spec, guild, list["path"].as_str().unwrap_or("/")));
        let Some(data) = status_blocks(&res, 48.0, &mut out) else { return out };
        let rows = crate::pages::first_array(&data, list["key"].as_str());
        let (guild_id, refresh) = (guild.to_string(), format!("discord:{guild}:m:{id}"));
        let actions = Rc::new(move || row_actions(spec, &guild_id, list));
        let changed: Rc<dyn Fn(&mut App)> = Rc::new(move |app: &mut App| app.forget(&refresh));
        out.extend(crate::pages::generic::json_list(app, &format!("discord-{id}-{at}"), &rows, actions, changed, Some(&tr("Liste vide", "Empty list")), None));
    } else if let Ok(at) = active.parse::<usize>() {
        let config = &spec["configs"][at];
        let res = load(app, guild, id, &module_url(spec, guild, config["get"].as_str().unwrap_or("/")));
        let Some(data) = status_blocks(&res, 120.0, &mut out) else { return out };
        let (body, wrapper) = unwrap_config(&data);
        let (channels, roles) = directory(app, guild);
        let form_key = format!("discord-{guild}-{id}-{at}");
        let put = module_url(spec, guild, config["put"].as_str().unwrap_or("/"));
        let method = config["method"].as_str().unwrap_or("PUT").to_string();
        let strict = config["strict"] == true;
        let refresh = format!("discord:{guild}:m:{id}");
        form::ensure(&form_key, &Value::Object(body), Rc::new(move |next: Value| {
            let payload = match wrapper.filter(|_| strict) {
                Some(wrapper) => json!({ wrapper: next }),
                None => next,
            };
            bot(&method, &put, Some(payload))
        }), Rc::new(move |app: &mut App| app.forget(&refresh)), channels, roles);
        out.extend(form::view(app, &form_key));
    }
    out
}

fn row_actions(spec: &'static Value, guild: &str, list: &'static Value) -> Vec<RowAction> {
    list["rowActions"].as_array().into_iter().flatten().map(|action| {
        let guild = guild.to_string();
        RowAction {
            title: action["title"].as_str().unwrap_or_default().to_string(),
            destructive: action["destructive"] == true,
            prompt: action["textPrompt"].as_str().map(str::to_string),
            run: Rc::new(move |row: &Value, typed: &str| {
                let id = text_of(&row[list["idKey"].as_str().unwrap_or("id")]);
                let method = action["method"].as_str().unwrap_or("POST");
                let url = module_url(spec, &guild, &action["path"].as_str().unwrap_or_default().replace("{id}", &encode(&id)));
                let body = (method != "DELETE").then(|| {
                    let mut body = action["body"].as_object().cloned().unwrap_or_default();
                    if let Some(key) = action["idBody"].as_str() {
                        body.insert(key.into(), id.clone().into());
                    }
                    if action["textPrompt"].is_string() {
                        body.insert(action["textPromptKey"].as_str().unwrap_or("name").into(), typed.into());
                    }
                    Value::Object(body)
                });
                bot(method, &url, body)
            }),
        }
    }).collect()
}

fn uptime(milliseconds: f64) -> String {
    let hours = (milliseconds / 3_600_000.0).floor() as i64;
    if hours >= 24 {
        tr(&format!("{} j {} h", hours / 24, hours % 24), &format!("{}d {}h", hours / 24, hours % 24))
    } else {
        format!("{hours} h {} min", ((milliseconds % 3_600_000.0) / 60000.0).floor())
    }
}

fn overview(app: &mut App, current: &Value) -> Vec<B> {
    let guild = current["id"].as_str().unwrap_or_default().to_string();
    let name = current["name"].as_str().unwrap_or_default().to_string();
    let res = load(app, &guild, "home", &format!("api/guilds/{guild}/overview"));
    let picture = current["icon"].as_str().map(|icon| app.img(&format!("https://cdn.discordapp.com/icons/{guild}/{icon}.png?size=128"))).unwrap_or_default();
    let mut hero = vec![avatar(&name.chars().next().map(String::from).unwrap_or_default(), picture, 52.0)];
    let data = res.data.clone();
    let status = data.as_ref().map(|data| &data["botStatus"]).filter(|status| status.is_object());
    let line = status.map(|status| {
        let mut line = if status["online"] == true { tr("Bot en ligne", "Bot online") } else { tr("Bot hors ligne", "Bot offline") };
        if let Some(ping) = status["pingMs"].as_f64().filter(|ping| *ping > 0.0) {
            line.push_str(&format!(", {ping} ms"));
        }
        line
    }).unwrap_or_default();
    hero.push(C { kind: "stack", title: name.clone(), sub: line, size: 20.0, weight: 1.0, tone: if status.is_some_and(|status| status["online"] == true) { "ok" } else if status.is_some() { "bad" } else { "" }, ..Default::default() });
    let mut out = vec![card(hero)];
    if let Some(message) = &res.error {
        out.push(error(message, vec![btn("discord:refresh", &tr("Réessayer", "Retry"))]));
    }
    match &data {
        Some(data) => {
            let number = |value: &Value| number_text(value.as_f64().unwrap_or(0.0));
            let mut facts = vec![stat(&tr("Membres", "Members"), &number(&data["guild"]["memberCount"]), ""), stat(&tr("Salons", "Channels"), &number(&data["guild"]["channelsCount"]), ""), stat(&tr("Rôles", "Roles"), &number(&data["guild"]["rolesCount"]), ""), stat(&tr("Commandes", "Commands"), &number(&data["stats"]["totalCommands"]), ""), stat(&tr("Aujourd'hui", "Today"), &number(&data["stats"]["commandsToday"]), "")];
            if let Some(up) = data["botStatus"]["uptimeMs"].as_f64().filter(|up| *up > 0.0) {
                facts.push(stat(&tr("En ligne depuis", "Up for"), &uptime(up), ""));
            }
            out.push(row(facts));
        }
        None if res.loading => out.extend(skeletons(1, 64.0)),
        None => {}
    }
    let chart = load(app, &guild, "home", &format!("api/guilds/{guild}/analytics/overview?period=7d"));
    let points = chart.data.as_ref().and_then(|data| data["timeSeries"].as_array().cloned()).unwrap_or_default();
    if !points.is_empty() {
        let value = |point: &Value| point["messages"].as_f64().unwrap_or(0.0) + point["commands"].as_f64().unwrap_or(0.0);
        let total: f64 = points.iter().map(value).fold(0.0, |total, value| total + value);
        let peak = points.iter().map(value).fold(0.0, f64::max);
        out.push(h2x(&tr("Activité sur 7 jours", "Activity over 7 days"), &tr(&format!("{} messages et commandes", number_text(total)), &format!("{} messages and commands", number_text(total))), vec![]));
        if total == 0.0 {
            out.push(note(&tr("Aucun message ni commande compté sur cette période.", "No messages or commands counted in this period.")));
        } else {
            let fr = fr();
            out.push(bars(90.0, points.iter().map(|point| {
                let amount = value(point);
                let day = time::parse(point["timestamp"].as_str().unwrap_or_default()).map(|date| time::short_date(&date, fr)).unwrap_or_default();
                C { progress: ((amount / peak) as f32).max(if amount > 0.0 { 0.04 } else { 0.01 }), tip: format!("{day} : {}", number_text(amount)), ..Default::default() }
            }).collect()));
        }
    }
    let list = load(app, &guild, "home", &format!("api/guilds/{guild}/modules"));
    let items = list.data.as_ref().and_then(|data| data["modules"].as_array().cloned());
    let count = items.as_ref().map(|items| tr(&format!("{} actifs sur {}", items.iter().filter(|item| item["enabled"] == true).count(), items.len()), &format!("{} on, {} total", items.iter().filter(|item| item["enabled"] == true).count(), items.len()))).unwrap_or_default();
    out.push(h2x(&tr("Modules du serveur", "Server modules"), &count, vec![]));
    message_block(app, &mut out);
    match items {
        Some(items) => {
            let chevron = app.icon("chevron-right");
            out.extend(group(items.iter().map(|item| {
                let id = item["id"].as_str().unwrap_or_default();
                let openable = spec_of(id).is_some();
                let mut cells = vec![stack(item["name"].as_str().unwrap_or(id), item["description"].as_str().unwrap_or_default()).grow(), switch(&format!("discord:toggle:{id}"), item["enabled"] == true, item["name"].as_str().unwrap_or(id))];
                if openable {
                    cells.push(icon(chevron.clone()));
                }
                let line = row(cells);
                if openable { line.id(&format!("discord:module:{id}")) } else { line }
            }).collect()));
        }
        None if list.loading => out.extend(skeletons(4, 56.0)),
        None => {
            if let Some(message) = &list.error {
                out.push(error(message, vec![btn("discord:refresh", &tr("Réessayer", "Retry"))]));
            }
        }
    }
    let activities = data.as_ref().and_then(|data| data["stats"]["recentActivities"].as_array().cloned()).unwrap_or_default();
    if !activities.is_empty() {
        out.push(h2(&tr("Activité récente", "Recent activity")));
        out.extend(group(activities.iter().take(6).map(|item| {
            let title = ["message", "description", "title", "action"].iter().map(|key| text_of(&item[*key])).find(|value| !value.is_empty()).unwrap_or_default();
            row(vec![text(&title).grow(), muted(&when(&item["timestamp"]))])
        }).collect()));
    }
    out
}

fn toggle(app: &mut App, id: &str) {
    let Some(guild) = guild() else { return };
    let key = format!("discord:{guild}:m:home:api/guilds/{guild}/modules");
    let Some(mut data) = app.res.get(&key).and_then(|res| res.data.clone()).map(|data| (*data).clone()) else { return };
    let mut enabled = false;
    if let Some(items) = data["modules"].as_array_mut() {
        for item in items.iter_mut().filter(|item| item["id"] == id) {
            enabled = item["enabled"] != true;
            item["enabled"] = enabled.into();
        }
    }
    app.finish(&key, Ok(data));
    app.state.discord.message = None;
    spawn(bot("PATCH", &format!("api/guilds/{guild}/modules/{id}"), Some(json!({ "enabled": enabled }))), move |app, result| {
        if let Err(error) = result {
            app.state.discord.message = Some((error_text(&error), false));
            app.forget(&key);
        }
    });
}

pub fn login_done(app: &mut App, result: &Result<(), String>) {
    app.state.discord.waiting = false;
    match result {
        Ok(()) => {
            app.state.discord.linked = Some(true);
            app.state.discord.error = None;
        }
        Err(error) => app.state.discord.error = Some(error_text(error)),
    }
}

fn connect(app: &mut App) {
    app.state.discord.waiting = true;
    app.state.discord.error = None;
    let opened = crate::background::register_protocol().and_then(|_| crate::services::open_url(ethone_engine::bot::LOGIN_URL));
    if let Err(error) = opened {
        app.state.discord.waiting = false;
        app.state.discord.error = Some(error_text(&error));
    }
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    let current = guild().unwrap_or_default();
    match verb {
        "connect" => connect(app),
        "logout" => {
            ethone_engine::bot::sign_out();
            app.state.discord.linked = Some(false);
            app.forget("discord:");
        }
        "guild" => {
            prefs::write_json(GUILD_KEY, &value.to_string());
            app.state.discord.message = None;
        }
        "query" => app.state.discord.query = value.into(),
        "home" => {
            set_module(app, "");
            set_section(SECTION_KEY, "home");
        }
        "module" => {
            set_module(app, arg);
            if let Some(spec) = spec_of(arg) {
                set_section(SECTION_KEY, spec["group"].as_str().unwrap_or("home"));
            }
            app.state.discord.query.clear();
        }
        "pane" | "pane-select" => {
            app.state.discord.pane = if verb == "pane" { arg.into() } else { value.into() };
            app.state.discord.confirm = None;
        }
        "refresh" => app.forget(&format!("discord:{current}:")),
        "toggle" => toggle(app, arg),
        "cancel" => app.state.discord.confirm = None,
        "ask" => app.state.discord.confirm = Some(arg.into()),
        "yes" => {
            let mut parts = arg.split('|');
            let (kind, target, extra) = (parts.next().unwrap_or_default(), parts.next().unwrap_or_default().to_string(), parts.next().unwrap_or_default().to_string());
            let module = current_module().and_then(|spec| spec["id"].as_str()).unwrap_or_default().to_string();
            let refresh = format!("discord:{current}:m:{module}");
            let work = match kind {
                "revert" => bot("POST", &format!("api/guilds/{current}/moderation/cases/{target}/revert"), Some(json!({}))),
                "unban" => bot("POST", &format!("api/guilds/{current}/moderation/unban"), Some(json!({ "userId": target, "reason": "Débanni depuis Ethone" }))),
                "ticket-close" => {
                    app.state.discord.ticket = None;
                    app.close_drawer();
                    bot("POST", &format!("api/guilds/{current}/tickets/tickets/{target}/close"), Some(json!({ "closedBy": "Ethone", "reason": "Fermé depuis Ethone" })))
                }
                "giveaway" => bot("POST", &format!("api/guilds/{current}/giveaways/{target}/{extra}"), Some(json!({}))),
                "action" => match current_module().and_then(|spec| target.parse::<usize>().ok().map(|at| (spec, &spec["actions"][at]))) {
                    Some((spec, action)) => bot(action["method"].as_str().unwrap_or("POST"), &module_url(spec, &current, action["path"].as_str().unwrap_or_default()), Some(action["body"].clone()).filter(|body| !body.is_null()).or(Some(json!({})))),
                    None => return,
                },
                _ => return,
            };
            run(app, work, refresh);
        }
        "action" => {
            if let Some((spec, action)) = current_module().and_then(|spec| arg.parse::<usize>().ok().map(|at| (spec, &spec["actions"][at]))) {
                let work = bot(action["method"].as_str().unwrap_or("POST"), &module_url(spec, &current, action["path"].as_str().unwrap_or_default()), Some(action["body"].clone()).filter(|body| !body.is_null()).or(Some(json!({}))));
                run(app, work, format!("discord:{current}:m:{}", spec["id"].as_str().unwrap_or_default()));
            }
        }
        "create" => {
            if let Some((module, at)) = arg.rsplit_once(':') {
                open_create(app, module, at.parse().unwrap_or(0));
            }
        }
        "value" => {
            app.state.discord.values.insert(arg.to_string(), value.to_string());
        }
        "create-submit" => submit_create(app),
        "members-filter" => app.state.discord.members_filter = value.into(),
        "members-more" => app.state.discord.members_page = app.state.discord.members_page.max(1) + 1,
        "audit-filter" => app.state.discord.audit_filter = value.into(),
        "ticket" => {
            let key = format!("discord:{current}:m:tickets:api/guilds/{current}/tickets/list");
            let found = app.res.get(&key).and_then(|res| res.data.clone()).and_then(|data| arg.parse::<usize>().ok().and_then(|at| data["tickets"].get(at).cloned()));
            if let Some(found) = found {
                let title = Some(text_of(&found["categoryName"])).filter(|value| !value.is_empty()).unwrap_or_else(|| "Ticket".into());
                app.state.discord.ticket = Some(found);
                app.state.discord.message = None;
                app.open_drawer(&title, 520.0, ticket_view);
            }
        }
        "ticket-claim" => {
            app.state.discord.ticket = None;
            app.close_drawer();
            run(app, bot("POST", &format!("api/guilds/{current}/tickets/tickets/{arg}/claim"), Some(json!({ "claimedBy": "Ethone" }))), format!("discord:{current}:m:tickets"));
        }
        "giveaway-reroll" => run(app, bot("POST", &format!("api/guilds/{current}/giveaways/{arg}/reroll"), Some(json!({}))), format!("discord:{current}:m:giveaways")),
        "suggestion" => {
            if let Some((target, status)) = arg.split_once(':') {
                run(app, bot("POST", &format!("api/guilds/{current}/suggestions/{target}/status"), Some(json!({ "status": status }))), format!("discord:{current}:m:suggestions"));
            }
        }
        "music" => {
            app.state.discord.music_at = 0.0;
            run(app, bot("POST", &format!("api/guilds/{current}/music/{arg}"), Some(json!({}))), format!("discord:{current}:m:music"));
        }
        "music-query" => app.state.discord.music_query = value.into(),
        "music-search" | "music-query:submit" => {
            let query = app.state.discord.music_query.trim().to_string();
            if query.is_empty() {
                return;
            }
            app.state.discord.music_searching = true;
            spawn(bot("GET", &format!("api/guilds/{current}/music/search?q={}", encode(&query)), None), |app, result| {
                app.state.discord.music_searching = false;
                app.state.discord.music_results = result.ok().and_then(|data| data["results"].as_array().cloned()).unwrap_or_default();
            });
        }
        "music-play" => {
            let Some(item) = arg.parse::<usize>().ok().and_then(|at| app.state.discord.music_results.get(at).cloned()) else { return };
            let query = ["uri", "url", "title"].iter().map(|key| text_of(&item[*key])).find(|value| !value.is_empty()).unwrap_or_default();
            app.state.discord.music_at = 0.0;
            run(app, bot("POST", &format!("api/guilds/{current}/music/play"), Some(json!({ "query": query }))), format!("discord:{current}:m:music"));
        }
        "music-remove" => {
            app.state.discord.music_at = 0.0;
            run(app, bot("DELETE", &format!("api/guilds/{current}/music/queue/{arg}"), None), format!("discord:{current}:m:music"));
        }
        _ => {}
    }
}

pub fn view(app: &mut App) -> Page {
    let linked = *app.state.discord.linked.get_or_insert_with(ethone_engine::bot::linked);
    if !linked {
        let (mark, link_icon) = (app.icon("provider-discord"), app.icon("external-link"));
        let state = &app.state.discord;
        let mut main = vec![
            B { kind: "logo", image: mark, title: tr("Connecte ton compte Discord", "Link your Discord account"), sub: tr("La connexion s'ouvre dans ton navigateur, puis revient dans Ethone. Elle donne accès à la gestion du bot sur tes serveurs.", "Sign-in opens in your browser, then returns to Ethone. It gives access to bot management on your servers."), tone: "icon", ..Default::default() },
            row(vec![primary("discord:connect", &if state.waiting { tr("Rouvrir le navigateur", "Reopen the browser") } else { tr("Se connecter avec Discord", "Sign in with Discord") }).icon(link_icon)]).center(),
        ];
        if let Some(message) = &state.error {
            main.push(bad(message));
        }
        return Page { main, ..Default::default() };
    }
    let guilds = app.load("discord:guilds", || bot("GET", "api/guilds", None));
    if let Some(message) = &guilds.error {
        if ["Connecte", "discordRequired", "Sign in"].iter().any(|word| message.contains(word)) {
            app.state.discord.linked = Some(false);
            app.forget("discord:");
            return view(app);
        }
    }
    let mut usable: Vec<Value> = guilds.data.as_ref().and_then(|data| data["guilds"].as_array().cloned()).unwrap_or_default().into_iter().filter(|item| item["botPresent"] != false).collect();
    usable.sort_by(|left, right| left["name"].as_str().unwrap_or_default().cmp(right["name"].as_str().unwrap_or_default()));
    let mut chosen = guild();
    if !usable.is_empty() && !usable.iter().any(|item| item["id"].as_str() == chosen.as_deref()) {
        chosen = usable[0]["id"].as_str().map(str::to_string);
        if let Some(first) = &chosen {
            prefs::write_json(GUILD_KEY, first);
        }
    }
    let current = usable.iter().find(|item| item["id"].as_str() == chosen.as_deref()).cloned();
    let options: Vec<(String, String)> = usable.iter().map(|item| (item["id"].as_str().unwrap_or_default().to_string(), item["name"].as_str().unwrap_or_default().to_string())).collect();
    let query = app.state.discord.query.clone();
    let logout = app.icon("log-out");
    let mut bar = Vec::new();
    if guilds.data.is_some() && !options.is_empty() {
        bar.push(app.select("discord:guild", chosen.as_deref().unwrap_or_default(), &options));
    }
    bar.push(input("discord:query", &query, &tr("Chercher un module", "Find a module")).tip(&tr("Chercher un module", "Find a module")));
    bar.push(link("discord:logout", &tr("Déconnecter", "Disconnect")).icon(logout));
    let mut main = vec![row(bar)];
    if guilds.data.is_none() && guilds.loading {
        main.extend(skeletons(1, 34.0));
    }
    if let Some(message) = &guilds.error {
        main.push(error(message, vec![btn("discord:refresh-guilds", &tr("Réessayer", "Retry"))]));
    }
    if guilds.data.is_some() && usable.is_empty() && guilds.error.is_none() {
        main.push(empty(&tr("Aucun serveur avec le bot", "No server with the bot"), &tr("Invite le bot sur un de tes serveurs depuis ethone.dev.", "Invite the bot to one of your servers from ethone.dev.")));
    }
    let text = query.trim().to_lowercase();
    let mut side = vec![("discord:home".to_string(), tr("Vue d'ensemble", "Overview"), "house".to_string(), String::new())];
    for group_name in groups() {
        let shown: Vec<&Value> = modules().iter().filter(|item| item["group"] == group_name.as_str() && (text.is_empty() || item["title"].as_str().unwrap_or_default().to_lowercase().contains(&text) || item["id"].as_str().unwrap_or_default().contains(&text))).collect();
        if shown.is_empty() {
            continue;
        }
        let heading = group_label(&group_name);
        side.push((String::new(), heading.clone(), String::new(), String::new()));
        side.extend(shown.iter().map(|item| (format!("discord:module:{}", item["id"].as_str().unwrap_or_default()), item["title"].as_str().unwrap_or_default().to_string(), String::new(), heading.clone())));
    }
    if !text.is_empty() && side.len() == 1 {
        main.push(note(&tr("Aucun module trouvé.", "No module found.")));
    }
    let spec = current_module();
    let active = spec.map_or_else(|| "discord:home".to_string(), |spec| format!("discord:module:{}", spec["id"].as_str().unwrap_or_default()));
    if let (Some(guild), Some(current)) = (chosen, current) {
        match spec {
            Some(spec) => main.extend(module_view(app, spec, &guild)),
            None => main.extend(overview(app, &current)),
        }
    }
    Page { side, side_active: active, main, ..Default::default() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs.iter().map(|(key, value)| (key.to_string(), value.to_string())).collect()
    }

    #[test]
    fn module_urls_follow_the_base() {
        let members = spec_of("members").expect("members");
        assert_eq!(module_url(members, "42", "/members"), "api/guilds/42/server/members");
        let tickets = spec_of("tickets").expect("tickets");
        assert_eq!(module_url(tickets, "42", "/"), "api/guilds/42/tickets");
        assert!(modules().iter().filter(|item| item["id"] == "moderation").count() == 1);
    }

    #[test]
    fn commands_build_embeds_fields_and_buttons() {
        let values = ctx(&[("name", "salut"), ("embedTitle", "Titre"), ("embedFields", "Nom | Valeur\nseul\nA | b | c"), ("buttonLabel", "Site"), ("buttonUrl", "https://ethone.dev")]);
        let body = build_command(&Ctx { values: &values, roles: &[] });
        let response = &body["defaultActions"][0]["response"];
        assert_eq!(response["embed"]["color"], "#6366F1");
        assert_eq!(response["embed"]["fields"].as_array().map(Vec::len), Some(2));
        assert_eq!(response["embed"]["fields"][1]["value"], "b|c");
        assert_eq!(response["buttons"][0]["url"], "https://ethone.dev");
        assert_eq!(body["description"], "Commande personnalisée");
        let empty_body = build_command(&Ctx { values: &ctx(&[("name", "x")]), roles: &[] });
        assert_eq!(empty_body["defaultActions"][0]["response"]["content"], "(réponse vide)");
    }

    #[test]
    fn events_need_a_readable_date_and_last_at_least_15_minutes() {
        let values = ctx(&[("title", "Soirée"), ("startDate", "2026-12-01 20:00"), ("durationMinutes", "5")]);
        let body = build_event(&Ctx { values: &values, roles: &[] });
        assert_eq!(body["durationMinutes"], 15.0);
        assert!(body["endDate"].as_str().is_some());
        assert!(build_event(&Ctx { values: &ctx(&[("startDate", "demain")]), roles: &[] }).is_null());
    }

    #[test]
    fn role_names_come_from_the_directory() {
        let values = ctx(&[]);
        let roles = vec![("1".to_string(), "VIP".to_string())];
        let context = Ctx { values: &values, roles: &roles };
        assert_eq!(context.role_name("1"), "VIP");
        assert_eq!(context.role_name("2"), "Rôle");
        assert_eq!(uuid().len(), 36);
    }
}
