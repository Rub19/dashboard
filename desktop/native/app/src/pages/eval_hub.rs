use crate::app::{entry, spawn, App};
use crate::i18n::{error_text, fr, t, tr};
use crate::logic::eval::{banner_image, mode_name, rank_color, rank_name, split_riot_id, stats_for, tier_icon};
use crate::logic::friends::{board_of, card_image, friend_portrait, last_seen_text, presence_kind, text as ftext};
use crate::logic::time;
use crate::pages::{encode, first_array, section, set_section};
use crate::pages::generic::number_text;
use crate::prefs;
use crate::services::{api_data, bot, catalog_get, riot_call, riot_get, rest_get, svc, Fut};
use crate::vm::*;
use serde_json::{json, Value};

const SECTION_KEY: &str = "ethone-section-hub";
const LANGUAGE: &str = "language=fr-FR";
const REGIONS: [&str; 6] = ["eu", "na", "ap", "kr", "latam", "br"];
const CARD_KEY: &str = "ethone-friend-cards";
const ICON_KEY: &str = "ethone-friend-icons";

#[derive(Default)]
pub struct HubState {
    pub region: String,
    pub search: String,
    pub found: Option<Value>,
    pub busy: bool,
    pub error: Option<String>,
    pub friends_query: String,
    pub open: Option<Value>,
    pub collection_query: String,
    pub collection_weapon: String,
    pub lineup_map: i64,
    pub lineup_agent: i64,
    pub snapshot_name: String,
    pub confirm: Option<String>,
    pub message: Option<(String, bool)>,
    pub recap_guild: String,
    pub recap_channel: String,
    pub portraits_running: bool,
    pub friends_at: f64,
}

pub fn side() -> Vec<(String, String, String, String)> {
    let players = tr("Joueurs", "Players");
    let tools = tr("Outils", "Tools");
    let game = tr("Le jeu", "The game");
    let mut out = vec![(String::new(), players.clone(), String::new(), String::new())];
    for (id, label, icon) in [("friends", tr("Amis", "Friends"), "user-plus"), ("leaderboard", tr("Classement", "Leaderboard"), "trophy"), ("players", tr("Rechercher un joueur", "Find a player"), "users"), ("seasons", tr("Mes saisons", "My seasons"), "book-open"), ("names", tr("Mes anciens pseudos", "My past names"), "history"), ("collection", tr("Ma collection", "My collection"), "sparkles"), ("goal", tr("Objectif de saison", "Season goal"), "target"), ("contracts", tr("Contrats d'agents", "Agent contracts"), "file-text")] {
        out.push((format!("eval:hub:{id}"), label, icon.into(), players.clone()));
    }
    out.push((String::new(), tools.clone(), String::new(), String::new()));
    for (id, label, icon) in [("recap", tr("Récap Discord", "Discord recap"), "send"), ("settings", tr("Paramètres de jeu", "Game settings"), "save")] {
        out.push((format!("eval:hub:{id}"), label, icon.into(), tools.clone()));
    }
    out.push((String::new(), game.clone(), String::new(), String::new()));
    for (id, label, icon) in [("lineups", "Line-ups".to_string(), "crosshair"), ("maps", tr("Cartes", "Maps"), "map"), ("agents", tr("Agents", "Agents"), "users"), ("weapons", tr("Armes", "Weapons"), "crosshair")] {
        out.push((format!("eval:hub:{id}"), label, icon.into(), game.clone()));
    }
    out
}

pub fn current() -> String {
    section(SECTION_KEY, "friends")
}

