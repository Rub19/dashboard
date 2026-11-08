use crate::app::{spawn, App, Page};
use crate::i18n::{error_text, fr, t, tr, tv};
use crate::logic::eval::split_riot_id;
use crate::logic::lol::{add_lp_point, champion_splash, clean_lp_points, keep_known_matches, live_mode, lol_line, lol_rank, lol_session, lol_stats, lol_teams, mode_label, parse_assets, top_champions};
use crate::logic::time;
use crate::pages::eval::decimal;
use crate::pages::generic::number_text;
use crate::pages::{encode, section, set_section};
use crate::prefs;
use crate::services::{api_data, ddragon_get, svc, Fut};
use crate::vm::*;
use serde_json::{json, Value};

const SECTION_KEY: &str = "ethone-section-games";
const ID_KEY: &str = "ethone-lol-id";
const LP_LEGACY: &str = "ethone-lol-lp";

#[derive(Default)]
pub struct LolState {
    pub id: Option<String>,
    pub started: bool,
    pub data: Option<Value>,
    pub busy: bool,
    pub error: Option<String>,
    pub search: String,
    pub open: Option<Value>,
    pub view: String,
    pub filter_result: String,
    pub filter_mode: String,
    pub filter_pick: String,
    pub connecting: bool,
    pub tft_text: String,
    pub tft_expanded: Option<String>,
    pub live_at: f64,
}

fn query(id: &str) -> String {
    let (name, tag) = split_riot_id(id).unwrap_or_default();
    format!("name={}&tag={}", encode(&name), encode(&tag))
}

fn own() -> Option<String> {
    ethone_engine::riot::load_identity().filter(|identity| !identity.name.is_empty() && !identity.tag.is_empty()).map(|identity| format!("{}#{}", identity.name, identity.tag))
}

fn lp_key(own: &str) -> String {
    format!("{LP_LEGACY}:{}", own.to_lowercase())
}

fn load(app: &mut App, id: &str, force: bool) {
    app.state.lol.error = None;
    let key = format!("lol:{}", id.to_lowercase());
    let cached = crate::cache::read(&key);
    app.state.lol.data = cached.as_ref().map(|(_, value)| value.clone());
    if !force && cached.as_ref().is_some_and(|(at, _)| chrono::Utc::now().timestamp_millis() - at < 5 * 60 * 1000) {
        return;
    }
    app.state.lol.busy = true;
    let (holder, known) = (id.to_string(), cached.map(|(_, value)| value["matches"].as_array().cloned().unwrap_or_default()));
    spawn(
        async move {
            let q = query(&holder);
            let profile = api_data(&format!("api/stats/lol-profile?{q}")).await?;
            let matches = api_data(&format!("api/stats/lol-matches?{q}")).await.ok().map(|value| value.as_array().cloned().unwrap_or_default());
            let (list, stale) = keep_known_matches(matches, known);
            let next = json!({ "of": holder.to_lowercase(), "profile": profile, "matches": list });
            crate::cache::write(&format!("lol:{}", holder.to_lowercase()), &next);
            Ok::<(Value, bool), String>((next, stale))
        },
        |app, result| {
            app.state.lol.busy = false;
            match result {
                Ok((data, stale)) => {
                    if stale {
                        app.state.lol.error = Some(tr("Les matchs n'ont pas pu être actualisés. Dernière liste connue affichée.", "Matches could not be refreshed. Showing the last known list."));
                    }
                    record_lp(&data);
                    app.state.lol.data = Some(data);
                }
                Err(error) => app.state.lol.error = Some(error_text(&error)),
            }
        },
    );
}

fn record_lp(data: &Value) {
    let Some(own) = own() else { return };
    if data["of"].as_str() != Some(own.to_lowercase().as_str()) {
        return;
    }
    let mut points: Vec<Value> = prefs::read_json(&lp_key(&own)).unwrap_or_default();
    let legacy: Vec<Value> = prefs::read_json(LP_LEGACY).unwrap_or_default();
    if !legacy.is_empty() && points.is_empty() {
        points = legacy;
        prefs::write(LP_LEGACY, "[]");
    }
    let next = add_lp_point(&points, data["profile"]["rankSolo"].as_str().unwrap_or_default(), time::now_ms());
    prefs::write_json(&lp_key(&own), &next);
}

fn show(app: &mut App, id: &str) {
    app.state.lol.id = Some(id.to_string());
    app.state.lol.open = None;
    set_section(SECTION_KEY, "profile");
    if own().is_none() {
        prefs::write_json(ID_KEY, &id.to_string());
    }
    load(app, id, false);
}

