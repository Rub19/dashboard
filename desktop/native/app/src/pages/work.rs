use crate::app::{spawn, App, Page};
use crate::i18n::{fr, t, tr};
use crate::logic::productivity::{self as logic, at_noon, habit_streak, input_to_iso, item_preview, item_to_task_row, last_days, month_cells, task_due, task_late, task_priority, to_input, visible_tasks};
use crate::logic::time;
use crate::pages::daily::{tasks_list, COMPLETIONS_PATH, HABITS_PATH};
use crate::pages::{section, set_section};
use crate::services::{api_data, api_m, items_list, rest, rest_get, svc, Fut};
use crate::vm::*;
use crate::prefs;
use chrono::{Datelike, Local};
use serde_json::{json, Value};

const SECTION_KEY: &str = "ethone-section-productivity";
const FOCUS_KEY: &str = "ethone-focus-history";

#[derive(Default)]
pub struct WorkState {
    pub editor: Option<String>,
    pub title: String,
    pub body: String,
    pub start: String,
    pub end: String,
    pub due: String,
    pub priority: String,
    pub saving: bool,
    pub error: Option<String>,
    pub day: Option<String>,
    pub month: Option<(i32, u32)>,
    pub habit_name: String,
    pub habit_target: i64,
    pub bill_label: String,
    pub bill_amount: String,
    pub bill_due: String,
    pub capture_title: String,
    pub capture_body: String,
    pub capture_message: Option<(String, bool)>,
    pub scratch: Option<String>,
    pub focus_end: Option<f64>,
    pub focus_left: Option<i64>,
    pub hidden: Vec<String>,
}

fn kind_of(section: &str) -> Option<&'static str> {
    match section {
        "tasks" => Some("tasks"),
        "events" => Some("events"),
        "notes" => Some("notes"),
        _ => None,
    }
}

fn items_key(kind: &str) -> String {
    format!("productivity:{kind}")
}

fn load_items(kind: &'static str) -> Fut {
    if kind == "tasks" { tasks_list() } else { items_list(kind) }
}

fn reload(app: &mut App, kind: &'static str) {
    app.reload(&items_key(kind), || load_items(kind));
    app.forget("home:tasks");
    app.forget("home:events");
}

fn side() -> Vec<(String, String, String, String)> {
    let organize = tr("Organisation", "Organize");
    let daily = tr("Quotidien", "Daily");
    vec![
        (String::new(), organize.clone(), String::new(), String::new()),
        ("work:section:tasks".into(), tr("Tâches", "Tasks"), "list-checks".into(), organize.clone()),
        ("work:section:events".into(), tr("Calendrier", "Calendar"), "calendar-days".into(), organize.clone()),
        ("work:section:notes".into(), tr("Notes", "Notes"), "notebook-pen".into(), organize.clone()),
        ("work:section:scratchpad".into(), tr("Mémo", "Scratchpad"), "file-text".into(), organize.clone()),
        ("work:section:capture".into(), tr("Capture rapide", "Quick capture"), "zap".into(), organize),
        (String::new(), daily.clone(), String::new(), String::new()),
        ("work:section:habits".into(), tr("Habitudes", "Habits"), "flame".into(), daily.clone()),
        ("work:section:focus".into(), tr("Concentration", "Focus"), "timer".into(), daily.clone()),
        ("work:section:bills".into(), tr("Factures", "Bills"), "receipt".into(), daily),
    ]
}

pub fn view(app: &mut App) -> Page {
    let mut current = section(SECTION_KEY, "tasks");
    if current == "ambience" {
        current = "focus".into();
    }
    tick_focus(app);
    let main = match current.as_str() {
        "habits" => habits(app),
        "focus" => {
            let mut blocks = focus(app);
            blocks.extend(crate::pages::ambience::view(app));
            blocks
        }
        "bills" => bills(app),
        "scratchpad" => scratchpad(app),
        "capture" => capture(app),
        other => items(app, kind_of(other).unwrap_or("tasks")),
    };
    Page { side: side(), side_active: format!("work:section:{current}"), main, ..Default::default() }
}

fn empty_draft(app: &mut App) {
    let state = &mut app.state.work;
    state.title.clear();
    state.body.clear();
    state.start.clear();
    state.end.clear();
    state.due.clear();
    state.priority = "medium".into();
}

fn find_item(app: &App, kind: &str, id: &str) -> Option<Value> {
    app.res.get(&items_key(kind)).and_then(|res| res.data.clone()).and_then(|data| data.as_array().and_then(|list| list.iter().find(|item| item["id"] == id).cloned()))
}

fn input_for(app: &App, kind: &str, item: Option<&Value>) -> Value {
    let state = &app.state.work;
    let start = if kind == "events" { input_to_iso(&state.start) } else { String::new() };
    let end = if kind == "events" { input_to_iso(&state.end) } else { String::new() };
    let mut data = item.map(|item| item["data"].clone()).filter(Value::is_object).unwrap_or_else(|| json!({}));
    if kind == "tasks" {
        if state.due.is_empty() {
            data.as_object_mut().map(|map| map.remove("dueDate"));
        } else {
            data["dueDate"] = json!(state.due);
        }
        data["priority"] = json!(state.priority);
    }
    let keep = |field: &str| item.map_or(Value::Null, |item| item[field].clone());
    json!({
        "title": state.title,
        "body": state.body,
        "done": item.is_some_and(|item| item["done"] == true),
        "startAt": if kind == "events" { if start.is_empty() { Value::Null } else { json!(start) } } else { keep("startAt") },
        "endAt": if kind == "events" { if end.is_empty() { Value::Null } else { json!(end) } } else { keep("endAt") },
        "data": data,
    })
}