fn search_player(app: &mut App, text: &str) {
    let Some((name, tag)) = split_riot_id(text) else {
        app.state.hub.error = Some(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
        return;
    };
    app.state.hub.busy = true;
    app.state.hub.error = None;
    spawn(
        async move {
            let path = ethone_engine::tracker::sync_path(&name, &tag)?;
            let account = ethone_engine::tracker::parse_account(svc().auth.worker_get(&path).await?)?;
            let puuid = account["puuid"].as_str().unwrap_or_default().to_string();
            let matches = ethone_engine::tracker::parse_matches(svc().auth.rest_get(&ethone_engine::tracker::matches_path(&puuid, 20)?).await?)?;
            Ok::<Value, String>(json!({ "account": account, "matches": matches }))
        },
        |app, result| {
            app.state.hub.busy = false;
            match result {
                Ok(found) => app.state.hub.found = Some(found),
                Err(error) => app.state.hub.error = Some(error_text(&error)),
            }
        },
    );
}

pub fn load_friends(app: &mut App) {
    app.state.hub.friends_at = time::now_ms();
    let had = app.res.get("eval:friends").and_then(|res| res.data.clone());
    if had.is_none() {
        if let Some((_, saved)) = crate::cache::read("riot:friends") {
            app.finish("eval:friends", Ok(saved));
        }
    }
    app.reload("eval:friends", || Box::pin(async {
        if !svc().auth.is_signed_in().await {
            return Err("sessionRequired".to_string());
        }
        let list = svc().riot.friends(svc().host.as_ref()).await?;
        let value = serde_json::to_value(list).map_err(|error| error.to_string())?;
        crate::cache::write("riot:friends", &value);
        Ok(value)
    }));
}

pub fn portraits(app: &mut App, friends: &[Value], lol: bool) {
    if app.state.hub.portraits_running {
        return;
    }
    let cards: serde_json::Map<String, Value> = prefs::read_json(CARD_KEY).unwrap_or_default();
    let icons: serde_json::Map<String, Value> = prefs::read_json(ICON_KEY).unwrap_or_default();
    let tried_key = format!("ethone-friend-cards-tried-{}", if lol { "lol" } else { "val" });
    let tried: serde_json::Map<String, Value> = prefs::read_json(&tried_key).unwrap_or_default();
    let now = time::now_ms();
    let missing: Vec<Value> = friends.iter().filter(|friend| {
        let id = ftext(friend, "id");
        let has_card = !ftext(friend, "card").is_empty() || cards.contains_key(id);
        let has_icon = !ftext(friend, "icon").is_empty() || icons.contains_key(id);
        let missing = if lol { !has_icon } else { !has_card && !has_icon };
        missing && now - tried.get(id).and_then(Value::as_f64).unwrap_or(0.0) > 30.0 * 60000.0
    }).take(60).cloned().collect();
    if missing.is_empty() {
        return;
    }
    app.state.hub.portraits_running = true;
    svc().rt.spawn(async move {
        for friend in missing {
            let id = ftext(&friend, "id").to_string();
            let mut tried: serde_json::Map<String, Value> = prefs::read_json(&tried_key).unwrap_or_default();
            tried.insert(id.clone(), json!(time::now_ms()));
            prefs::write_json(&tried_key, &tried);
            let mut card = String::new();
            if !lol {
                if let Ok(history) = riot_call("pd", &format!("/match-history/v1/history/{id}?startIndex=0&endIndex=1"), "GET", None).await {
                    if let Some(match_id) = history["History"][0]["MatchID"].as_str() {
                        if let Ok(details) = riot_get(&format!("/match-details/v1/matches/{match_id}")).await {
                            card = details["players"].as_array().and_then(|list| list.iter().find(|player| player["subject"].as_str().is_some_and(|subject| subject.eq_ignore_ascii_case(&id)))).and_then(|player| player["playerCard"].as_str()).unwrap_or_default().to_string();
                        }
                    }
                }
            }
            if !card.is_empty() {
                let mut cards: serde_json::Map<String, Value> = prefs::read_json(CARD_KEY).unwrap_or_default();
                cards.insert(id.clone(), json!(card));
                prefs::write_json(CARD_KEY, &cards);
            } else if let Ok(profile) = api_data(&format!("api/stats/lol-profile?name={}&tag={}", encode(ftext(&friend, "name")), encode(ftext(&friend, "tag")))).await {
                if let Some(icon) = profile["avatarUrl"].as_str().filter(|icon| !icon.is_empty()) {
                    let mut icons: serde_json::Map<String, Value> = prefs::read_json(ICON_KEY).unwrap_or_default();
                    icons.insert(id.clone(), json!(icon));
                    prefs::write_json(ICON_KEY, &icons);
                }
            }
            crate::app::post(|_| {});
            tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
        }
        crate::app::post(|app| app.state.hub.portraits_running = false);
    });
}

pub fn act(app: &mut App, verb: &str, arg: &str, value: &str) -> bool {
    match verb {
        "hub" => set_section(SECTION_KEY, arg),
        "region" => app.state.hub.region = value.into(),
        "player-text" => app.state.hub.search = value.into(),
        "player-search" | "player-text:submit" => {
            let text = app.state.hub.search.clone();
            search_player(app, &text);
        }
        "bookmark" => {
            let mut saved: Vec<String> = prefs::read_json("ethone-eval-bookmarks").unwrap_or_default();
            saved = crate::logic::toggle_pinned(&saved, arg);
            prefs::write_json("ethone-eval-bookmarks", &saved);
        }
        "bookmark-open" => {
            app.state.hub.search = arg.to_string();
            search_player(app, arg);
        }
        "friends-refresh" => load_friends(app),
        "friends-query" => app.state.hub.friends_query = value.into(),
        "friend-open" => {
            set_section(SECTION_KEY, "players");
            app.state.hub.search = arg.to_string();
            search_player(app, arg);
        }
        "friend-copy" => match crate::clipboard::set(arg) {
            Ok(()) => app.toast(&tr("Identifiant copié", "Riot ID copied")),
            Err(_) => app.toast_bad(&tr("Impossible de copier.", "Could not copy.")),
        },
        "map" | "agent" | "weapon" => {
            let collection = match verb { "map" => "eval:hub-maps", "agent" => "eval:hub-agents", _ => "eval:weapons" };
            let found = app.res.get(collection).and_then(|res| res.data.clone()).and_then(|data| data.as_array().and_then(|list| list.iter().find(|item| item["uuid"] == arg).cloned()));
            if let Some(item) = found {
                let title = item["displayName"].as_str().unwrap_or_default().to_string();
                app.state.hub.open = Some(json!({ "kind": verb, "item": item }));
                app.open_drawer(&title, if verb == "weapon" { 640.0 } else { 560.0 }, hub_drawer);
            }
        }
        "collection-query" => app.state.hub.collection_query = value.into(),
        "collection-weapon" => app.state.hub.collection_weapon = value.into(),
        "goal" => prefs::write_json("ethone-eval-goal-tier", &value.parse::<i64>().unwrap_or(0)),
        "lineup-map" => app.state.hub.lineup_map = value.parse().unwrap_or(0),
        "lineup-agent" => app.state.hub.lineup_agent = value.parse().unwrap_or(0),
        "lineup-open" => {
            let found = app.res.get("eval:lineups").and_then(|res| res.data.clone()).and_then(|data| data.as_array().and_then(|list| list.iter().find(|item| item["id"] == arg).cloned()));
            if let Some(item) = found {
                let video = item["video"].as_str().unwrap_or_default();
                let (id, query) = video.split_once('?').unwrap_or((video, ""));
                if !id.is_empty() {
                    let extra = if query.is_empty() { String::new() } else { format!("&{}", query.replace("start=", "t=")) };
                    let _ = crate::services::open_url(&format!("https://www.youtube.com/watch?v={}{extra}", encode(id)));
                }
            }
        }
        "snapshot-name" => app.state.hub.snapshot_name = value.into(),
        "snapshot-save" | "snapshot-name:submit" => {
            let name = app.state.hub.snapshot_name.trim().to_string();
            if name.is_empty() {
                return true;
            }
            app.state.hub.message = None;
            spawn(riot_call("prefs", "/getPreference/Ares.PlayerSettings", "GET", None), move |app, result| match result {
                Ok(preference) => {
                    let mut list: Vec<Value> = prefs::read_json("ethone-eval-settings-snapshots").unwrap_or_default();
                    list.insert(0, json!({ "id": format!("{}", time::now_ms() as i64), "name": name, "data": preference["data"], "createdAt": time::iso(&chrono::Local::now()) }));
                    prefs::write_json("ethone-eval-settings-snapshots", &list);
                    app.state.hub.snapshot_name.clear();
                    app.state.hub.message = Some((tr("Paramètres sauvegardés sur ce PC.", "Settings saved on this PC."), true));
                }
                Err(error) => app.state.hub.message = Some((error_text(&error), false)),
            });
        }
        "snapshot-ask" => app.state.hub.confirm = Some(arg.to_string()),
        "snapshot-cancel" => app.state.hub.confirm = None,
        "snapshot-apply" => {
            let list: Vec<Value> = prefs::read_json("ethone-eval-settings-snapshots").unwrap_or_default();
            let Some(snapshot) = list.iter().find(|item| item["id"] == arg).cloned() else { return true };
            spawn(riot_call("prefs", "/savePreference", "PUT", Some(json!({ "type": "Ares.PlayerSettings", "data": snapshot["data"] }))), |app, result| {
                app.state.hub.confirm = None;
                app.state.hub.message = Some(match result {
                    Ok(_) => (tr("Paramètres appliqués. Relance VALORANT pour les voir.", "Settings applied. Restart VALORANT to see them."), true),
                    Err(error) => (error_text(&error), false),
                });
            });
        }
        "snapshot-delete" => {
            let mut list: Vec<Value> = prefs::read_json("ethone-eval-settings-snapshots").unwrap_or_default();
            list.retain(|item| item["id"] != arg);
            prefs::write_json("ethone-eval-settings-snapshots", &list);
        }
        "recap-guild" => {
            app.state.hub.recap_guild = value.into();
            app.state.hub.recap_channel.clear();
        }
        "recap-channel" => app.state.hub.recap_channel = value.into(),
        "recap-post" => post_recap(app),
        _ => return false,
    }
    true
}

fn post_recap(app: &mut App) {
    let Some(data) = app.state.eval.data.clone() else { return };
    let account = data["account"].clone();
    let Some(item) = data["matches"][0].as_object().map(|_| data["matches"][0].clone()) else { return };
    let Some(summary) = crate::logic::eval::match_summary(&item, account["puuid"].as_str().unwrap_or_default()) else { return };
    let (guild, channel) = (app.state.hub.recap_guild.clone(), app.state.hub.recap_channel.clone());
    prefs::write_json("ethone-eval-recap", &json!({ "guild": guild, "channel": channel }));
    let body = json!({
        "channelId": channel,
        "won": summary.won,
        "author": format!("{}#{}", account["name"].as_str().unwrap_or_default(), account["tag"].as_str().unwrap_or_default()),
        "title": format!("{}  {} — {}", if summary.won { "🟢 VICTOIRE" } else { "🔴 DÉFAITE" }, summary.score.0, summary.score.1),
        "description": format!("**{}**, {}, {}", summary.me["agent"].as_str().unwrap_or_default(), mode_name(item["mode"].as_str().unwrap_or_default()), item["map"].as_str().unwrap_or_default()),
        "fields": [
            { "name": "🎯 K / D / A", "value": format!("**{} / {} / {}**", summary.me["kills"], summary.me["deaths"], summary.me["assists"]), "inline": true },
            { "name": "📈 ACS", "value": summary.line.acs.to_string(), "inline": true },
            { "name": "💥 ADR", "value": summary.line.adr.to_string(), "inline": true },
            { "name": "🧠 HS%", "value": format!("{} %", summary.line.hs), "inline": true },
        ],
        "players": [],
        "rounds": "",
        "footer": "E:VAL, ETHONE",
    });
    app.state.hub.busy = true;
    app.state.hub.message = None;
    spawn(bot("POST", &format!("api/guilds/{guild}/valorant/recap"), Some(body)), |app, result| {
        app.state.hub.busy = false;
        app.state.hub.message = Some(match result {
            Ok(_) => (tr("Récap publié.", "Recap posted."), true),
            Err(error) => (error_text(&error), false),
        });
    });
}

fn hub_drawer(app: &mut App) -> Vec<B> {
    let Some(open) = app.state.hub.open.clone() else { return Vec::new() };
    let item = &open["item"];
    let mut out = Vec::new();
    match open["kind"].as_str().unwrap_or_default() {
        "map" => {
            out.push(B { kind: "stage", image: app.img(item["splash"].as_str().unwrap_or_default()), height: 220.0, ..Default::default() });
            if let Some(text) = item["narrativeDescription"].as_str() {
                out.push(prose(text));
            }
            if let Some(text) = item["coordinates"].as_str() {
                out.push(note(text));
            }
            let mut callouts: Vec<String> = item["callouts"].as_array().into_iter().flatten().map(|callout| format!("{} {}", callout["superRegionName"].as_str().unwrap_or_default(), callout["regionName"].as_str().unwrap_or_default()).trim().to_string()).collect();
            callouts.sort();
            callouts.dedup();
            if !callouts.is_empty() {
                out.push(h2(&tr("Repères", "Callouts")));
                for chunk in callouts.chunks(5) {
                    out.push(row(chunk.iter().map(|name| chip("", name)).collect()).gap(6.0));
                }
            }
        }
        "agent" => {
            out.push(B { kind: "stage", image: app.img(item["fullPortrait"].as_str().unwrap_or_default()), height: 260.0, ..Default::default() });
            out.push(note(item["role"]["displayName"].as_str().unwrap_or_default()));
            out.push(prose(item["description"].as_str().unwrap_or_default()));
            let abilities = item["abilities"].as_array().cloned().unwrap_or_default();
            out.extend(group(abilities.iter().map(|ability| row(vec![C { kind: "icon", icon: app.img(ability["displayIcon"].as_str().unwrap_or_default()), size: 28.0, ..Default::default() }, stack_wrap(ability["displayName"].as_str().unwrap_or_default(), ability["description"].as_str().unwrap_or_default())])).collect()));
        }
        _ => {
            out.push(B { kind: "stage", image: app.img(item["displayIcon"].as_str().unwrap_or_default()), height: 140.0, ..Default::default() });
            let stats = &item["weaponStats"];
            if stats.is_object() {
                out.push(row(vec![stat(&tr("Cadence", "Fire rate"), &number_text(stats["fireRate"].as_f64().unwrap_or(0.0)), ""), stat(&tr("Chargeur", "Magazine"), &number_text(stats["magazineSize"].as_f64().unwrap_or(0.0)), ""), stat(&tr("Rechargement", "Reload"), &format!("{} s", number_text(stats["reloadTimeSeconds"].as_f64().unwrap_or(0.0))), "")]));
                let ranges = stats["damageRanges"].as_array().cloned().unwrap_or_default();
                if !ranges.is_empty() {
                    out.push(row(vec![muted(&tr("Distance", "Range")).grow(), muted(&tr("Tête", "Head")), muted(&tr("Corps", "Body")), muted(&tr("Jambes", "Legs"))]));
                    out.extend(group(ranges.iter().map(|range| row(vec![text(&format!("{}–{} m", range["rangeStartMeters"], range["rangeEndMeters"])).grow(), text(&format!("{}", range["headDamage"].as_f64().unwrap_or(0.0).round())), text(&format!("{}", range["bodyDamage"].as_f64().unwrap_or(0.0).round())), text(&format!("{}", range["legDamage"].as_f64().unwrap_or(0.0).round()))])).collect()));
                }
            }
            out.push(h2(&tr("Apparences", "Skins")));
            let cells: Vec<C> = item["skins"].as_array().into_iter().flatten().filter(|skin| skin["displayIcon"].is_string()).map(|skin| C { kind: "variant", id: format!("eval:skin:{}", skin["uuid"].as_str().unwrap_or_default()), title: skin["displayName"].as_str().unwrap_or_default().into(), image: app.img(skin["displayIcon"].as_str().unwrap_or_default()), weight: 1.0, ..Default::default() }).collect();
            for chunk in cells.chunks(3) {
                out.push(row(chunk.to_vec()).gap(6.0));
            }
        }
    }
    out
}

fn not_linked(text_value: &str) -> Vec<B> {
    vec![empty_with(&tr("Compte Riot non connecté", "Riot account not linked"), text_value, vec![primary("eval:connect", &tr("Connecter mon compte Riot", "Link my Riot account"))])]
}

pub fn friends(app: &mut App, linked: bool, account: Option<&Value>, lol: bool) -> Vec<B> {
    if !linked {
        return not_linked(&tr("Connecte ton compte Riot pour voir tes amis en direct.", "Link your Riot account to see your friends live."));
    }
    if app.res.get("eval:friends").is_none() || time::now_ms() - app.state.hub.friends_at > 60000.0 && app.res.get("eval:friends").is_some_and(|res| !res.loading) {
        load_friends(app);
    }
    let res = app.res.get("eval:friends").cloned().unwrap_or_default();
    let refresh = app.icon("refresh-cw");
    let list: Vec<Value> = res.data.as_deref().and_then(Value::as_array).cloned().unwrap_or_default();
    let online = list.iter().filter(|friend| friend["online"] == true).count();
    let mut out = vec![head(&tr("Amis", "Friends"), &if res.data.is_some() { tr(&format!("{online} en ligne sur {}", list.len()), &format!("{online} online of {}", list.len())) } else { String::new() }, vec![btn("eval:friends-refresh", &tr("Actualiser", "Refresh")).icon(refresh).off(res.loading)])];
    let search = app.icon("search");
    let query = app.state.hub.friends_query.clone();
    out.push(row(vec![input("eval:friends-query", &query, &tr("Rechercher des amis", "Search friends")).icon(search)]));
    if let Some(message) = res.error.clone() {
        let mut cells = vec![btn("eval:friends-refresh", &t("retry"))];
        if crate::logic::riot_reconnect_required(&message) {
            cells.push(primary("eval:connect", &tr("Se reconnecter à Riot", "Sign in to Riot again")));
        }
        out.push(error(&message, cells));
    }
    if res.data.is_none() {
        if res.error.is_none() {
            out.extend(skeletons(6, 56.0));
        }
        return out;
    }
    portraits(app, &list, lol);
    let cards: serde_json::Map<String, Value> = prefs::read_json(CARD_KEY).unwrap_or_default();
    let icons: serde_json::Map<String, Value> = prefs::read_json(ICON_KEY).unwrap_or_default();
    let maps = app.load("eval:hub-maps", || catalog_get(&format!("/maps?{LANGUAGE}"))).data;
    let titles = app.load("eval:titles", || catalog_get(&format!("/playertitles?{LANGUAGE}"))).data;
    let map_name = |url: &str| maps.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|map| map["mapUrl"].as_str().is_some_and(|other| other.eq_ignore_ascii_case(url)))).and_then(|map| map["displayName"].as_str()).unwrap_or_default().to_string();
    let title_of = |id: &str| titles.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|item| item["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(id)))).and_then(|item| item["titleText"].as_str()).unwrap_or_default().to_string();
    let board = board_of(&list, &query);
    let now = time::now_ms();
    let mut line = |app: &mut App, friend: &Value| -> B {
        let id = ftext(friend, "id");
        let handle = format!("{}#{}", ftext(friend, "name"), ftext(friend, "tag"));
        let portrait = friend_portrait(friend, cards.get(id).and_then(Value::as_str), icons.get(id).and_then(Value::as_str), lol);
        let mut face = avatar(&ftext(friend, "name").chars().next().map_or(String::new(), |first| first.to_uppercase().to_string()), app.img(&portrait), 38.0);
        face.tone = presence_kind(friend);
        face.kind = "presence";
        let (status, place) = if friend["online"] != true {
            (last_seen_text(ftext(friend, "lastOnline"), now), String::new())
        } else if ftext(friend, "product") != "valorant" {
            (if friend["playing"] == true { tr("En jeu", "In game") } else if ftext(friend, "show") == "dnd" { tr("Occupé", "Busy") } else if friend["idle"] == true || ftext(friend, "show") == "away" { tr("Inactif", "Away") } else { tr("En ligne", "Online") }, String::new())
        } else {
            let mode = if ftext(friend, "queue").is_empty() { String::new() } else { mode_name(ftext(friend, "queue")) };
            let map = map_name(ftext(friend, "map"));
            let place = [mode.clone(), map].into_iter().filter(|part| !part.is_empty()).collect::<Vec<_>>().join(" • ");
            match ftext(friend, "state") {
                "INGAME" => (tr(&format!("En jeu {} – {}", friend["allyScore"], friend["enemyScore"]), &format!("In game {} – {}", friend["allyScore"], friend["enemyScore"])), place),
                "PREGAME" => (tr("Sélection d'agent", "Agent select"), place),
                _ if ftext(friend, "partyState") == "MATCHMAKING" => (tr("Recherche de partie", "In queue"), mode),
                _ if friend["idle"] == true => (tr("Inactif", "Away"), String::new()),
                _ => (tr("Dans les menus", "In menus"), String::new()),
            }
        };
        let title = title_of(ftext(friend, "title"));
        let mut name = handle.clone();
        if !title.is_empty() {
            name.push_str(&format!("  ·  {title}"));
        }
        let mut cells = vec![face, stack(&name, &if place.is_empty() { status } else { format!("{status} · {place}") })];
        let tier = friend["tier"].as_i64().unwrap_or(0);
        if tier > 0 && friend["online"] == true {
            cells.push(img(app.img(&tier_icon(tier)), 26.0).tip(&rank_name(tier)));
        }
        let menu = format!("friend-menu:{id}");
        app.menu_for(&menu, vec![entry(&format!("eval:friend-open:{handle}"), &tr("Voir le profil", "View profile")), entry(&format!("eval:friend-copy:{handle}"), &tr("Copier l'identifiant Riot", "Copy Riot ID"))]);
        row(cells).id(&format!("eval:friend-open:{handle}")).menu(&menu)
    };
    if let (Some(account), true) = (account, query.is_empty() && !lol) {
        let party = app.load("eval:my-party", || Box::pin(async {
            let player = riot_call("glz", "/parties/v1/players/{puuid}", "GET", None).await.ok();
            let party = match player.as_ref().and_then(|player| player["CurrentPartyID"].as_str()) {
                Some(id) => riot_call("glz", &format!("/parties/v1/parties/{id}"), "GET", None).await.unwrap_or(Value::Null),
                None => Value::Null,
            };
            let loadout = riot_get("/personalization/v2/players/{puuid}/playerloadout").await.unwrap_or(Value::Null);
            Ok(json!({ "inGame": player.is_some_and(|player| player["CurrentPartyID"].is_string()), "size": party["Members"].as_array().map_or(1, Vec::len), "max": party["MaxPartySize"].as_i64().unwrap_or(5), "card": loadout["Identity"]["PlayerCardID"], "title": loadout["Identity"]["PlayerTitleID"] }))
        })).data;
        let (size, max) = party.as_ref().map_or((1, 5), |party| (party["size"].as_i64().unwrap_or(1), party["max"].as_i64().unwrap_or(5)));
        out.push(h2(&tr(&format!("Votre groupe — {size}/{max}"), &format!("Your party — {size}/{max}"))));
        let card = party.as_ref().and_then(|party| party["card"].as_str()).or(account["card"].as_str()).unwrap_or_default().to_string();
        let mut face = avatar(&account["name"].as_str().unwrap_or("?").chars().next().map_or(String::new(), |first| first.to_uppercase().to_string()), app.img(&card_image(&card)), 38.0);
        face.kind = "presence";
        face.tone = if party.as_ref().is_some_and(|party| party["inGame"] == true) { "online" } else { "offline" };
        let title = party.as_ref().and_then(|party| party["title"].as_str()).map(title_of).unwrap_or_default();
        out.push(card_row(vec![face, stack(&format!("{}#{}{}", account["name"].as_str().unwrap_or_default(), account["tag"].as_str().unwrap_or_default(), if title.is_empty() { String::new() } else { format!("  ·  {title}") }), &if face_in_game(&party) { tr("Dans VALORANT", "In VALORANT") } else { tr("VALORANT fermé", "VALORANT closed") })]));
    }
    for party in &board.parties {
        out.push(h2(&tr(&format!("Groupe — {}/{}", party.size, party.max), &format!("Party — {}/{}", party.size, party.max))));
        let mut rows: Vec<B> = party.members.iter().map(|friend| line(app, friend)).collect();
        if party.others > 0 {
            rows.push(row(vec![muted(&tr(&format!("+ {} autre{}", party.others, if party.others > 1 { "s" } else { "" }), &format!("+ {} other{}", party.others, if party.others > 1 { "s" } else { "" })))]));
        }
        out.extend(group(rows));
    }
    let mut aside = Vec::new();
    if !board.valorant.is_empty() {
        out.push(h2(&format!("VALORANT — {}", board.valorant.len())));
        let rows: Vec<B> = board.valorant.iter().map(|friend| line(app, friend)).collect();
        out.extend(group(rows));
    }
    for (name, rows) in &board.platforms {
        out.push(h2(&format!("{name} — {}", rows.len())));
        let lines: Vec<B> = rows.iter().map(|friend| line(app, friend)).collect();
        out.extend(group(lines));
    }
    if !board.offline.is_empty() {
        aside.push(h2(&tr(&format!("Hors ligne — {}", board.offline.len()), &format!("Offline — {}", board.offline.len()))));
        let lines: Vec<B> = board.offline.iter().map(|friend| line(app, friend)).collect();
        aside.extend(group(lines));
    }
    if !query.is_empty() && board.parties.is_empty() && board.valorant.is_empty() && board.platforms.is_empty() && board.offline.is_empty() {
        out.push(empty(&tr("Aucun ami trouvé", "No friend found"), &tr("Vérifie le pseudo ou le tag.", "Check the name or tag.")));
    }
    out.extend(aside);
    out.push(note(&tr("Tu restes invisible pour tes amis pendant cette lecture.", "You stay invisible to your friends during this check.")));
    out
}