fn assets(app: &mut App) -> Option<std::rc::Rc<Value>> {
    app.load("lol:assets", || crate::cache::cached("lol-assets".into(), 86_400_000, true, Box::pin(async {
        if !svc().auth.is_signed_in().await {
            return Err("sessionRequired".to_string());
        }
        let summoner = ddragon_get("summoner").await?;
        let runes = ddragon_get("runesReforged").await?;
        let champions = ddragon_get("champion").await?;
        Ok(parse_assets(&summoner, &runes, &champions))
    }) as Fut)).data
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "tab" => set_section(SECTION_KEY, arg),
        "connect" => {
            app.state.lol.connecting = true;
            spawn(async { svc().riot.login(svc().host.clone(), false).await }, |app, result| {
                if let Err(error) = result {
                    app.state.lol.connecting = false;
                    app.state.lol.error = Some(error_text(&error));
                }
            });
        }
        "search" => app.state.lol.search = value.into(),
        "search-submit" | "search:submit" => match split_riot_id(&app.state.lol.search) {
            Some((name, tag)) => {
                app.state.lol.search.clear();
                show(app, &format!("{name}#{tag}"));
            }
            None => app.state.lol.error = Some(t("evalRiotInvalid")),
        },
        "mine" => {
            if let Some(mine) = own() {
                show(app, &mine);
            }
        }
        "refresh" => {
            if let Some(id) = app.state.lol.id.clone() {
                load(app, &id, true);
            }
        }
        "open" => {
            let found = app.state.lol.data.as_ref().and_then(|data| data["matches"].as_array().and_then(|list| list.iter().find(|item| item["id"] == arg).cloned()));
            if let Some(found) = found {
                let title = found["metadata"]["agentName"].as_str().unwrap_or_default().to_string();
                app.state.lol.open = Some(found);
                app.state.lol.view = "board".into();
                app.open_drawer(&title, 760.0, panel);
            }
        }
        "panel" => app.state.lol.view = arg.into(),
        "filter-result" => app.state.lol.filter_result = arg.into(),
        "filter-mode" => app.state.lol.filter_mode = value.into(),
        "filter-pick" => app.state.lol.filter_pick = value.into(),
        "filter-clear" => {
            app.state.lol.filter_result.clear();
            app.state.lol.filter_mode.clear();
            app.state.lol.filter_pick.clear();
        }
        "player" => show(app, arg),
        "tft-text" => app.state.lol.tft_text = value.into(),
        "tft-search" | "tft-text:submit" => {
            let text = app.state.lol.tft_text.trim().to_string();
            if !text.contains('#') {
                app.state.lol.error = Some(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
                return;
            }
            prefs::write_json(ID_KEY, &text);
            app.forget("lol:tft");
        }
        "tft-toggle" => app.state.lol.tft_expanded = if app.state.lol.tft_expanded.as_deref() == Some(arg) { None } else { Some(arg.to_string()) },
        "rotation-refresh" => app.forget("lol:rotation"),
        other => {
            let _ = crate::pages::eval_hub::act(app, other, arg, value);
        }
    }
}

pub fn login_event(app: &mut App, status: &str) {
    app.state.lol.connecting = false;
    if status == "linked" {
        if let Some(mine) = own() {
            app.state.lol.id = Some(mine.clone());
            load(app, &mine, true);
        }
    }
}

fn icons(app: &mut App, ids: &[Option<i64>], table: Option<&Value>, size: f32) -> Vec<C> {
    ids.iter().flatten().filter_map(|id| table.and_then(|table| table[id.to_string()]["image"].as_str()).map(|url| (url.to_string(), table.and_then(|table| table[id.to_string()]["name"].as_str()).unwrap_or_default().to_string()))).map(|(url, name)| img(app.img(&url), size).tip(&name)).collect()
}

