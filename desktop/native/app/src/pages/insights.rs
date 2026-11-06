use crate::app::{spawn, App, Page};
use crate::i18n::{fr, t, tr};
use crate::logic::productivity::activity_weeks;
use crate::logic::time;
use crate::logic::weather::{air_level, city_time, compass, hour_of, icon_for, next_rain, range_bar, toggle_city, uv_level};
use crate::pages::generic::{activity_label, humanize, json_fields, number_text};
use crate::pages::{encode, first_array, section, set_section};
use crate::prefs;
use crate::services::{api_data, open_url};
use crate::vm::*;
use chrono::Datelike;
use serde_json::Value;

const SECTION_KEY: &str = "ethone-section-insights";

#[derive(Default)]
pub struct InsightsState {
    pub query: String,
    pub places: Vec<Value>,
    pub rss_url: String,
    pub rss_current: Option<String>,
}

fn side() -> Vec<(String, String, String, String)> {
    vec![
        ("insights:section:activity".into(), tr("Activité", "Activity"), "activity".into(), String::new()),
        ("insights:section:mail".into(), tr("Statistiques mail", "Mail stats"), "message-square".into(), String::new()),
        (String::new(), tr("Infos", "Info"), String::new(), String::new()),
        ("insights:section:weather".into(), tr("Météo", "Weather"), "cloud-sun".into(), String::new()),
        ("insights:section:rss".into(), tr("Flux RSS", "RSS feeds"), "rss".into(), String::new()),
        (String::new(), tr("Support", "Support"), String::new(), String::new()),
        ("insights:section:diagnostic".into(), tr("Diagnostic", "Diagnostics"), "shield".into(), String::new()),
    ]
}

pub fn view(app: &mut App) -> Page {
    let current = section(SECTION_KEY, "activity");
    let main = match current.as_str() {
        "mail" => mail_stats(app),
        "weather" => weather(app),
        "rss" => rss(app),
        "diagnostic" => diagnostic(app),
        _ => activity(app),
    };
    Page { side: side(), side_active: format!("insights:section:{current}"), main, ..Default::default() }
}

fn city() -> String {
    prefs::text("ethone-weather-city", "Paris")
}

fn feeds() -> Vec<String> {
    prefs::read_json("ethone-rss-feeds").unwrap_or_default()
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => set_section(SECTION_KEY, arg),
        "refresh" => app.forget("insights:"),
        "query" => {
            app.state.insights.query = value.to_string();
            let text = value.trim().to_string();
            if text.chars().count() < 2 {
                app.state.insights.places.clear();
                return;
            }
            let holder = text.clone();
            spawn(
                async move {
                    tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                    (holder.clone(), api_data(&format!("api/geocode?q={}", encode(&holder))).await)
                },
                |app, (asked, result)| {
                    if app.state.insights.query.trim() == asked {
                        app.state.insights.places = result.ok().and_then(|value| value.as_array().cloned()).unwrap_or_default();
                    }
                },
            );
        }
        "query:submit" => {
            let pick = app.state.insights.places.first().and_then(|place| place["name"].as_str().map(str::to_string)).unwrap_or_else(|| app.state.insights.query.trim().to_string());
            if pick.chars().count() >= 2 {
                choose(app, &pick);
            }
        }
        "city" => choose(app, value),
        "place" => {
            if let Some(name) = arg.parse::<usize>().ok().and_then(|at| app.state.insights.places.get(at)).and_then(|place| place["name"].as_str().map(str::to_string)) {
                choose(app, &name);
            }
        }
        "save-city" => {
            let next = toggle_city(&prefs::read_json::<Vec<String>>("ethone-weather-cities").unwrap_or_default(), arg);
            prefs::write_json("ethone-weather-cities", &next);
        }
        "go-city" => choose(app, arg),
        "rss-url" => app.state.insights.rss_url = value.into(),
        "rss-add" | "rss-url:submit" => {
            let url = app.state.insights.rss_url.trim().to_string();
            if !(url.starts_with("https://") || url.starts_with("http://")) {
                return;
            }
            let mut list = feeds();
            if !list.contains(&url) {
                list.push(url.clone());
            }
            prefs::write_json("ethone-rss-feeds", &list);
            app.state.insights.rss_current = Some(url);
            app.state.insights.rss_url.clear();
        }
        "rss-pick" => app.state.insights.rss_current = feeds().get(arg.parse::<usize>().unwrap_or(0)).cloned(),
        "rss-open" => {
            let _ = open_url(&app.get(&format!("rss:{arg}")));
        }
        "link" => {
            let _ = open_url(&format!("https://ethone.dev/{arg}"));
        }
        _ => {}
    }
}