fn face_in_game(party: &Option<std::rc::Rc<Value>>) -> bool {
    party.as_ref().is_some_and(|party| party["inGame"] == true)
}

fn card_row(cells: Vec<C>) -> B {
    card(cells)
}

pub fn view(app: &mut App, linked: bool, account: &Value) -> Vec<B> {
    match current().as_str() {
        "leaderboard" => leaderboard(app),
        "players" => players(app),
        "seasons" => seasons(account),
        "names" => names(app, account),
        "collection" => collection(app, linked),
        "goal" => goal(app, account),
        "contracts" => contracts(app, linked),
        "recap" => recap(app),
        "settings" => game_settings(app, linked),
        "lineups" => lineups(app),
        "maps" => gallery(app, "map"),
        "agents" => gallery(app, "agent"),
        "weapons" => gallery(app, "weapon"),
        _ => friends(app, linked, Some(account), false),
    }
}

fn leaderboard(app: &mut App) -> Vec<B> {
    let region = if app.state.hub.region.is_empty() { "eu".to_string() } else { app.state.hub.region.clone() };
    let holder = region.clone();
    let res = app.load(&format!("eval:board:{region}"), move || api_data(&format!("api/stats/valorant-leaderboard?region={holder}&platform=pc&startIndex=1&size=50")));
    let options: Vec<(String, String)> = REGIONS.iter().map(|item| (item.to_string(), item.to_uppercase())).collect();
    let pick = app.select("eval:region", &region, &options);
    let mut out = vec![head(&tr("Classement", "Leaderboard"), "", vec![pick])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(6, 44.0));
        }
        return out;
    };
    let players = first_array(&data["players"], None);
    if players.is_empty() {
        out.push(empty(&tr("Classement vide", "Empty leaderboard"), ""));
        return out;
    }
    out.push(row(vec![muted("#"), muted(&tr("Joueur", "Player")).grow(), muted(&tr("Rang", "Rank")), muted("RR"), muted(&tr("Victoires", "Wins"))]));
    let rows: Vec<B> = players.iter().map(|player| {
        let tier = player["tier"].as_i64().unwrap_or(0);
        let name = if player["isAnonymized"] == true { tr("Joueur masqué", "Hidden player") } else { format!("{}#{}", player["name"].as_str().unwrap_or_default(), player["tag"].as_str().unwrap_or_default()) };
        let rank = if tier > 0 { img(app.img(&tier_icon(tier)), 26.0).tip(&rank_name(tier)) } else { fixed_gap(26.0) };
        row(vec![strong(&player["leaderboardRank"].to_string()), text(&name).grow(), rank, text(&player["rr"].to_string()), text(&player["wins"].to_string())])
    }).collect();
    out.extend(group(rows));
    out
}