fn match_block(app: &mut App, item: &Value, table: Option<&Value>) -> B {
    let line = lol_line(item);
    let meta = &item["metadata"];
    let portrait_url = meta["agentImageUrl"].as_str().unwrap_or_default().to_string();
    let portrait = if app.image_failed.contains(&portrait_url) { app.img(meta["agentImageFallback"].as_str().unwrap_or_default()) } else { app.img(&portrait_url) };
    let mut cells = vec![C { kind: "img", image: portrait, size: 50.0, progress: 50.0, round: true, ..Default::default() }];
    let mut title = C { kind: "stack", title: meta["agentName"].as_str().unwrap_or_default().to_string(), sub: mode_label(meta["modeName"].as_str().unwrap_or_default(), fr()), weight: 1.0, size: 15.0, ..Default::default() };
    title.sub.push_str(&format!(" · {}", time::ago(meta["timestamp"].as_str(), time::now_ms(), fr())));
    cells.push(title);
    let runes = table.map(|table| &table["runes"]);
    let spells = table.map(|table| &table["spells"]);
    cells.extend(icons(app, &[line.me.as_ref().and_then(|me| me["rune"]["id"].as_i64())], runes, 20.0));
    let spell_ids: Vec<Option<i64>> = line.me.as_ref().and_then(|me| me["spells"].as_array()).map(|list| list.iter().map(|spell| spell["id"].as_i64()).collect()).unwrap_or_default();
    cells.extend(icons(app, &spell_ids, spells, 20.0));
    cells.push(C { kind: "stack", title: format!("{} / {} / {}", line.kills, line.deaths, line.assists), sub: format!("{} CS", line.cs), extra: "right".into(), ..Default::default() });
    let result = if line.remake { tr("Remake", "Remake") } else if line.won { tr("Victoire", "Win") } else { tr("Défaite", "Loss") };
    let score = if line.minutes > 0 { format!("{} — {} · {} min", line.score.0, line.score.1, line.minutes) } else { format!("{} — {}", line.score.0, line.score.1) };
    cells.push(C { kind: "stack", title: score, sub: result, tone: if line.remake { "" } else if line.won { "ok" } else { "bad" }, extra: "right".into(), ..Default::default() });
    let splash = champion_splash(&portrait_url);
    let mut block = banner(app.img(&splash), 80.0, cells).id(&format!("lol:open:{}", item["id"].as_str().unwrap_or_default()));
    block.tone = if line.remake { "draw" } else if line.won { "win" } else { "loss" };
    block
}

fn panel(app: &mut App) -> Vec<B> {
    let Some(item) = app.state.lol.open.clone() else { return Vec::new() };
    let table = assets(app);
    let line = lol_line(&item);
    let meta = &item["metadata"];
    let fr = fr();
    let mut detail = mode_label(meta["modeName"].as_str().unwrap_or_default(), fr);
    if let Some(date) = meta["timestamp"].as_str().and_then(time::parse) {
        detail.push_str(&format!(", {}", time::date_time(&date, fr)));
    }
    if line.minutes > 0 {
        detail.push_str(&format!(", {} min", line.minutes));
    }
    let splash = champion_splash(meta["agentImageUrl"].as_str().unwrap_or_default());
    let mut out = vec![banner(app.img(&splash), 110.0, vec![stack(meta["agentName"].as_str().unwrap_or_default(), &detail)])];
    let mine = line.me.as_ref().map(|me| me["stats"].clone()).filter(Value::is_object);
    let view = if app.state.lol.view.is_empty() { "board".to_string() } else { app.state.lol.view.clone() };
    if mine.is_some() {
        out.push(tabs(&[("board", &tr("Tableau", "Scoreboard")), ("analysis", &tr("Analyse", "Analysis"))], &view, "lol:panel:"));
    }
    if view == "analysis" {
        if let Some(mine) = mine {
            let number = |key: &str| mine[key].as_f64().unwrap_or(0.0);
            let cells = vec![
                stat(&tr("Participation aux éliminations", "Kill participation"), &format!("{} %", number_text(number("killParticipation"))), ""),
                stat(&tr("Or/min", "Gold/min"), &number("goldPerMin").round().to_string(), ""),
                stat(&tr("Dégâts/min", "Damage/min"), &number("damagePerMin").round().to_string(), ""),
                stat(&tr("Dégâts subis/min", "Damage taken/min"), &number("damageTakenPerMin").round().to_string(), ""),
                stat(&tr("Dégâts aux objectifs", "Objective damage"), &number_text(number("damageToObjectives")), ""),
                stat(&tr("Score de vision", "Vision score"), &number_text(number("visionScore")), ""),
                stat(&tr("Balises posées", "Wards placed"), &number_text(number("wardsPlaced")), ""),
                stat(&tr("Contrôle infligé", "Crowd control"), &format!("{} s", number_text(number("timeCCingOthers"))), ""),
            ];
            out.extend(grid(cells, 3, 0.0));
        }
        return out;
    }
    for team in lol_teams(&item) {
        let objectives = &item["scoreboard"]["teams"][&team.team];
        let note_text = if objectives.is_object() { tr(&format!("{} tours, {} dragons, {} barons", objectives["towers"].as_i64().unwrap_or(0), objectives["dragons"].as_i64().unwrap_or(0), objectives["barons"].as_i64().unwrap_or(0)), &format!("{} towers, {} dragons, {} barons", objectives["towers"].as_i64().unwrap_or(0), objectives["dragons"].as_i64().unwrap_or(0), objectives["barons"].as_i64().unwrap_or(0))) } else { String::new() };
        out.push(h2x(&format!("{} · {}", team.kills, t(if team.won { "evalTeamWon" } else { "evalTeamLost" })), &note_text, vec![]));
        out.push(row(vec![muted(&t("evalPlayer")).grow(), muted("K/D/A"), muted("CS"), muted(&tr("Dégâts", "Damage")), muted(&tr("Or", "Gold"))]));
        let lines: Vec<B> = team.players.iter().map(|player| {
            let face_url = player["assets"]["champion"]["small"].as_str().unwrap_or_default().to_string();
            let face = if app.image_failed.contains(&face_url) { app.img(player["assets"]["champion"]["fallback"].as_str().unwrap_or_default()) } else { app.img(&face_url) };
            let stats = &player["stats"];
            let mut cells = vec![img(face, 26.0).tip(player["character"].as_str().unwrap_or_default()), text(player["name"].as_str().filter(|name| !name.is_empty()).or(player["character"].as_str()).unwrap_or_default()).on(player["isMe"] == true).grow()];
            cells.extend(icons(app, &[player["rune"]["id"].as_i64()], table.as_deref().map(|table| &table["runes"]), 18.0));
            let spells: Vec<Option<i64>> = player["spells"].as_array().map(|list| list.iter().map(|spell| spell["id"].as_i64()).collect()).unwrap_or_default();
            cells.extend(icons(app, &spells, table.as_deref().map(|table| &table["spells"]), 18.0));
            for item_data in player["items"].as_array().into_iter().flatten().filter(|entry| entry["image"].is_string()).take(7) {
                let picture = app.img(item_data["image"].as_str().unwrap_or_default());
                cells.push(img(picture, 18.0));
            }
            cells.extend([text(&format!("{}/{}/{}", stats["kills"], stats["deaths"], stats["assists"])), text(&stats["cs"].to_string()), text(&number_text(stats["damage"].as_f64().unwrap_or(0.0))), text(&number_text(stats["gold"].as_f64().unwrap_or(0.0)))]);
            row(cells).on(player["isMe"] == true)
        }).collect();
        out.extend(group(lines));
    }
    out
}

