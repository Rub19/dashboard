use crate::app::{entry, danger_entry, spawn, App, Page};
use crate::i18n::{error_text, fr, t, tv, tr};
use crate::logic::eval::{agent_bust, agent_icon, banner_image, current_tier, map_image, match_analysis, match_line, match_summary, mode_name, rank_color, rank_name, rounds_for, scoreboard, split_riot_id, stats_for, last_session, tier_icon, weapon_icon};
use crate::logic::time;
use crate::pages::{section, set_section};
use crate::prefs;
use crate::services::{self, api_data, catalog_get, svc, Fut};
use crate::vm::*;
use chrono::{Datelike, Local};
use serde_json::{json, Value};

const SECTION_KEY: &str = "ethone-section-eval";
const LOCAL_ID: &str = "ethone-eval-riot-id";
const MATCH_LIMIT: u32 = 25;
const SNAPSHOT: &str = "eval-snapshot";

#[derive(Default)]
pub struct EvalState {
    pub data: Option<Value>,
    pub loading: bool,
    pub refreshing: bool,
    pub started: bool,
    pub error: Option<String>,
    pub needs_id: bool,
    pub connecting: bool,
    pub search: String,
    pub search_invalid: bool,
    pub browser: bool,
    pub browser_url: String,
    pub limit: u32,
    pub filter_result: String,
    pub filter_mode: String,
    pub filter_pick: String,
    pub open: Option<Value>,
    pub panel_view: String,
    pub asking_remove: Option<String>,
}

fn identity() -> Option<ethone_engine::riot::Identity> {
    ethone_engine::riot::load_identity()
}

async fn load(name: String, tag: String, linked: Option<String>) -> Result<Value, String> {
    let path = ethone_engine::tracker::sync_path(&name, &tag)?;
    let mut account = ethone_engine::tracker::parse_account(svc().auth.worker_get(&path).await?)?;
    let puuid = account["puuid"].as_str().unwrap_or_default().to_string();
    let matches_path = ethone_engine::tracker::matches_path(&puuid, MATCH_LIMIT)?;
    let matches = ethone_engine::tracker::parse_matches(svc().auth.rest_get(&matches_path).await?)?;
    if linked.as_deref().is_some_and(|id| id.eq_ignore_ascii_case(&puuid)) {
        if let Ok(rank) = svc().riot.rank(svc().host.as_ref()).await {
            let rank = serde_json::to_value(rank).unwrap_or(Value::Null);
            let mut mmr = account["mmr"].clone();
            if !mmr.is_object() {
                mmr = json!({});
            }
            for (key, value) in rank.as_object().into_iter().flatten() {
                mmr[key] = value.clone();
            }
            account["mmr"] = mmr;
        }
    }
    let snapshot = json!({ "account": account, "matches": matches, "linked": linked.is_some() });
    crate::cache::write(SNAPSHOT, &snapshot);
    Ok(snapshot)
}

fn loaded(app: &mut App, result: Result<Value, String>) {
    app.state.eval.loading = false;
    app.state.eval.refreshing = false;
    match result {
        Ok(data) => {
            app.state.eval.data = Some(data);
            app.state.eval.needs_id = false;
            app.state.eval.error = None;
        }
        Err(error) => app.state.eval.error = Some(error_text(&error)),
    }
}

