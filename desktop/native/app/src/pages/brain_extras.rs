use crate::app::{spawn, App};
use crate::i18n::{fr, t, tr};
use crate::logic::navigation::{macro_targets, page_for_href};
use crate::logic::productivity::{activity_weeks, task_due, task_late};
use crate::logic::settings::LOOKS;
use crate::logic::time;
use crate::pages::daily::tasks_list;
use crate::pages::first_array;
use crate::pages::generic::activity_label;
use crate::prefs;
use crate::services::{api, api_data, api_m, items_list, rest_get, Fut};
use crate::vm::*;
use chrono::Local;
use serde_json::{json, Value};

#[derive(Default)]
pub struct ExtrasState {
    pub label: String,
    pub href: String,
    pub look: String,
    pub editing: Option<String>,
    pub error: Option<String>,
    pub summary: String,
    pub busy: bool,
    pub flow: Option<Value>,
    pub flow_running: bool,
    pub steps: Vec<String>,
    pub done_steps: Vec<usize>,
    pub when: String,
    pub time: String,
    pub page: String,
    pub action: String,
}

fn look_name(id: &str) -> String {
    LOOKS.iter().find(|look| look.id == id).map_or(id.to_string(), |look| if fr() { look.fr } else { look.en }.to_string())
}

pub fn site_theme(theme: &str) -> &'static str {
    match theme {
        "obsidian" => "obsidian",
        "cyber-neon" | "neon" => "neon",
        "northern-aurora" | "aurora" => "aurora",
        "solar-eclipse" | "solar" => "solar",
        "monochrome-studio" | "mono" => "mono",
        "sunset" => "sunset",
        "ethone" => "ethone",
        "daylight" => "daylight",
        _ => "obsidian",
    }
}

pub fn look_theme(look: &str) -> &str {
    match look {
        "neon" => "cyber-neon",
        "aurora" => "northern-aurora",
        "solar" => "solar-eclipse",
        "mono" => "monochrome-studio",
        other => other,
    }
}

pub fn interaction_stats(events: &[Value]) -> Vec<(String, usize)> {
    let mut counts: Vec<(String, usize)> = Vec::new();
    for event in events {
        let kind = event["eventType"].as_str().filter(|kind| !kind.is_empty()).unwrap_or("other").to_string();
        match counts.iter_mut().find(|(known, _)| *known == kind) {
            Some((_, count)) => *count += 1,
            None => counts.push((kind, 1)),
        }
    }
    counts.sort_by(|left, right| right.1.cmp(&left.1));
    counts
}

fn briefing_data() -> Fut {
    Box::pin(async {
        let today = time::day_key(&Local::now());
        let tasks = tasks_list().await?;
        let events = items_list("events").await?;
        let habits = rest_get("ethone_habits?select=id,name&archived=eq.false").await.unwrap_or(json!([]));
        let done = rest_get(&format!("ethone_habit_completions?select=habit_id&completed_on=eq.{today}")).await.unwrap_or(json!([]));
        let unread = api("api/mail/inbox?folder=inbox&limit=1").await.ok().map(|answer| answer["meta"]["unread"].as_i64().unwrap_or(0));
        let open: Vec<Value> = tasks.as_array().into_iter().flatten().filter(|task| task["done"] != true).cloned().collect();
        let mut today_events: Vec<(f64, String)> = events.as_array().into_iter().flatten().filter_map(|event| {
            let date = event["startAt"].as_str().and_then(time::parse)?;
            (time::day_key(&date) == today).then(|| (date.timestamp_millis() as f64, format!("{} {}", time::clock(&date), event["title"].as_str().unwrap_or_default())))
        }).collect();
        today_events.sort_by(|left, right| left.0.total_cmp(&right.0));
        let history: Vec<Value> = prefs::read_json("ethone-focus-history").unwrap_or_default();
        let focus: f64 = history.iter().filter(|entry| entry["completedAt"].as_str().and_then(time::parse).is_some_and(|date| time::day_key(&date) == today)).map(|entry| entry["seconds"].as_f64().unwrap_or(0.0)).sum();
        let done_ids: Vec<&Value> = done.as_array().into_iter().flatten().map(|item| &item["habit_id"]).collect();
        Ok(json!({
            "events": today_events.into_iter().map(|(_, text)| text).collect::<Vec<_>>(),
            "late": open.iter().filter(|task| task_late(task, &today)).map(|task| task["title"].clone()).collect::<Vec<_>>(),
            "today": open.iter().filter(|task| task_due(task) == today).map(|task| task["title"].clone()).collect::<Vec<_>>(),
            "open": open.len(),
            "habitsLeft": habits.as_array().into_iter().flatten().filter(|habit| !done_ids.contains(&&habit["id"])).map(|habit| habit["name"].clone()).collect::<Vec<_>>(),
            "unread": unread,
            "focus": (focus / 60.0).round(),
        }))
    })
}