fn rank_cell(app: &mut App, text_value: &str, label: &str) -> C {
    let rank = lol_rank(text_value, fr());
    let progress = (rank.lp.min(100) as f32) / 100.0;
    C { kind: "rank", title: label.into(), value: rank.name, sub: if rank.emblem.is_empty() { String::new() } else { format!("{} LP", rank.lp) }, image: app.img(&rank.emblem), color: Some(if rank.color.is_empty() { hex("#8e8e93") } else { hex(rank.color) }), progress, extra: crate::pages::work::ring_path(progress), weight: 1.0, ..Default::default() }
}

fn profile(app: &mut App, id: &str) -> (Vec<B>, Vec<B>) {
    let mine = own();
    let data = app.state.lol.data.clone();
    let matches: Vec<Value> = data.as_ref().and_then(|data| data["matches"].as_array().cloned()).unwrap_or_default();
    let mut aside = Vec::new();
    match &data {
        Some(data) => {
            let profile = &data["profile"];
            let handle = profile["handle"].as_str().unwrap_or(id).to_string();
            let mut header = vec![stack(&handle, &tr("Profil League of Legends", "League of Legends profile"))];
            if mine.as_deref() == Some(id) {
                crate::pages::eval::prepare_accounts_menu(app);
                let users = app.icon("users");
                header.push(C { kind: "menubtn", icon: users, value: "riot-accounts".into(), tip: tr("Changer de compte Riot", "Switch Riot account"), ..Default::default() });
            }
            if let Some(avatar_url) = profile["avatarUrl"].as_str() {
                header.push(img(app.img(avatar_url), 40.0).round());
            }
            aside.push(card(header));
            let favorite = top_champions(&matches, 1).into_iter().next();
            let splash = favorite.as_ref().map(|favorite| champion_splash(&favorite.image)).unwrap_or_default();
            let level = profile["segments"][0]["stats"]["level"]["value"].as_f64().unwrap_or(0.0);
            aside.push(banner(app.img(&splash), 96.0, if level > 0.0 { vec![gap(), chip("", &number_text(level))] } else { vec![] }));
            let (solo, flex) = (rank_cell(app, profile["rankSolo"].as_str().unwrap_or_default(), "Solo"), rank_cell(app, profile["rankFlex"].as_str().unwrap_or_default(), "Flex"));
            aside.push(row(vec![solo, flex]));
        }
        None => aside.extend(skeletons(1, 280.0)),
    }
    if !matches.is_empty() {
        let stats = lol_stats(&matches);
        aside.push(h2x(&t("evalSummary"), &tv("evalOnMatches", &[("count", &stats.count.to_string())]), vec![]));
        aside.push(row(vec![stat(&t("evalWinRate"), &format!("{} %", decimal(stats.win_rate)), ""), stat(&t("evalRecord"), &format!("{}V – {}D", stats.wins, stats.losses), "")]));
        aside.push(row(vec![stat("KDA", &decimal(stats.kda), ""), stat(&tr("CS/min", "CS/min"), &decimal(stats.cs_per_min), ""), stat(&tr("Dégâts/min", "Damage/min"), &stats.damage_per_min.to_string(), "")]));
    }
    if let Some(mine) = mine.as_deref().filter(|mine| *mine == id) {
        let points = clean_lp_points(&prefs::read_json::<Vec<Value>>(&lp_key(mine)).unwrap_or_default());
        if !points.is_empty() {
            aside.push(h2x(&tr("Historique des LP", "LP history"), &tr(&format!("{} relevé(s) sur ce PC", points.len()), &format!("{} reading(s) on this PC", points.len())), vec![]));
            if points.len() > 1 {
                let recent = &points[points.len().saturating_sub(40)..];
                let (low, high) = recent.iter().fold((i64::MAX, i64::MIN), |(low, high), point| { let score = point["score"].as_i64().unwrap_or(0); (low.min(score), high.max(score)) });
                aside.push(bars(80.0, recent.iter().map(|point| { let score = point["score"].as_i64().unwrap_or(0); C { progress: if high == low { 0.5 } else { 0.1 + (score - low) as f32 / (high - low) as f32 * 0.9 }, tip: point["rank"].as_str().unwrap_or_default().into(), ..Default::default() } }).collect()));
            }
            let fr = fr();
            let changes: Vec<B> = points.iter().rev().take(5).enumerate().map(|(at, point)| {
                let before = points.len().checked_sub(at + 2).and_then(|index| points.get(index));
                let delta = before.map(|before| point["score"].as_i64().unwrap_or(0) - before["score"].as_i64().unwrap_or(0));
                let rank = lol_rank(point["rank"].as_str().unwrap_or_default(), fr);
                let mut cells = vec![text(&format!("{} {} LP", rank.name, rank.lp)).grow()];
                if let Some(delta) = delta {
                    cells.push(strong(&format!("{}{delta}", if delta >= 0 { "+" } else { "" })).tone(if delta >= 0 { "ok" } else { "bad" }));
                }
                cells.push(muted(&point["at"].as_f64().map(|at| time::short_date(&time::from_ms(at), fr)).unwrap_or_default()));
                row(cells)
            }).collect();
            aside.extend(group(changes));
        }
    }
    if !matches.is_empty() {
        aside.push(h2(&tr("Champions", "Champions")));
        let rows: Vec<B> = top_champions(&matches, 3).iter().map(|champion| row(vec![img(app.img(&champion.image), 32.0).round(), stack(&champion.name, &tr(&format!("{} parties", champion.games), &format!("{} games", champion.games))), C { kind: "stack", title: format!("{} %", champion.win_rate), sub: format!("KDA {}", decimal(champion.kda)), extra: "right".into(), ..Default::default() }])).collect();
        aside.extend(group(rows));
    }
    let (refresh, me_icon, search) = (app.icon("refresh-cw"), app.icon("user-round"), app.icon("search"));
    let mut actions = Vec::new();
    if let Some(mine) = &mine {
        if mine != id {
            actions.push(btn("lol:mine", &tr("Mon profil", "My profile")).icon(me_icon));
        }
    }
    let search_text = app.state.lol.search.clone();
    actions.push(input("lol:search", &search_text, &t("evalRiotPlaceholder")).tip(&t("evalOtherPlayer")).size(220.0));
    actions.push(ibtn("lol:search-submit", search, &t("evalSearch")));
    actions.push(btn("lol:refresh", &t("refresh")).icon(refresh).off(app.state.lol.busy).tip("F5"));
    let mut main = vec![head(&t("evalMatches"), "", actions)];
    if let Some(message) = app.state.lol.error.clone() {
        main.push(error(&message, vec![btn("lol:refresh", &t("retry"))]));
    }
    if data.is_none() {
        main.extend(skeletons(6, 58.0));
        return (main, aside);
    }
    if matches.is_empty() && !app.state.lol.busy {
        main.push(empty(&t("evalNoMatches"), &tr("Aucune partie récente trouvée pour ce joueur.", "No recent games found for this player.")));
        return (main, aside);
    }
    let session = lol_session(&matches);
    let session_stats = lol_stats(&session);
    if session_stats.count > 0 {
        main.push(row(vec![stat(&t("evalSession"), &format!("{}V – {}D", session_stats.wins, session_stats.losses), ""), stat("KDA", &decimal(session_stats.kda), ""), stat(&tr("CS/min", "CS/min"), &decimal(session_stats.cs_per_min), ""), stat(&tr("Dégâts/min", "Damage/min"), &session_stats.damage_per_min.to_string(), "")]));
    }
    let fr = fr();
    let modes = crate::logic::options(matches.iter().map(|item| mode_label(item["metadata"]["modeName"].as_str().unwrap_or_default(), fr)).collect());
    let picks = crate::logic::options(matches.iter().map(|item| item["metadata"]["agentName"].as_str().unwrap_or_default().to_string()).collect());
    let (result, mode, pick) = (app.state.lol.filter_result.clone(), app.state.lol.filter_mode.clone(), app.state.lol.filter_pick.clone());
    let mut filters = crate::pages::eval_more::filters(app, "lol", &modes, &picks, &tr("Tous les champions", "All champions"), &result, &mode, &pick);
    let shown: Vec<&Value> = matches.iter().filter(|item| {
        let line = lol_line(item);
        crate::logic::keep_match(&result, &mode, &pick, line.won, line.remake, &mode_label(item["metadata"]["modeName"].as_str().unwrap_or_default(), fr), item["metadata"]["agentName"].as_str().unwrap_or_default())
    }).collect();
    filters.push(muted(&format!("{}/{}", shown.len(), matches.len())));
    main.push(row(filters));
    let table = assets(app);
    let mut day = String::new();
    for item in shown {
        let label = crate::pages::eval::day_label(item["metadata"]["timestamp"].as_str().unwrap_or_default());
        if label != day {
            main.push(h2(&label));
            day = label;
        }
        main.push(match_block(app, item, table.as_deref()));
    }
    (main, aside)
}

