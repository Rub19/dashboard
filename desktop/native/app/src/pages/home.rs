use crate::app::{app_image, App, Page, Res};
use crate::i18n::{fr, lang, t, tv, tr};
use crate::logic::home::{connection_status, day_progress, group_mail};
use crate::logic::{spotify, time};
use crate::logic::eval::{rank_name, tier_icon};
use crate::logic::lol::lol_rank;
use crate::logic::productivity::habit_streak;
use crate::pages::daily::{COMPLETIONS_PATH, HABITS_PATH};
use crate::pages::first_array;
use crate::services::{self, api, rest, rest_get};
use crate::vm::*;
use crate::prefs;
use chrono::{Local, Timelike};
use serde_json::{json, Value};

const BLOCKS: [&str; 10] = ["music", "mail", "valorant", "league", "weather", "focus", "agenda", "habits", "recent", "apps"];

fn block_label(block: &str) -> String {
    match block {
        "music" => tr("Musique", "Music"),
        "mail" => tr("Mails non lus", "Unread mail"),
        "valorant" => "VALORANT".into(),
        "league" => "League of Legends".into(),
        "weather" => tr("Météo", "Weather"),
        "focus" => tr("Concentration", "Focus"),
        "agenda" => tr("Agenda et tâches", "Agenda and tasks"),
        "habits" => tr("Habitudes", "Habits"),
        "recent" => tr("Derniers mails", "Latest mail"),
        _ => t("modules"),
    }
}

fn greeting(hour: u32) -> String {
    t(if hour < 12 { "morning" } else if hour < 18 { "afternoon" } else { "evening" })
}

fn hidden() -> Vec<String> {
    prefs::text("ethone-home-hidden", "").split(',').filter(|item| !item.is_empty()).map(str::to_string).collect()
}

pub fn reload_all(app: &mut App) {
    app.forget("home:");
    crate::pages::modules::load_modules(app, false);
}

pub fn act(app: &mut App, id: &str, _value: &str) {
    if let Some(block) = id.strip_prefix("block:") {
        let mut list = hidden();
        if let Some(at) = list.iter().position(|item| item == block) {
            list.remove(at);
        } else {
            list.push(block.to_string());
        }
        prefs::write_json("ethone-home-hidden", &list.join(","));
        return;
    }
    if let Some(habit) = id.strip_prefix("habit:") {
        toggle_habit(app, habit);
        return;
    }
    match id {
        "edit" => {
            let on = app.flag("home:editing");
            app.set_flag("home:editing", !on);
        }
        "refresh" => reload_all(app),
        "weather" => {
            crate::pages::set_section("ethone-section-insights", "weather");
            crate::pages::shell::go(app, "insights");
        }
        "spotify-open" => {
            if let Some(track) = app.spotify.track.as_ref().and_then(|track| track.id.clone()) {
                let _ = services::open_url(&format!("https://open.spotify.com/track/{track}"));
            }
        }
        _ => {}
    }
}

fn toggle_habit(app: &mut App, habit: &str) {
    let today = time::day_key(&Local::now());
    let done = app.res.get("home:done").and_then(|res| res.data.clone());
    let found = done.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|item| item["habit_id"] == habit && item["completed_on"] == today.as_str())).and_then(|item| item["id"].as_str().map(str::to_string));
    let work = match found {
        Some(id) => rest("DELETE", &format!("ethone_habit_completions?id=eq.{id}"), None, Some("return=minimal")),
        None => rest("POST", "ethone_habit_completions", Some(json!({ "habit_id": habit, "completed_on": today })), Some("return=minimal")),
    };
    app.set_flag("home:habit-failed", false);
    crate::app::spawn(
        async move {
            work.await?;
            rest_get(COMPLETIONS_PATH).await
        },
        |app, result| match result {
            Ok(list) => app.finish("home:done", Ok(list)),
            Err(_) => app.set_flag("home:habit-failed", true),
        },
    );
}

fn music_card(app: &mut App, out: &mut Vec<B>) {
    let state = app.spotify.clone();
    let Some(track) = state.track.clone() else { return };
    let position = spotify::live_progress(&state, time::now_ms());
    let cover = app.img(track.cover.as_deref().unwrap_or_default());
    let (prev, next, play) = (app.icon("skip-back"), app.icon("skip-forward"), app.icon(if state.playing { "pause" } else { "play" }));
    let status = if state.playing { tr("En écoute sur Spotify", "Playing on Spotify") } else { tr("En pause sur Spotify", "Paused on Spotify") };
    let artist = [track.artist.clone(), track.album.clone()].into_iter().flatten().collect::<Vec<_>>().join(", ");
    out.push(card(vec![
        img(cover, 64.0),
        C { kind: "stack", title: track.title.clone(), sub: artist, weight: 1.0, id: "home:spotify-open".into(), ..Default::default() },
        muted(&status),
        ibtn("music:previous", prev, &tr("Titre précédent", "Previous track")),
        ibtn("music:toggle", play, &if state.playing { tr("Pause", "Pause") } else { tr("Lecture", "Play") }),
        ibtn("music:next", next, &tr("Titre suivant", "Next track")),
    ]).id("home:spotify-open"));
    out.push(row(vec![muted(&spotify::clock(position)), bar(if track.duration_ms > 0.0 { (position / track.duration_ms) as f32 } else { 0.0 }), muted(&spotify::clock(track.duration_ms))]));
}