fn mutate_item(kind: &'static str, verb: &'static str, id: Option<String>, input: Value) -> Fut {
    Box::pin(async move {
        let now = time::iso(&Local::now());
        if kind == "tasks" {
            let row = item_to_task_row(&input, &now);
            return match (verb, id) {
                ("create", _) => rest("POST", "tasks", Some(row), Some("return=minimal")).await,
                ("update", Some(id)) => {
                    ethone_engine::sync::validate_id(&id)?;
                    let mut row = row;
                    row["updated_at"] = json!(now);
                    rest("PATCH", &format!("tasks?id=eq.{id}"), Some(row), Some("return=minimal")).await
                }
                ("delete", Some(id)) => {
                    ethone_engine::sync::validate_id(&id)?;
                    rest("DELETE", &format!("tasks?id=eq.{id}"), None, Some("return=minimal")).await
                }
                _ => Err("server".into()),
            };
        }
        let item_kind = ethone_engine::sync::ItemKind::try_from(kind)?;
        let path = item_kind.path();
        match (verb, id) {
            ("create", _) => {
                let parsed: ethone_engine::sync::ItemInput = serde_json::from_value(input).map_err(|_| "Donnée invalide".to_string())?;
                item_kind.validate(&parsed)?;
                svc().auth.worker_json(reqwest::Method::POST, path, Some(serde_json::to_value(parsed).map_err(|error| error.to_string())?)).await
            }
            ("update", Some(id)) => {
                ethone_engine::sync::validate_id(&id)?;
                let parsed: ethone_engine::sync::ItemInput = serde_json::from_value(input).map_err(|_| "Donnée invalide".to_string())?;
                item_kind.validate(&parsed)?;
                let mut body = serde_json::to_value(parsed).map_err(|error| error.to_string())?;
                body["id"] = json!(id);
                svc().auth.worker_json(reqwest::Method::PATCH, path, Some(body)).await
            }
            ("delete", Some(id)) => {
                ethone_engine::sync::validate_id(&id)?;
                svc().auth.worker_json(reqwest::Method::DELETE, path, Some(json!({ "id": id }))).await
            }
            _ => Err("server".into()),
        }
    })
}