fn choose(app: &mut App, name: &str) {
    prefs::write_json("ethone-weather-city", &name.to_string());
    app.state.insights.query.clear();
    app.state.insights.places.clear();
    app.forget("home:weather");
}

fn activity(app: &mut App) -> Vec<B> {
    let res = app.load("insights:activity", || api_data("api/cloud/activity?limit=1000"));
    let dashboard = app.load("insights:dashboard", || {
        let inner = api_data("api/cloud/dashboard");
        Box::pin(async move { Ok(inner.await.unwrap_or(Value::Null)) })
    });
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Activité", "Activity"), "", vec![btn("insights:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(data) = dashboard.data {
        let numbers: Vec<C> = data.as_object().into_iter().flatten().filter(|(_, value)| value.is_number()).take(6).map(|(key, value)| stat(&humanize(key), &number_text(value.as_f64().unwrap_or(0.0)), "")).collect();
        for chunk in numbers.chunks(3) {
            out.push(row(chunk.to_vec()));
        }
    }
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![btn("insights:refresh", &t("retry"))]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(4, 46.0));
        }
        return out;
    };
    let events = first_array(&data["events"], None);
    if events.is_empty() {
        out.push(empty(&tr("Aucune activité", "No activity"), ""));
        return out;
    }
    let dates: Vec<String> = events.iter().filter_map(|event| event["createdAt"].as_str().map(str::to_string)).collect();
    let weeks = activity_weeks(&dates, chrono::Local::now(), 26);
    let peak = weeks.iter().flatten().map(|day| day.count).max().unwrap_or(1).max(1) as f32;
    out.push(h2(&tr(&format!("Activité des {} dernières semaines", weeks.len()), &format!("Activity over the last {} weeks", weeks.len()))));
    let accent = hex("#2997ff");
    for day in 0..7 {
        let cells: Vec<C> = weeks.iter().map(|week| {
            let cell = &week[day];
            let level = if cell.future { 0.0 } else { cell.count as f32 / peak };
            C { kind: "heat", tip: format!("{} : {}", cell.key, cell.count), progress: level, on: cell.count > 0, color: Some(accent), weight: 1.0, disabled: cell.future, ..Default::default() }
        }).collect();
        out.push(row(cells).gap(3.0));
    }
    let fr = fr();
    let mut rows: Vec<(String, String, usize)> = Vec::new();
    for event in &events {
        let title = event["details"]["title"].as_str().map_or_else(|| activity_label(event["eventType"].as_str().unwrap_or_default()), str::to_string);
        match rows.last_mut() {
            Some(last) if last.0 == title => last.2 += 1,
            _ => rows.push((title, event["createdAt"].as_str().unwrap_or_default().to_string(), 1)),
        }
    }
    out.extend(group(rows.iter().take(300).map(|(title, at, count)| {
        let mut cells = vec![strong(title).grow()];
        if *count > 1 {
            cells.push(chip("", &format!("×{count}")));
        }
        cells.push(muted(&time::parse(at).map(|date| time::date_time(&date, fr)).unwrap_or_default()));
        row(cells)
    }).collect()));
    out
}