fn live(app: &mut App, id: &str) -> Vec<B> {
    let now = time::now_ms();
    if now - app.state.lol.live_at > 30000.0 {
        app.state.lol.live_at = now;
        let holder = id.to_string();
        app.reload(&format!("lol:live:{id}"), move || api_data(&format!("api/stats/lol-live?{}", query(&holder))));
    }
    let holder = id.to_string();
    let res = app.load(&format!("lol:live:{id}"), move || api_data(&format!("api/stats/lol-live?{}", query(&holder))));
    if let Some(message) = res.error.clone() {
        return vec![error(&message, vec![])];
    }
    let Some(game) = res.data else { return skeletons(3, 58.0) };
    if game["active"] != true {
        return vec![empty(&tr("Pas en partie", "Not in a game"), &tr(&format!("{id} n'est pas en partie pour le moment. Cette page se met à jour toutes les 30 secondes."), &format!("{id} is not in a game right now. This page refreshes every 30 seconds.")))];
    }
    let table = assets(app);
    let seconds = game["startedAt"].as_f64().map(|start| ((now - start) / 1000.0).floor().max(0.0) as i64).unwrap_or_else(|| game["length"].as_i64().unwrap_or(0));
    let mode = live_mode(game["mode"].as_str().unwrap_or_default(), game["queueId"].as_i64().unwrap_or(0), fr());
    let mut out = vec![head(&if mode.is_empty() { tr("Partie en cours", "Game in progress") } else { mode }, &format!("{}:{:02}", seconds / 60, seconds % 60), vec![])];
    for team in ["Blue", "Red"] {
        out.push(h2(&if team == "Blue" { tr("Équipe bleue", "Blue team") } else { tr("Équipe rouge", "Red team") }));
        let lines: Vec<B> = game["players"].as_array().into_iter().flatten().filter(|player| player["team"] == team).map(|player| {
            let champion = table.as_deref().map(|table| &table["champions"][player["championId"].to_string()]);
            let face = champion.and_then(|champion| champion["image"].as_str()).map(|url| app.img(url)).unwrap_or_default();
            let mut cells = vec![img(face, 34.0).round(), stack(player["name"].as_str().unwrap_or_default(), champion.and_then(|champion| champion["name"].as_str()).unwrap_or_default())];
            let spells: Vec<Option<i64>> = player["spells"].as_array().map(|list| list.iter().map(Value::as_i64).collect()).unwrap_or_default();
            cells.extend(icons(app, &spells, table.as_deref().map(|table| &table["spells"]), 22.0));
            cells.extend(icons(app, &[player["keystone"].as_i64(), player["secondary"].as_i64()], table.as_deref().map(|table| &table["runes"]), 22.0));
            let handle = format!("{}#{}", player["name"].as_str().unwrap_or_default(), player["tag"].as_str().unwrap_or_default());
            let line = row(cells).on(player["isMe"] == true);
            if player["tag"].as_str().is_some_and(|tag| !tag.is_empty()) { line.id(&format!("lol:player:{handle}")) } else { line }
        }).collect();
        out.extend(group(lines));
    }
    out
}