fn tiles(app: &mut App, out: &mut Vec<B>, shown: &dyn Fn(&str) -> bool) {
    let mut cells = Vec::new();
    if shown("mail") {
        let unread = app.load("home:unread", || api("api/mail/inbox?folder=inbox&limit=1"));
        if let Some(data) = unread.data {
            let count = data["meta"]["unread"].as_i64().unwrap_or(0);
            cells.push(tile("go:mail", &tr("Mails non lus", "Unread mail"), &count.to_string(), ""));
        }
    }
    let identity = app.load("home:riot", || Box::pin(async { Ok(serde_json::to_value(ethone_engine::riot::load_identity()).unwrap_or(Value::Null)) }));
    let identity = identity.data.filter(|value| value.is_object());
    if shown("valorant") && identity.is_some() {
        let rank = app.load("home:rank", || {
            Box::pin(async {
                let rank = services::svc().riot.rank(services::svc().host.as_ref()).await?;
                serde_json::to_value(rank).map_err(|error| error.to_string())
            })
        });
        if let Some(data) = rank.data {
            let tier = data["tier"].as_i64().unwrap_or(0);
            let rr = data["rr"].as_i64().unwrap_or(0);
            let mut cell = if tier > 0 { tile("go:tracker", "VALORANT", &format!("{rr} RR"), &rank_name(tier)) } else { tile("go:tracker", "VALORANT", &rank_name(0), "") };
            if tier > 0 {
                cell.image = app.img(&tier_icon(tier));
            }
            cells.push(cell);
        }
    }
    if shown("league") {
        if let Some(identity) = &identity {
            let (name, tag) = (identity["name"].as_str().unwrap_or_default().to_string(), identity["tag"].as_str().unwrap_or_default().to_string());
            if !name.is_empty() {
                let league = app.load("home:league", move || services::api_data(&format!("api/stats/lol-profile?name={}&tag={}", crate::pages::encode(&name), crate::pages::encode(&tag))));
                if let Some(profile) = league.data {
                    let text = profile["rankSolo"].as_str().filter(|text| !text.is_empty()).or(profile["rankFlex"].as_str()).unwrap_or_default();
                    let rank = lol_rank(text, fr());
                    if !rank.emblem.is_empty() {
                        let mut cell = tile("go:games", "League of Legends", &format!("{} LP", rank.lp), &rank.name);
                        cell.image = app.img(&rank.emblem);
                        cells.push(cell);
                    }
                }
            }
        }
    }
    if shown("weather") {
        let city = prefs::text("ethone-weather-city", "Paris");
        let holder = city.clone();
        let weather = app.load("home:weather", move || services::api_data(&format!("api/weather?city={}", crate::pages::encode(&holder))));
        if let Some(temperature) = weather.data.as_ref().and_then(|data| data["temperature"].as_f64()) {
            cells.push(tile("home:weather", &city, &format!("{} °C", temperature.round() as i64), ""));
        }
    }
    if shown("focus") {
        let history: Vec<Value> = prefs::read_json("ethone-focus-history").unwrap_or_default();
        let today = time::day_key(&Local::now());
        let seconds: f64 = history.iter().filter(|entry| entry["completedAt"].as_str().and_then(time::parse).is_some_and(|date| time::day_key(&date) == today)).map(|entry| entry["seconds"].as_f64().unwrap_or(0.0)).fold(0.0, |total, value| total + value);
        cells.push(tile("go:productivity", &tr("Concentration aujourd'hui", "Focus today"), &format!("{} min", (seconds / 60.0).round() as i64), ""));
    }
    for chunk in cells.chunks(3) {
        out.push(row(chunk.to_vec()));
    }
}

