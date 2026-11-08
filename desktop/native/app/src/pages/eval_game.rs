use crate::app::{spawn, App};
use crate::i18n::{error_text, tr};
use crate::logic::eval::{agent_icon, mode_name, rank_color, rank_name, tier_icon};
use crate::pages::generic::number_text;
use crate::prefs;
use crate::services::{catalog_get, riot_call, riot_get, Fut};
use crate::vm::*;
use serde_json::{json, Value};

pub const VP: &str = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const RP: &str = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
const KC: &str = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";
pub const SKIN_TYPE: &str = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
pub const CHROMA_TYPE: &str = "3ad1b2b2-acdb-4524-852f-954a76ddae0a";
const CARD_TYPE: &str = "3f296c07-64c3-494c-923b-fe692a4fa1bd";
const SPRAY_TYPE: &str = "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475";
const BUDDY_TYPE: &str = "dd3bf334-87f3-40bd-b043-682a57a8dc3a";
const TITLE_TYPE: &str = "de7caa6b-adf7-4588-bbd1-143831e786c6";
const MEDIA: &str = "https://media.valorant-api.com";
const LANGUAGE: &str = "language=fr-FR";
const PROFILES_KEY: &str = "ethone-eval-appearance-profiles";

#[derive(Default)]
pub struct GameState {
    pub skin: Option<(String, Option<i64>)>,
    pub level_at: usize,
    pub chroma_at: usize,
    pub bundle: Option<String>,
    pub bundle_item: Option<usize>,
    pub item: Option<(Value, i64)>,
    pub picker: Option<String>,
    pub gun: Option<String>,
    pub gun_detail: Option<String>,
    pub busy: bool,
    pub error: Option<String>,
    pub profile_name: String,
    pub live_player: Option<String>,
    pub started_at: f64,
}

pub fn tier_info(id: &str) -> Option<(&'static str, &'static str)> {
    Some(match id.to_lowercase().as_str() {
        "12683d76-48d7-84a3-4e09-6985794f0445" => ("#73b8fb", "Select"),
        "0cebb8be-46d7-c12a-d306-e9907bfc5a25" => ("#5ed3be", "Deluxe"),
        "60bca009-4182-7998-dee7-b8a2558dc369" => ("#e96da5", "Premium"),
        "e046854e-406c-37f4-6607-19a9ba8426fc" => ("#fea56d", "Exclusive"),
        "411e4a55-4e59-7757-41f0-86a53f101bb5" => ("#f5d96a", "Ultra"),
        _ => return None,
    })
}

pub fn countdown(seconds: i64) -> String {
    let left = seconds.max(0);
    let days = left / 86400;
    let clock = format!("{}:{:02}:{:02}", (left % 86400) / 3600, (left % 3600) / 60, left % 60);
    if days > 0 { format!("{days}j {clock}") } else { clock }
}

pub fn level_label(level: &Value, position: usize) -> String {
    if position == 0 {
        return tr("Apparence de base", "Base skin");
    }
    match level["levelItem"].as_str().unwrap_or_default().rsplit("::").next().unwrap_or_default() {
        "VFX" => tr("Effets visuels", "Visual effects"),
        "Animation" => tr("Animation", "Animation"),
        "Finisher" => tr("Achèvement", "Finisher"),
        "Voiceover" => tr("Voix", "Voiceover"),
        "SoundEffects" => tr("Effets sonores", "Sound effects"),
        "Fish" => tr("Aquarium", "Aquarium"),
        "KillCounter" => tr("Compteur d'éliminations", "Kill counter"),
        "KillBanner" => tr("Bannière d'élimination", "Kill banner"),
        "KillEffect" => tr("Effet d'élimination", "Kill effect"),
        "TopFrag" => tr("Meilleur joueur", "Top frag"),
        "InspectAndKill" => tr("Inspection et élimination", "Inspect and kill"),
        "AttackerDefenderSwap" => tr("Attaque et défense", "Attack and defense"),
        "Transformation" => tr("Transformation", "Transformation"),
        "HeartbeatAndMapSensor" => tr("Battement et capteur de carte", "Heartbeat and map sensor"),
        _ => tr("Amélioration", "Upgrade"),
    }
}

pub fn chroma_label(chroma: &Value, position: usize) -> String {
    let name = chroma["displayName"].as_str().unwrap_or_default();
    let inner = name.trim_end().strip_suffix(')').and_then(|rest| rest.rsplit_once('(')).map(|(_, inside)| inside.trim());
    let variant = inner.and_then(|inside| {
        let words: Vec<&str> = inside.split_whitespace().collect();
        let at = words.iter().position(|word| word.chars().all(|character| character.is_ascii_digit()))?;
        (at + 1 < words.len()).then(|| words[at + 1..].join(" "))
    });
    variant.unwrap_or_else(|| if position == 0 { tr("Base", "Base") } else { name.to_string() })
}

pub fn money(value: i64) -> String {
    format!("{} VP", number_text(value as f64))
}

fn skin_index(app: &mut App) -> Option<std::rc::Rc<Value>> {
    app.load("eval:skins", || catalog_get(&format!("/weapons/skins?{LANGUAGE}"))).data
}