fn tft(app: &mut App) -> Vec<B> {
    if app.state.lol.tft_text.is_empty() {
        app.state.lol.tft_text = prefs::read_json::<String>(ID_KEY).or_else(own).unwrap_or_default();
    }
    let id = prefs::read_json::<String>(ID_KEY).or_else(own).unwrap_or_default();
    let text_value = app.state.lol.tft_text.clone();
    let mut out = vec![head("Teamfight Tactics", &tr("Tes parties, compositions et classements Riot réels.", "Your real Riot matches, compositions and standings."), vec![]), row(vec![input("lol:tft-text", &text_value, "Pseudo#TAG").tip(&tr("Identifiant Riot", "Riot ID")), primary("lol:tft-search", &tr("Rechercher", "Search"))])];
    if id.is_empty() {
        return out;
    }
    let holder = id.clone();
    let res = app.load("lol:tft", move || api_data(&format!("api/stats/tft-matches?{}", query(&holder))));
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(4, 120.0));
        }
        return out;
    };
    let matches: Vec<Value> = data.as_array().cloned().unwrap_or_default();
    if matches.is_empty() {
        out.push(empty(&tr("Aucune partie TFT", "No TFT games"), &tr("Aucune partie récente n'est disponible pour cet identifiant.", "No recent match is available for this Riot ID.")));
        return out;
    }
    let totals = crate::logic::tft::summary(&matches);
    let games = totals.games;
    out.push(row(vec![stat(&tr("Parties", "Games"), &games.to_string(), ""), stat(&tr("Place moyenne", "Average place"), &decimal(totals.average), ""), stat("Top 4", &format!("{} %", totals.top_four_rate), &format!("{}/{games}", totals.top_four)), stat(&tr("Victoires", "Wins"), &totals.wins.to_string(), "")]));
    out.push(h2x(&tr("Historique", "History"), &tr(&format!("{games} parties analysées"), &format!("{games} games analyzed")), vec![]));
    let fr = fr();
    let expanded = app.state.lol.tft_expanded.clone();
    for (at, item) in matches.iter().enumerate() {
        let key = item["id"].as_str().map_or(at.to_string(), str::to_string);
        let me = &item["me"];
        let placement = me["placement"].as_i64().unwrap_or(0);
        let tone = match crate::logic::tft::placement_tone(Some(placement)) { "first" => "ok", "top" => "accent", "out" => "bad", _ => "" };
        let mut sub = Vec::new();
        if let Some(set) = item["setNumber"].as_i64() {
            sub.push(format!("Set {set}"));
        }
        if let Some(date) = item["playedAt"].as_str().and_then(time::parse) {
            sub.push(time::date_time(&date, fr));
        }
        let length = crate::logic::tft::duration(item["durationSeconds"].as_f64());
        if !length.is_empty() {
            sub.push(length);
        }
        let metric = |value: &Value, label: String| C { kind: "stack", title: value.as_f64().map_or("–".into(), number_text), sub: label, extra: "right".into(), ..Default::default() };
        out.push(card(vec![strong(&if placement > 0 { format!("#{placement}") } else { "–".into() }).tone(tone).size(20.0), stack(item["mode"].as_str().filter(|mode| !mode.is_empty()).unwrap_or("TFT"), &sub.join(" · ")), metric(&me["level"], tr("Niveau", "Level")), metric(&me["damage"], tr("Dégâts", "Damage")), metric(&me["playersEliminated"], tr("Élim.", "Elims")), metric(&me["lastRound"], tr("Manche", "Round"))]).id(&format!("lol:tft-toggle:{key}")));
        let traits: Vec<C> = me["traits"].as_array().into_iter().flatten().take(7).map(|item_trait| chip("", &format!("{} {}", item_trait["name"].as_str().unwrap_or_default(), item_trait["numUnits"].as_i64().unwrap_or(0))).on(item_trait["tierCurrent"].as_i64().unwrap_or(0) >= 3)).collect();
        if !traits.is_empty() {
            out.push(row(traits).gap(6.0).level(1));
        }
        let units: Vec<C> = me["units"].as_array().into_iter().flatten().take(9).map(|unit| chip("", &format!("{} {}", unit["name"].as_str().or(unit["characterId"].as_str()).unwrap_or_default(), "★".repeat(unit["tier"].as_u64().unwrap_or(1).max(1) as usize)))).collect();
        if !units.is_empty() {
            out.push(row(units).gap(6.0).level(1));
        }
        if expanded.as_deref() == Some(key.as_str()) {
            out.push(h2(&tr("Classement du lobby", "Lobby standings")).level(1));
            out.extend(group(item["players"].as_array().into_iter().flatten().map(|player| {
                let main_trait = &player["traits"][0];
                row(vec![strong(&player["placement"].as_i64().map_or("–".into(), |place| format!("#{place}"))), stack(&tr(&format!("Niveau {}", player["level"]), &format!("Level {}", player["level"])), &main_trait["name"].as_str().map_or_else(|| tr("Composition non disponible", "Composition unavailable"), |name| format!("{name} {}", main_trait["numUnits"].as_i64().unwrap_or(0)))), C { kind: "stack", title: player["damage"].as_f64().map_or("–".into(), number_text), sub: tr("dégâts", "damage"), extra: "right".into(), ..Default::default() }, C { kind: "stack", title: player["playersEliminated"].to_string(), sub: tr("éliminations", "eliminations"), extra: "right".into(), ..Default::default() }]).level(1)
            }).collect()));
        }
    }
    out.push(note(&tr("Données fournies par l'API Riot Games.", "Data provided by the Riot Games API.")));
    out
}