fn players(app: &mut App) -> Vec<B> {
    let state = &app.state.hub;
    let (value, busy, message, found) = (state.search.clone(), state.busy, state.error.clone(), state.found.clone());
    let search = app.icon("search");
    let mut out = vec![head(&tr("Rechercher un joueur", "Find a player"), "", vec![]), row(vec![input("eval:player-text", &value, "Pseudo#TAG").tip(&tr("Identifiant Riot", "Riot ID")), primary("eval:player-search", &tr("Rechercher", "Search")).icon(search).off(busy)])];
    let saved: Vec<String> = prefs::read_json("ethone-eval-bookmarks").unwrap_or_default();
    if !saved.is_empty() {
        out.push(row(saved.iter().map(|handle| chip(&format!("eval:bookmark-open:{handle}"), handle)).collect()).gap(6.0));
    }
    if let Some(message) = message {
        out.push(error(&message, vec![]));
    }
    if busy {
        out.extend(skeletons(1, 180.0));
        return out;
    }
    let Some(found) = found else { return out };
    let account = &found["account"];
    let handle = format!("{}#{}", account["name"].as_str().unwrap_or_default(), account["tag"].as_str().unwrap_or_default());
    let card = account["card"].as_str().map(banner_image).unwrap_or_default();
    let tier = account["mmr"]["tier"].as_i64().filter(|tier| *tier > 0).or(account["tier"].as_i64()).unwrap_or(0);
    let rr = account["mmr"]["rr"].as_i64().unwrap_or(0);
    out.push(banner(app.img(&card), 110.0, vec![C { kind: "stack", title: handle.clone(), sub: format!("{}{}", rank_name(tier), if rr > 0 { format!(", {rr} RR") } else { String::new() }), weight: 1.0, size: 16.0, ..Default::default() }, btn(&format!("eval:bookmark:{handle}"), &if saved.contains(&handle) { tr("Retirer des signets", "Remove bookmark") } else { tr("Ajouter aux signets", "Bookmark") })]));
    let matches: Vec<Value> = found["matches"].as_array().cloned().unwrap_or_default();
    let puuid = account["puuid"].as_str().unwrap_or_default();
    let stats = stats_for(&matches, puuid);
    if stats.count > 0 {
        out.push(B { color: Some(hex(rank_color(tier))), ..note(&format!("{}V – {}D, K/D {}, {} % {}, {} {} {}", stats.wins, stats.losses, crate::pages::eval::decimal(stats.kd), stats.hs, tr("à la tête", "headshots"), tr("sur", "over"), stats.count, tr("matchs", "matches"))) });
    }
    out.extend(group(matches.iter().take(8).map(|item| {
        let me = item["players"].as_array().and_then(|list| list.iter().find(|player| player["puuid"] == puuid)).cloned().unwrap_or(Value::Null);
        row(vec![strong(item["map"].as_str().unwrap_or_default()).grow(), muted(&mode_name(item["mode"].as_str().unwrap_or_default())), text(me["agent"].as_str().unwrap_or_default()), text(&if me.is_object() { format!("{}/{}/{}", me["kills"], me["deaths"], me["assists"]) } else { String::new() })])
    }).collect()));
    out
}