pub fn start(app: &mut App) {
    app.state.eval.started = true;
    app.state.eval.loading = true;
    app.state.eval.error = None;
    let riot = identity();
    if let Some((at, saved)) = crate::cache::read(SNAPSHOT) {
        let same = saved["linked"] == riot.is_some() && riot.as_ref().is_none_or(|riot| saved["account"]["puuid"].as_str().is_some_and(|puuid| puuid.eq_ignore_ascii_case(&riot.puuid)));
        if same {
            app.state.eval.data = Some(saved.clone());
            app.state.eval.loading = false;
            if chrono::Utc::now().timestamp_millis() - at < 5 * 60 * 1000 {
                return;
            }
            app.state.eval.refreshing = true;
            let (name, tag) = (saved["account"]["name"].as_str().unwrap_or_default().to_string(), saved["account"]["tag"].as_str().unwrap_or_default().to_string());
            let linked = riot.map(|riot| riot.puuid);
            spawn(load(name, tag, linked), |app, result| {
                app.state.eval.refreshing = false;
                if let Ok(data) = result {
                    app.state.eval.data = Some(data);
                }
            });
            return;
        }
    }
    spawn(
        async move {
            let id = match &riot {
                Some(riot) => Some((riot.name.clone(), riot.tag.clone())),
                None => match prefs::read_json::<Value>(LOCAL_ID).filter(|value| value["name"].is_string()) {
                    Some(value) => Some((value["name"].as_str().unwrap_or_default().to_string(), value["tag"].as_str().unwrap_or_default().to_string())),
                    None => ethone_engine::tracker::parse_identity(&svc().auth.rest_get(ethone_engine::tracker::SETTINGS_PATH).await?).map(|id| (id.name, id.tag)),
                },
            };
            match id {
                Some((name, tag)) => load(name, tag, riot.map(|riot| riot.puuid)).await.map(Some),
                None => Ok(None),
            }
        },
        |app, result| match result {
            Ok(Some(data)) => loaded(app, Ok(data)),
            Ok(None) => {
                app.state.eval.loading = false;
                app.state.eval.needs_id = true;
            }
            Err(error) => loaded(app, Err(error)),
        },
    );
}

pub fn login_event(app: &mut App, status: &str, message: Option<String>) {
    crate::pages::lol::login_event(app, status);
    app.state.eval.connecting = false;
    app.forget("eval:");
    match status {
        "linked" => {
            crate::cache::clear("riot:");
            crate::cache::clear(SNAPSHOT);
            app.state.eval.data = None;
            app.forget("home:riot");
            app.forget("home:rank");
            start(app);
        }
        "failed" => {
            let text = error_text(message.as_deref().unwrap_or("riotFailed"));
            app.state.eval.error = Some(text.clone());
            app.toast_bad(&text);
        }
        _ => {}
    }
}