pub fn briefing_text(data: &Value) -> String {
    let list = |key: &str, none: &str| { let items: Vec<&str> = data[key].as_array().into_iter().flatten().filter_map(Value::as_str).collect(); if items.is_empty() { none.to_string() } else { items.join(", ") } };
    let mut lines = vec![
        format!("Événements du jour : {}.", list("events", "aucun")),
        format!("Tâches en retard : {}.", list("late", "aucune")),
        format!("Tâches pour aujourd'hui : {}. Tâches ouvertes au total : {}.", list("today", "aucune"), data["open"]),
        format!("Habitudes restantes aujourd'hui : {}.", list("habitsLeft", "aucune")),
    ];
    if let Some(unread) = data["unread"].as_i64() {
        lines.push(format!("Mails non lus : {unread}."));
    }
    lines.push(format!("Concentration aujourd'hui : {} min.", data["focus"]));
    lines.join("\n")
}

fn data_path(section: &str) -> &'static str {
    match section {
        "flows" => "api/user-data/flows",
        "macros" => "api/user-data/macros",
        _ => "api/user-data/personas",
    }
}

fn load_rows(section: &str) -> Fut {
    let inner = api(data_path(section));
    Box::pin(async move { Ok(Value::Array(first_array(&inner.await?, None))) })
}

fn rows(app: &App, section: &str) -> Vec<Value> {
    app.res.get(&format!("brain:{section}")).and_then(|res| res.data.clone()).and_then(|data| data.as_array().cloned()).unwrap_or_default()
}

fn mutate(app: &mut App, section: &'static str, work: Fut, after: impl FnOnce(&mut App) + Send + 'static) {
    app.state.extras.error = None;
    spawn(work, move |app, result| match result {
        Ok(_) => {
            after(app);
            app.reload(&format!("brain:{section}"), || load_rows(section));
        }
        Err(error) => app.state.extras.error = Some(crate::i18n::error_text(&error)),
    });
}

fn stamp() -> i64 {
    time::now_ms() as i64
}

fn page_label(page: &str) -> String {
    macro_targets().into_iter().find(|(href, _)| page_for_href(href) == Some(page)).map_or(page.to_string(), |(_, label)| label.to_string())
}