fn season_name(short: &str) -> String {
    let lower = short.to_lowercase();
    let parsed = lower.strip_prefix('e').and_then(|rest| rest.split_once('a')).filter(|(episode, act)| !episode.is_empty() && !act.is_empty() && episode.chars().all(|character| character.is_ascii_digit()) && act.chars().all(|character| character.is_ascii_digit()));
    parsed.map_or(short.to_string(), |(episode, act)| tr(&format!("Épisode {episode}, acte {act}"), &format!("Episode {episode}, act {act}")))
}

fn seasons(account: &Value) -> Vec<B> {
    let list = account["mmr"]["seasons"].as_array().cloned().unwrap_or_default();
    let mut out = vec![head(&tr("Mes saisons", "My seasons"), "", vec![])];
    if list.is_empty() {
        out.push(empty(&tr("Aucune saison enregistrée", "No recorded seasons"), &tr("L'historique des saisons de ce compte n'est pas disponible.", "This account's season history is not available.")));
        return out;
    }
    out.push(row(vec![muted(&tr("Saison", "Season")).grow(), muted(&tr("Rang final", "Final rank")), muted(&tr("Victoires", "Wins")), muted(&tr("Parties", "Games"))]));
    out.extend(group(list.iter().rev().map(|season| {
        let tier = season["endTier"].as_i64().unwrap_or(0);
        row(vec![text(&season_name(season["short"].as_str().or(season["season"].as_str()).unwrap_or_default())).grow(), text(&rank_name(tier)).color(hex(rank_color(tier))), text(&season["wins"].to_string()), text(&season["games"].to_string())])
    }).collect()));
    out
}