fn connect(app: &mut App) {
    app.state.eval.connecting = true;
    app.state.eval.error = None;
    spawn(async { svc().riot.login(svc().host.clone(), false).await }, |app, result| {
        if let Err(error) = result {
            app.state.eval.connecting = false;
            app.state.eval.error = Some(error_text(&error));
        }
    });
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "tab" => set_section(SECTION_KEY, arg),
        "connect" => connect(app),
        "browser" => match services::open_url(ethone_engine::riot::AUTHORIZE) {
            Ok(()) => app.state.eval.browser = true,
            Err(error) => app.state.eval.error = Some(error_text(&error)),
        },
        "browser-url" => app.state.eval.browser_url = value.into(),
        "browser-submit" | "browser-url:submit" => {
            let url = app.state.eval.browser_url.clone();
            spawn(async move { svc().riot.link_url(svc().host.as_ref(), &url).await }, |app, result| match result {
                Ok(_) => {
                    app.state.eval.browser_url.clear();
                    app.state.eval.data = None;
                    start(app);
                }
                Err(error) => app.state.eval.error = Some(error_text(&error)),
            });
        }
        "search" => app.state.eval.search = value.into(),
        "search-submit" | "search:submit" => {
            let Some((name, tag)) = split_riot_id(&app.state.eval.search) else {
                app.state.eval.search_invalid = true;
                return;
            };
            app.state.eval.search_invalid = false;
            app.state.eval.loading = true;
            let (keep_name, keep_tag) = (name.clone(), tag.clone());
            spawn(load(name, tag, None), move |app, result| {
                if result.is_ok() {
                    prefs::write_json(LOCAL_ID, &json!({ "name": keep_name, "tag": keep_tag }));
                }
                loaded(app, result);
            });
        }
        "refresh" => {
            let Some(data) = app.state.eval.data.clone() else {
                start(app);
                return;
            };
            app.state.eval.refreshing = true;
            crate::cache::clear("riot:");
            let linked = (data["linked"] == true).then(|| data["account"]["puuid"].as_str().unwrap_or_default().to_string());
            spawn(load(data["account"]["name"].as_str().unwrap_or_default().into(), data["account"]["tag"].as_str().unwrap_or_default().into(), linked), loaded);
        }
        "retry" => start(app),
        "disconnect" => {
            app.state.eval.data = None;
            prefs::write(LOCAL_ID, "null");
            crate::cache::clear("riot:");
            crate::cache::clear(SNAPSHOT);
            spawn(async { svc().riot.logout(svc().host.as_ref()).await }, |app, result| {
                if let Err(error) = result {
                    app.state.eval.error = Some(error_text(&error));
                }
                if identity().is_none() {
                    app.state.eval.needs_id = true;
                } else {
                    start(app);
                }
            });
        }
        "more" => {
            let Some(data) = app.state.eval.data.clone() else { return };
            let limit = if app.state.eval.limit == 0 { MATCH_LIMIT } else { app.state.eval.limit };
            let puuid = data["account"]["puuid"].as_str().unwrap_or_default().to_string();
            app.state.eval.refreshing = true;
            spawn(
                async move {
                    api_data(&format!("api/valorant/eval/history?puuid={puuid}&page={}", limit / 10 + 1)).await?;
                    let path = ethone_engine::tracker::matches_path(&puuid, (limit + 10).min(100))?;
                    ethone_engine::tracker::parse_matches(svc().auth.rest_get(&path).await?)
                },
                move |app, result| {
                    app.state.eval.refreshing = false;
                    match result {
                        Ok(matches) => {
                            if let Some(data) = app.state.eval.data.as_mut() {
                                data["matches"] = Value::Array(matches);
                                crate::cache::write(SNAPSHOT, data);
                            }
                            app.state.eval.limit = limit + 10;
                        }
                        Err(error) => app.state.eval.error = Some(error_text(&error)),
                    }
                },
            );
        }
        "filter-result" => app.state.eval.filter_result = arg.into(),
        "filter-mode" => app.state.eval.filter_mode = value.into(),
        "filter-pick" => app.state.eval.filter_pick = value.into(),
        "filter-clear" => {
            app.state.eval.filter_result.clear();
            app.state.eval.filter_mode.clear();
            app.state.eval.filter_pick.clear();
        }
        "open" => {
            let found = app.state.eval.data.as_ref().and_then(|data| data["matches"].as_array().and_then(|list| list.iter().find(|item| item["id"] == arg).cloned()));
            if let Some(found) = found {
                app.state.eval.open = Some(found.clone());
                app.state.eval.panel_view = "board".into();
                let title = found["map"].as_str().unwrap_or_default().to_string();
                app.open_drawer(&title, 640.0, panel);
            }
        }
        "panel" => app.state.eval.panel_view = arg.into(),
        "account-switch" => {
            let slot = arg.to_string();
            crate::cache::clear("riot:");
            crate::cache::clear(SNAPSHOT);
            spawn(async move { svc().riot.switch(svc().host.as_ref(), &slot).await }, |app, result| {
                if let Err(error) = result {
                    app.toast_bad(&error_text(&error));
                }
            });
        }
        "account-add" => spawn(async { svc().riot.login(svc().host.clone(), true).await }, |app, result| {
            if let Err(error) = result {
                app.toast_bad(&error_text(&error));
            }
        }),
        "account-remove" => {
            if app.state.eval.asking_remove.as_deref() != Some(arg) {
                app.state.eval.asking_remove = Some(arg.to_string());
                app.toast_plain(&tr("Choisis encore « Retirer » pour confirmer.", "Choose \"Remove\" again to confirm."));
                return;
            }
            app.state.eval.asking_remove = None;
            let slot = arg.to_string();
            crate::cache::clear("riot:");
            crate::cache::clear(SNAPSHOT);
            spawn(async move { svc().riot.remove(svc().host.as_ref(), &slot).await }, |app, result| {
                if let Err(error) = result {
                    app.toast_bad(&error_text(&error));
                }
            });
        }
        other => crate::pages::eval_more::act(app, other, arg, value),
    }
}