pub fn act(app: &mut App, verb: &str, arg: &str, value: &str) {
    let state = &mut app.state.extras;
    match verb {
        "label" => state.label = value.into(),
        "href" => state.href = value.into(),
        "look" => state.look = value.into(),
        "when" => state.when = value.into(),
        "time" => state.time = value.into(),
        "page" => state.page = value.into(),
        "action" => state.action = value.into(),
        "briefing-refresh" => app.forget("brain:briefing"),
        "briefing-ask" => {
            let Some(data) = app.res.get("brain:briefing").and_then(|res| res.data.clone()) else { return };
            app.state.extras.busy = true;
            app.state.extras.error = None;
            let prompt = format!("Voici ma journée. Fais-moi un résumé court et dis-moi par quoi commencer, sans rien inventer.\n{}", briefing_text(&data));
            spawn(api_m("POST", "api/brain/complete", Some(json!({ "messages": [{ "role": "user", "content": prompt }] }))), |app, result| {
                app.state.extras.busy = false;
                match result {
                    Ok(value) => app.state.extras.summary = crate::pages::brain::answer_of(&value),
                    Err(error) => app.state.extras.error = Some(crate::i18n::error_text(&error)),
                }
            });
        }
        "refresh" => app.forget(&format!("brain:{arg}")),
        "flow-add" | "label:submit" if crate::pages::section("ethone-section-brain", "chat") == "flows" => {
            let label = app.state.extras.label.trim().to_string();
            if label.is_empty() {
                return;
            }
            mutate(app, "flows", api_m("POST", data_path("flows"), Some(json!({ "slug": format!("flows-{}", stamp()), "label": label, "data": { "steps": [] } }))), |app| app.state.extras.label.clear());
        }
        "flow-open" | "flow-run" => {
            if let Some(row) = rows(app, "flows").into_iter().find(|row| row["id"] == arg) {
                let state = &mut app.state.extras;
                state.steps = row["data"]["steps"].as_array().map(|list| list.iter().filter_map(Value::as_str).map(str::to_string).collect()).unwrap_or_default();
                state.flow_running = verb == "flow-run";
                state.done_steps.clear();
                state.label = row["label"].as_str().unwrap_or_default().to_string();
                state.flow = Some(row.clone());
                let title = state.label.clone();
                app.open_drawer(&title, 460.0, flow_drawer);
            }
        }
        "flow-name" => app.state.extras.label = value.into(),
        "flow-step" => {
            if let Ok(at) = arg.parse::<usize>() {
                if let Some(step) = app.state.extras.steps.get_mut(at) {
                    *step = value.to_string();
                }
            }
        }
        "flow-step-add" => app.state.extras.steps.push(String::new()),
        "flow-step-remove" => {
            if let Ok(at) = arg.parse::<usize>() {
                if at < app.state.extras.steps.len() {
                    app.state.extras.steps.remove(at);
                }
            }
        }
        "flow-check" => {
            if let Ok(at) = arg.parse::<usize>() {
                let done = &mut app.state.extras.done_steps;
                if let Some(position) = done.iter().position(|item| *item == at) {
                    done.remove(position);
                } else {
                    done.push(at);
                }
            }
        }
        "flow-save" => {
            let Some(flow) = app.state.extras.flow.clone() else { return };
            let mut data = flow["data"].clone();
            if !data.is_object() {
                data = json!({});
            }
            data["steps"] = json!(app.state.extras.steps.iter().map(|step| step.trim()).filter(|step| !step.is_empty()).collect::<Vec<_>>());
            let body = json!({ "id": flow["id"], "label": app.state.extras.label.trim(), "data": data });
            mutate(app, "flows", api_m("PATCH", data_path("flows"), Some(body)), |app| {
                app.close_drawer();
                app.state.extras.flow = None;
                app.state.extras.label.clear();
            });
        }
        "delete" => {
            let (section, id) = arg.split_once('|').unwrap_or(("", arg));
            let section: &'static str = match section { "flows" => "flows", "macros" => "macros", _ => "personas" };
            mutate(app, section, api_m("DELETE", data_path(section), Some(json!({ "id": id }))), |_| {});
        }
        "macro-save" | "label:submit" if crate::pages::section("ethone-section-brain", "chat") == "macros" => {
            let label = app.state.extras.label.trim().to_string();
            if label.is_empty() {
                return;
            }
            let href = if app.state.extras.href.is_empty() { "/tasks".to_string() } else { app.state.extras.href.clone() };
            let data = json!({ "action": "navigate", "href": href });
            let work = match app.state.extras.editing.clone() {
                Some(id) => api_m("PATCH", data_path("macros"), Some(json!({ "id": id, "label": label, "data": data }))),
                None => api_m("POST", data_path("macros"), Some(json!({ "slug": format!("macros-{}", stamp()), "label": label, "data": data }))),
            };
            mutate(app, "macros", work, |app| {
                app.state.extras.label.clear();
                app.state.extras.editing = None;
            });
        }
        "macro-run" => {
            let page = rows(app, "macros").into_iter().find(|row| row["id"] == arg).and_then(|row| row["data"]["href"].as_str().and_then(page_for_href));
            if let Some(page) = page {
                crate::pages::shell::go(app, page);
            }
        }
        "macro-edit" => {
            if let Some(row) = rows(app, "macros").into_iter().find(|row| row["id"] == arg) {
                app.state.extras.editing = Some(arg.to_string());
                app.state.extras.label = row["label"].as_str().unwrap_or_default().to_string();
                app.state.extras.href = row["data"]["href"].as_str().unwrap_or("/tasks").to_string();
            }
        }
        "macro-cancel" => {
            app.state.extras.editing = None;
            app.state.extras.label.clear();
        }
        "persona-add" | "label:submit" => {
            let label = app.state.extras.label.trim().to_string();
            if label.is_empty() {
                return;
            }
            let look = if app.state.extras.look.is_empty() { "obsidian".to_string() } else { app.state.extras.look.clone() };
            mutate(app, "personas", api_m("POST", data_path("personas"), Some(json!({ "slug": format!("personas-{}", stamp()), "label": label, "data": { "theme": look_theme(&look) } }))), |app| app.state.extras.label.clear());
        }
        "persona-apply" => {
            let target = site_theme(arg);
            app.with_ui(|ui| crate::theme::apply_look(ui, target));
            app.toast(&tr(&format!("Thème {} appliqué", look_name(target)), &format!("{} theme applied", look_name(target))));
        }
        "rule-add" => {
            let state = &app.state.extras;
            let when = if state.when.is_empty() { "time" } else { state.when.as_str() };
            let trigger = if when == "time" {
                let clock = if state.time.is_empty() { "09:00".to_string() } else { state.time.clone() };
                if !valid_clock(&clock) {
                    app.toast_bad(&tr("Heure invalide, écris HH:MM", "Invalid time, write HH:MM"));
                    return;
                }
                json!({ "type": "time", "value": clock })
            } else {
                json!({ "type": "page", "value": page_for_href(if state.page.is_empty() { "/mail" } else { &state.page }).unwrap_or("home") })
            };
            let action = if state.action.is_empty() { "look:aurora".to_string() } else { state.action.clone() };
            let (kind, target) = action.split_once(':').unwrap_or(("look", "aurora"));
            let mut rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
            rules.push(json!({ "id": format!("{:x}", stamp()), "enabled": true, "trigger": trigger, "action": { "type": kind, "value": target } }));
            prefs::write_json("ethone-automations", &rules);
        }
        "rule-toggle" => {
            let mut rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
            for rule in &mut rules {
                if rule["id"] == arg {
                    rule["enabled"] = json!(value == "true");
                }
            }
            prefs::write_json("ethone-automations", &rules);
        }
        "rule-delete" => {
            let mut rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
            rules.retain(|rule| rule["id"] != arg);
            prefs::write_json("ethone-automations", &rules);
        }
        _ => {}
    }
}