fn names(app: &mut App, account: &Value) -> Vec<B> {
    let puuid = account["puuid"].as_str().unwrap_or_default().to_string();
    let holder = puuid.clone();
    let res = app.load(&format!("eval:names:{puuid}"), move || rest_get(&format!("ethone_valorant_name_history?select=name,tag,first_seen_at&puuid=eq.{holder}&order=first_seen_at.desc")));
    let mut out = vec![head(&tr("Mes anciens pseudos", "My past names"), "", vec![])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else { return out };
    let rows = first_array(&data, None);
    if rows.is_empty() {
        out.push(empty(&tr("Aucun ancien pseudo", "No previous names"), ""));
        return out;
    }
    let fr = fr();
    out.extend(group(rows.iter().map(|row_data| row(vec![muted(&row_data["first_seen_at"].as_str().and_then(time::parse).map(|date| time::short_date(&date, fr)).unwrap_or_default()), strong(&format!("{}#{}", row_data["name"].as_str().unwrap_or_default(), row_data["tag"].as_str().unwrap_or_default())).grow()])).collect()));
    out
}

fn collection(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return vec![empty(&tr("Compte Riot non connecté", "Riot account not linked"), &tr("Connecte ton compte pour voir tes skins.", "Link your account to see your skins."))];
    }
    let owned = app.load("eval:owned-skins", || riot_get(&format!("/store/v1/entitlements/{{puuid}}/{}", crate::pages::eval_game::SKIN_TYPE))).data;
    let weapons = app.load("eval:weapons", || catalog_get(&format!("/weapons?{LANGUAGE}"))).data;
    let (Some(owned), Some(weapons)) = (owned, weapons) else { return skeletons(4, 80.0) };
    let ids: Vec<String> = owned["Entitlements"].as_array().into_iter().flatten().filter_map(|item| item["ItemID"].as_str().map(str::to_lowercase)).collect();
    let rows: Vec<(String, String, String, String)> = weapons.as_array().into_iter().flatten().flat_map(|weapon| {
        let weapon_name = weapon["displayName"].as_str().unwrap_or_default().to_string();
        weapon["skins"].as_array().into_iter().flatten().filter(|skin| skin["levels"][0]["uuid"].as_str().is_some_and(|uuid| ids.contains(&uuid.to_lowercase()))).map(move |skin| (skin["uuid"].as_str().unwrap_or_default().to_string(), weapon_name.clone(), skin["displayName"].as_str().unwrap_or_default().to_string(), skin["levels"][0]["displayIcon"].as_str().or(skin["displayIcon"].as_str()).unwrap_or_default().to_string())).collect::<Vec<_>>()
    }).collect();
    let mut weapon_names: Vec<String> = rows.iter().map(|row| row.1.clone()).collect();
    weapon_names.sort();
    weapon_names.dedup();
    let mut options = vec![(String::new(), tr("Toutes les armes", "All weapons"))];
    options.extend(weapon_names.iter().map(|name| (name.clone(), format!("{name} ({})", rows.iter().filter(|row| row.1 == *name).count()))));
    let (weapon, query) = (app.state.hub.collection_weapon.clone(), app.state.hub.collection_query.clone());
    let pick = app.select("eval:collection-weapon", &weapon, &options);
    let mut out = vec![head(&format!("{} ({})", tr("Mes skins", "My skins"), rows.len()), "", vec![]), row(vec![pick, input("eval:collection-query", &query, &tr("Chercher un skin", "Find a skin"))])];
    let needle = query.trim().to_lowercase();
    let cells: Vec<C> = rows.iter().filter(|row| (weapon.is_empty() || row.1 == weapon) && (needle.is_empty() || row.2.to_lowercase().contains(&needle))).map(|(id, _, name, icon_url)| C { kind: "variant", id: format!("eval:skin:{id}"), title: name.clone(), image: app.img(icon_url), weight: 1.0, ..Default::default() }).collect();
    for chunk in cells.chunks(4) {
        out.push(row(chunk.to_vec()).gap(6.0));
    }
    out
}