fn done_after(kind: &'static str) -> impl FnOnce(&mut App, Result<Value, String>) + Send + 'static {
    move |app, result| {
        app.state.work.saving = false;
        match result {
            Ok(_) => {
                app.state.work.editor = None;
                reload(app, kind);
            }
            Err(error) => app.state.work.error = Some(crate::i18n::error_text(&error)),
        }
    }
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let current = section(SECTION_KEY, "tasks");
    let kind = kind_of(&current).unwrap_or("tasks");
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => {
            set_section(SECTION_KEY, arg);
            app.state.work.editor = None;
            crate::pages::shell::restart_enter(app);
            let weak = app.ui.clone();
            let _ = slint::invoke_from_event_loop(move || {
                if let Some(ui) = weak.upgrade() {
                    ui.set_main_scroll(0.0);
                    ui.set_entered(true);
                }
            });
        }
        "refresh" => reload(app, kind),
        "new" => {
            empty_draft(app);
            app.state.work.editor = Some("new".into());
        }
        "edit" => {
            if let Some(item) = find_item(app, kind, arg) {
                let state = &mut app.state.work;
                state.title = item["title"].as_str().unwrap_or_default().into();
                state.body = item["body"].as_str().unwrap_or_default().into();
                state.start = to_input(item["startAt"].as_str());
                state.end = to_input(item["endAt"].as_str());
                state.due = task_due(&item);
                state.priority = task_priority(&item).into();
                state.editor = Some(arg.to_string());
            }
        }
        "cancel" => app.state.work.editor = None,
        "field" => match arg {
            "title" => app.state.work.title = value.into(),
            "body" => app.state.work.body = value.into(),
            "start" => app.state.work.start = value.into(),
            "end" => app.state.work.end = value.into(),
            "due" => app.state.work.due = value.into(),
            "priority" => app.state.work.priority = value.into(),
            "title:submit" => save(app, kind),
            _ => {}
        },
        "save" => save(app, kind),
        "toggle" => {
            if let Some(mut item) = find_item(app, kind, arg) {
                item["done"] = json!(item["done"] != true);
                app.state.work.saving = true;
                spawn(mutate_item("tasks", "update", Some(arg.to_string()), item), done_after("tasks"));
            }
        }
        "delete" => {
            let Some(item) = find_item(app, kind, arg) else { return };
            let title = item["title"].as_str().unwrap_or_default().to_string();
            let target = arg.to_string();
            app.state.work.hidden.push(target.clone());
            let message = if fr() { format!("« {title} » supprimé") } else { format!("\"{title}\" deleted") };
            let restore = target.clone();
            app.undoable(&message, mutate_item(kind, "delete", Some(target.clone()), Value::Null), Box::new(move |app: &mut App| app.state.work.hidden.retain(|id| *id != restore)), move |app, result| {
                app.state.work.hidden.retain(|id| *id != target);
                if let Err(error) = result {
                    app.state.work.error = Some(crate::i18n::error_text(&error));
                }
                reload(app, kind);
            });
        }
        "filter" => prefs::write_json("ethone-task-filter", &arg.to_string()),
        "day" => app.state.work.day = if app.state.work.day.as_deref() == Some(arg) { None } else { Some(arg.to_string()) },
        "month" => {
            let now = Local::now();
            let (year, month) = app.state.work.month.unwrap_or((now.year(), now.month()));
            let next = match arg {
                "previous" => if month == 1 { (year - 1, 12) } else { (year, month - 1) },
                "next" => if month == 12 { (year + 1, 1) } else { (year, month + 1) },
                _ => {
                    app.state.work.day = None;
                    (now.year(), now.month())
                }
            };
            app.state.work.month = Some(next);
        }
        "habit-name" => app.state.work.habit_name = value.into(),
        "habit-target" => app.state.work.habit_target = value.parse().unwrap_or(7),
        "habit-add" | "habit-name:submit" => habit_add(app),
        "habit-day" => {
            if let Some((habit, day)) = arg.split_once('|') {
                habit_toggle(app, habit, day);
            }
        }
        "habit-archive" => {
            let work = rest("PATCH", &format!("ethone_habits?id=eq.{arg}"), Some(json!({ "archived": true })), Some("return=minimal"));
            habit_mutation(app, work);
        }
        "focus-toggle" => focus_toggle(app),
        "focus-reset" => {
            app.state.work.focus_end = None;
            app.state.work.focus_left = None;
        }
        "focus-minutes" => {
            prefs::write_json("ethone-focus-minutes", &arg.parse::<i64>().unwrap_or(25));
            app.state.work.focus_end = None;
            app.state.work.focus_left = None;
        }
        "bill-label" => app.state.work.bill_label = value.into(),
        "bill-amount" => app.state.work.bill_amount = value.into(),
        "bill-due" => app.state.work.bill_due = value.into(),
        "bill-add" => bill_add(app),
        "bill-paid" => {
            let bills = app.res.get("productivity:bills").and_then(|res| res.data.clone());
            if let Some(bill) = bills.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|bill| bill["id"] == arg)) {
                let mut data = bill["data"].clone();
                data["paid"] = json!(data["paid"] != true);
                let work = api_m("PATCH", "api/user-data/bills", Some(json!({ "id": arg, "data": data })));
                bill_mutation(app, work);
            }
        }
        "bill-delete" => {
            let work = api_m("DELETE", "api/user-data/bills", Some(json!({ "id": arg })));
            bill_mutation(app, work);
        }
        "capture-title" => app.state.work.capture_title = value.into(),
        "capture-body" => app.state.work.capture_body = value.into(),
        "capture-save" => capture_save(app, arg),
        "scratch" => {
            app.state.work.scratch = Some(value.to_string());
            prefs::write_json("ethone-scratchpad", &value.to_string());
        }
        _ => {}
    }
}

fn save(app: &mut App, kind: &'static str) {
    let Some(editor) = app.state.work.editor.clone() else { return };
    if app.state.work.title.trim().is_empty() {
        return;
    }
    let item = if editor == "new" { None } else { find_item(app, kind, &editor) };
    let input = input_for(app, kind, item.as_ref());
    app.state.work.saving = true;
    app.state.work.error = None;
    let (verb, id) = if editor == "new" { ("create", None) } else { ("update", Some(editor)) };
    spawn(mutate_item(kind, verb, id, input), done_after(kind));
}

fn editor_blocks(app: &mut App, kind: &str) -> Vec<B> {
    let state = &app.state.work;
    let (title, body, start, end, due, priority, saving) = (state.title.clone(), state.body.clone(), state.start.clone(), state.end.clone(), state.due.clone(), state.priority.clone(), state.saving);
    let mut out = vec![h2(&if state.editor.as_deref() == Some("new") { match kind { "notes" => t("newNote"), "tasks" => t("newTask"), _ => t("newEvent") } } else { t("edit") })];
    out.push(field(&tr("Titre", "Title"), vec![input("work:field:title", &title, "").focus().tip(&tr("Titre", "Title"))]));
    out.push(field(&tr("Détails", "Details"), vec![area("work:field:body", &body, "", 110.0)]));
    if kind == "events" {
        out.push(field(&tr("Début et fin (AAAA-MM-JJ HH:MM)", "Start and end (YYYY-MM-DD HH:MM)"), vec![input("work:field:start", &start, "2026-11-05T09:00"), input("work:field:end", &end, "2026-11-05T10:00")]));
        if !start.is_empty() && input_to_iso(&start).is_empty() {
            out.push(bad(&tr("La date de début n'est pas lisible.", "The start date cannot be read.")));
        }
    }
    if kind == "tasks" {
        let options = vec![("high".to_string(), tr("Haute", "High")), ("medium".to_string(), tr("Normale", "Normal")), ("low".to_string(), tr("Basse", "Low"))];
        let pick = app.select("work:field:priority", &priority, &options);
        out.push(field(&tr("Échéance (AAAA-MM-JJ) et priorité", "Due (YYYY-MM-DD) and priority"), vec![input("work:field:due", &due, "2026-11-30"), pick]));
    }
    out.push(row(vec![primary("work:save", &if saving { tr("Enregistrement…", "Saving…") } else { tr("Enregistrer", "Save") }).off(saving || title.trim().is_empty()), btn("work:cancel", &t("cancel"))]));
    out.push(divider());
    out
}