pub fn valid_clock(text: &str) -> bool {
    let Some((hour, minute)) = text.split_once(':') else { return false };
    hour.len() == 2 && minute.len() == 2 && hour.parse::<u32>().is_ok_and(|value| value < 24) && minute.parse::<u32>().is_ok_and(|value| value < 60)
}

fn flow_drawer(app: &mut App) -> Vec<B> {
    let state = &app.state.extras;
    let (steps, running, done, label) = (state.steps.clone(), state.flow_running, state.done_steps.clone(), state.label.clone());
    let (check, circle, trash, plus) = (app.icon("circle-check"), app.icon("circle"), app.icon("trash-2"), app.icon("plus"));
    let mut out = Vec::new();
    if running {
        out.extend(group(steps.iter().enumerate().map(|(at, step)| {
            let on = done.contains(&at);
            row(vec![icon(if on { check.clone() } else { circle.clone() }).tone(if on { "ok" } else { "" }), text(step).grow()]).id(&format!("brain:flow-check:{at}"))
        }).collect()));
        if !steps.is_empty() && done.len() == steps.len() {
            out.push(B { tone: "ok", ..prose(&tr("Routine terminée", "Routine finished")) });
        }
        return out;
    }
    out.push(field(&tr("Nom", "Name"), vec![input("brain:flow-name", &label, "")]));
    for (at, step) in steps.iter().enumerate() {
        out.push(row(vec![input(&format!("brain:flow-step:{at}"), step, &tr(&format!("Étape {}", at + 1), &format!("Step {}", at + 1))), ibtn(&format!("brain:flow-step-remove:{at}"), trash.clone(), &tr("Retirer l'étape", "Remove step"))]));
    }
    out.push(row(vec![btn("brain:flow-step-add", &tr("Ajouter une étape", "Add a step")).icon(plus), primary("brain:flow-save", &tr("Enregistrer", "Save")).off(label.trim().is_empty())]));
    if let Some(message) = app.state.extras.error.clone() {
        out.push(error(&message, vec![]));
    }
    out
}