fn goal(app: &mut App, account: &Value) -> Vec<B> {
    let goal_tier = prefs::read_json::<i64>("ethone-eval-goal-tier").unwrap_or(0);
    let tier = account["mmr"]["tier"].as_i64().filter(|tier| *tier > 0).or(account["tier"].as_i64()).unwrap_or(0);
    let rr = account["mmr"]["rr"].as_i64().unwrap_or(0);
    let mut options = vec![("0".to_string(), tr("Aucun", "None"))];
    options.extend((3..=27).map(|value| (value.to_string(), rank_name(value))));
    let pick = app.select("eval:goal", &goal_tier.to_string(), &options);
    let mut out = vec![head(&tr("Objectif de saison", "Season goal"), "", vec![]), field(&tr("Rang visé", "Target rank"), vec![pick])];
    if goal_tier > 0 {
        let left = if goal_tier > tier { (goal_tier - tier) * 100 - rr } else { 0 };
        out.push(card(vec![stack_wrap(&format!("{} : {}{}", tr("Actuel", "Current"), rank_name(tier), if tier > 0 { format!(", {rr} RR") } else { String::new() }), &if goal_tier <= tier { tr("Objectif atteint.", "Goal reached.") } else { tr(&format!("Il te reste environ {left} RR avant {}.", rank_name(goal_tier)), &format!("About {left} RR left to {}.", rank_name(goal_tier))) })]));
    }
    out
}

fn contracts(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return vec![empty(&tr("Compte Riot non connecté", "Riot account not linked"), "")];
    }
    let mine = app.load("eval:contracts", || riot_get("/contracts/v1/contracts/{puuid}")).data;
    let catalog = app.load("eval:contract-catalog", || catalog_get(&format!("/contracts?{LANGUAGE}"))).data;
    let agents = app.load("eval:hub-agents", || catalog_get(&format!("/agents?isPlayableCharacter=true&{LANGUAGE}"))).data;
    let mut out = vec![head(&tr("Contrats d'agents", "Agent contracts"), "", vec![])];
    let (Some(mine), Some(catalog), Some(agents)) = (mine, catalog, agents) else {
        out.extend(skeletons(3, 50.0));
        return out;
    };
    let mut rows: Vec<(String, String, i64, i64)> = agents.as_array().into_iter().flatten().filter_map(|agent| {
        let uuid = agent["uuid"].as_str()?;
        let contract = catalog.as_array()?.iter().find(|item| item["content"]["relationType"] == "Agent" && item["content"]["relationUuid"].as_str().is_some_and(|relation| relation.eq_ignore_ascii_case(uuid)))?;
        let total: i64 = contract["content"]["chapters"].as_array().into_iter().flatten().map(|chapter| chapter["levels"].as_array().map_or(0, Vec::len) as i64).sum();
        let reached = mine["Contracts"].as_array()?.iter().find(|item| item["ContractDefinitionID"].as_str().zip(contract["uuid"].as_str()).is_some_and(|(left, right)| left.eq_ignore_ascii_case(right)))?["ProgressionLevelReached"].as_i64()?;
        Some((agent["displayName"].as_str().unwrap_or_default().to_string(), agent["displayIcon"].as_str().unwrap_or_default().to_string(), reached.min(total), total))
    }).collect();
    rows.sort_by(|left, right| (right.2 as f64 / right.3.max(1) as f64).total_cmp(&(left.2 as f64 / left.3.max(1) as f64)));
    if rows.is_empty() {
        out.push(empty(&tr("Aucun contrat en cours", "No active contract"), &tr("Riot ne donne que la progression des contrats actifs. Active un agent dans le jeu pour le suivre ici.", "Riot only shares progress for active contracts. Activate an agent in the game to follow it here.")));
        return out;
    }
    out.extend(group(rows.iter().map(|(name, icon_url, reached, total)| row(vec![img(app.img(icon_url), 34.0), strong(name).grow(), C { weight: 0.8, ..bar(*reached as f32 / (*total).max(1) as f32) }, muted(&format!("{} {reached} / {total}", tr("Niveau", "Level")))])).collect()));
    out
}

fn recap(app: &mut App) -> Vec<B> {
    if app.state.hub.recap_guild.is_empty() {
        if let Some(saved) = prefs::read_json::<Value>("ethone-eval-recap") {
            app.state.hub.recap_guild = saved["guild"].as_str().unwrap_or_default().to_string();
            app.state.hub.recap_channel = saved["channel"].as_str().unwrap_or_default().to_string();
        }
    }
    let mut out = vec![head(&tr("Récap Discord", "Discord recap"), "", vec![])];
    if !ethone_engine::bot::linked() {
        out.push(empty(&tr("Discord non connecté", "Discord not linked"), &tr("Connecte Discord depuis la page Discord pour publier tes récaps.", "Link Discord from the Discord page to post your recaps.")));
        return out;
    }
    let guilds = app.load("discord:guilds", || bot("GET", "api/guilds", None)).data;
    let guild = app.state.hub.recap_guild.clone();
    let mut guild_options = vec![(String::new(), tr("Choisir", "Choose"))];
    guild_options.extend(guilds.as_deref().map(|data| first_array(&data["guilds"], None)).unwrap_or_default().iter().filter(|item| item["botPresent"] != false).map(|item| (item["id"].as_str().unwrap_or_default().to_string(), item["name"].as_str().unwrap_or_default().to_string())));
    let guild_pick = app.select("eval:recap-guild", &guild, &guild_options);
    out.push(field(&tr("Serveur", "Server"), vec![guild_pick]));
    let mut channel_options = vec![(String::new(), tr("Choisir", "Choose"))];
    if !guild.is_empty() {
        let holder = guild.clone();
        let channels = app.load(&format!("discord:channels:{guild}"), move || bot("GET", &format!("api/guilds/{holder}/server/channels"), None)).data;
        if let Some(channels) = channels {
            channel_options.extend(crate::pages::generic::flatten_entries(&channels, "").into_iter().map(|(id, name)| (id, format!("#{name}"))));
        }
    }
    let channel = app.state.hub.recap_channel.clone();
    let channel_pick = app.select("eval:recap-channel", &channel, &channel_options);
    out.push(field(&tr("Salon", "Channel"), vec![channel_pick]));
    let has_match = app.state.eval.data.as_ref().is_some_and(|data| data["matches"][0].is_object());
    out.push(row(vec![primary("eval:recap-post", &tr("Publier mon dernier match", "Post my last match")).off(app.state.hub.busy || guild.is_empty() || channel.is_empty() || !has_match)]));
    if let Some((text_value, ok)) = app.state.hub.message.clone() {
        out.push(B { tone: if ok { "ok" } else { "bad" }, ..prose(&text_value) });
    }
    out
}