fn agenda(app: &mut App, out: &mut Vec<B>) {
    let tasks = app.load("home:tasks", crate::pages::daily::tasks_list);
    let events = app.load("home:events", || services::items_list("events"));
    let google = app.load("home:google", crate::pages::daily::linked_google_events);
    if let Some(error) = tasks.error.clone().or(events.error.clone()).filter(|_| tasks.data.is_none() || events.data.is_none()) {
        out.push(note(&if app.offline() { t("offlineSession") } else { error }));
        return;
    }
    let (Some(tasks), Some(events)) = (tasks.data, events.data) else {
        out.extend(skeletons(2, 56.0));
        return;
    };
    let now = Local::now();
    let today = time::day_key(&now);
    let mut items: Vec<(f64, String, String)> = Vec::new();
    for event in events.as_array().into_iter().flatten() {
        if let Some(date) = event["startAt"].as_str().and_then(time::parse) {
            if time::day_key(&date) == today {
                items.push((date.timestamp_millis() as f64, time::clock(&date), event["title"].as_str().unwrap_or_default().to_string()));
            }
        }
    }
    for event in google.data.as_deref().and_then(Value::as_array).into_iter().flatten() {
        if event["allDay"] == true {
            continue;
        }
        if let Some(date) = event["start"].as_str().and_then(time::parse) {
            if time::day_key(&date) == today {
                items.push((date.timestamp_millis() as f64, time::clock(&date), event["title"].as_str().unwrap_or_default().to_string()));
            }
        }
    }
    items.sort_by(|left, right| left.0.total_cmp(&right.0));
    let progress = day_progress(now.hour(), now.minute());
    out.push(row(vec![bar(progress)]));
    out.push(h2(&t("calendar")));
    if items.is_empty() {
        out.push(note(&t("homeNoEvents")));
    } else {
        out.extend(group(items.iter().map(|(_, clock, title)| row(vec![muted(clock), text(title).grow()])).collect()));
    }
    let todo: Vec<&Value> = tasks.as_array().into_iter().flatten().filter(|task| task["done"] != true).collect();
    out.push(h2x(&t("tasks"), &if todo.is_empty() { String::new() } else { todo.len().to_string() }, vec![]));
    if todo.is_empty() {
        out.push(note(&t("homeNoTasks")));
    } else {
        out.extend(group(todo.iter().take(6).map(|task| row(vec![text(task["title"].as_str().unwrap_or_default()).grow()])).collect()));
    }
    let calendar = app.icon("calendar-days");
    out.push(row(vec![btn("go:productivity", &t("homeOpenProductivity")).icon(calendar)]));
}

fn habits(app: &mut App, out: &mut Vec<B>) {
    let list = app.load("home:habits", || rest_get(HABITS_PATH));
    let done = app.load("home:done", || rest_get(COMPLETIONS_PATH));
    let Some(list) = list.data else { return };
    let empty_done = std::rc::Rc::new(json!([]));
    let done = done.data.unwrap_or(empty_done);
    let today = time::day_key(&Local::now());
    let habits = list.as_array().cloned().unwrap_or_default();
    let of = |id: &str| -> std::collections::HashSet<String> { done.as_array().into_iter().flatten().filter(|item| item["habit_id"] == id).filter_map(|item| item["completed_on"].as_str().map(str::to_string)).collect() };
    let count = habits.iter().filter(|habit| of(habit["id"].as_str().unwrap_or_default()).contains(&today)).count();
    out.push(h2x(&tr("Habitudes du jour", "Today's habits"), &if habits.is_empty() { String::new() } else { format!("{count}/{}", habits.len()) }, vec![]));
    if habits.is_empty() {
        out.push(row(vec![muted(&tr("Aucune habitude pour l'instant.", "No habits yet.")), link("go:productivity", &tr("En ajouter une", "Add one"))]));
        return;
    }
    let (check, circle, flame) = (app.icon("circle-check"), app.icon("circle"), app.icon("flame"));
    let rows = habits.iter().map(|habit| {
        let id = habit["id"].as_str().unwrap_or_default();
        let days = of(id);
        let on = days.contains(&today);
        let streak = habit_streak(&days, Local::now());
        let emoji = habit["emoji"].as_str().map_or(String::new(), |emoji| format!("{emoji} "));
        let mut cells = vec![icon(if on { check.clone() } else { circle.clone() }).tone(if on { "ok" } else { "" }), text(&format!("{emoji}{}", habit["name"].as_str().unwrap_or_default())).on(true).grow()];
        if streak > 0 {
            cells.push(icon(flame.clone()).tone("warn"));
            cells.push(muted(&streak.to_string()));
        }
        row(cells).id(&format!("home:habit:{id}"))
    }).collect();
    out.extend(group(rows));
    if app.flag("home:habit-failed") {
        out.push(bad(&tr("Modification non enregistrée.", "Change not saved.")));
    }
}