fn list_head(title: &str, text: &str, section: &str, loading: bool, app: &mut App) -> B {
    let refresh = app.icon("refresh-cw");
    head(title, text, vec![btn(&format!("brain:refresh:{section}"), &t("refresh")).icon(refresh).off(loading)])
}

pub fn view(app: &mut App, section: &str) -> Vec<B> {
    match section {
        "briefing" => briefing(app),
        "flows" => flows(app),
        "macros" => macros(app),
        "interactions" => interactions(app),
        "personas" => personas(app),
        _ => rules(app),
    }
}

fn briefing(app: &mut App) -> Vec<B> {
    let res = app.load("brain:briefing", briefing_data);
    let refresh = app.icon("refresh-cw");
    let sparkles = app.icon("sparkles");
    let mut out = vec![head(&tr("Résumé du jour", "Daily briefing"), &time::long_date(&Local::now(), fr()), vec![btn("brain:briefing-refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(4, 60.0));
        }
        return out;
    };
    let block = |title: String, key: &str, none: String, out: &mut Vec<B>| {
        out.push(h2(&title));
        let items: Vec<String> = data[key].as_array().into_iter().flatten().filter_map(Value::as_str).map(str::to_string).collect();
        if items.is_empty() {
            out.push(note(&none));
        } else {
            out.extend(group(items.iter().map(|item| row(vec![text(item).grow()])).collect()));
        }
    };
    block(tr("Calendrier", "Calendar"), "events", tr("Rien de prévu.", "Nothing planned."), &mut out);
    block(tr("En retard", "Late"), "late", tr("Aucune tâche en retard.", "No late tasks."), &mut out);
    let open = data["open"].as_i64().unwrap_or(0);
    block(tr("Pour aujourd'hui", "For today"), "today", tr(&format!("{open} tâche(s) ouverte(s), aucune pour aujourd'hui."), &format!("{open} open task(s), none for today.")), &mut out);
    block(tr("Habitudes restantes", "Habits left"), "habitsLeft", tr("Tout est fait.", "All done."), &mut out);
    let mut cells = Vec::new();
    if let Some(unread) = data["unread"].as_i64() {
        cells.push(muted(&tr(&format!("{unread} mail(s) non lu(s)"), &format!("{unread} unread email(s)"))));
    }
    cells.push(muted(&tr(&format!("{} min de concentration", data["focus"]), &format!("{} min of focus", data["focus"]))));
    cells.push(gap());
    cells.push(primary("brain:briefing-ask", &if app.state.extras.busy { tr("Brain réfléchit…", "Brain is thinking…") } else { tr("Demander à Brain", "Ask Brain") }).icon(sparkles).off(app.state.extras.busy));
    out.push(row(cells));
    if !app.state.extras.summary.is_empty() {
        out.push(card(vec![stack_wrap("Brain", &app.state.extras.summary)]));
    }
    if let Some(message) = app.state.extras.error.clone() {
        out.push(error(&message, vec![]));
    }
    out
}

fn flows(app: &mut App) -> Vec<B> {
    let res = app.load("brain:flows", || load_rows("flows"));
    let label = app.state.extras.label.clone();
    let (play, list, trash) = (app.icon("play"), app.icon("list-checks"), app.icon("trash-2"));
    let mut out = vec![list_head("Flows", &tr("Tes routines, étape par étape.", "Your routines, step by step."), "flows", res.loading, app), row(vec![input("brain:label", &label, &tr("Nom du flow", "Flow name")), primary("brain:flow-add", &tr("Créer", "Create")).off(label.trim().is_empty())])];
    if let Some(message) = app.state.extras.error.clone().filter(|_| app.drawer.is_none()).or(res.error.clone()) {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else { return out };
    let rows: Vec<Value> = data.as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun flow", "No flows"), &tr("Crée ta première routine ci-dessus.", "Create your first routine above.")));
        return out;
    }
    out.extend(group(rows.iter().map(|row_data| {
        let id = row_data["id"].as_str().map_or(row_data["id"].to_string(), str::to_string);
        let count = row_data["data"]["steps"].as_array().map_or(0, Vec::len);
        row(vec![stack(row_data["label"].as_str().unwrap_or_default(), &tr(&format!("{count} étape(s)"), &format!("{count} step(s)"))), btn(&format!("brain:flow-run:{id}"), &tr("Lancer", "Run")).icon(play.clone()).off(count == 0), btn(&format!("brain:flow-open:{id}"), &tr("Modifier", "Edit")).icon(list.clone()), ibtn(&format!("brain:delete:flows|{id}"), trash.clone(), &tr("Supprimer", "Delete"))])
    }).collect()));
    out
}

fn macros(app: &mut App) -> Vec<B> {
    let res = app.load("brain:macros", || load_rows("macros"));
    let state = &app.state.extras;
    let (label, href, editing) = (state.label.clone(), if state.href.is_empty() { "/tasks".to_string() } else { state.href.clone() }, state.editing.clone());
    let options: Vec<(String, String)> = macro_targets().into_iter().map(|(href, label)| (href.to_string(), label.to_string())).collect();
    let pick = app.select("brain:href", &href, &options);
    let mut form = vec![input("brain:label", &label, &tr("Nom de la macro", "Macro name")), pick, primary("brain:macro-save", &if editing.is_some() { tr("Enregistrer", "Save") } else { tr("Créer", "Create") }).off(label.trim().is_empty())];
    if editing.is_some() {
        form.push(btn("brain:macro-cancel", &tr("Annuler", "Cancel")));
    }
    let (play, trash) = (app.icon("play"), app.icon("trash-2"));
    let mut out = vec![list_head("Macros", &tr("Un clic pour aller directement à une page.", "One click to jump to a page."), "macros", res.loading, app), row(form)];
    if let Some(message) = app.state.extras.error.clone().or(res.error.clone()) {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else { return out };
    let rows: Vec<Value> = data.as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucune macro", "No macros"), &tr("Crée ta première macro ci-dessus.", "Create your first macro above.")));
        return out;
    }
    out.extend(group(rows.iter().map(|row_data| {
        let id = row_data["id"].as_str().map_or(row_data["id"].to_string(), str::to_string);
        let target_href = row_data["data"]["href"].as_str().unwrap_or_default();
        let target = macro_targets().into_iter().find(|(item, _)| *item == target_href).map(|(_, label)| label.to_string());
        let page = page_for_href(target_href);
        row(vec![stack(row_data["label"].as_str().unwrap_or_default(), &target.clone().unwrap_or_else(|| tr("Action du site, non disponible ici", "Website action, not available here"))), btn(&format!("brain:macro-run:{id}"), &tr("Lancer", "Run")).icon(play.clone()).off(page.is_none()), btn(&format!("brain:macro-edit:{id}"), &tr("Modifier", "Edit")).off(target.is_none()), ibtn(&format!("brain:delete:macros|{id}"), trash.clone(), &tr("Supprimer", "Delete"))])
    }).collect()));
    out
}

fn personas(app: &mut App) -> Vec<B> {
    let res = app.load("brain:personas", || load_rows("personas"));
    let label = app.state.extras.label.clone();
    let look = if app.state.extras.look.is_empty() { "obsidian".to_string() } else { app.state.extras.look.clone() };
    let options: Vec<(String, String)> = LOOKS.iter().map(|item| (item.id.to_string(), look_name(item.id))).collect();
    let pick = app.select("brain:look", &look, &options);
    let (play, trash) = (app.icon("play"), app.icon("trash-2"));
    let mut out = vec![list_head("Personas", &tr("Des ambiances à appliquer en un clic, synchronisées avec ton compte.", "Moods you apply in one click, synced with your account."), "personas", res.loading, app), row(vec![input("brain:label", &label, &tr("Nom du persona", "Persona name")), pick, primary("brain:persona-add", &tr("Créer", "Create")).off(label.trim().is_empty())])];
    if let Some(message) = app.state.extras.error.clone().or(res.error.clone()) {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else { return out };
    let rows: Vec<Value> = data.as_array().cloned().unwrap_or_default();
    if rows.is_empty() {
        out.push(empty(&tr("Aucun persona", "No personas"), &tr("Crée ta première ambiance ci-dessus.", "Create your first mood above.")));
        return out;
    }
    out.extend(group(rows.iter().map(|row_data| {
        let id = row_data["id"].as_str().map_or(row_data["id"].to_string(), str::to_string);
        let theme = row_data["data"]["theme"].as_str().unwrap_or_default();
        let target = site_theme(theme);
        row(vec![stack(row_data["label"].as_str().unwrap_or_default(), &look_name(target)), btn(&format!("brain:persona-apply:{theme}"), &tr("Appliquer", "Apply")).icon(play.clone()), ibtn(&format!("brain:delete:personas|{id}"), trash.clone(), &tr("Supprimer", "Delete"))])
    }).collect()));
    out
}

fn interactions(app: &mut App) -> Vec<B> {
    let res = app.load("brain:interactions", || api_data("api/cloud/activity?limit=2000"));
    let mut out = vec![list_head(&tr("Interactions", "Interactions"), &tr("Ce que tu as fait sur les 12 derniers mois.", "What you did over the last 12 months."), "interactions", res.loading, app)];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 60.0));
        }
        return out;
    };
    let events = first_array(&data["events"], None);
    if events.is_empty() {
        out.push(empty(&tr("Aucune interaction", "No interactions"), ""));
        return out;
    }
    let dates: Vec<String> = events.iter().filter_map(|event| event["createdAt"].as_str().map(str::to_string)).collect();
    let weeks = activity_weeks(&dates, Local::now(), 52);
    let peak = weeks.iter().flatten().map(|day| day.count).max().unwrap_or(1).max(1) as f32;
    let accent = hex("#2997ff");
    for day in 0..7 {
        out.push(row(weeks.iter().map(|week| {
            let cell = &week[day];
            C { kind: "heat", tip: format!("{} : {}", cell.key, cell.count), progress: cell.count as f32 / peak, on: cell.count > 0, color: Some(accent), weight: 1.0, disabled: cell.future, ..Default::default() }
        }).collect()).gap(2.0));
    }
    let stats = interaction_stats(&events);
    let top = stats.first().map_or(1, |(_, count)| *count).max(1) as f32;
    out.push(h2(&tr("Répartition", "Breakdown")));
    out.extend(group(stats.iter().take(8).map(|(kind, count)| row(vec![text(&activity_label(kind)).grow(), C { weight: 1.5, ..bar(*count as f32 / top) }, strong(&count.to_string())])).collect()));
    out.push(h2(&tr("Récemment", "Recent")));
    let fr = fr();
    out.extend(group(events.iter().take(8).map(|event| row(vec![text(&event["details"]["title"].as_str().map_or_else(|| activity_label(event["eventType"].as_str().unwrap_or_default()), str::to_string)).grow(), muted(&event["createdAt"].as_str().and_then(time::parse).map(|date| time::date_time(&date, fr)).unwrap_or_default())])).collect()));
    out
}