fn game_settings(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return vec![empty(&tr("Compte Riot non connecté", "Riot account not linked"), "")];
    }
    let name = app.state.hub.snapshot_name.clone();
    let mut out = vec![head(&tr("Paramètres de jeu", "Game settings"), &tr("Sauvegarde tes réglages VALORANT (sensibilité, viseur, touches) et remets-les quand tu veux.", "Back up your VALORANT settings (sensitivity, crosshair, keybinds) and restore them any time."), vec![]), row(vec![input("eval:snapshot-name", &name, &tr("Nom de la sauvegarde", "Backup name")), primary("eval:snapshot-save", &tr("Sauvegarder", "Back up")).off(name.trim().is_empty())])];
    if let Some((text_value, ok)) = app.state.hub.message.clone() {
        out.push(B { tone: if ok { "ok" } else { "bad" }, ..prose(&text_value) });
    }
    let fr = fr();
    let list: Vec<Value> = prefs::read_json("ethone-eval-settings-snapshots").unwrap_or_default();
    let confirm = app.state.hub.confirm.clone();
    out.extend(group(list.iter().map(|snapshot| {
        let id = snapshot["id"].as_str().unwrap_or_default();
        let mut cells = vec![stack(snapshot["name"].as_str().unwrap_or_default(), &snapshot["createdAt"].as_str().and_then(time::parse).map(|date| time::short_date(&date, fr)).unwrap_or_default())];
        if confirm.as_deref() == Some(id) {
            cells.push(btn("eval:snapshot-cancel", &tr("Annuler", "Cancel")));
            cells.push(danger(&format!("eval:snapshot-apply:{id}"), &tr("Remplacer mes réglages", "Replace my settings")));
        } else {
            cells.push(btn(&format!("eval:snapshot-ask:{id}"), &tr("Appliquer", "Apply")));
        }
        cells.push(danger(&format!("eval:snapshot-delete:{id}"), &tr("Supprimer", "Delete")));
        row(cells)
    }).collect()));
    out
}

fn lineup_agent(id: i64) -> &'static str {
    match id { 2 => "Breach", 3 => "Brimstone", 4 => "Cypher", 6 => "Killjoy", 11 => "Sage", 13 => "Sova", 14 => "Viper", 16 => "KAY/O", 18 => "Fade", 20 => "Gekko", _ => "" }
}

fn lineup_map(id: i64) -> &'static str {
    match id { 11 => "Abyss", 1 => "Ascent", 2 => "Bind", 3 => "Breeze", 7 => "Fracture", 4 => "Haven", 5 => "Icebox", 9 => "Lotus", 8 => "Pearl", 6 => "Split", 12 => "Summit", 10 => "Sunset", _ => "" }
}

fn lineups(app: &mut App) -> Vec<B> {
    let res = app.load("eval:lineups", || Box::pin(async {
        if !svc().auth.is_signed_in().await {
            return Err("sessionRequired".to_string());
        }
        svc().riot.catalog(ethone_engine::gateway::LINEUPS_URL).await
    }) as Fut);
    let (map, agent) = (app.state.hub.lineup_map, app.state.hub.lineup_agent);
    let mut map_options = vec![("0".to_string(), tr("Toutes les cartes", "All maps"))];
    map_options.extend([11, 1, 2, 3, 7, 4, 5, 9, 8, 6, 12, 10].iter().map(|id| (id.to_string(), lineup_map(*id).to_string())));
    let mut agent_options = vec![("0".to_string(), tr("Tous les agents", "All agents"))];
    agent_options.extend([2, 3, 4, 6, 11, 13, 14, 16, 18, 20].iter().map(|id| (id.to_string(), lineup_agent(*id).to_string())));
    let (map_pick, agent_pick) = (app.select("eval:lineup-map", &map.to_string(), &map_options), app.select("eval:lineup-agent", &agent.to_string(), &agent_options));
    let mut out = vec![head("Line-ups", "", vec![map_pick, agent_pick])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 120.0));
        }
        return out;
    };
    let rows: Vec<Value> = data.as_array().into_iter().flatten().filter(|item| (map == 0 || item["mapId"].as_i64() == Some(map)) && (agent == 0 || item["agent"].as_i64() == Some(agent))).take(120).cloned().collect();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun line-up pour ce choix", "No line-up for this choice"), ""));
        return out;
    }
    let cells: Vec<C> = rows.iter().map(|item| {
        let video = item["video"].as_str().unwrap_or_default();
        let thumb = item["images"][0].as_str().map(str::to_string).unwrap_or_else(|| if video.is_empty() { String::new() } else { format!("https://img.youtube.com/vi/{}/hqdefault.jpg", encode(video.split('?').next().unwrap_or_default())) });
        C { kind: "offer", id: format!("eval:lineup-open:{}", item["id"].as_str().unwrap_or_default()), title: item["name"].as_str().unwrap_or_default().into(), sub: format!("{}, {}", lineup_agent(item["agent"].as_i64().unwrap_or(0)), lineup_map(item["mapId"].as_i64().unwrap_or(0))), tip: item["description"].as_str().unwrap_or_default().into(), image: app.img(&thumb), weight: 1.0, ..Default::default() }
    }).collect();
    for chunk in cells.chunks(3) {
        out.push(row(chunk.to_vec()));
    }
    out
}

fn gallery(app: &mut App, kind: &str) -> Vec<B> {
    let (key, path, title): (&str, String, String) = match kind {
        "map" => ("eval:hub-maps", format!("/maps?{LANGUAGE}"), tr("Cartes", "Maps")),
        "agent" => ("eval:hub-agents", format!("/agents?isPlayableCharacter=true&{LANGUAGE}"), tr("Agents", "Agents")),
        _ => ("eval:weapons", format!("/weapons?{LANGUAGE}"), tr("Armes", "Weapons")),
    };
    let res = app.load(key, move || catalog_get(&path));
    let mut out = vec![head(&title, "", vec![])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 120.0));
        }
        return out;
    };
    let mut items: Vec<Value> = data.as_array().cloned().unwrap_or_default();
    if kind == "map" {
        items.retain(|item| item["tacticalDescription"].is_string());
    }
    if kind == "agent" {
        items.sort_by_key(|item| item["displayName"].as_str().unwrap_or_default().to_lowercase());
    }
    let cells: Vec<C> = items.iter().map(|item| {
        let (image, sub) = match kind {
            "map" => (item["splash"].as_str(), item["tacticalDescription"].as_str().unwrap_or_default().to_string()),
            "agent" => (item["displayIcon"].as_str(), item["role"]["displayName"].as_str().unwrap_or_default().to_string()),
            _ => (item["displayIcon"].as_str(), format!("{}{}", item["shopData"]["categoryText"].as_str().map_or_else(|| tr("Corps à corps", "Melee"), str::to_string), item["shopData"]["cost"].as_i64().filter(|cost| *cost > 0).map_or(String::new(), |cost| format!(", {cost}")))),
        };
        C { kind: "offer", id: format!("eval:{kind}:{}", item["uuid"].as_str().unwrap_or_default()), title: item["displayName"].as_str().unwrap_or_default().into(), sub, image: app.img(image.unwrap_or_default()), weight: 1.0, ..Default::default() }
    }).collect();
    let per = if kind == "agent" { 5 } else { 3 };
    for chunk in cells.chunks(per) {
        out.push(row(chunk.to_vec()));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn season_codes_read_as_words() {
        crate::prefs::write("ethone-language", "fr");
        assert_eq!(season_name("e9a2"), "Épisode 9, acte 2");
        assert_eq!(season_name("Saison spéciale"), "Saison spéciale");
    }

    #[test]
    fn lineup_tables_cover_known_ids() {
        assert_eq!(lineup_agent(13), "Sova");
        assert_eq!(lineup_map(9), "Lotus");
        assert_eq!(lineup_agent(99), "");
    }
}