fn mail_stats(app: &mut App) -> Vec<B> {
    let res = app.load("insights:mail", || api_data("api/mail/analytics"));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&tr("Statistiques mail", "Mail stats"), "", vec![btn("insights:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    match res.data {
        Some(data) => json_fields(&data, 0, &mut out),
        None if res.loading => out.extend(skeletons(3, 52.0)),
        None => {}
    }
    out
}

fn degrees(value: Option<f64>) -> String {
    value.map_or("–".into(), |value| format!("{}°", value.round() as i64))
}

fn weather(app: &mut App) -> Vec<B> {
    let city = city();
    let holder = city.clone();
    let res = app.load(&format!("insights:weather:{city}"), move || api_data(&format!("api/weather?city={}", encode(&holder))));
    let (refresh, search, pin, star, close) = (app.icon("refresh-cw"), app.icon("search"), app.icon("map-pin"), app.icon("star"), app.icon("x"));
    let mut out = vec![head(&tr("Météo", "Weather"), "", vec![btn("insights:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    let query = app.state.insights.query.clone();
    out.push(row(vec![input("insights:query", &query, &tr("Changer de ville", "Change city")).icon(search)]));
    let places = app.state.insights.places.clone();
    if !places.is_empty() {
        out.extend(group(places.iter().enumerate().map(|(at, place)| {
            let detail = [place["admin1"].as_str(), place["country"].as_str()].into_iter().flatten().collect::<Vec<_>>().join(", ");
            row(vec![icon(pin.clone()), stack(place["name"].as_str().unwrap_or_default(), &detail)]).id(&format!("insights:place:{at}"))
        }).collect()));
    }
    let saved: Vec<String> = prefs::read_json("ethone-weather-cities").unwrap_or_default();
    if !saved.is_empty() {
        let mut cells = Vec::new();
        for name in &saved {
            cells.push(chip(&format!("insights:go-city:{name}"), name).on(*name == city));
            cells.push(ibtn(&format!("insights:save-city:{name}"), close.clone(), &tr(&format!("Retirer {name}"), &format!("Remove {name}"))));
        }
        out.push(row(cells).gap(4.0));
    }
    if res.error.is_some() {
        out.push(error(&tr(&format!("Impossible d'afficher la météo de {city}."), &format!("Could not show the weather for {city}.")), vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 90.0));
        }
        return out;
    };
    let number = |key: &str| data[key].as_f64();
    let day = data["isDay"] != false;
    let hourly = first_array(&data["hourly"], None);
    let daily = first_array(&data["daily"], None);
    let offset = data["utcOffsetSeconds"].as_i64().unwrap_or(0);
    let shown = data["city"].as_str().unwrap_or(&city).to_string();
    let rain = next_rain(&hourly);
    let mut feels = String::new();
    if let Some(value) = number("apparentTemperature") {
        feels = tr(&format!("Ressenti {}", degrees(Some(value))), &format!("Feels like {}", degrees(Some(value))));
    }
    if let Some(first) = daily.first() {
        feels.push_str(&format!("  ·  {}", tr(&format!("Max {}, min {}", degrees(first["max"].as_f64()), degrees(first["min"].as_f64())), &format!("High {}, low {}", degrees(first["max"].as_f64()), degrees(first["min"].as_f64())))));
    }
    let big = app.icon(icon_for(data["weatherCode"].as_i64(), day));
    let saved_now = saved.contains(&city);
    out.push(card(vec![
        C { kind: "stack", title: format!("{shown}{}", data["country"].as_str().map_or(String::new(), |country| format!(", {country}"))), sub: format!("{}\n{feels}", data["description"].as_str().unwrap_or_default()), weight: 1.0, ..Default::default() },
        text(&degrees(number("temperature"))).size(44.0).on(true),
        icon(big).size(56.0).color(hex(if day { "#ffb340" } else { "#c7c7cf" })),
    ]).tall(120.0));
    out.push(row(vec![muted(&match &rain { Some(time) => tr(&format!("Pluie probable vers {}", hour_of(time)), &format!("Rain likely around {}", hour_of(time))), None => tr("Pas de pluie prévue dans les 24 h", "No rain expected in the next 24 h") }).grow(), btn(&format!("insights:save-city:{city}"), &if saved_now { tr("Enregistrée", "Saved") } else { tr("Enregistrer", "Save") }).icon(star).on(saved_now)]));
    out.push(h2(&tr("Prochaines 24 heures", "Next 24 hours")));
    let hours: Vec<C> = hourly.iter().take(24).enumerate().map(|(at, hour)| {
        let chance = hour["precipitationProbability"].as_f64().filter(|value| *value > 0.0).map_or(String::new(), |value| format!("{value} %"));
        C { kind: "hour", title: if at == 0 { tr("Maint.", "Now") } else { hour_of(hour["time"].as_str().unwrap_or_default()) }, value: degrees(hour["temperature"].as_f64()), sub: chance, icon: crate::assets::icon(icon_for(hour["weatherCode"].as_i64(), hour["isDay"] != false)), weight: 1.0, ..Default::default() }
    }).collect();
    for chunk in hours.chunks(12) {
        out.push(row(chunk.to_vec()).gap(4.0));
    }
    out.push(h2(&tr("7 prochains jours", "Next 7 days")));
    let lowest = daily.iter().filter_map(|day| day["min"].as_f64()).fold(f64::INFINITY, f64::min);
    let highest = daily.iter().filter_map(|day| day["max"].as_f64()).fold(f64::NEG_INFINITY, f64::max);
    let fr = fr();
    out.extend(group(daily.iter().enumerate().map(|(at, item)| {
        let name = if at == 0 { tr("Aujourd'hui", "Today") } else { item["date"].as_str().and_then(|date| chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()).map(|date| { let days = if fr { ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] } else { ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }; days[date.weekday().num_days_from_monday() as usize].to_string() }).unwrap_or_default() };
        let (left, width) = range_bar(item["min"].as_f64().unwrap_or(lowest), item["max"].as_f64().unwrap_or(highest), lowest, highest);
        let chance = item["precipitationProbability"].as_f64().filter(|value| *value > 0.0).map_or(String::new(), |value| format!("{value} %"));
        let mut range = bar(((left + width) / 100.0) as f32);
        range.size = (left / 100.0) as f32;
        range.kind = "range";
        row(vec![text(&name).grow(), icon(crate::assets::icon(icon_for(item["weatherCode"].as_i64(), true))), muted(&chance), muted(&degrees(item["min"].as_f64())), range, strong(&degrees(item["max"].as_f64()))])
    }).collect()));
    let mut tiles = Vec::new();
    let mut tile_of = |icon_name: &'static str, label: String, value: String, hint: String| {
        let mut cell = tile("", &label, &value, &hint);
        cell.icon = crate::assets::icon(icon_name);
        tiles.push(cell);
    };
    if let Some(wind) = number("windSpeedKmh") {
        let hint = [number("windDirection").map(|value| compass(value).to_string()), number("windGustsKmh").map(|value| tr(&format!("rafales {} km/h", value.round() as i64), &format!("gusts {} km/h", value.round() as i64)))].into_iter().flatten().collect::<Vec<_>>().join(", ");
        tile_of("wind", tr("Vent", "Wind"), format!("{} km/h", wind.round() as i64), hint);
    }
    if let Some(value) = number("humidityPercent") {
        tile_of("droplets", tr("Humidité", "Humidity"), format!("{} %", value.round() as i64), number("dewPoint").map_or(String::new(), |dew| tr(&format!("Point de rosée {}", degrees(Some(dew))), &format!("Dew point {}", degrees(Some(dew))))));
    }
    if let Some(value) = number("uvIndex") {
        let level = match uv_level(value) { "low" => tr("Faible", "Low"), "moderate" => tr("Modéré", "Moderate"), "high" => tr("Élevé", "High"), _ => tr("Très élevé", "Very high") };
        tile_of("sun", tr("Indice UV", "UV index"), format!("{}", value.round() as i64), level);
    }
    if let Some(value) = number("airQuality") {
        let level = match air_level(value) { "good" => tr("Bon", "Good"), "fair" => tr("Correct", "Fair"), "moderate" => tr("Moyen", "Moderate"), "poor" => tr("Médiocre", "Poor"), _ => tr("Mauvais", "Bad") };
        tile_of("leaf", tr("Qualité de l'air", "Air quality"), format!("{}", value.round() as i64), level);
    }
    if let Some(value) = number("pressure") {
        tile_of("gauge", tr("Pression", "Pressure"), format!("{} hPa", value.round() as i64), String::new());
    }
    if let Some(value) = number("visibility") {
        tile_of("eye", tr("Visibilité", "Visibility"), format!("{} km", (value / 1000.0).round() as i64), String::new());
    }
    if let Some(value) = number("precipitationProbability") {
        tile_of("cloud-rain", tr("Précipitations", "Precipitation"), format!("{value} %"), number("precipitation").map_or(String::new(), |mm| format!("{mm} mm")));
    }
    if let Some(sunrise) = data["sunrise"].as_str() {
        tile_of("sunrise", tr("Lever du soleil", "Sunrise"), city_time(sunrise, offset), String::new());
    }
    if let Some(sunset) = data["sunset"].as_str() {
        tile_of("sunset", tr("Coucher du soleil", "Sunset"), city_time(sunset, offset), String::new());
    }
    for chunk in tiles.chunks(3) {
        out.push(row(chunk.to_vec()));
    }
    out
}

fn rss(app: &mut App) -> Vec<B> {
    let list = feeds();
    if app.state.insights.rss_current.is_none() {
        app.state.insights.rss_current = list.first().cloned();
    }
    let url = app.state.insights.rss_url.clone();
    let mut out = vec![head(&tr("Flux RSS", "RSS feeds"), &tr("Ta liste de flux reste sur ce PC.", "Your feed list stays on this PC."), vec![]), row(vec![input("insights:rss-url", &url, "https://…").tip(&tr("Adresse du flux", "Feed address")), btn("insights:rss-add", &tr("Ajouter", "Add"))])];
    let current = app.state.insights.rss_current.clone();
    if !list.is_empty() {
        out.push(row(list.iter().enumerate().map(|(at, feed)| chip(&format!("insights:rss-pick:{at}"), &reqwest::Url::parse(feed).ok().and_then(|parsed| parsed.host_str().map(str::to_string)).unwrap_or_else(|| feed.clone())).on(Some(feed) == current.as_ref())).collect()).gap(6.0));
    }
    let Some(current) = current else {
        out.push(empty(&tr("Aucun flux", "No feeds"), ""));
        return out;
    };
    let holder = current.clone();
    let res = app.load(&format!("insights:rss:{current}"), move || api_data(&format!("api/rss?url={}", encode(&holder))));
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(5, 44.0));
        }
        return out;
    };
    let fr = fr();
    let items = first_array(&data["items"], None);
    let mut rows = Vec::new();
    for (at, item) in items.iter().take(50).enumerate() {
        let link_url = item["link"].as_str().unwrap_or_default().to_string();
        app.set(&format!("rss:{at}"), &link_url);
        let date = item["pubDate"].as_str().and_then(|text| chrono::DateTime::parse_from_rfc2822(text).ok().map(|date| date.with_timezone(&chrono::Local)).or_else(|| time::parse(text))).map(|date| time::date_time(&date, fr)).unwrap_or_default();
        let line = row(vec![stack(item["title"].as_str().unwrap_or_default(), &date)]);
        rows.push(if link_url.starts_with("https://") { line.id(&format!("insights:rss-open:{at}")) } else { line });
    }
    out.extend(group(rows));
    out
}