fn rules(app: &mut App) -> Vec<B> {
    let rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
    let state = &app.state.extras;
    let when = if state.when.is_empty() { "time".to_string() } else { state.when.clone() };
    let (clock, page, action) = (if state.time.is_empty() { "09:00".to_string() } else { state.time.clone() }, if state.page.is_empty() { "/mail".to_string() } else { state.page.clone() }, if state.action.is_empty() { "look:aurora".to_string() } else { state.action.clone() });
    let when_pick = app.select("brain:when", &when, &[("time".into(), tr("À une heure", "At a time")), ("page".into(), tr("Sur une page", "On a page"))]);
    let mut seen = Vec::new();
    let page_options: Vec<(String, String)> = macro_targets().into_iter().filter(|(href, _)| { let page = page_for_href(href); if seen.contains(&page) { false } else { seen.push(page); true } }).map(|(href, label)| (href.to_string(), label.to_string())).collect();
    let mut action_options: Vec<(String, String)> = LOOKS.iter().map(|item| (format!("look:{}", item.id), tr(&format!("Thème {}", look_name(item.id)), &format!("{} theme", look_name(item.id))))).collect();
    action_options.push(("density:compact".into(), tr("Densité compacte", "Compact density")));
    action_options.push(("density:comfortable".into(), tr("Densité confortable", "Comfortable density")));
    let action_pick = app.select("brain:action", &action, &action_options);
    let mut form = vec![when_pick];
    if when == "time" {
        form.push(input("brain:time", &clock, "09:00").tip(&tr("Heure", "Time")));
    } else {
        let page_pick = app.select("brain:page", &page, &page_options);
        form.push(page_pick);
    }
    form.push(action_pick);
    let (plus, trash) = (app.icon("plus"), app.icon("trash-2"));
    form.push(primary("brain:rule-add", &tr("Ajouter", "Add")).icon(plus));
    let mut out = vec![head(&tr("Règles", "Rules"), &tr("Change l'ambiance d'Ethone à une heure ou sur une page. Tant qu'Ethone est ouvert, sur ce PC.", "Change Ethone's mood at a time or on a page. While Ethone is open, on this PC."), vec![]), row(form)];
    if rules.is_empty() {
        out.push(empty(&tr("Aucune règle", "No rules"), &tr("Ajoute ta première règle ci-dessus.", "Add your first rule above.")));
        return out;
    }
    out.extend(group(rules.iter().map(|rule| {
        let id = rule["id"].as_str().unwrap_or_default();
        let value = rule["trigger"]["value"].as_str().unwrap_or_default();
        let trigger = if rule["trigger"]["type"] == "time" { tr(&format!("Chaque jour à {value}"), &format!("Every day at {value}")) } else { tr(&format!("En ouvrant {}", page_label(value)), &format!("When opening {value}")) };
        let target = rule["action"]["value"].as_str().unwrap_or_default();
        let action = if rule["action"]["type"] == "look" { tr(&format!("Thème {}", look_name(target)), &format!("{} theme", look_name(target))) } else if target == "compact" { tr("Densité compacte", "Compact density") } else { tr("Densité confortable", "Comfortable density") };
        row(vec![stack(&action, &trigger), switch(&format!("brain:rule-toggle:{id}"), rule["enabled"] == true, &tr("Activer la règle", "Enable the rule")), ibtn(&format!("brain:rule-delete:{id}"), trash.clone(), &tr("Supprimer la règle", "Delete the rule"))])
    }).collect()));
    out
}