pub fn prepare_accounts_menu(app: &mut App) {
    let Ok(book) = ethone_engine::riot::account_book(svc().host.as_ref()) else { return };
    let mut entries: Vec<crate::app::Entry> = book.accounts.iter().map(|account| crate::app::Entry { on: account.slot == book.active, ..entry(&format!("eval:account-switch:{}", account.slot), &format!("{}#{}", account.identity.name, account.identity.tag)) }).collect();
    for account in &book.accounts {
        if account.slot != book.active {
            entries.push(danger_entry(&format!("eval:account-remove:{}", account.slot), &tr(&format!("Retirer {}", account.identity.name), &format!("Remove {}", account.identity.name))));
        }
    }
    entries.push(entry("eval:account-add", &tr("Ajouter un compte", "Add an account")));
    app.menu_for("riot-accounts", entries);
}

pub fn map_images(app: &mut App) -> std::collections::HashMap<String, String> {
    let res = app.load("eval:maps", || catalog_get("/maps"));
    res.data.as_deref().and_then(Value::as_array).into_iter().flatten().filter_map(|item| {
        let name = item["displayName"].as_str()?.to_lowercase();
        let image = item["listViewIcon"].as_str().or(item["splash"].as_str())?.to_string();
        Some((name, image))
    }).collect()
}

pub fn day_label(iso: &str) -> String {
    let Some(date) = time::parse(iso) else { return String::new() };
    let today = Local::now().date_naive();
    let days = (today - date.date_naive()).num_days();
    match days {
        0 => tr("Aujourd'hui", "Today"),
        1 => tr("Hier", "Yesterday"),
        _ => {
            let fr = fr();
            let names = if fr { ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] } else { ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] };
            let weekday = names[date.weekday().num_days_from_monday() as usize];
            if fr { format!("{weekday} {} {}", date.day(), time::month_name(date.month0() as usize, true)) } else { format!("{weekday}, {} {}", time::month_name(date.month0() as usize, false), date.day()) }
        }
    }
}

pub fn decimal(value: f64) -> String {
    let text = format!("{value:.1}");
    if fr() { text.replace('.', ",") } else { text }
}

fn rank_ring(app: &mut App, label: &str, tier: i64, progress: f32, sub: &str) -> C {
    C { kind: "rank", title: label.into(), value: rank_name(tier), sub: sub.into(), image: if tier > 0 { app.img(&tier_icon(tier)) } else { slint::Image::default() }, progress, color: Some(hex(rank_color(tier))), weight: 1.0, extra: crate::pages::work::ring_path(progress), ..Default::default() }
}