fn items(app: &mut App, kind: &'static str) -> Vec<B> {
    let res = app.load(&items_key(kind), || load_items(kind));
    let refresh = app.icon("refresh-cw");
    let plus = app.icon("plus");
    let saving = app.state.work.saving;
    let title = match kind { "notes" => t("notes"), "tasks" => t("tasks"), _ => t("calendar") };
    let new_label = match kind { "notes" => t("newNote"), "tasks" => t("newTask"), _ => t("newEvent") };
    let mut out = vec![head(&title, &t("productivityLine"), vec![btn("work:refresh", &t("refresh")).icon(refresh).off(res.loading || saving).tip("F5"), primary("work:new", &new_label).icon(plus).off(saving)])];
    let error = app.state.work.error.clone().or(res.error.clone());
    if let Some(error) = &error {
        out.push(error_retry(error));
    }
    if app.state.work.editor.is_some() {
        out.extend(editor_blocks(app, kind));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 56.0));
        }
        return out;
    };
    let hidden = app.state.work.hidden.clone();
    let mut list: Vec<Value> = data.as_array().cloned().unwrap_or_default().into_iter().filter(|item| !hidden.iter().any(|id| item["id"] == id.as_str())).collect();
    if kind == "events" {
        logic::events_by_start(&mut list);
    } else {
        logic::newest_items_first(&mut list);
    }
    let today = time::day_key(&Local::now());
    if kind == "tasks" {
        let filter = prefs::text("ethone-task-filter", "open");
        let count = |name: &str| visible_tasks(&list, name, &today).len();
        let labels = [("open", format!("{} {}", tr("À faire", "To do"), count("open"))), ("late", format!("{} {}", tr("En retard", "Late"), count("late"))), ("done", format!("{} {}", tr("Terminées", "Done"), count("done"))), ("all", format!("{} {}", tr("Toutes", "All"), list.len()))];
        let items: Vec<(&str, &str)> = labels.iter().map(|(id, label)| (*id, label.as_str())).collect();
        out.push(seg(&items, &filter, "work:filter:"));
        list = visible_tasks(&list, &filter, &today);
    }
    if kind == "events" {
        out.extend(month_grid(app, &list));
        if let Some(day) = app.state.work.day.clone() {
            list.retain(|item| item["startAt"].as_str().and_then(time::parse).is_some_and(|date| time::day_key(&date) == day));
        }
    }
    if list.is_empty() {
        let text = match kind { "notes" => t("noNotes"), "tasks" if !data.as_array().is_none_or(Vec::is_empty) => tr("Aucune tâche dans ce filtre.", "No tasks in this filter."), "tasks" => t("noTasks"), _ => t("noEvents") };
        out.push(empty(&text, ""));
        return out;
    }
    let (done_icon, open_icon, event_icon, note_icon, pencil, trash, undo) = (app.icon("circle-check"), app.icon("circle"), app.icon("calendar-days"), app.icon("notebook-pen"), app.icon("pencil"), app.icon("trash-2"), app.icon("rotate-ccw"));
    let fr = fr();
    let rows = list.iter().map(|item| {
        let id = item["id"].as_str().unwrap_or_default();
        let done = item["done"] == true;
        let lead = match kind { "tasks" => icon(if done { done_icon.clone() } else { open_icon.clone() }).tone(if done { "ok" } else { "" }), "events" => icon(event_icon.clone()), _ => icon(note_icon.clone()) };
        let mut sub = item_preview(item["body"].as_str().unwrap_or_default());
        if kind == "tasks" {
            let due = task_due(item);
            let mut meta = Vec::new();
            if !due.is_empty() {
                let date = chrono::NaiveDate::parse_from_str(&due, "%Y-%m-%d").ok().map(at_noon);
                let label = date.map_or(due.clone(), |date| format!("{} {}", date.day(), time::month_name(date.month0() as usize, fr)));
                meta.push(if task_late(item, &today) { format!("{}{label}", tr("En retard : ", "Late: ")) } else { format!("{}{label}", tr("Pour le ", "Due ")) });
            }
            match task_priority(item) {
                "high" => meta.push(tr("Priorité haute", "High priority")),
                "low" => meta.push(tr("Priorité basse", "Low priority")),
                _ => {}
            }
            if !meta.is_empty() {
                sub = if sub.is_empty() { meta.join(" · ") } else { format!("{sub} · {}", meta.join(" · ")) };
            }
        }
        let stamp = if kind == "events" { item["startAt"].as_str() } else { item["updatedAt"].as_str() }.and_then(time::parse).map(|date| time::date_time(&date, fr)).unwrap_or_default();
        let mut cells = vec![lead, stack(item["title"].as_str().unwrap_or_default(), &sub)];
        if !stamp.is_empty() {
            cells.push(muted(&stamp));
        }
        if kind == "tasks" {
            cells.push(btn(&format!("work:toggle:{id}"), &if done { t("reopen") } else { t("markDone") }).icon(if done { undo.clone() } else { done_icon.clone() }).off(saving));
        }
        cells.push(ibtn(&format!("work:edit:{id}"), pencil.clone(), &t("edit")).off(saving));
        cells.push(ibtn(&format!("work:delete:{id}"), trash.clone(), &t("delete")).off(saving));
        row(cells)
    }).collect();
    out.extend(group(rows));
    out
}