pub fn run_time_rules(app: &mut App, clock: &str) {
    let rules: Vec<Value> = prefs::read_json("ethone-automations").unwrap_or_default();
    for rule in rules.iter().filter(|rule| rule["enabled"] == true && rule["trigger"]["type"] == "time" && rule["trigger"]["value"] == clock) {
        crate::pages::shell::run_rule(app, rule);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn site_themes_and_looks_round_trip() {
        for look in ["neon", "aurora", "solar", "mono", "sunset", "obsidian"] {
            assert_eq!(site_theme(look_theme(look)), look);
        }
        assert_eq!(site_theme("inconnu"), "obsidian");
    }

    #[test]
    fn interactions_are_counted_by_kind() {
        let events = vec![json!({ "eventType": "shared" }), json!({ "eventType": "shared" }), json!({})];
        assert_eq!(interaction_stats(&events), vec![("shared".to_string(), 2), ("other".to_string(), 1)]);
    }

    #[test]
    fn the_briefing_never_invents_anything() {
        let text = briefing_text(&json!({ "events": [], "late": ["A"], "today": [], "open": 3, "habitsLeft": [], "unread": null, "focus": 0 }));
        assert!(text.contains("Événements du jour : aucun."));
        assert!(text.contains("Tâches en retard : A."));
        assert!(!text.contains("Mails non lus"));
    }

    #[test]
    fn clocks_are_checked() {
        assert!(valid_clock("09:30"));
        assert!(!valid_clock("9:30"));
        assert!(!valid_clock("24:00"));
    }
}