pub fn match_block(app: &mut App, item: &Value, puuid: &str, images: &std::collections::HashMap<String, String>, history: &[Value]) -> Option<B> {
    let summary = match_summary(item, puuid)?;
    let me = &summary.me;
    let id = item["id"].as_str().unwrap_or_default();
    let map = item["map"].as_str().unwrap_or_default();
    let banner_url = images.get(&map.to_lowercase()).cloned().or_else(|| item["mapId"].as_str().filter(|id| !id.is_empty()).map(map_image)).unwrap_or_default();
    let agent_id = me["agentId"].as_str().unwrap_or_default();
    let portrait = app.img(&agent_bust(agent_id));
    let portrait = if portrait.size().width == 0 && app.image_failed.contains(&agent_bust(agent_id)) { app.img(&agent_icon(agent_id)) } else { portrait };
    let point = history.iter().find(|point| point["match"].as_str().is_some_and(|other| other.eq_ignore_ascii_case(id)));
    let mut chips = vec![map.to_string()];
    if let Some(mvp) = summary.mvp {
        chips.push(t(if mvp == "match" { "evalMvpMatch" } else { "evalMvpTeam" }));
    }
    if let Some(point) = point {
        let change = point["change"].as_i64().unwrap_or(0);
        chips.push(format!("{}{change} RR", if change >= 0 { "+" } else { "" }));
    }
    let result = if summary.draw { tr("Égalité", "Draw") } else if summary.won { tr("Victoire", "Win") } else { tr("Défaite", "Loss") };
    let tone = if summary.draw { "" } else if summary.won { "ok" } else { "bad" };
    let mut cells = vec![C { kind: "img", image: portrait, size: 54.0, progress: 54.0, ..Default::default() }];
    let mut title = C { kind: "stack", title: me["agent"].as_str().unwrap_or_default().to_string(), sub: format!("{} · {}", mode_name(item["mode"].as_str().unwrap_or_default()), chips.join(" · ")), weight: 1.0, ..Default::default() };
    title.size = 15.0;
    cells.push(title);
    if let Some(tier) = point.and_then(|point| point["tier"].as_i64()).filter(|tier| *tier > 0) {
        cells.push(img(app.img(&tier_icon(tier)), 28.0).tip(&rank_name(tier)));
    }
    cells.push(C { kind: "stack", title: format!("{} / {} / {}", me["kills"], me["deaths"], me["assists"]), sub: "K / D / A".into(), extra: "right".into(), ..Default::default() });
    cells.push(C { kind: "stack", title: summary.line.acs.to_string(), sub: "ACS".into(), extra: "right".into(), ..Default::default() });
    cells.push(C { kind: "stack", title: format!("{} — {}", summary.score.0, summary.score.1), sub: result, tone, extra: "right".into(), ..Default::default() });
    let mut block = banner(app.img(&banner_url), 84.0, cells).id(&format!("eval:open:{id}"));
    block.tone = if summary.draw { "draw" } else if summary.won { "win" } else { "loss" };
    block.sub = time::ago(item["startedAt"].as_str(), time::now_ms(), fr());
    Some(block)
}