fn rotation(app: &mut App) -> Vec<B> {
    let res = app.load("lol:rotation", || api_data("api/stats/lol-rotation"));
    let refresh = app.icon("refresh-cw");
    let version = res.data.as_ref().and_then(|data| data["gameVersion"].as_str()).map(|version| tr(&format!("Version {version}"), &format!("Version {version}"))).unwrap_or_default();
    let mut out = vec![head(&tr("Rotation LoL", "LoL rotation"), &version, vec![btn("lol:rotation-refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 80.0));
        }
        return out;
    };
    for (title, key) in [(tr("Gratuits cette semaine", "Free this week"), "free"), (tr("Gratuits pour les nouveaux joueurs", "Free for new players"), "freeForNewPlayers")] {
        let rows = data[key].as_array().cloned().unwrap_or_default();
        if rows.is_empty() {
            continue;
        }
        out.push(h2(&title));
        let cells: Vec<C> = rows.iter().map(|champion| C { kind: "variant", title: format!("{}{}", champion["name"].as_str().unwrap_or_default(), champion["title"].as_str().map_or(String::new(), |title| format!(", {title}"))), image: app.img(champion["icon"].as_str().unwrap_or_default()), weight: 1.0, ..Default::default() }).collect();
        out.extend(grid(cells, 6, 6.0));
    }
    out
}

pub fn view(app: &mut App) -> Page {
    if !app.state.lol.started {
        app.state.lol.started = true;
        let start = own().or_else(|| prefs::read_json::<String>(ID_KEY));
        if let Some(start) = start {
            app.state.lol.id = Some(start.clone());
            load(app, &start, false);
        }
    }
    let Some(id) = app.state.lol.id.clone() else {
        let (mark, link_icon) = (app.icon("league"), app.icon("external-link"));
        let search_text = app.state.lol.search.clone();
        let mut main = vec![
            B { kind: "logo", image: mark, title: "E:LOL".into(), sub: tr("Relie ton compte Riot ou cherche un joueur pour voir son rang et ses parties.", "Link your Riot account or search a player to see their rank and games."), tone: "icon", ..Default::default() },
            row(vec![primary("lol:connect", &tr("Se connecter avec Riot", "Sign in with Riot")).icon(link_icon).off(app.state.lol.connecting)]).center(),
        ];
        if app.state.lol.connecting {
            main.push(note(&t("evalConnecting")));
        }
        if let Some(message) = app.state.lol.error.clone() {
            main.push(bad(&message));
        }
        main.push(field(&t("evalOtherPlayer"), vec![input("lol:search", &search_text, &t("evalRiotPlaceholder")), btn("lol:search-submit", &t("evalSearch"))]));
        return Page { main, ..Default::default() };
    };
    let tab = section(SECTION_KEY, "profile");
    let tab = if ["profile", "live", "tft", "rotation", "hub"].contains(&tab.as_str()) { tab } else { "profile".into() };
    let mut main = vec![tabs(&[("profile", &tr("Profil", "Profile")), ("live", &tr("En direct", "Live")), ("tft", "TFT"), ("rotation", &tr("Rotation", "Rotation")), ("hub", &tr("Amis", "Friends"))], &tab, "lol:tab:")];
    match tab.as_str() {
        "live" => main.extend(live(app, &id)),
        "tft" => main.extend(tft(app)),
        "rotation" => main.extend(rotation(app)),
        "hub" => {
            let linked = own().is_some();
            main.extend(crate::pages::eval_hub::friends(app, linked, None, true).into_iter().map(|mut block| {
                if block.id.starts_with("eval:friend-open:") {
                    block.id = block.id.replacen("eval:friend-open:", "lol:player:", 1);
                }
                block
            }));
        }
        _ => {
            let (extra, aside) = profile(app, &id);
            main.extend(extra);
            return Page { main, aside, aside_width: 360.0, ..Default::default() };
        }
    }
    Page { main, ..Default::default() }
}