pub fn find_skin(index: &Value, id: &str) -> Option<Value> {
    let id = id.to_lowercase();
    index.as_array()?.iter().find(|skin| {
        skin["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&id))
            || skin["levels"].as_array().is_some_and(|list| list.iter().any(|level| level["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&id))))
            || skin["chromas"].as_array().is_some_and(|list| list.iter().any(|chroma| chroma["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&id))))
    }).cloned()
}

pub fn skin_image(skin: &Value) -> String {
    skin["chromas"][0]["fullRender"].as_str().or(skin["displayIcon"].as_str()).or(skin["levels"][0]["displayIcon"].as_str()).unwrap_or_default().to_string()
}

fn describe(app: &mut App, kind: &str, id: &str) -> Option<Value> {
    let lower = kind.to_lowercase();
    if lower == SKIN_TYPE {
        let index = skin_index(app)?;
        let skin = find_skin(&index, id);
        let image = skin.as_ref().map(skin_image).unwrap_or_default();
        return Some(json!({ "name": skin.as_ref().and_then(|skin| skin["displayName"].as_str()).map_or_else(|| tr("Arme", "Weapon"), str::to_string), "kind": tr("Arme", "Weapon"), "image": image, "large": image, "skinId": id }));
    }
    let (path, label) = match lower.as_str() {
        CARD_TYPE => (format!("/playercards/{id}?{LANGUAGE}"), tr("Carte", "Card")),
        SPRAY_TYPE => (format!("/sprays/{id}?{LANGUAGE}"), tr("Graffiti", "Spray")),
        BUDDY_TYPE => (format!("/buddies/levels/{id}?{LANGUAGE}"), tr("Porte-bonheur", "Gun buddy")),
        TITLE_TYPE => (format!("/playertitles/{id}?{LANGUAGE}"), tr("Titre", "Title")),
        _ => return Some(json!({ "name": tr("Objet", "Item"), "kind": tr("Objet", "Item"), "image": "", "large": "" })),
    };
    let holder = path.clone();
    let res = app.load(&format!("eval:item:{path}"), move || catalog_get(&holder));
    if res.error.is_some() {
        return Some(json!({ "name": tr("Objet", "Item"), "kind": label, "image": "", "large": "" }));
    }
    let data = res.data?;
    let (image, large) = match lower.as_str() {
        CARD_TYPE => (data["smallArt"].as_str(), data["wideArt"].as_str().or(data["largeArt"].as_str()).or(data["smallArt"].as_str())),
        SPRAY_TYPE => (data["displayIcon"].as_str(), data["fullTransparentIcon"].as_str().or(data["displayIcon"].as_str())),
        BUDDY_TYPE => (data["displayIcon"].as_str(), data["displayIcon"].as_str()),
        _ => (None, None),
    };
    let name = if lower == TITLE_TYPE { data["titleText"].as_str().or(data["displayName"].as_str()) } else { data["displayName"].as_str() };
    Some(json!({ "name": name.unwrap_or_default(), "kind": label, "image": image.unwrap_or_default(), "large": large.unwrap_or_default() }))
}

fn store_front() -> Fut {
    riot_call("pd", "/store/v3/storefront/{puuid}", "POST", Some(json!({})))
}

fn loadout_load() -> Fut {
    Box::pin(async {
        match riot_get("/personalization/v3/players/{puuid}/playerloadout").await {
            Ok(value) => Ok(value),
            Err(_) => riot_get("/personalization/v2/players/{puuid}/playerloadout").await,
        }
    })
}

fn put_loadout(app: &mut App, body: Value) {
    app.state.game.busy = true;
    app.state.game.error = None;
    spawn(riot_call("pd", "/personalization/v3/players/{puuid}/playerloadout", "PUT", Some(body)), |app, result| {
        app.state.game.busy = false;
        match result {
            Ok(_) => {
                crate::cache::clear("riot:/personalization");
                app.forget("eval:loadout");
                app.state.game.picker = None;
                app.state.game.gun = None;
                app.state.game.gun_detail = None;
                app.close_drawer();
            }
            Err(error) => app.state.game.error = Some(error_text(&error)),
        }
    });
}

pub fn act(app: &mut App, verb: &str, arg: &str, value: &str) {
    match verb {
        "game-refresh" => {
            crate::cache::clear("riot:");
            app.forget("eval:");
        }
        "skin" => {
            let (id, price) = arg.split_once('|').map_or((arg, None), |(id, price)| (id, price.parse().ok()));
            app.state.game.skin = Some((id.to_string(), price));
            app.state.game.level_at = 0;
            app.state.game.chroma_at = 0;
            app.open_drawer(&tr("Aperçu de l'arme", "Weapon preview"), 760.0, |app| {
                let (id, price) = app.state.game.skin.clone().unwrap_or_default();
                skin_viewer(app, &id, price, false)
            });
        }
        "level" => app.state.game.level_at = arg.parse().unwrap_or(0),
        "chroma" => app.state.game.chroma_at = arg.parse().unwrap_or(0),
        "video" => {
            let title = app.get("eval:video-title");
            if let Err(error) = crate::web::play_video(&app.get("eval:video"), &title) {
                app.toast_bad(&error_text(&error));
            }
        }
        "bundle" => {
            app.state.game.bundle = Some(arg.to_string());
            app.state.game.bundle_item = None;
            app.open_drawer(&tr("Pack", "Bundle"), 900.0, bundle_drawer);
        }
        "bundle-item" => app.state.game.bundle_item = arg.parse().ok(),
        "bundle-back" => app.state.game.bundle_item = None,
        "accessory" => {
            let offer = arg.to_string();
            let front = app.res.get("eval:store").and_then(|res| res.data.clone());
            let found = front.as_deref().and_then(|front| front["AccessoryStore"]["AccessoryStoreOffers"].as_array()).and_then(|list| list.iter().find(|entry| entry["Offer"]["OfferID"] == offer.as_str())).cloned();
            if let Some(entry) = found {
                let reward = &entry["Offer"]["Rewards"][0];
                if let Some(item) = describe(app, reward["ItemTypeID"].as_str().unwrap_or_default(), reward["ItemID"].as_str().unwrap_or_default()) {
                    let price = entry["Offer"]["Cost"][KC].as_i64().or_else(|| entry["Offer"]["Cost"].as_object().and_then(|map| map.values().next()).and_then(Value::as_i64)).unwrap_or(0);
                    let title = item["name"].as_str().unwrap_or_default().to_string();
                    app.state.game.item = Some((item, price));
                    app.open_drawer(&title, 620.0, |app| {
                        let Some((item, price)) = app.state.game.item.clone() else { return Vec::new() };
                        let mut out = item_viewer(app, &item, None);
                        out.push(note(&format!("{} Kingdom Credits", number_text(price as f64))));
                        out
                    });
                }
            }
        }
        "picker" => {
            app.state.game.picker = Some(arg.to_string());
            app.state.game.error = None;
            let title = if arg == "card" { tr("Changer de carte", "Change card") } else { tr("Changer de titre", "Change title") };
            app.open_drawer(&title, 620.0, picker_drawer);
        }
        "pick" => {
            let Some(loadout) = app.res.get("eval:loadout").and_then(|res| res.data.clone()) else { return };
            let mut body = (*loadout).clone();
            let key = if app.state.game.picker.as_deref() == Some("card") { "PlayerCardID" } else { "PlayerTitleID" };
            if !body["Identity"].is_object() {
                body["Identity"] = json!({});
            }
            body["Identity"][key] = json!(arg);
            put_loadout(app, body);
        }
        "gun" => {
            app.state.game.gun = Some(arg.to_string());
            app.state.game.gun_detail = None;
            app.state.game.error = None;
            let weapons = app.res.get("eval:weapons").and_then(|res| res.data.clone());
            let title = weapons.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|weapon| weapon["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(arg)))).and_then(|weapon| weapon["displayName"].as_str().map(str::to_string)).unwrap_or_default();
            app.open_drawer(&title, 760.0, gun_drawer);
        }
        "gun-detail" => {
            app.state.game.gun_detail = Some(arg.to_string());
            app.state.game.level_at = 0;
            app.state.game.chroma_at = 0;
        }
        "gun-back" => app.state.game.gun_detail = None,
        "equip" => {
            let Some(loadout) = app.res.get("eval:loadout").and_then(|res| res.data.clone()) else { return };
            let mut parts = arg.split('|');
            let (Some(skin), Some(level), Some(chroma)) = (parts.next(), parts.next(), parts.next()) else { return };
            let gun_id = app.state.game.gun.clone().unwrap_or_default();
            let mut body = (*loadout).clone();
            if let Some(guns) = body["Guns"].as_array_mut() {
                for gun in guns.iter_mut().filter(|gun| gun["ID"].as_str().is_some_and(|id| id.eq_ignore_ascii_case(&gun_id))) {
                    gun["SkinID"] = json!(skin);
                    gun["SkinLevelID"] = json!(level);
                    gun["ChromaID"] = json!(chroma);
                }
            }
            put_loadout(app, body);
        }
        "profile-name" => app.state.game.profile_name = value.into(),
        "profile-save" | "profile-name:submit" => {
            let name = app.state.game.profile_name.trim().to_string();
            let Some(loadout) = app.res.get("eval:loadout").and_then(|res| res.data.clone()) else { return };
            if name.is_empty() {
                return;
            }
            let mut profiles: Vec<Value> = prefs::read_json(PROFILES_KEY).unwrap_or_default();
            profiles.insert(0, json!({ "id": format!("{}", crate::logic::time::now_ms() as i64), "name": name, "loadout": *loadout }));
            prefs::write_json(PROFILES_KEY, &profiles);
            app.state.game.profile_name.clear();
        }
        "profile-apply" => {
            let profiles: Vec<Value> = prefs::read_json(PROFILES_KEY).unwrap_or_default();
            let Some(saved) = profiles.iter().find(|profile| profile["id"] == arg).map(|profile| profile["loadout"].clone()) else { return };
            let Some(loadout) = app.res.get("eval:loadout").and_then(|res| res.data.clone()) else { return };
            let mut body = (*loadout).clone();
            for key in ["Guns", "Sprays", "Identity", "Incognito"] {
                body[key] = saved[key].clone();
            }
            put_loadout(app, body);
        }
        "profile-delete" => {
            let mut profiles: Vec<Value> = prefs::read_json(PROFILES_KEY).unwrap_or_default();
            profiles.retain(|profile| profile["id"] != arg);
            prefs::write_json(PROFILES_KEY, &profiles);
        }
        "live-player" => {
            app.state.game.live_player = Some(arg.to_string());
            app.open_drawer(&tr("Joueur", "Player"), 640.0, live_player_drawer);
        }
        _ => {}
    }
}

pub fn item_viewer(app: &mut App, item: &Value, price: Option<i64>) -> Vec<B> {
    let large = app.img(item["large"].as_str().unwrap_or_default());
    let mut out = Vec::new();
    if large.size().width > 0 || !item["large"].as_str().unwrap_or_default().is_empty() {
        out.push(B { kind: "stage", image: large, height: 240.0, ..Default::default() });
    }
    let mut cells = vec![stack(item["name"].as_str().unwrap_or_default(), item["kind"].as_str().unwrap_or_default())];
    if let Some(price) = price {
        cells.push(strong(&money(price)));
    }
    out.push(row(cells));
    out
}

pub fn skin_viewer(app: &mut App, id: &str, price: Option<i64>, equip: bool) -> Vec<B> {
    let Some(index) = skin_index(app) else {
        return skeletons(2, 180.0);
    };
    let Some(skin) = find_skin(&index, id) else {
        return vec![note(&tr("Cette apparence n'est pas dans le catalogue.", "This skin is not in the catalog."))];
    };
    let levels = skin["levels"].as_array().cloned().unwrap_or_default();
    let chromas = skin["chromas"].as_array().cloned().unwrap_or_default();
    let (level_at, chroma_at) = (app.state.game.level_at.min(levels.len().saturating_sub(1)), app.state.game.chroma_at.min(chromas.len().saturating_sub(1)));
    let level = levels.get(level_at).cloned().unwrap_or(Value::Null);
    let chroma = chromas.get(chroma_at).cloned().unwrap_or(Value::Null);
    let video = if chroma_at > 0 { chroma["streamedVideo"].as_str() } else { None }.or(level["streamedVideo"].as_str()).or(chroma["streamedVideo"].as_str()).unwrap_or_default().to_string();
    let image_url = chroma["fullRender"].as_str().or(skin["displayIcon"].as_str()).or(level["displayIcon"].as_str()).unwrap_or_default().to_string();
    let name = skin["displayName"].as_str().unwrap_or_default().to_string();
    let image = app.img(&image_url);
    let mut out = vec![B { kind: "stage", image, height: 260.0, ..Default::default() }];
    let tier = tier_info(skin["contentTierUuid"].as_str().unwrap_or_default());
    let mut head_cells = vec![C { kind: "stack", title: name.clone(), sub: tier.map_or(String::new(), |(_, label)| label.to_string()), weight: 1.0, size: 16.0, ..Default::default() }];
    if let Some(price) = price {
        head_cells.push(strong(&money(price)));
    }
    if !video.is_empty() {
        app.set("eval:video", &video);
        app.set("eval:video-title", &name);
        let play = app.icon("play");
        head_cells.push(btn("eval:video", &tr("Voir la vidéo", "Watch the video")).icon(play));
    }
    out.push(row(head_cells));
    let owned = if equip { owned_sets(app) } else { None };
    if levels.len() > 1 {
        out.push(h2(&tr("Améliorations", "Upgrades")));
        let check = app.icon("check");
        out.extend(group(levels.iter().enumerate().map(|(at, item)| {
            let mut cells = vec![chip("", &(at + 1).to_string()).on(at == level_at), text(&level_label(item, at)).grow()];
            if owned.as_ref().is_some_and(|(levels, _)| levels.contains(&item["uuid"].as_str().unwrap_or_default().to_lowercase())) {
                cells.push(icon(check.clone()).tone("ok"));
            }
            row(cells).id(&format!("eval:level:{at}")).on(at == level_at)
        }).collect()));
    }
    if chromas.len() > 1 {
        out.push(h2(&tr("Variantes", "Variants")));
        let cells: Vec<C> = chromas.iter().enumerate().map(|(at, item)| {
            let swatch = app.img(item["swatch"].as_str().unwrap_or_default());
            C { kind: "variant", id: format!("eval:chroma:{at}"), title: chroma_label(item, at), image: swatch, on: at == chroma_at, weight: 1.0, ..Default::default() }
        }).collect();
        out.extend(grid(cells, 4, 6.0));
    }
    if equip {
        let level_id = level["uuid"].as_str().unwrap_or_default().to_lowercase();
        let chroma_id = chroma["uuid"].as_str().unwrap_or_default().to_lowercase();
        let unlocked = owned.as_ref().is_some_and(|(levels, chromas)| levels.contains(&level_id) && (chroma_at == 0 || chromas.contains(&chroma_id)));
        let busy = app.state.game.busy;
        out.push(row(vec![primary(&format!("eval:equip:{}|{}|{}", skin["uuid"].as_str().unwrap_or_default(), level["uuid"].as_str().unwrap_or_default(), chroma["uuid"].as_str().unwrap_or_default()), &if unlocked { tr("Équiper", "Equip") } else { tr("Pas encore débloqué", "Not unlocked yet") }).off(busy || !unlocked)]));
        if let Some(message) = app.state.game.error.clone() {
            out.push(error(&message, vec![]));
        }
    }
    out
}

fn owned_sets(app: &mut App) -> Option<(Vec<String>, Vec<String>)> {
    let levels = app.load("eval:owned-skins", || riot_get(&format!("/store/v1/entitlements/{{puuid}}/{SKIN_TYPE}"))).data?;
    let chromas = app.load("eval:owned-chromas", || {
        let inner = riot_get(&format!("/store/v1/entitlements/{{puuid}}/{CHROMA_TYPE}"));
        Box::pin(async move { Ok(inner.await.unwrap_or(json!({ "Entitlements": [] }))) })
    }).data.unwrap_or_else(|| std::rc::Rc::new(json!({ "Entitlements": [] })));
    let ids = |value: &Value| value["Entitlements"].as_array().into_iter().flatten().filter_map(|item| item["ItemID"].as_str().map(str::to_lowercase)).collect::<Vec<_>>();
    Some((ids(&levels), ids(&chromas)))
}

fn bundle_drawer(app: &mut App) -> Vec<B> {
    let Some(front) = app.res.get("eval:store").and_then(|res| res.data.clone()) else { return Vec::new() };
    let Some(id) = app.state.game.bundle.clone() else { return Vec::new() };
    let Some(bundle) = front["FeaturedBundle"]["Bundles"].as_array().and_then(|list| list.iter().find(|bundle| bundle["ID"] == id.as_str())).cloned() else { return Vec::new() };
    let asset = bundle["DataAssetID"].as_str().unwrap_or_default().to_string();
    let meta = app.load(&format!("eval:bundle:{asset}"), move || catalog_get(&format!("/bundles/{asset}?{LANGUAGE}"))).data;
    let name = meta.as_ref().and_then(|meta| meta["displayName"].as_str()).map_or_else(|| tr("Pack", "Bundle"), str::to_string);
    let mut rows: Vec<(Value, i64, i64)> = Vec::new();
    for entry in bundle["Items"].as_array().cloned().unwrap_or_default() {
        if let Some(item) = describe(app, entry["Item"]["ItemTypeID"].as_str().unwrap_or_default(), entry["Item"]["ItemID"].as_str().unwrap_or_default()) {
            let base = entry["BasePrice"].as_i64().unwrap_or(0);
            rows.push((item, base, entry["DiscountedPrice"].as_i64().unwrap_or(base)));
        }
    }
    rows.sort_by(|left, right| right.0["skinId"].is_string().cmp(&left.0["skinId"].is_string()).then(right.2.cmp(&left.2)));
    if let Some(at) = app.state.game.bundle_item {
        if let Some((item, _, price)) = rows.get(at).cloned() {
            let back = app.icon("arrow-left");
            let mut out = vec![row(vec![btn("eval:bundle-back", &name).icon(back)])];
            if let Some(skin) = item["skinId"].as_str() {
                out.extend(skin_viewer(app, skin, Some(price), false));
            } else {
                out.extend(item_viewer(app, &item, Some(price)));
            }
            return out;
        }
    }
    let hero = meta.as_ref().and_then(|meta| meta["displayIcon2"].as_str().or(meta["displayIcon"].as_str())).unwrap_or_default().to_string();
    let mut out = vec![B { kind: "stage", image: app.img(&hero), height: 220.0, ..Default::default() }];
    let total = bundle["TotalDiscountedCost"][VP].as_i64();
    let base = bundle["TotalBaseCost"][VP].as_i64();
    let mut summary = Vec::new();
    if let Some(total) = total {
        summary.push(strong(&money(total)).size(18.0));
    }
    if let (Some(base), Some(total)) = (base, total) {
        if base > total {
            summary.push(muted(&tr(&format!("au lieu de {}", money(base)), &format!("instead of {}", money(base)))));
        }
    }
    if let Some(discount) = bundle["TotalDiscountPercent"].as_f64().filter(|value| *value > 0.0) {
        summary.push(chip("", &format!("−{} %", (discount * 100.0).round() as i64)).color(hex("#30d158")));
    }
    summary.push(gap());
    if let Some(left) = bundle["DurationRemainingInSeconds"].as_i64() {
        let elapsed = ((crate::logic::time::now_ms() - app.state.game.started_at) / 1000.0) as i64;
        summary.push(muted(&countdown(left - elapsed)));
    }
    out.push(row(summary));
    let cells: Vec<C> = rows.iter().enumerate().map(|(at, (item, base, price))| {
        let image = app.img(item["image"].as_str().unwrap_or_default());
        C { kind: "offer", id: format!("eval:bundle-item:{at}"), title: item["name"].as_str().unwrap_or_default().into(), sub: item["kind"].as_str().unwrap_or_default().into(), value: if *price == 0 { tr("Offert", "Free") } else { money(*price) }, extra: if base > price { money(*base) } else { String::new() }, image, weight: 1.0, ..Default::default() }
    }).collect();
    out.extend(grid(cells, 3, 0.0));
    out
}

fn picker_drawer(app: &mut App) -> Vec<B> {
    let kind = app.state.game.picker.clone().unwrap_or_default();
    let type_id = if kind == "card" { CARD_TYPE } else { TITLE_TYPE };
    let owned = app.load(&format!("eval:owned-{kind}"), move || riot_get(&format!("/store/v1/entitlements/{{puuid}}/{type_id}"))).data;
    let path = if kind == "card" { format!("/playercards?{LANGUAGE}") } else { format!("/playertitles?{LANGUAGE}") };
    let all = app.load(&format!("eval:all-{kind}"), move || catalog_get(&path)).data;
    let mut out = Vec::new();
    if let Some(message) = app.state.game.error.clone() {
        out.push(error(&message, vec![]));
    }
    let (Some(owned), Some(all)) = (owned, all) else {
        out.extend(skeletons(4, 48.0));
        return out;
    };
    let ids: Vec<String> = owned["Entitlements"].as_array().into_iter().flatten().filter_map(|item| item["ItemID"].as_str().map(str::to_lowercase)).collect();
    let current = app.res.get("eval:loadout").and_then(|res| res.data.clone()).and_then(|loadout| loadout["Identity"][if kind == "card" { "PlayerCardID" } else { "PlayerTitleID" }].as_str().map(str::to_lowercase)).unwrap_or_default();
    let busy = app.state.game.busy;
    let items: Vec<Value> = all.as_array().into_iter().flatten().filter(|item| item["uuid"].as_str().is_some_and(|uuid| ids.contains(&uuid.to_lowercase()))).cloned().collect();
    if kind == "card" {
        let cells: Vec<C> = items.iter().map(|item| {
            let uuid = item["uuid"].as_str().unwrap_or_default();
            let art = app.img(item["smallArt"].as_str().unwrap_or_default());
            C { kind: "variant", id: format!("eval:pick:{uuid}"), title: item["displayName"].as_str().unwrap_or_default().into(), image: art, on: uuid.eq_ignore_ascii_case(&current), disabled: busy, weight: 1.0, ..Default::default() }
        }).collect();
        out.extend(grid(cells, 4, 6.0));
    } else {
        out.extend(group(items.iter().filter(|item| item["titleText"].as_str().is_some_and(|text| !text.is_empty())).map(|item| {
            let uuid = item["uuid"].as_str().unwrap_or_default();
            row(vec![text(item["titleText"].as_str().unwrap_or_default()).grow()]).id(&format!("eval:pick:{uuid}")).on(uuid.eq_ignore_ascii_case(&current))
        }).collect()));
    }
    out
}

fn gun_drawer(app: &mut App) -> Vec<B> {
    if let Some(detail) = app.state.game.gun_detail.clone() {
        let back = app.icon("arrow-left");
        let mut out = vec![row(vec![btn("eval:gun-back", &tr("Toutes les apparences", "All skins")).icon(back)])];
        out.extend(skin_viewer(app, &detail, None, true));
        return out;
    }
    let gun_id = app.state.game.gun.clone().unwrap_or_default();
    let Some(weapons) = app.res.get("eval:weapons").and_then(|res| res.data.clone()) else { return Vec::new() };
    let Some(weapon) = weapons.as_array().and_then(|list| list.iter().find(|weapon| weapon["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&gun_id)))).cloned() else { return Vec::new() };
    let mut out = Vec::new();
    if let Some(message) = app.state.game.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some((levels, _)) = owned_sets(app) else {
        out.extend(skeletons(4, 60.0));
        return out;
    };
    let current = app.res.get("eval:loadout").and_then(|res| res.data.clone()).and_then(|loadout| loadout["Guns"].as_array().and_then(|list| list.iter().find(|gun| gun["ID"].as_str().is_some_and(|id| id.eq_ignore_ascii_case(&gun_id)))).and_then(|gun| gun["SkinLevelID"].as_str().map(str::to_lowercase))).unwrap_or_default();
    let mut skins: Vec<(Value, Value, bool)> = weapon["skins"].as_array().into_iter().flatten().filter_map(|skin| {
        let owned: Vec<&Value> = skin["levels"].as_array()?.iter().filter(|level| level["uuid"].as_str().is_some_and(|uuid| levels.contains(&uuid.to_lowercase()))).collect();
        let level = (*owned.last()?).clone();
        skin["chromas"].get(0)?;
        let equipped = skin["levels"].as_array().is_some_and(|list| list.iter().any(|item| item["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&current))));
        Some((skin.clone(), level, equipped))
    }).collect();
    skins.sort_by(|left, right| right.2.cmp(&left.2));
    if skins.is_empty() {
        out.push(note(&tr("Tu n'as pas d'autre apparence pour cette arme.", "You have no other skin for this weapon.")));
    }
    let cells: Vec<C> = skins.iter().map(|(skin, level, equipped)| {
        let picture = app.img(level["displayIcon"].as_str().or(skin["displayIcon"].as_str()).unwrap_or_default());
        C { kind: "variant", id: format!("eval:gun-detail:{}", skin["uuid"].as_str().unwrap_or_default()), title: skin["displayName"].as_str().unwrap_or_default().into(), image: picture, on: *equipped, weight: 1.0, ..Default::default() }
    }).collect();
    out.extend(grid(cells, 3, 6.0));
    out.push(note(&tr("Pour revenir à l'apparence de base, utilise le jeu.", "To go back to the base skin, use the game.")));
    out
}

fn live_player_drawer(app: &mut App) -> Vec<B> {
    let Some(subject) = app.state.game.live_player.clone() else { return Vec::new() };
    let Some(live) = app.res.get("eval:live").and_then(|res| res.data.clone()) else { return Vec::new() };
    let extra = app.res.get(&format!("eval:live-extra:{}", live["id"].as_str().unwrap_or_default())).and_then(|res| res.data.clone());
    let mut out = Vec::new();
    if let Some(stats) = extra.as_ref().and_then(|extra| extra["stats"][&subject].as_object().cloned()) {
        out.push(note(&tr(&format!("{} victoires sur ses {} dernières parties.", stats["wins"], stats["games"]), &format!("{} wins in the last {} games.", stats["wins"], stats["games"]))));
    }
    out.push(h2(&tr("Équipement", "Loadout")));
    let skins = extra.as_ref().and_then(|extra| extra["skins"][&subject].as_object().cloned()).unwrap_or_default();
    if skins.is_empty() {
        out.push(note(&tr("Riot ne donne pas l'équipement de ce joueur pour l'instant.", "Riot doesn't provide this player's loadout right now.")));
        return out;
    }
    let weapons = app.load("eval:weapons", || catalog_get(&format!("/weapons?{LANGUAGE}"))).data;
    let cells: Vec<C> = skins.iter().map(|(weapon, chroma)| {
        let name = weapons.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|item| item["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(weapon)))).and_then(|item| item["displayName"].as_str()).unwrap_or_default().to_string();
        let chroma = chroma.as_str().unwrap_or_default();
        let full = format!("{MEDIA}/weaponskinchromas/{chroma}/fullrender.png");
        let picture = if app.image_failed.contains(&full) { app.img(&format!("{MEDIA}/weaponskinchromas/{chroma}/displayicon.png")) } else { app.img(&full) };
        C { kind: "variant", title: name, image: picture, weight: 1.0, ..Default::default() }
    }).collect();
    out.extend(grid(cells, 3, 6.0));
    out
}

fn not_linked(prefix_text: &str) -> Vec<B> {
    vec![empty_with(&tr("Compte Riot non connecté", "Riot account not linked"), prefix_text, vec![primary("eval:connect", &tr("Connecter mon compte Riot", "Link my Riot account"))])]
}

pub fn game_view(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return not_linked(&tr("La boutique, le portefeuille, les missions, l'équipement et le groupe viennent de ton compte Riot.", "Store, wallet, missions, loadout and party come from your Riot account."));
    }
    if app.state.game.started_at == 0.0 {
        app.state.game.started_at = crate::logic::time::now_ms();
    }
    let elapsed = ((crate::logic::time::now_ms() - app.state.game.started_at) / 1000.0) as i64;
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Jeu et boutique", "Game and store"), "", vec![btn("eval:game-refresh", &crate::i18n::t("refresh")).icon(refresh)])];
    let wallet = app.load("eval:wallet", || riot_get("/store/v1/wallet/{puuid}"));
    let balance = |id: &str| if wallet.error.is_some() { "–".to_string() } else { number_text(wallet.data.as_ref().and_then(|data| data["Balances"][id].as_f64()).unwrap_or(0.0)) };
    let mut tiles = Vec::new();
    for (id, label) in [(VP, "VP".to_string()), (RP, tr("Radianite", "Radianite")), (KC, "Kingdom Credits".to_string())] {
        let mut cell = tile("", &label, &balance(id), "");
        cell.image = app.img(&format!("{MEDIA}/currencies/{id}/displayicon.png"));
        tiles.push(cell);
    }
    out.push(row(tiles));
    let store = app.load("eval:store", store_front);
    if let Some(message) = store.error.clone() {
        out.push(error(&message, vec![]));
    }
    if let Some(front) = store.data.clone() {
        let index = skin_index(app);
        let bundles = front["FeaturedBundle"]["Bundles"].as_array().cloned().unwrap_or_default();
        for bundle in &bundles {
            let asset = bundle["DataAssetID"].as_str().unwrap_or_default().to_string();
            let meta = app.load(&format!("eval:bundle:{asset}"), move || catalog_get(&format!("/bundles/{asset}?{LANGUAGE}"))).data;
            let price = bundle["TotalDiscountedCost"][VP].as_i64().unwrap_or_else(|| bundle["Items"].as_array().map_or(0, |items| items.iter().map(|item| item["DiscountedPrice"].as_i64().unwrap_or(0)).sum()));
            let image = meta.as_ref().and_then(|meta| meta["displayIcon2"].as_str().or(meta["displayIcon"].as_str())).unwrap_or_default().to_string();
            let name = meta.as_ref().and_then(|meta| meta["displayName"].as_str()).map_or_else(|| tr("Pack", "Bundle"), str::to_string);
            out.push(banner(app.img(&image), 160.0, vec![gap(), stack(&name, &money(price))]).id(&format!("eval:bundle:{}", bundle["ID"].as_str().unwrap_or_default())));
        }
        let left = front["SkinsPanelLayout"]["SingleItemOffersRemainingDurationInSeconds"].as_i64();
        out.push(h2x(&tr("Boutique du jour", "Daily store"), &left.map_or(String::new(), |left| countdown(left - elapsed)), vec![]));
        let offers = front["SkinsPanelLayout"]["SingleItemStoreOffers"].as_array().cloned().unwrap_or_default();
        let cells: Vec<C> = offers.iter().map(|offer| {
            let id = offer["Rewards"][0]["ItemID"].as_str().or(offer["OfferID"].as_str()).unwrap_or_default().to_lowercase();
            let skin = index.as_deref().and_then(|index| find_skin(index, &id));
            let level_icon = skin.as_ref().and_then(|skin| skin["levels"].as_array().and_then(|list| list.iter().find(|level| level["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(&id))))).and_then(|level| level["displayIcon"].as_str());
            let icon_url = level_icon.or(skin.as_ref().and_then(|skin| skin["displayIcon"].as_str())).unwrap_or_default();
            let tier = skin.as_ref().and_then(|skin| tier_info(skin["contentTierUuid"].as_str().unwrap_or_default()));
            let price = offer["Cost"][VP].as_i64().unwrap_or(0);
            C { kind: "offer", id: format!("eval:skin:{id}|{price}"), title: skin.as_ref().and_then(|skin| skin["displayName"].as_str()).map_or_else(|| tr("Chargement…", "Loading…"), str::to_string), sub: tier.map_or(String::new(), |(_, label)| label.to_string()), value: money(price), image: app.img(icon_url), color: tier.map(|(color, _)| hex(color)), weight: 1.0, ..Default::default() }
        }).collect();
        out.extend(grid(cells, 2, 0.0));
        let accessories = front["AccessoryStore"]["AccessoryStoreOffers"].as_array().cloned().unwrap_or_default();
        if !accessories.is_empty() {
            let left = front["AccessoryStore"]["AccessoryStoreRemainingDurationInSeconds"].as_i64();
            out.push(h2x(&tr("Accessoires", "Accessories"), &left.map_or(String::new(), |left| countdown(left - elapsed)), vec![]));
            let cells: Vec<C> = accessories.iter().filter_map(|entry| {
                let offer = &entry["Offer"];
                let reward = &offer["Rewards"][0];
                let item = describe(app, reward["ItemTypeID"].as_str()?, reward["ItemID"].as_str()?);
                let price = offer["Cost"][KC].as_i64().or_else(|| offer["Cost"].as_object().and_then(|map| map.values().next()).and_then(Value::as_i64)).unwrap_or(0);
                let image = item.as_ref().map(|item| app.img(item["image"].as_str().unwrap_or_default())).unwrap_or_default();
                Some(C { kind: "offer", id: if item.is_some() { format!("eval:accessory:{}", offer["OfferID"].as_str().unwrap_or_default()) } else { String::new() }, title: item.as_ref().and_then(|item| item["name"].as_str()).unwrap_or(" ").into(), sub: item.as_ref().and_then(|item| item["kind"].as_str()).unwrap_or_default().into(), value: number_text(price as f64), image, weight: 1.0, ..Default::default() })
            }).collect();
            out.extend(grid(cells, 4, 0.0));
        }
    } else if store.loading {
        out.extend(skeletons(2, 150.0));
    }
    out
}

pub fn game_side(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return Vec::new();
    }
    let mut out = Vec::new();
    let party = app.load("eval:party", || Box::pin(async {
        let player = riot_call("glz", "/parties/v1/players/{puuid}", "GET", None).await.ok();
        let Some(id) = player.as_ref().and_then(|player| player["CurrentPartyID"].as_str()).map(str::to_string) else { return Ok(Value::Null) };
        let party = riot_call("glz", &format!("/parties/v1/parties/{id}"), "GET", None).await.unwrap_or(Value::Null);
        let subjects: Vec<Value> = party["Members"].as_array().into_iter().flatten().map(|member| member["Subject"].clone()).collect();
        let names = if subjects.is_empty() { json!([]) } else { riot_call("pd", "/name-service/v2/players", "PUT", Some(Value::Array(subjects))).await.unwrap_or(json!([])) };
        Ok(json!({ "party": party, "names": names }))
    }));
    let users = app.icon("users");
    match party.data {
        Some(data) if data["party"].is_object() => {
            let members = data["party"]["Members"].as_array().cloned().unwrap_or_default();
            out.push(h2x(&tr("Groupe", "Party"), &format!("{} / 5", members.len()), vec![icon(users)]));
            let lines: Vec<B> = members.iter().map(|member| {
                let subject = member["Subject"].as_str().unwrap_or_default();
                let name = data["names"].as_array().and_then(|list| list.iter().find(|row| row["Subject"] == subject)).filter(|row| row["GameName"].as_str().is_some_and(|name| !name.is_empty())).map_or_else(|| tr("Joueur masqué", "Hidden player"), |row| format!("{}#{}", row["GameName"].as_str().unwrap_or_default(), row["TagLine"].as_str().unwrap_or_default()));
                let card = member["PlayerIdentity"]["PlayerCardID"].as_str().map(|card| format!("{MEDIA}/playercards/{}/smallart.png", card.to_lowercase())).unwrap_or_default();
                let mut cells = vec![img(app.img(&card), 32.0), text(&name).grow()];
                if member["IsOwner"] == true {
                    cells.push(chip("", &tr("Chef", "Leader")));
                }
                row(cells)
            }).collect();
            out.extend(group(lines));
        }
        Some(_) => {
            out.push(h2x(&tr("Groupe", "Party"), "", vec![icon(users)]));
            out.push(note(&tr("Lance VALORANT pour voir ton groupe. Riot ne connaît ton groupe que lorsque le jeu est ouvert.", "Start VALORANT to see your party. Riot only knows your party while the game is open.")));
        }
        None => out.extend(skeletons(1, 90.0)),
    }
    missions(app, &mut out);
    loadout(app, &mut out);
    out
}

fn missions(app: &mut App, out: &mut Vec<B>) {
    let contracts = app.load("eval:contracts", || riot_get("/contracts/v1/contracts/{puuid}"));
    let daily = app.load("eval:daily", || {
        let inner = riot_get("/daily-ticket/v1/{puuid}");
        Box::pin(async move { Ok(inner.await.unwrap_or(Value::Null)) })
    });
    let seasons = app.load("eval:seasons", || catalog_get("/seasons"));
    let catalog = app.load("eval:contract-catalog", || catalog_get(&format!("/contracts?{LANGUAGE}")));
    if let Some(message) = contracts.error.clone() {
        out.push(error(&message, vec![]));
        return;
    }
    let (Some(contracts), Some(seasons), Some(catalog)) = (contracts.data, seasons.data, catalog.data) else {
        out.extend(skeletons(2, 56.0));
        return;
    };
    let now = crate::logic::time::now_ms();
    let act = seasons.as_array().into_iter().flatten().find(|season| season["parentUuid"].as_str().is_some_and(|parent| !parent.is_empty()) && season["startTime"].as_str().and_then(crate::logic::time::parse_ms).is_some_and(|start| start <= now) && season["endTime"].as_str().and_then(crate::logic::time::parse_ms).is_some_and(|end| now < end));
    let pass = act.and_then(|act| catalog.as_array().into_iter().flatten().find(|contract| contract["content"]["relationType"] == "Season" && contract["content"]["relationUuid"] == act["uuid"]));
    if let Some(pass) = pass {
        let mine = contracts["Contracts"].as_array().into_iter().flatten().find(|contract| contract["ContractDefinitionID"].as_str().is_some_and(|id| pass["uuid"].as_str().is_some_and(|uuid| id.eq_ignore_ascii_case(uuid))));
        let levels: Vec<&Value> = pass["content"]["chapters"].as_array().into_iter().flatten().flat_map(|chapter| chapter["levels"].as_array().into_iter().flatten()).collect();
        let reached = mine.and_then(|mine| mine["ProgressionLevelReached"].as_u64()).unwrap_or(0) as usize;
        out.push(h2x(&tr("Passe de combat", "Battle pass"), &format!("{} {reached} / {}", tr("Niveau", "Tier"), levels.len()), vec![]));
        out.push(row(vec![bar(if levels.is_empty() { 0.0 } else { reached as f32 / levels.len() as f32 })]));
        if let Some(next) = levels.get(reached).and_then(|level| level["xp"].as_f64()).filter(|xp| *xp > 0.0) {
            out.push(note(&format!("{} / {} XP", number_text(mine.and_then(|mine| mine["ProgressionTowardsNextLevel"].as_f64()).unwrap_or(0.0)), number_text(next))));
        }
    }
    let milestones = daily.data.as_ref().and_then(|daily| daily["DailyRewards"]["Milestones"].as_array().cloned()).unwrap_or_default();
    if !milestones.is_empty() {
        out.push(h2(&tr("Récompense quotidienne", "Daily reward")));
        out.push(row(milestones.iter().map(|milestone| {
            let on = milestone["BonusApplied"] == true || milestone["Progress"].as_i64().unwrap_or(0) >= 4;
            C { kind: "bar", progress: if on { 1.0 } else { milestone["Progress"].as_f64().unwrap_or(0.0) as f32 / 4.0 }, weight: 1.0, ..Default::default() }
        }).collect()).gap(6.0));
    }
    out.push(h2(&tr("Missions", "Missions")));
    let list = contracts["Missions"].as_array().cloned().unwrap_or_default();
    let mut rows = Vec::new();
    for mission in &list {
        let id = mission["ID"].as_str().unwrap_or_default().to_string();
        let meta = app.load(&format!("eval:mission:{id}"), move || {
            let inner = catalog_get(&format!("/missions/{id}?{LANGUAGE}"));
            Box::pin(async move { Ok(inner.await.unwrap_or(Value::Null)) })
        }).data;
        let Some(meta) = meta.filter(|meta| meta["title"].is_string()) else { continue };
        let target = meta["progressToComplete"].as_f64().unwrap_or(0.0);
        let progress = mission["Objectives"].as_object().and_then(|map| map.values().next()).and_then(Value::as_f64).unwrap_or(0.0);
        let share = if mission["Complete"] == true { 1.0 } else if target > 0.0 { progress / target } else { 0.0 };
        rows.push(row(vec![stack(meta["title"].as_str().unwrap_or_default(), &format!("{} XP", number_text(meta["xpGrant"].as_f64().unwrap_or(0.0)))), C { weight: 0.8, ..bar(share as f32) }, muted(&format!("{} / {}", number_text(progress), number_text(target)))]));
    }
    if rows.is_empty() {
        out.push(note(&tr("Aucune mission active.", "No active missions.")));
    } else {
        out.extend(group(rows));
    }
}

fn loadout(app: &mut App, out: &mut Vec<B>) {
    let state = app.load("eval:loadout", loadout_load);
    let weapons = app.load("eval:weapons", || catalog_get(&format!("/weapons?{LANGUAGE}")));
    let index = skin_index(app);
    if let Some(message) = state.error.clone() {
        out.push(error(&message, vec![]));
        return;
    }
    let (Some(loadout), Some(weapons)) = (state.data, weapons.data) else {
        out.extend(skeletons(2, 100.0));
        return;
    };
    out.push(h2(&tr("Équipement", "Loadout")));
    let title_id = loadout["Identity"]["PlayerTitleID"].as_str().unwrap_or_default().to_string();
    let title = if title_id.is_empty() { None } else {
        let holder = title_id.clone();
        app.load(&format!("eval:title:{title_id}"), move || {
            let inner = catalog_get(&format!("/playertitles/{holder}?{LANGUAGE}"));
            Box::pin(async move { Ok(inner.await.unwrap_or(Value::Null)) })
        }).data.and_then(|data| data["titleText"].as_str().map(str::to_string))
    };
    let card = loadout["Identity"]["PlayerCardID"].as_str().map(|card| format!("{MEDIA}/playercards/{}/wideart.png", card.to_lowercase())).unwrap_or_default();
    out.push(banner(app.img(&card), 100.0, vec![C { kind: "stack", title: title.unwrap_or_default(), weight: 1.0, ..Default::default() }]));
    out.push(row(vec![btn("eval:picker:card", &tr("Changer de carte", "Change card")), btn("eval:picker:title", &tr("Changer de titre", "Change title"))]));
    let sprays: Vec<C> = loadout["Sprays"].as_array().into_iter().flatten().filter_map(|spray| spray["SprayID"].as_str()).map(|id| img(app.img(&format!("{MEDIA}/sprays/{}/displayicon.png", id.to_lowercase())), 44.0)).collect();
    if !sprays.is_empty() {
        out.push(row(sprays).gap(6.0));
    }
    let guns: Vec<C> = loadout["Guns"].as_array().into_iter().flatten().map(|gun| {
        let id = gun["ID"].as_str().unwrap_or_default();
        let weapon = weapons.as_array().and_then(|list| list.iter().find(|weapon| weapon["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(id))));
        let skin = gun["SkinLevelID"].as_str().and_then(|level| index.as_deref().and_then(|index| find_skin(index, level)));
        let level_icon = skin.as_ref().zip(gun["SkinLevelID"].as_str()).and_then(|(skin, level)| skin["levels"].as_array().and_then(|list| list.iter().find(|item| item["uuid"].as_str().is_some_and(|uuid| uuid.eq_ignore_ascii_case(level)))).and_then(|item| item["displayIcon"].as_str().map(str::to_string)));
        let picture = level_icon.or_else(|| skin.as_ref().and_then(|skin| skin["displayIcon"].as_str().map(str::to_string))).or_else(|| weapon.and_then(|weapon| weapon["displayIcon"].as_str().map(str::to_string))).unwrap_or_default();
        C { kind: "offer", id: if weapon.is_some() { format!("eval:gun:{id}") } else { String::new() }, title: skin.as_ref().and_then(|skin| skin["displayName"].as_str()).or(weapon.and_then(|weapon| weapon["displayName"].as_str())).unwrap_or_default().into(), sub: weapon.and_then(|weapon| weapon["displayName"].as_str()).unwrap_or_default().into(), image: app.img(&picture), weight: 1.0, ..Default::default() }
    }).collect();
    out.extend(grid(guns, 3, 0.0));
    out.push(h2(&tr("Profils d'apparences", "Appearance profiles")));
    let name = app.state.game.profile_name.clone();
    out.push(row(vec![input("eval:profile-name", &name, &tr("Nom du profil", "Profile name")), btn("eval:profile-save", &tr("Enregistrer l'équipement", "Save loadout")).off(name.trim().is_empty())]));
    if let Some(message) = app.state.game.error.clone().filter(|_| app.drawer.is_none()) {
        out.push(error(&message, vec![]));
    }
    let profiles: Vec<Value> = prefs::read_json(PROFILES_KEY).unwrap_or_default();
    out.extend(group(profiles.iter().map(|profile| {
        let id = profile["id"].as_str().unwrap_or_default();
        row(vec![strong(profile["name"].as_str().unwrap_or_default()).grow(), btn(&format!("eval:profile-apply:{id}"), &tr("Appliquer", "Apply")), danger(&format!("eval:profile-delete:{id}"), &tr("Supprimer", "Delete"))])
    }).collect()));
}

fn live_fetch() -> Fut {
    Box::pin(async {
        let puuid = ethone_engine::riot::load_identity().map(|identity| identity.puuid.to_lowercase()).unwrap_or_default();
        if let Ok(core) = riot_call("glz", "/core-game/v1/players/{puuid}", "GET", None).await {
            let id = core["MatchID"].as_str().unwrap_or_default().to_string();
            if let Ok(data) = riot_call("glz", &format!("/core-game/v1/matches/{id}"), "GET", None).await {
                let players = data["Players"].as_array().cloned().unwrap_or_default();
                let team = players.iter().find(|player| player["Subject"].as_str().is_some_and(|subject| subject.eq_ignore_ascii_case(&puuid))).and_then(|player| player["TeamID"].as_str()).unwrap_or("Blue").to_string();
                return Ok(json!({ "id": id, "pregame": false, "map": data["MapID"], "queue": data["MatchmakingData"]["QueueID"], "endsAt": null, "players": players, "myTeam": team, "me": puuid }));
            }
        }
        let Ok(pre) = riot_call("glz", "/pregame/v1/players/{puuid}", "GET", None).await else { return Ok(json!({ "none": true })) };
        let id = pre["MatchID"].as_str().unwrap_or_default().to_string();
        let Ok(data) = riot_call("glz", &format!("/pregame/v1/matches/{id}"), "GET", None).await else { return Ok(json!({ "none": true })) };
        let team = data["AllyTeam"]["TeamID"].as_str().unwrap_or("Blue").to_string();
        let enemy = data["EnemyTeam"]["TeamID"].as_str().unwrap_or("Red").to_string();
        let mut players: Vec<Value> = data["AllyTeam"]["Players"].as_array().cloned().unwrap_or_default().into_iter().map(|mut player| { player["TeamID"] = json!(team); player }).collect();
        players.extend(data["EnemyTeam"]["Players"].as_array().cloned().unwrap_or_default().into_iter().map(|mut player| { player["TeamID"] = json!(enemy); player }));
        let left = data["PhaseTimeRemainingNS"].as_f64().unwrap_or(0.0) / 1e9;
        Ok(json!({ "id": id, "pregame": true, "map": data["MapID"], "queue": data["QueueID"], "endsAt": if left > 0.0 { json!(crate::logic::time::now_ms() + left * 1000.0) } else { Value::Null }, "players": players, "myTeam": team, "enemyLocks": data["EnemyTeamLockCount"], "enemySize": data["EnemyTeamSize"], "me": puuid }))
    })
}

fn live_extra(live: Value) -> Fut {
    Box::pin(async move {
        let ids: Vec<Value> = live["players"].as_array().into_iter().flatten().map(|player| player["Subject"].clone()).collect();
        let names = riot_call("pd", "/name-service/v2/players", "PUT", Some(Value::Array(ids.clone()))).await.unwrap_or(json!([]));
        let mut ranks = serde_json::Map::new();
        let mut stats = serde_json::Map::new();
        let mut details: std::collections::HashMap<String, Value> = std::collections::HashMap::new();
        for id in ids.iter().filter_map(Value::as_str) {
            if let Ok(data) = riot_get(&format!("/mmr/v1/players/{id}")).await {
                let tier = data["LatestCompetitiveUpdate"]["TierAfterUpdate"].as_i64().unwrap_or(0);
                let peak = data["QueueSkills"]["competitive"]["SeasonalInfoBySeasonID"].as_object().into_iter().flatten().flat_map(|(_, season)| season["WinsByTier"].as_object().into_iter().flatten().filter_map(|(key, _)| key.parse::<i64>().ok())).fold(tier, i64::max);
                ranks.insert(id.into(), json!({ "tier": tier, "rr": data["LatestCompetitiveUpdate"]["RankedRatingAfterUpdate"].as_i64().unwrap_or(0), "peak": peak }));
            } else {
                ranks.insert(id.into(), Value::Null);
            }
        }
        for id in ids.iter().filter_map(Value::as_str) {
            let history = riot_get(&format!("/match-history/v1/history/{id}?startIndex=0&endIndex=3")).await.unwrap_or(Value::Null);
            let (mut kills, mut deaths, mut head, mut shots, mut wins, mut count) = (0i64, 0i64, 0i64, 0i64, 0i64, 0i64);
            for game in history["History"].as_array().into_iter().flatten() {
                let match_id = game["MatchID"].as_str().unwrap_or_default().to_string();
                if !details.contains_key(&match_id) {
                    if let Ok(found) = riot_get(&format!("/match-details/v1/matches/{match_id}")).await {
                        details.insert(match_id.clone(), found);
                    }
                }
                let Some(detail) = details.get(&match_id) else { continue };
                let Some(me) = detail["players"].as_array().and_then(|list| list.iter().find(|player| player["subject"] == id)) else { continue };
                count += 1;
                kills += me["stats"]["kills"].as_i64().unwrap_or(0);
                deaths += me["stats"]["deaths"].as_i64().unwrap_or(0);
                if detail["teams"].as_array().and_then(|list| list.iter().find(|team| team["teamId"] == me["teamId"])).is_some_and(|team| team["won"] == true) {
                    wins += 1;
                }
                for round in detail["roundResults"].as_array().into_iter().flatten() {
                    for hit in round["playerStats"].as_array().and_then(|list| list.iter().find(|stat| stat["subject"] == id)).and_then(|stat| stat["damage"].as_array()).into_iter().flatten() {
                        let (h, b, l) = (hit["headshots"].as_i64().unwrap_or(0), hit["bodyshots"].as_i64().unwrap_or(0), hit["legshots"].as_i64().unwrap_or(0));
                        head += h;
                        shots += h + b + l;
                    }
                }
            }
            stats.insert(id.into(), if count > 0 { json!({ "kd": kills as f64 / deaths.max(1) as f64, "hs": if shots > 0 { (head as f64 / shots as f64 * 100.0).round() } else { 0.0 }, "games": count, "wins": wins }) } else { Value::Null });
        }
        let path = if live["pregame"] == true { format!("/pregame/v1/matches/{}/loadouts", live["id"].as_str().unwrap_or_default()) } else { format!("/core-game/v1/matches/{}/loadouts", live["id"].as_str().unwrap_or_default()) };
        let loadouts = riot_call("glz", &path, "GET", None).await.unwrap_or(Value::Null);
        let mut skins = serde_json::Map::new();
        for entry in loadouts["Loadouts"].as_array().into_iter().flatten() {
            let loadout = if entry["Loadout"].is_object() { &entry["Loadout"] } else { entry };
            let Some(subject) = loadout["Subject"].as_str() else { continue };
            let items: serde_json::Map<String, Value> = loadout["Items"].as_object().into_iter().flatten().filter_map(|(weapon, item)| item["Sockets"][CHROMA_TYPE]["Item"]["ID"].as_str().map(|id| (weapon.to_lowercase(), json!(id)))).collect();
            skins.insert(subject.into(), Value::Object(items));
        }
        Ok(json!({ "names": names, "ranks": ranks, "stats": stats, "skins": skins }))
    })
}

pub fn live_view(app: &mut App, linked: bool) -> Vec<B> {
    if !linked {
        return not_linked(&tr("La vue en direct vient de ton compte Riot.", "The live view comes from your Riot account."));
    }
    let checked = app.get("eval:live-at").parse::<f64>().unwrap_or(0.0);
    let now = crate::logic::time::now_ms();
    if now - checked > 8000.0 && app.res.get("eval:live").is_some_and(|res| !res.loading) {
        app.set("eval:live-at", &now.to_string());
        app.reload("eval:live", live_fetch);
    }
    if checked == 0.0 {
        app.set("eval:live-at", &now.to_string());
    }
    let live = app.load("eval:live", live_fetch);
    let Some(data) = live.data else {
        return skeletons(5, 56.0);
    };
    if data["none"] == true {
        return vec![empty(&tr("Aucune partie en cours", "No match in progress"), &tr("Lance une partie de VALORANT : les joueurs, leurs rangs et leurs statistiques apparaissent ici tout seuls.", "Start a VALORANT match: players, their ranks and stats show up here on their own."))];
    }
    let id = data["id"].as_str().unwrap_or_default().to_string();
    let holder = (*data).clone();
    let extra = app.load(&format!("eval:live-extra:{id}"), move || live_extra(holder)).data;
    let maps = app.load("eval:maps", || catalog_get("/maps")).data;
    let map = maps.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|item| item["mapUrl"].as_str().zip(data["map"].as_str()).is_some_and(|(left, right)| left.eq_ignore_ascii_case(right)))).cloned();
    let splash = map.as_ref().and_then(|map| map["splash"].as_str()).unwrap_or_default().to_string();
    let mut header = vec![C { kind: "stack", title: map.as_ref().and_then(|map| map["displayName"].as_str()).map_or_else(|| tr("Partie en cours", "Match in progress"), str::to_string), sub: format!("{} · {}", if data["pregame"] == true { tr("Sélection des agents", "Agent select") } else { tr("En direct", "Live") }, data["queue"].as_str().map(mode_name).unwrap_or_default()), weight: 1.0, size: 18.0, ..Default::default() }];
    if let Some(ends) = data["endsAt"].as_f64() {
        header.push(chip("", &format!("{} s", ((ends - now) / 1000.0).round().max(0.0))));
    }
    let mut out = vec![banner(app.img(&splash), 130.0, header)];
    let me = data["me"].as_str().unwrap_or_default().to_string();
    let team = data["myTeam"].as_str().unwrap_or("Blue").to_string();
    let players = data["players"].as_array().cloned().unwrap_or_default();
    let (allies, enemies): (Vec<&Value>, Vec<&Value>) = players.iter().partition(|player| player["TeamID"] == team.as_str());
    for (title, list) in [(tr("Ton équipe", "Your team"), allies), (tr("Adversaires", "Enemies"), enemies)] {
        if list.is_empty() {
            if data["pregame"] == true && title == tr("Adversaires", "Enemies") {
                out.push(h2(&title));
                out.push(note(&tr(&format!("{} sur {} agents verrouillés.", data["enemyLocks"], data["enemySize"]), &format!("{} of {} agents locked.", data["enemyLocks"], data["enemySize"]))));
            }
            continue;
        }
        out.push(h2(&title));
        let lines: Vec<B> = list.iter().map(|player| {
            let subject = player["Subject"].as_str().unwrap_or_default();
            let name = extra.as_ref().and_then(|extra| extra["names"].as_array().and_then(|list| list.iter().find(|row| row["Subject"] == subject)).filter(|row| row["GameName"].as_str().is_some_and(|name| !name.is_empty())).map(|row| format!("{}#{}", row["GameName"].as_str().unwrap_or_default(), row["TagLine"].as_str().unwrap_or_default()))).unwrap_or_else(|| tr("Joueur masqué", "Hidden player"));
            let level = if player["PlayerIdentity"]["HideAccountLevel"] == true { None } else { player["PlayerIdentity"]["AccountLevel"].as_i64() };
            let agent = player["CharacterID"].as_str().map(|id| app.img(&agent_icon(&id.to_lowercase()))).unwrap_or_default();
            let rank = extra.as_ref().map(|extra| extra["ranks"][subject].clone());
            let tier = rank.as_ref().and_then(|rank| rank["tier"].as_i64()).unwrap_or(0);
            let stat = extra.as_ref().map(|extra| extra["stats"][subject].clone()).filter(|stat| stat.is_object());
            let mut cells = vec![img(agent, 34.0).round(), stack(&name, &level.map_or(String::new(), |level| tr(&format!("Niveau {level}"), &format!("Level {level}"))))];
            if tier > 0 {
                cells.push(img(app.img(&tier_icon(tier)), 28.0));
            }
            let mut rank_text = C { kind: "stack", title: if rank.is_none() { "…".into() } else { rank_name(tier) }, sub: if tier > 0 { format!("{} RR", rank.as_ref().and_then(|rank| rank["rr"].as_i64()).unwrap_or(0)) } else { String::new() }, extra: "right".into(), ..Default::default() };
            rank_text.tone = "";
            cells.push(rank_text.color(hex(rank_color(tier))));
            if let Some(peak) = rank.as_ref().and_then(|rank| rank["peak"].as_i64()).filter(|peak| *peak > 0) {
                cells.push(img(app.img(&tier_icon(peak)), 22.0).tip(&format!("{} : {}", tr("Meilleur rang", "Peak rank"), rank_name(peak))));
            }
            cells.push(C { kind: "stack", title: stat.as_ref().map_or("–".into(), |stat| crate::pages::eval::decimal(stat["kd"].as_f64().unwrap_or(0.0))), sub: "K/D".into(), extra: "right".into(), ..Default::default() });
            cells.push(C { kind: "stack", title: stat.as_ref().map_or("–".into(), |stat| format!("{} %", stat["hs"].as_f64().unwrap_or(0.0))), sub: tr("Tête", "HS"), extra: "right".into(), ..Default::default() });
            row(cells).id(&format!("eval:live-player:{subject}")).on(subject.eq_ignore_ascii_case(&me))
        }).collect();
        out.extend(group(lines));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn countdowns_show_days_when_needed() {
        assert_eq!(countdown(3725), "1:02:05");
        assert_eq!(countdown(90000), "1j 1:00:00");
        assert_eq!(countdown(-5), "0:00:00");
    }

    #[test]
    fn chroma_and_level_labels() {
        assert_eq!(chroma_label(&json!({ "displayName": "Vandal Prime (Variante 2 Rouge)" }), 1), "Rouge");
        assert_eq!(chroma_label(&json!({ "displayName": "Vandal Prime" }), 0), "Base");
        assert_eq!(level_label(&json!({ "levelItem": "EEquippableSkinLevelItem::VFX" }), 1), "Effets visuels");
        assert_eq!(level_label(&json!({}), 0), "Apparence de base");
    }

    #[test]
    fn skins_are_found_by_any_of_their_ids() {
        let index = json!([{ "uuid": "S", "levels": [{ "uuid": "L1" }], "chromas": [{ "uuid": "C1", "fullRender": "full" }] }]);
        assert!(find_skin(&index, "l1").is_some());
        assert!(find_skin(&index, "c1").is_some());
        assert!(find_skin(&index, "zz").is_none());
        assert_eq!(skin_image(&index[0]), "full");
        assert_eq!(tier_info("411E4A55-4E59-7757-41F0-86A53F101BB5"), Some(("#f5d96a", "Ultra")));
    }
}