fn service_name(id: &str) -> String {
    match id {
        "lastfm" => "Last.fm".into(),
        "nowplaying" => tr("Lecture en cours", "Now playing"),
        "weather" => tr("Météo", "Weather"),
        "github" => "GitHub".into(),
        "youtube" => "YouTube".into(),
        "google-calendar" => "Google Agenda".into(),
        "google-drive" => "Google Drive".into(),
        other => humanize(other),
    }
}

fn diagnostic(app: &mut App) -> Vec<B> {
    let res = app.load("insights:diagnostic", || api_data("api/diagnostic"));
    let (refresh, link) = (app.icon("refresh-cw"), app.icon("external-link"));
    let mut out = vec![head(&tr("Diagnostic", "Diagnostics"), &tr("L'état des services Ethone vu par ton compte.", "Ethone service status as seen by your account."), vec![btn("insights:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    if let Some(data) = res.data {
        let services = first_array(&data["services"], None);
        let up = services.iter().filter(|service| service["available"] == true).count();
        out.push(row(vec![
            stat(&tr("Serveur Ethone", "Ethone server"), &if data["worker"] == "connected" { tr("Connecté", "Connected") } else { tr("Indisponible", "Unavailable") }, ""),
            stat(&tr("Version", "Version"), data["version"].as_str().unwrap_or("–"), ""),
            stat(&tr("Services disponibles", "Available services"), &format!("{up} / {}", services.len()), ""),
        ]));
        let dot = app.icon("circle");
        out.extend(group(services.iter().map(|service| {
            let on = service["available"] == true;
            row(vec![icon(dot.clone()).tone(if on { "ok" } else { "bad" }), text(&service_name(service["id"].as_str().unwrap_or_default())).grow(), muted(&if on { tr("Disponible", "Available") } else { tr("Indisponible", "Unavailable") })])
        }).collect()));
    } else if res.loading {
        out.extend(skeletons(3, 60.0));
    }
    out.push(h2(&tr("Liens", "Links")));
    out.push(row(vec![btn("insights:link:changelog", &tr("Nouveautés d'Ethone", "What's new")).icon(link.clone()), btn("insights:link:docs", &tr("Documentation", "Documentation")).icon(link.clone()), btn("insights:link:terms", &tr("Conditions d'utilisation", "Terms")).icon(link.clone()), btn("insights:link:privacy", &tr("Confidentialité", "Privacy")).icon(link)]));
    out
}