fn month_grid(app: &mut App, items: &[Value]) -> Vec<B> {
    let now = Local::now();
    let (year, month) = app.state.work.month.unwrap_or((now.year(), now.month()));
    let fr = fr();
    let cells = month_cells(year, month);
    let today = time::day_key(&now);
    let selected = app.state.work.day.clone();
    let (left, right) = (app.icon("chevron-left"), app.icon("chevron-right"));
    let mut out = vec![h2x(&format!("{} {year}", time::month_name(month as usize - 1, fr)), "", vec![ibtn("work:month:previous", left, &tr("Mois précédent", "Previous month")), btn("work:month:today", &tr("Aujourd'hui", "Today")), ibtn("work:month:next", right, &tr("Mois suivant", "Next month"))])];
    let names = if fr { ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."] } else { ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
    out.push(row(names.iter().map(|name| muted(name).center().grow()).collect()));
    for week in cells.chunks(7) {
        let days = week.iter().map(|cell| {
            let events: Vec<&str> = items.iter().filter(|item| item["startAt"].as_str().and_then(time::parse).is_some_and(|date| time::day_key(&date) == cell.key)).filter_map(|item| item["title"].as_str()).collect();
            let mut lines = events.iter().take(2).copied().collect::<Vec<_>>().join("\n");
            if events.len() > 2 {
                lines.push_str(&format!("\n+{}", events.len() - 2));
            }
            C { kind: "day", id: format!("work:day:{}", cell.key), title: cell.date.day().to_string(), sub: lines, on: selected.as_deref() == Some(cell.key.as_str()), tone: if cell.key == today { "accent" } else if !cell.in_month { "faint" } else { "" }, weight: 1.0, ..Default::default() }
        }).collect();
        out.push(row(days).gap(4.0));
    }
    out
}

fn habits_data(app: &mut App) -> (Option<std::rc::Rc<Value>>, Option<std::rc::Rc<Value>>, Option<String>, bool) {
    let list = app.load("productivity:habits", || rest_get(HABITS_PATH));
    let done = app.load("productivity:done", || rest_get(COMPLETIONS_PATH));
    (list.data, done.data, list.error.or(done.error), list.loading)
}

fn habit_mutation(app: &mut App, work: Fut) {
    app.state.work.error = None;
    spawn(work, |app, result| {
        if let Err(error) = result {
            app.state.work.error = Some(crate::i18n::error_text(&error));
        }
        app.reload("productivity:habits", || rest_get(HABITS_PATH));
        app.reload("productivity:done", || rest_get(COMPLETIONS_PATH));
        app.forget("home:habits");
        app.forget("home:done");
    });
}

fn habit_add(app: &mut App) {
    let name = app.state.work.habit_name.trim().to_string();
    if name.is_empty() {
        return;
    }
    let target = if app.state.work.habit_target == 0 { 7 } else { app.state.work.habit_target };
    app.state.work.habit_name.clear();
    let work = rest("POST", "ethone_habits", Some(json!({ "name": name.chars().take(80).collect::<String>(), "target_per_week": target })), Some("return=minimal"));
    habit_mutation(app, work);
}

fn habit_toggle(app: &mut App, habit: &str, day: &str) {
    let done = app.res.get("productivity:done").and_then(|res| res.data.clone());
    let found = done.as_deref().and_then(Value::as_array).and_then(|list| list.iter().find(|item| item["habit_id"] == habit && item["completed_on"] == day)).and_then(|item| item["id"].as_str().map(str::to_string));
    let work = match found {
        Some(id) => rest("DELETE", &format!("ethone_habit_completions?id=eq.{id}"), None, Some("return=minimal")),
        None => rest("POST", "ethone_habit_completions", Some(json!({ "habit_id": habit, "completed_on": day })), Some("return=minimal")),
    };
    habit_mutation(app, work);
}

fn habits(app: &mut App) -> Vec<B> {
    let (list, done, error, loading) = habits_data(app);
    let target = if app.state.work.habit_target == 0 { 7 } else { app.state.work.habit_target };
    let name = app.state.work.habit_name.clone();
    let options: Vec<(String, String)> = (1..=7).map(|value| (value.to_string(), format!("{value}/{}", tr("sem.", "wk")))).collect();
    let pick = app.select("work:habit-target", &target.to_string(), &options);
    let mut out = vec![head(&tr("Habitudes", "Habits"), &tr("Synchronisées avec ton compte Ethone.", "Synced with your Ethone account."), vec![])];
    out.push(row(vec![input("work:habit-name", &name, &tr("Nouvelle habitude", "New habit")), muted(&tr("Objectif", "Goal")), pick, primary("work:habit-add", &tr("Ajouter", "Add")).off(name.trim().is_empty())]));
    if let Some(error) = app.state.work.error.clone().or(error) {
        out.push(error_retry(&error));
    }
    let Some(list) = list else {
        if loading {
            out.extend(skeletons(3, 56.0));
        }
        return out;
    };
    let habits = list.as_array().cloned().unwrap_or_default();
    if habits.is_empty() {
        out.push(empty(&tr("Aucune habitude", "No habits"), &tr("Ajoute ta première habitude ci-dessus.", "Add your first habit above.")));
        return out;
    }
    let done = done.unwrap_or_else(|| std::rc::Rc::new(json!([])));
    let now = Local::now();
    let week = last_days(7, now);
    let today = time::day_key(&now);
    let (check, trash, flame) = (app.icon("check"), app.icon("trash-2"), app.icon("flame"));
    let letters = if fr() { ["L", "M", "M", "J", "V", "S", "D"] } else { ["M", "T", "W", "T", "F", "S", "S"] };
    let rows = habits.iter().map(|habit| {
        let id = habit["id"].as_str().unwrap_or_default();
        let days: std::collections::HashSet<String> = done.as_array().into_iter().flatten().filter(|item| item["habit_id"] == id).filter_map(|item| item["completed_on"].as_str().map(str::to_string)).collect();
        let streak = habit_streak(&days, now);
        let count = week.iter().filter(|date| days.contains(&logic::day_key_of(**date))).count();
        let emoji = habit["emoji"].as_str().map_or(String::new(), |emoji| format!("{emoji} "));
        let mut sub = format!("{count}/{} {}", habit["target_per_week"].as_i64().unwrap_or(7), tr("cette semaine", "this week"));
        if streak > 0 {
            sub.push_str(&format!(" · {streak} 🔥"));
        }
        let _ = &flame;
        let mut cells = vec![stack(&format!("{emoji}{}", habit["name"].as_str().unwrap_or_default()), &sub)];
        for date in &week {
            let key = logic::day_key_of(*date);
            let on = days.contains(&key);
            let mut day = chip(&format!("work:habit-day:{id}|{key}"), if on { "" } else { letters[date.weekday().num_days_from_monday() as usize] }).on(on);
            if on {
                day.icon = check.clone();
            }
            if key == today && !on {
                day.color = Some(hex("#5aa9ff"));
            }
            cells.push(day);
        }
        cells.push(ibtn(&format!("work:habit-archive:{id}"), trash.clone(), &tr("Archiver", "Archive")));
        row(cells)
    }).collect();
    out.extend(group(rows));
    out
}

fn focus_minutes() -> i64 {
    prefs::read_json::<i64>("ethone-focus-minutes").unwrap_or(25)
}

fn tick_focus(app: &mut App) {
    let Some(end) = app.state.work.focus_end else { return };
    let left = ((end - time::now_ms()) / 1000.0).round().max(0.0) as i64;
    app.state.work.focus_left = Some(left);
    if left == 0 {
        app.state.work.focus_end = None;
        let mut history: Vec<Value> = prefs::read_json(FOCUS_KEY).unwrap_or_default();
        history.insert(0, json!({ "completedAt": time::iso(&Local::now()), "seconds": focus_minutes() * 60 }));
        history.truncate(500);
        prefs::write_json(FOCUS_KEY, &history);
        let _ = crate::background::notify("Ethone", &tr("Séance de concentration terminée.", "Focus session finished."));
    }
}

fn focus_toggle(app: &mut App) {
    let state = &mut app.state.work;
    if state.focus_end.is_some() {
        state.focus_left = Some(((state.focus_end.unwrap_or(0.0) - time::now_ms()) / 1000.0).round().max(0.0) as i64);
        state.focus_end = None;
    } else {
        let left = state.focus_left.filter(|left| *left > 0).unwrap_or(focus_minutes() * 60);
        state.focus_end = Some(time::now_ms() + left as f64 * 1000.0);
    }
}

pub fn ring_path(progress: f32) -> String {
    let progress = progress.clamp(0.0, 0.9999) as f64;
    if progress <= 0.0 {
        return String::new();
    }
    let angle = progress * std::f64::consts::TAU;
    let (x, y) = (50.0 + 45.0 * angle.sin(), 50.0 - 45.0 * angle.cos());
    format!("M 50 5 A 45 45 0 {} 1 {x:.3} {y:.3}", if progress > 0.5 { 1 } else { 0 })
}

fn focus(app: &mut App) -> Vec<B> {
    let minutes = focus_minutes();
    let running = app.state.work.focus_end.is_some();
    let left = app.state.work.focus_left.unwrap_or(minutes * 60);
    let progress = 1.0 - left as f32 / (minutes * 60).max(1) as f32;
    let history: Vec<Value> = prefs::read_json(FOCUS_KEY).unwrap_or_default();
    let today = time::day_key(&Local::now());
    let today_entries: Vec<&Value> = history.iter().filter(|entry| entry["completedAt"].as_str().and_then(time::parse).is_some_and(|date| time::day_key(&date) == today)).collect();
    let seconds: f64 = today_entries.iter().map(|entry| entry["seconds"].as_f64().unwrap_or(0.0)).sum();
    let (play, pause, reset) = (app.icon("play"), app.icon("pause"), app.icon("rotate-ccw"));
    let mut out = vec![head(&tr("Concentration", "Focus"), &tr("Les séances terminées sont gardées sur ce PC.", "Finished sessions are kept on this PC."), vec![])];
    out.push(B { kind: "ring", title: format!("{:02}:{:02}", left / 60, left % 60), path: ring_path(progress), height: 240.0, progress, ..Default::default() });
    let mut controls = vec![primary("work:focus-toggle", &if running { tr("Pause", "Pause") } else { tr("Démarrer", "Start") }).icon(if running { pause } else { play }).off(left == 0 && !running), btn("work:focus-reset", &tr("Recommencer", "Reset")).icon(reset), gap()];
    for preset in [15, 25, 45, 60] {
        controls.push(chip(&format!("work:focus-minutes:{preset}"), &format!("{preset} min")).on(minutes == preset));
    }
    out.push(row(controls).center());
    out.push(row(vec![stat(&tr("Séances aujourd'hui", "Sessions today"), &today_entries.len().to_string(), ""), stat(&tr("Temps aujourd'hui", "Time today"), &format!("{} min", (seconds / 60.0).round()), ""), stat(&tr("Total", "Total"), &history.len().to_string(), &tr("séances", "sessions"))]));
    out
}

fn bill_mutation(app: &mut App, work: Fut) {
    app.state.work.error = None;
    app.state.work.saving = true;
    spawn(work, |app, result| {
        app.state.work.saving = false;
        if let Err(error) = result {
            app.state.work.error = Some(crate::i18n::error_text(&error));
        }
        app.reload("productivity:bills", || api_data("api/user-data/bills"));
    });
}

pub fn parse_amount(text: &str) -> Option<f64> {
    text.trim().replace(',', ".").parse::<f64>().ok().filter(|value| value.is_finite())
}

pub fn money(value: f64, fr: bool) -> String {
    let cents = (value * 100.0).round() as i64;
    let (whole, part) = (cents.abs() / 100, cents.abs() % 100);
    let digits = whole.to_string();
    let mut grouped = String::new();
    for (at, character) in digits.chars().enumerate() {
        if at > 0 && (digits.len() - at) % 3 == 0 {
            grouped.push(if fr { '\u{202f}' } else { ',' });
        }
        grouped.push(character);
    }
    let sign = if cents < 0 { "-" } else { "" };
    if fr { format!("{sign}{grouped},{part:02} €") } else { format!("{sign}€{grouped}.{part:02}") }
}

fn bill_add(app: &mut App) {
    let state = &app.state.work;
    let (label, due) = (state.bill_label.trim().to_string(), state.bill_due.trim().to_string());
    let Some(amount) = parse_amount(&state.bill_amount) else { return };
    if label.is_empty() {
        return;
    }
    let stamp = time::now_ms() as i64;
    let work = api_m("POST", "api/user-data/bills", Some(json!({ "slug": format!("bill-{stamp}"), "label": label, "data": { "amount": amount, "currency": "EUR", "dueDate": due, "paid": false, "category": "other", "recurrence": "none" } })));
    app.state.work.bill_label.clear();
    app.state.work.bill_amount.clear();
    app.state.work.bill_due.clear();
    bill_mutation(app, work);
}

fn bills(app: &mut App) -> Vec<B> {
    let res = app.load("productivity:bills", || api_data("api/user-data/bills"));
    let fr = fr();
    let state = &app.state.work;
    let (label, amount, due, busy) = (state.bill_label.clone(), state.bill_amount.clone(), state.bill_due.clone(), state.saving);
    let mut list: Vec<Value> = res.data.as_deref().and_then(Value::as_array).cloned().unwrap_or_default();
    list.sort_by(|left, right| (left["data"]["paid"] == true).cmp(&(right["data"]["paid"] == true)).then_with(|| left["data"]["dueDate"].as_str().unwrap_or("").cmp(right["data"]["dueDate"].as_str().unwrap_or(""))));
    let left: f64 = list.iter().filter(|bill| bill["data"]["paid"] != true).map(|bill| bill["data"]["amount"].as_f64().unwrap_or(0.0)).sum();
    let mut out = vec![head(&tr("Factures", "Bills"), &tr("Synchronisées avec ton compte Ethone.", "Synced with your Ethone account."), vec![])];
    out.push(row(vec![stat(&tr("Reste à payer", "Left to pay"), &money(left, fr), ""), stat(&tr("Factures", "Bills"), &list.len().to_string(), "")]));
    out.push(row(vec![input("work:bill-label", &label, &tr("Nom de la facture", "Bill name")), input("work:bill-amount", &amount, &tr("Montant", "Amount")), input("work:bill-due", &due, &tr("Échéance AAAA-MM-JJ", "Due YYYY-MM-DD")), primary("work:bill-add", &tr("Ajouter", "Add")).off(busy || label.trim().is_empty() || parse_amount(&amount).is_none())]));
    if let Some(error) = app.state.work.error.clone().or(res.error.clone()) {
        out.push(error_retry(&error));
    }
    if res.data.is_none() {
        if res.loading {
            out.extend(skeletons(3, 52.0));
        }
        return out;
    }
    if list.is_empty() {
        out.push(empty(&tr("Aucune facture", "No bills"), ""));
        return out;
    }
    let (check, circle, trash) = (app.icon("circle-check"), app.icon("circle"), app.icon("trash-2"));
    let rows = list.iter().map(|bill| {
        let id = bill["id"].as_str().unwrap_or_default();
        let paid = bill["data"]["paid"] == true;
        let due = bill["data"]["dueDate"].as_str().and_then(time::parse).map(|date| time::short_date(&date, fr)).unwrap_or_default();
        row(vec![ibtn(&format!("work:bill-paid:{id}"), if paid { check.clone() } else { circle.clone() }, &tr("Marquer comme payée", "Mark as paid")).on(paid).off(busy), stack(bill["label"].as_str().unwrap_or_default(), &due), strong(&money(bill["data"]["amount"].as_f64().unwrap_or(0.0), fr)), ibtn(&format!("work:bill-delete:{id}"), trash.clone(), &t("delete")).off(busy)])
    }).collect();
    out.extend(group(rows));
    out
}

fn capture_save(app: &mut App, kind: &str) {
    let (title, body) = (app.state.work.capture_title.trim().to_string(), app.state.work.capture_body.trim().to_string());
    if title.is_empty() && body.is_empty() {
        return;
    }
    let title = if title.is_empty() { body.chars().take(80).collect() } else { title };
    let input = json!({ "title": title, "body": body, "done": false, "startAt": null, "endAt": null, "data": { "source": "desktop-capture" } });
    let target: &'static str = if kind == "tasks" { "tasks" } else { "notes" };
    app.state.work.saving = true;
    app.state.work.capture_message = None;
    spawn(mutate_item(target, "create", None, input), move |app, result| {
        app.state.work.saving = false;
        match result {
            Ok(_) => {
                app.state.work.capture_title.clear();
                app.state.work.capture_body.clear();
                app.state.work.capture_message = Some((if target == "notes" { tr("Note enregistrée.", "Note saved.") } else { tr("Tâche ajoutée.", "Task added.") }, true));
                app.forget(&items_key(target));
                app.forget("home:tasks");
            }
            Err(error) => app.state.work.capture_message = Some((crate::i18n::error_text(&error), false)),
        }
    });
}

fn capture(app: &mut App) -> Vec<B> {
    let state = &app.state.work;
    let (title, body, busy, message) = (state.capture_title.clone(), state.capture_body.clone(), state.saving, state.capture_message.clone());
    let empty_text = title.trim().is_empty() && body.trim().is_empty();
    let (note_icon, task_icon) = (app.icon("notebook-pen"), app.icon("list-checks"));
    let mut out = vec![
        head(&tr("Capture rapide", "Quick capture"), &tr("Colle un lien, un texte ou une idée, puis garde-le en note ou en tâche.", "Paste a link, text or idea, then keep it as a note or task."), vec![]),
        field(&tr("Titre", "Title"), vec![input("work:capture-title", &title, "")]),
        field(&tr("Contenu", "Content"), vec![area("work:capture-body", &body, "", 180.0)]),
        row(vec![primary("work:capture-save:notes", &tr("Garder en note", "Save as note")).icon(note_icon).off(busy || empty_text), btn("work:capture-save:tasks", &tr("Garder en tâche", "Save as task")).icon(task_icon).off(busy || empty_text)]),
    ];
    if let Some((text, ok)) = message {
        out.push(B { tone: if ok { "ok" } else { "bad" }, ..prose(&text) });
    }
    out
}

fn scratchpad(app: &mut App) -> Vec<B> {
    if app.state.work.scratch.is_none() {
        app.state.work.scratch = Some(prefs::read_json::<String>("ethone-scratchpad").unwrap_or_default());
    }
    let text = app.state.work.scratch.clone().unwrap_or_default();
    vec![head(&tr("Mémo", "Scratchpad"), &tr("Gardé sur ce PC, enregistré pendant que tu écris.", "Kept on this PC, saved as you type."), vec![]), field(&tr("Texte", "Text"), vec![area("work:scratch", &text, "", 460.0)])]
}

fn error_retry(message: &str) -> B {
    error(message, vec![btn("work:refresh", &t("retry"))])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn amounts_accept_a_comma() {
        assert_eq!(parse_amount("12,5"), Some(12.5));
        assert_eq!(parse_amount("abc"), None);
    }

    #[test]
    fn money_is_written_like_the_locale() {
        assert_eq!(money(1234.5, true), "1\u{202f}234,50 €");
        assert_eq!(money(1234.5, false), "€1,234.50");
        assert_eq!(money(0.0, true), "0,00 €");
    }

    #[test]
    fn the_ring_path_grows_with_progress() {
        assert!(ring_path(0.0).is_empty());
        assert!(ring_path(0.25).contains("A 45 45 0 0 1"));
        assert!(ring_path(0.75).contains("A 45 45 0 1 1"));
    }
}