fn panel(app: &mut App) -> Vec<B> {
    let Some(item) = app.state.eval.open.clone() else { return Vec::new() };
    let puuid = app.state.eval.data.as_ref().and_then(|data| data["account"]["puuid"].as_str().map(str::to_string)).unwrap_or_default();
    let view = if app.state.eval.panel_view.is_empty() { "board".to_string() } else { app.state.eval.panel_view.clone() };
    let images = map_images(app);
    let map = item["map"].as_str().unwrap_or_default();
    let fr = fr();
    let mut detail = mode_name(item["mode"].as_str().unwrap_or_default());
    if let Some(date) = item["startedAt"].as_str().and_then(time::parse) {
        detail.push_str(&format!(", {}", time::date_time(&date, fr)));
    }
    if let Some(length) = item["lengthSec"].as_f64().filter(|length| *length > 0.0) {
        detail.push_str(&format!(", {} min", (length / 60.0).round()));
    }
    let banner_url = images.get(&map.to_lowercase()).cloned().or_else(|| item["mapId"].as_str().map(map_image)).unwrap_or_default();
    let mut out = vec![banner(app.img(&banner_url), 110.0, vec![stack(map, &detail)])];
    let rounds = rounds_for(&item, &puuid);
    if !rounds.is_empty() {
        out.push(tabs(&[("board", &tr("Tableau", "Scoreboard")), ("analysis", &tr("Analyse", "Analysis")), ("rounds", &tr("Manches", "Rounds")), ("kills", &tr("Éliminations", "Kills"))], &view, "eval:panel:"));
    }
    match view.as_str() {
        "analysis" => {
            let analysis = match_analysis(&item, &puuid);
            out.push(row(vec![stat("KAST", &format!("{} %", analysis.kast), ""), stat(&tr("Premières éliminations", "First kills"), &analysis.first_kills.to_string(), ""), stat(&tr("Premières morts", "First deaths"), &analysis.first_deaths.to_string(), "")]));
            out.push(row(vec![stat(&tr("Spikes posés", "Spikes planted"), &analysis.plants.to_string(), ""), stat(&tr("Spikes désamorcés", "Spikes defused"), &analysis.defuses.to_string(), "")]));
        }
        "rounds" => out.extend(group(rounds.iter().map(|round| {
            let mut state = if round.won { tr("Gagnée", "Won") } else { tr("Perdue", "Lost") };
            if !round.end.is_empty() {
                state.push_str(&format!(", {}", round.end));
            }
            let mut kills = format!("{} {}", round.kills, tr("élim.", "kills"));
            if round.died {
                kills.push_str(&tr(", mort", ", died"));
            }
            row(vec![strong(&round.n.to_string()), text(&state).tone(if round.won { "ok" } else { "bad" }).grow(), muted(&if round.site.is_empty() { String::new() } else { tr(&format!("Spike en {}", round.site), &format!("Spike at {}", round.site)) }), muted(&kills)])
        }).collect())),
        "kills" => {
            let name_of = |id: &Value| item["players"].as_array().and_then(|list| list.iter().find(|player| player["puuid"] == *id)).and_then(|player| player["name"].as_str()).unwrap_or("?").to_string();
            let kills = item["kills"].as_array().cloned().unwrap_or_default();
            let lines: Vec<B> = kills.iter().map(|kill| {
                let weapon = kill["w"].as_str().filter(|weapon| !weapon.is_empty()).map(|weapon| app.img(&weapon_icon(weapon))).unwrap_or_default();
                let tone = if kill["k"] == puuid.as_str() { "ok" } else if kill["v"] == puuid.as_str() { "bad" } else { "" };
                row(vec![muted(&kill["r"].to_string()), text(&name_of(&kill["k"])).tone(tone).on(true), img_box(weapon, 64.0, 20.0), text(&name_of(&kill["v"])).grow()])
            }).collect();
            out.extend(group(lines));
        }
        _ => {
            for team in scoreboard(&item, &puuid) {
                out.push(h2x(&team.rounds.to_string(), &t(if team.won { "evalTeamWon" } else { "evalTeamLost" }), vec![]));
                out.push(row(vec![muted(&t("evalPlayer")).grow(), muted("ACS"), muted("K/D/A"), muted(&t("evalHeadshots")), muted(&t("evalDamage"))]));
                let lines: Vec<B> = team.players.iter().map(|player| {
                    let line = match_line(player, &item);
                    let face = app.img(&agent_icon(player["agentId"].as_str().unwrap_or_default()));
                    let tier = player["tier"].as_i64().unwrap_or(0);
                    let mut cells = vec![img(face, 26.0), text(player["name"].as_str().unwrap_or_default()).on(player["puuid"] == puuid.as_str()).grow()];
                    if tier > 0 {
                        cells.push(img(app.img(&tier_icon(tier)), 22.0).tip(&rank_name(tier)));
                    }
                    cells.extend([text(&line.acs.to_string()), text(&format!("{}/{}/{}", player["kills"], player["deaths"], player["assists"])), text(&format!("{} %", line.hs)), text(&line.adr.to_string())]);
                    row(cells).on(player["puuid"] == puuid.as_str())
                }).collect();
                out.extend(group(lines));
            }
        }
    }
    out
}

fn connect_view(app: &mut App) -> Vec<B> {
    let state = &app.state.eval;
    let (connecting, browser, url, search_text, invalid, message) = (state.connecting, state.browser, state.browser_url.clone(), state.search.clone(), state.search_invalid, state.error.clone());
    let (mark, link, search) = (app.icon("valorant"), app.icon("external-link"), app.icon("search"));
    let mut out = vec![
        B { kind: "logo", image: mark, title: "E:VAL".into(), sub: t("evalConnectText"), tone: "icon", ..Default::default() },
        row(vec![primary("eval:browser", &t("evalConnectBrowser")).icon(link), btn("eval:connect", &t("evalConnectWindow")).off(connecting)]).center(),
    ];
    if browser {
        out.push(prose(&format!("1. {}\n2. {}\n3. {}", t("evalBrowserStep1"), t("evalBrowserStep2"), t("evalBrowserStep3"))));
        out.push(field(&t("evalBrowserField"), vec![secret("eval:browser-url", &url, "https://playvalorant.com/opt_in#..."), primary("eval:browser-submit", &t("evalBrowserSubmit")).off(url.trim().is_empty())]));
        out.push(note(&t("evalBrowserNote")));
    }
    if connecting {
        out.push(note(&t("evalConnecting")));
    }
    if let Some(message) = message {
        out.push(bad(&message));
    }
    out.push(field(&t("evalOtherPlayer"), vec![input("eval:search", &search_text, &t("evalRiotPlaceholder")), btn("eval:search-submit", &t("evalSearch")).icon(search)]));
    if invalid {
        out.push(bad(&t("evalRiotInvalid")));
    }
    out
}