fn recent_mail(app: &mut App, out: &mut Vec<B>) {
    let mail: Res = app.load("home:mail", || api("api/mail/inbox?folder=inbox&limit=30"));
    let Some(data) = mail.data else { return };
    let groups = group_mail(&first_array(&data, None), 5);
    if groups.is_empty() {
        return;
    }
    out.push(h2(&tr("Derniers mails", "Latest mail")));
    let rows = groups.iter().map(|item| {
        let subject = if item.subject.is_empty() { tr("(sans objet)", "(no subject)") } else { item.subject.clone() };
        let mut cells = vec![stack(&item.from, &subject)];
        if item.count > 1 {
            cells.push(muted(&format!("×{}", item.count)));
        }
        row(cells).id("go:mail")
    }).collect();
    out.extend(group(rows));
}

fn apps(app: &mut App, out: &mut Vec<B>) {
    let total = app.modules.len();
    let installed = app.modules.iter().filter(|status| status.installed.is_some()).count();
    out.push(h2x(&t("modules"), &tv("installedCount", &[("count", &installed.to_string()), ("total", &total.to_string())]), vec![link("go:modules", &t("seeApplications"))]));
    let (val, league, arrow) = (app.icon("valorant"), app.icon("league"), app.icon("arrow-right"));
    out.push(card(vec![icon(val).size(22.0).color(hex("#ff4655")), stack("E:VAL", &t("evalTagline")), icon(arrow.clone())]).id("go:tracker"));
    out.push(card(vec![icon(league).size(22.0).color(hex("#c89b3c")), stack("E:LOL", &tr("Rang, parties et amis League of Legends", "League of Legends rank, games and friends")), icon(arrow)]).id("go:games"));
    if app.modules.is_empty() && !app.checking {
        out.push(note(&t("noApplications")));
    }
    let statuses = app.modules.clone();
    let mut rows = Vec::new();
    for status in statuses {
        let id = status.module.id.clone();
        let working = app.busy.get(&id).map(|busy| busy.label.clone());
        let update = status.has_update();
        let sub = working.clone().unwrap_or_else(|| if update { t("updateAvailable") } else if status.running { t("statRunning") } else if let Some(version) = &status.installed { format!("v{version}") } else { t("notInstalled") });
        let image = app_image(app, &id);
        let mut cells = vec![img(image, 32.0), stack(&status.module.name, &sub)];
        if status.can_run() {
            cells.push(btn(&format!("modules:run:{id}"), &t(&format!("action.{}", status.action_name()))).off(working.is_some()));
        }
        rows.push(row(cells));
    }
    out.extend(group(rows));
}

pub fn view(app: &mut App) -> Page {
    let hidden_list = hidden();
    let shown = |block: &str| !hidden_list.iter().any(|item| item == block);
    let now = Local::now();
    let name = app.profile().map_or(String::new(), |profile| profile.name);
    let status = connection_status(app.offline(), app.module_error.is_some());
    let status_label = t(match status { "degraded" => "degraded", "offline" => "offline", _ => "operational" });
    let status_icon = app.icon(match status { "degraded" => "triangle-alert", "offline" => "wifi-off", _ => "circle-check" });
    let (sliders, refresh) = (app.icon("sliders-horizontal"), app.icon("refresh-cw"));
    let editing = app.flag("home:editing");
    let mut main = vec![head(
        &format!("{}, {name}", greeting(now.hour())),
        &time::long_date(&now, lang() == "fr"),
        vec![
            icon(status_icon).tone(match status { "online" => "ok", "offline" => "warn", _ => "bad" }),
            muted(&status_label),
            ibtn("home:edit", sliders, &tr("Choisir les blocs", "Choose blocks")).on(editing),
            ibtn("home:refresh", refresh, &t("refresh")).off(app.checking),
        ],
    )];
    if let Some(error) = app.module_error.clone() {
        main.push(error_with_retry(&error));
    }
    if editing {
        let check = app.icon("check");
        let mut cells = Vec::new();
        for block in BLOCKS {
            let mut pick = chip(&format!("home:block:{block}"), &block_label(block)).on(shown(block));
            if shown(block) {
                pick.icon = check.clone();
            }
            cells.push(pick);
            if cells.len() == 5 {
                main.push(row(std::mem::take(&mut cells)).gap(6.0));
            }
        }
        if !cells.is_empty() {
            main.push(row(cells).gap(6.0));
        }
    }
    if shown("music") {
        music_card(app, &mut main);
    }
    tiles(app, &mut main, &shown);
    if shown("agenda") {
        agenda(app, &mut main);
    }
    let mut aside = Vec::new();
    if shown("habits") {
        habits(app, &mut aside);
    }
    if shown("recent") {
        recent_mail(app, &mut aside);
    }
    if shown("apps") {
        apps(app, &mut aside);
    }
    Page { main, aside, aside_width: 380.0, ..Default::default() }
}

fn error_with_retry(message: &str) -> B {
    error(message, vec![btn("home:refresh", &t("retry"))])
}