pub fn view(app: &mut App) -> Page {
    if !app.state.eval.started {
        start(app);
    }
    let tab = section(SECTION_KEY, "profile");
    if app.state.eval.loading {
        let spinner = app.icon("refresh-cw");
        let mut main = vec![B { kind: "spinner", icon: spinner, ..Default::default() }, note(&t("evalLoading"))];
        main.extend(skeletons(4, 80.0));
        return Page { main, ..Default::default() };
    }
    if app.state.eval.needs_id {
        return Page { main: connect_view(app), ..Default::default() };
    }
    let Some(data) = app.state.eval.data.clone() else {
        let message = app.state.eval.error.clone().unwrap_or_default();
        return Page { main: vec![empty_with(&t("evalUnavailable"), &message, vec![btn("eval:retry", &t("retry"))])], ..Default::default() };
    };
    let linked = data["linked"] == true;
    let list = crate::pages::eval_more::tab_list();
    let pairs: Vec<(&str, &str)> = list.iter().map(|(id, label)| (*id, label.as_str())).collect();
    let mut main = if pairs.len() > 1 { vec![tabs(&pairs, &tab, "eval:tab:")] } else { Vec::new() };
    if tab != "profile" {
        let (extra, aside) = crate::pages::eval_more::view(app, &tab, &data);
        main.extend(extra);
        if tab == "hub" {
            return Page { side: crate::pages::eval_hub::side(), side_active: format!("eval:hub:{}", crate::pages::eval_hub::current()), main, ..Default::default() };
        }
        return Page { main, aside, aside_width: 400.0, ..Default::default() };
    }
    let account = &data["account"];
    let puuid = account["puuid"].as_str().unwrap_or_default().to_string();
    let matches: Vec<Value> = data["matches"].as_array().cloned().unwrap_or_default();
    let tier = current_tier(&account["mmr"], account["tier"].as_i64());
    let peak = account["mmr"]["peakTier"].as_i64().unwrap_or(0);
    let rr = account["mmr"]["rr"].as_i64().unwrap_or(0);
    let mut aside = Vec::new();
    let (users, logout) = (app.icon("users"), app.icon("log-out"));
    let mut header = vec![C { kind: "stack", title: format!("{}#{}", account["name"].as_str().unwrap_or_default(), account["tag"].as_str().unwrap_or_default()), sub: t("evalProfile"), weight: 1.0, ..Default::default() }];
    if linked {
        prepare_accounts_menu(app);
        let mut accounts = ibtn("", users, &tr("Changer de compte Riot", "Switch Riot account"));
        accounts.kind = "menubtn";
        accounts.value = "riot-accounts".into();
        header.push(accounts);
        header.push(ibtn("eval:disconnect", logout, &t("evalDisconnect")));
    }
    aside.push(card(header));
    let card_url = account["card"].as_str().map(banner_image).unwrap_or_default();
    let level = account["level"].as_i64().unwrap_or(0);
    aside.push(banner(app.img(&card_url), 96.0, if level > 0 { vec![gap(), chip("", &level.to_string())] } else { vec![] }));
    let board = account["mmr"]["leaderboardRank"].as_i64().unwrap_or(0);
    let current_sub = if tier > 0 { format!("{rr} RR{}", if board > 0 { format!(" · {}", tv("evalBoard", &[("rank", &board.to_string())])) } else { String::new() }) } else { String::new() };
    let current = rank_ring(app, &t("evalCurrent"), tier, if tier > 0 { rr as f32 / 100.0 } else { 0.0 }, &current_sub);
    let best = rank_ring(app, &t("evalPeak"), peak, if peak > 0 { 1.0 } else { 0.0 }, "");
    aside.push(row(vec![current, best]));
    if !matches.is_empty() {
        let stats = stats_for(&matches, &puuid);
        aside.push(h2x(&t("evalSummary"), &tv("evalOnMatches", &[("count", &stats.count.to_string())]), vec![]));
        aside.push(row(vec![stat(&t("evalWinRate"), &format!("{} %", decimal(stats.win_rate)), ""), stat(&t("evalRecord"), &format!("{}V – {}D", stats.wins, stats.losses), "")]));
        aside.push(row(vec![stat("K/D", &decimal(stats.kd), ""), stat(&t("evalHeadshots"), &format!("{} %", stats.hs), ""), stat(&t("evalDamage"), &stats.adr.to_string(), "")]));
    }
    let refresh = app.icon("refresh-cw");
    main.push(head(&t("evalMatches"), "", vec![btn("eval:refresh", &t("refresh")).icon(refresh).off(app.state.eval.refreshing).tip("F5")]));
    if let Some(message) = app.state.eval.error.clone() {
        main.push(bad(&message));
    }
    if matches.is_empty() {
        main.push(empty(&t("evalNoMatches"), &t("evalNoMatchesText")));
        return Page { main, aside, aside_width: 360.0, ..Default::default() };
    }
    let session = last_session(&matches);
    if !session.is_empty() {
        let stats = stats_for(&session, &puuid);
        main.push(row(vec![stat(&t("evalSession"), &format!("{}V – {}D", stats.wins, stats.losses), ""), stat("K/D", &decimal(stats.kd), ""), stat(&t("evalHeadshots"), &format!("{} %", stats.hs), ""), stat(&t("evalDamage"), &stats.adr.to_string(), "")]));
    }
    let modes = crate::logic::options(matches.iter().map(|item| mode_name(item["mode"].as_str().unwrap_or_default())).collect());
    let picks = crate::logic::options(matches.iter().filter_map(|item| match_summary(item, &puuid).map(|summary| summary.me["agent"].as_str().unwrap_or_default().to_string())).collect());
    let filters = crate::pages::eval_more::filters(app, "eval", &modes, &picks, &tr("Tous les agents", "All agents"), &app.state.eval.filter_result.clone(), &app.state.eval.filter_mode.clone(), &app.state.eval.filter_pick.clone());
    let (result, mode, pick) = (app.state.eval.filter_result.clone(), app.state.eval.filter_mode.clone(), app.state.eval.filter_pick.clone());
    let shown: Vec<&Value> = matches.iter().filter(|item| {
        let summary = match_summary(item, &puuid);
        crate::logic::keep_match(&result, &mode, &pick, summary.as_ref().is_some_and(|summary| summary.won), summary.as_ref().is_some_and(|summary| summary.draw), &mode_name(item["mode"].as_str().unwrap_or_default()), summary.as_ref().map_or("", |summary| summary.me["agent"].as_str().unwrap_or_default()))
    }).collect();
    let mut row_filters = filters;
    row_filters.push(muted(&tr(&format!("{} sur {}", shown.len(), matches.len()), &format!("{} of {}", shown.len(), matches.len()))));
    main.push(row(row_filters));
    let images = map_images(app);
    let history: Vec<Value> = account["mmr"]["history"].as_array().cloned().unwrap_or_default();
    let mut day = String::new();
    for item in shown {
        let label = day_label(item["startedAt"].as_str().unwrap_or_default());
        if label != day {
            main.push(h2(&label));
            day = label;
        }
        if let Some(block) = match_block(app, item, &puuid, &images, &history) {
            main.push(block);
        }
    }
    let limit = if app.state.eval.limit == 0 { MATCH_LIMIT } else { app.state.eval.limit };
    if matches.len() as u32 >= limit {
        main.push(row(vec![btn("eval:more", &if app.state.eval.refreshing { t("loading") } else { tr("Charger plus de matchs", "Load more matches") }).off(app.state.eval.refreshing)]));
    }
    let _: Option<Fut> = None;
    Page { main, aside, aside_width: 360.0, ..Default::default() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decimals_follow_the_language() {
        crate::prefs::write("ethone-language", "fr");
        assert_eq!(decimal(1.26), "1,3");
    }
}
