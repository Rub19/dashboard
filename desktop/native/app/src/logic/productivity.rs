use chrono::{DateTime, Datelike, Duration, Local, NaiveDate, TimeZone};
use serde_json::{json, Value};

pub fn day_key_of(date: NaiveDate) -> String {
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

pub struct MonthCell {
    pub key: String,
    pub date: NaiveDate,
    pub in_month: bool,
}

pub fn month_cells(year: i32, month: u32) -> Vec<MonthCell> {
    let first = NaiveDate::from_ymd_opt(year, month, 1).unwrap_or_default();
    let offset = first.weekday().num_days_from_monday() as i64;
    let start = first - Duration::days(offset);
    let next = if month == 12 { NaiveDate::from_ymd_opt(year + 1, 1, 1) } else { NaiveDate::from_ymd_opt(year, month + 1, 1) }.unwrap_or(first);
    let days = (next - first).num_days();
    let count = ((offset + days) as f64 / 7.0).ceil() as i64 * 7;
    (0..count).map(|index| {
        let date = start + Duration::days(index);
        MonthCell { key: day_key_of(date), date, in_month: date.month() == month }
    }).collect()
}

pub fn task_row_to_item(row: &Value) -> Value {
    let mut data = json!({ "priority": row["priority"].as_str().unwrap_or("medium") });
    if let Some(due) = row["due_date"].as_str() {
        data["dueDate"] = json!(due);
    }
    json!({
        "id": row["id"], "title": row["title"], "body": row["description"].as_str().unwrap_or(""), "done": row["is_completed"], "startAt": null, "endAt": null, "data": data, "createdAt": row["created_at"], "updatedAt": row["updated_at"]
    })
}

pub fn task_due(task: &Value) -> String {
    task["data"]["dueDate"].as_str().map_or(String::new(), |due| due.chars().take(10).collect())
}

pub fn task_repeat(task: &Value) -> &'static str {
    match task["data"]["repeat"].as_str() {
        Some("daily") => "daily",
        Some("weekly") => "weekly",
        _ => "",
    }
}

pub fn next_due(due: &str, today: &str, repeat: &str) -> Option<String> {
    let step = match repeat {
        "daily" => 1,
        "weekly" => 7,
        _ => return None,
    };
    let parse = |text: &str| chrono::NaiveDate::parse_from_str(text, "%Y-%m-%d").ok();
    let today = parse(today)?;
    let mut next = parse(due).unwrap_or(today) + chrono::Duration::days(step);
    while next <= today {
        next += chrono::Duration::days(step);
    }
    Some(next.format("%Y-%m-%d").to_string())
}

pub fn task_priority(task: &Value) -> &'static str {
    match task["data"]["priority"].as_str() {
        Some("high" | "urgent") => "high",
        Some("low") => "low",
        _ => "medium",
    }
}

pub fn task_reminder(tasks: &[Value], today: &str, fr: bool) -> Option<String> {
    let open: Vec<&Value> = tasks.iter().filter(|task| task["done"] != true).collect();
    let due_today: Vec<&str> = open.iter().filter(|task| task_due(task) == today).filter_map(|task| task["title"].as_str()).collect();
    let late = open.iter().filter(|task| task_late(task, today)).count();
    if due_today.is_empty() && late == 0 {
        return None;
    }
    let mut parts = Vec::new();
    match due_today.len() {
        0 => {}
        1 => parts.push(if fr { format!("Aujourd'hui : {}", due_today[0]) } else { format!("Today: {}", due_today[0]) }),
        n => parts.push(if fr { format!("{n} tâches pour aujourd'hui") } else { format!("{n} tasks due today") }),
    }
    match late {
        0 => {}
        1 => parts.push(if fr { "1 en retard".into() } else { "1 late".into() }),
        n => parts.push(if fr { format!("{n} en retard") } else { format!("{n} late") }),
    }
    Some(parts.join(", "))
}

pub fn task_late(task: &Value, today: &str) -> bool {
    let due = task_due(task);
    task["done"] != true && !due.is_empty() && due.as_str() < today
}

pub fn item_to_task_row(item: &Value, now_iso: &str) -> Value {
    let done = item["done"] == true;
    let body = item["body"].as_str().unwrap_or("");
    let due = task_due(item);
    json!({
        "title": item["title"], "description": if body.is_empty() { Value::Null } else { json!(body) }, "is_completed": done, "completed_at": if done { json!(now_iso) } else { Value::Null }, "priority": task_priority(item), "due_date": if due.is_empty() { Value::Null } else { json!(due) }
    })
}

pub fn visible_tasks(tasks: &[Value], filter: &str, today: &str) -> Vec<Value> {
    let mut kept: Vec<Value> = tasks.iter().filter(|task| match filter {
        "all" => true,
        "done" => task["done"] == true,
        "late" => task_late(task, today),
        _ => task["done"] != true,
    }).cloned().collect();
    let rank = |task: &Value| match task_priority(task) { "high" => 0, "medium" => 1, _ => 2 };
    let due = |task: &Value| { let value = task_due(task); if value.is_empty() { "9999".to_string() } else { value } };
    kept.sort_by(|left, right| (left["done"] == true).cmp(&(right["done"] == true)).then_with(|| due(left).cmp(&due(right))).then_with(|| rank(left).cmp(&rank(right))));
    kept
}

pub fn item_preview(body: &str) -> String {
    let mut text = String::new();
    let lower = body.to_lowercase();
    let mut at = 0;
    while at < body.len() {
        let rest = &lower[at..];
        if rest.starts_with("<script") || rest.starts_with("<style") {
            let tag = if rest.starts_with("<script") { "</script>" } else { "</style>" };
            match rest.find(tag) {
                Some(end) => {
                    at += end + tag.len();
                    text.push(' ');
                    continue;
                }
                None => break,
            }
        }
        if rest.starts_with('<') {
            match rest.find('>') {
                Some(end) => {
                    at += end + 1;
                    text.push(' ');
                    continue;
                }
                None => break,
            }
        }
        let character = body[at..].chars().next().unwrap_or(' ');
        text.push(character);
        at += character.len_utf8();
    }
    let text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'");
    text.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(160).collect()
}

fn parse_ms(value: &Value) -> Option<f64> {
    value.as_str().and_then(crate::logic::time::parse_ms)
}

pub fn newest_items_first(items: &mut [Value]) {
    items.sort_by(|left, right| parse_ms(&right["updatedAt"]).unwrap_or(0.0).total_cmp(&parse_ms(&left["updatedAt"]).unwrap_or(0.0)));
}

pub fn events_by_start(items: &mut [Value]) {
    items.sort_by(|left, right| parse_ms(&left["startAt"]).unwrap_or(f64::INFINITY).total_cmp(&parse_ms(&right["startAt"]).unwrap_or(f64::INFINITY)));
}

pub fn to_input(value: Option<&str>) -> String {
    value.and_then(crate::logic::time::parse).map_or(String::new(), |date| date.format("%Y-%m-%dT%H:%M").to_string())
}

pub fn input_to_iso(value: &str) -> String {
    crate::logic::time::parse(value.trim()).map_or(String::new(), |date| crate::logic::time::iso(&date))
}

pub struct ActivityDay {
    pub key: String,
    pub count: usize,
    pub future: bool,
}

pub fn activity_weeks(dates: &[String], today: DateTime<Local>, weeks: i64) -> Vec<Vec<ActivityDay>> {
    let mut counts = std::collections::HashMap::<String, usize>::new();
    for date in dates {
        if let Some(parsed) = crate::logic::time::parse(date) {
            *counts.entry(crate::logic::time::day_key(&parsed)).or_default() += 1;
        }
    }
    let day = today.date_naive();
    let start = day - Duration::days(day.weekday().num_days_from_monday() as i64 + (weeks - 1) * 7);
    (0..weeks).map(|week| (0..7).map(|offset| {
        let date = start + Duration::days(week * 7 + offset);
        let key = day_key_of(date);
        ActivityDay { count: counts.get(&key).copied().unwrap_or(0), future: date > day, key }
    }).collect()).collect()
}

pub fn habit_streak(days: &std::collections::HashSet<String>, today: DateTime<Local>) -> usize {
    let mut cursor = today.date_naive();
    if !days.contains(&day_key_of(cursor)) {
        cursor -= Duration::days(1);
    }
    let mut streak = 0;
    while days.contains(&day_key_of(cursor)) {
        streak += 1;
        cursor -= Duration::days(1);
    }
    streak
}

pub fn focus_by_day(history: &[Value], days: &[String]) -> Vec<f64> {
    days.iter()
        .map(|day| {
            history
                .iter()
                .filter(|entry| entry["completedAt"].as_str().and_then(crate::logic::time::parse).is_some_and(|date| crate::logic::time::day_key(&date) == *day))
                .map(|entry| entry["seconds"].as_f64().unwrap_or(0.0) / 60.0)
                .sum()
        })
        .collect()
}

pub fn apply_order(list: &mut [Value], order: &[String]) {
    list.sort_by_key(|item| order.iter().position(|id| item["id"] == id.as_str()).unwrap_or(usize::MAX));
}

pub fn move_in_order(visible: &[String], order: &[String], id: &str, up: bool) -> Vec<String> {
    let mut next: Vec<String> = visible.to_vec();
    if let Some(at) = next.iter().position(|item| item == id) {
        let target = if up { at.checked_sub(1) } else { Some(at + 1).filter(|to| *to < next.len()) };
        if let Some(target) = target {
            next.swap(at, target);
        }
    }
    next.extend(order.iter().filter(|item| !visible.contains(item)).cloned());
    next
}

pub fn week_days(day: NaiveDate, shift: i64) -> Vec<NaiveDate> {
    let monday = day - chrono::Duration::days(i64::from(day.weekday().num_days_from_monday())) + chrono::Duration::days(7 * shift);
    (0..7).map(|at| monday + chrono::Duration::days(at)).collect()
}

pub fn last_days(count: i64, today: DateTime<Local>) -> Vec<NaiveDate> {
    (0..count).map(|index| today.date_naive() - Duration::days(count - 1 - index)).collect()
}

pub fn at_noon(date: NaiveDate) -> DateTime<Local> {
    Local.from_local_datetime(&date.and_hms_opt(12, 0, 0).unwrap_or_default()).single().unwrap_or_else(Local::now)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tasks_move_up_and_down_and_keep_their_place() {
        let ids = |list: &[&str]| list.iter().map(|id| id.to_string()).collect::<Vec<_>>();
        let visible = ids(&["a", "b", "c"]);
        assert_eq!(move_in_order(&visible, &[], "c", true), ids(&["a", "c", "b"]));
        assert_eq!(move_in_order(&visible, &[], "a", true), visible);
        assert_eq!(move_in_order(&visible, &ids(&["z", "a"]), "c", false), ids(&["a", "b", "c", "z"]));
        let mut list = vec![serde_json::json!({"id": "a"}), serde_json::json!({"id": "b"}), serde_json::json!({"id": "c"})];
        apply_order(&mut list, &ids(&["c", "a"]));
        assert_eq!(list.iter().map(|item| item["id"].as_str().unwrap()).collect::<Vec<_>>(), vec!["c", "a", "b"]);
    }

    #[test]
    fn week_view_starts_on_monday() {
        let day = NaiveDate::from_ymd_opt(2026, 11, 11).unwrap();
        let week = week_days(day, 0);
        assert_eq!(week[0], NaiveDate::from_ymd_opt(2026, 11, 9).unwrap());
        assert_eq!(week[6], NaiveDate::from_ymd_opt(2026, 11, 15).unwrap());
        assert_eq!(week_days(day, 1)[0], NaiveDate::from_ymd_opt(2026, 11, 16).unwrap());
        assert_eq!(week_days(day, -1)[0], NaiveDate::from_ymd_opt(2026, 11, 2).unwrap());
    }

    #[test]
    fn focus_minutes_add_up_per_day() {
        let at = |day: &str| crate::logic::time::iso(&crate::logic::time::parse(&format!("{day}T12:00:00")).unwrap());
        let history = vec![serde_json::json!({"completedAt": at("2026-11-10"), "seconds": 1500}), serde_json::json!({"completedAt": at("2026-11-10"), "seconds": 900}), serde_json::json!({"completedAt": at("2026-11-11"), "seconds": 2700})];
        assert_eq!(focus_by_day(&history, &["2026-11-09".into(), "2026-11-10".into(), "2026-11-11".into()]), vec![0.0, 40.0, 45.0]);
    }

    #[test]
    fn morning_task_reminder_counts_today_and_late() {
        let task = |title: &str, due: &str, done: bool| serde_json::json!({"title": title, "done": done, "data": {"dueDate": due}});
        let list = vec![task("Plombier", "2026-11-11", false), task("Vieux", "2026-11-01", false), task("Fait", "2026-11-11", true), task("Plus tard", "2026-12-01", false)];
        assert_eq!(task_reminder(&list, "2026-11-11", true).as_deref(), Some("Aujourd'hui : Plombier, 1 en retard"));
        assert_eq!(task_reminder(&list[2..], "2026-11-11", true), None);
        let two = vec![task("A", "2026-11-11", false), task("B", "2026-11-11", false)];
        assert_eq!(task_reminder(&two, "2026-11-11", true).as_deref(), Some("2 tâches pour aujourd'hui"));
    }

    #[test]
    fn repeating_tasks_land_on_the_next_free_day() {
        assert_eq!(next_due("2026-11-10", "2026-11-11", "daily").as_deref(), Some("2026-11-12"));
        assert_eq!(next_due("2026-11-11", "2026-11-11", "weekly").as_deref(), Some("2026-11-18"));
        assert_eq!(next_due("2026-10-01", "2026-11-11", "weekly").as_deref(), Some("2026-11-12"));
        assert_eq!(next_due("", "2026-11-11", "daily").as_deref(), Some("2026-11-12"));
        assert_eq!(next_due("2026-11-11", "2026-11-11", ""), None);
        assert_eq!(task_repeat(&serde_json::json!({"data": {"repeat": "weekly"}})), "weekly");
    }

    #[test]
    fn month_grid_starts_monday_and_fills_weeks() {
        let cells = month_cells(2026, 11);
        assert_eq!(cells.len() % 7, 0);
        assert_eq!(cells[0].key, "2026-10-26");
        assert!(!cells[0].in_month);
        assert!(cells.iter().any(|cell| cell.key == "2026-11-30" && cell.in_month));
    }

    #[test]
    fn task_rows_convert_both_ways() {
        let item = task_row_to_item(&json!({ "id": "1", "title": "T", "description": null, "is_completed": false, "priority": "urgent", "due_date": "2026-11-03T00:00:00Z" }));
        assert_eq!(item["body"], "");
        assert_eq!(task_priority(&item), "high");
        assert_eq!(task_due(&item), "2026-11-03");
        let row = item_to_task_row(&json!({ "title": "T", "body": "", "done": true, "data": { "priority": "low" } }), "now");
        assert_eq!(row["description"], Value::Null);
        assert_eq!(row["completed_at"], "now");
        assert_eq!(row["priority"], "low");
        assert_eq!(row["due_date"], Value::Null);
    }

    #[test]
    fn task_filters_and_sort_match_the_interface() {
        let tasks = vec![
            json!({ "id": "done", "done": true, "data": {} }),
            json!({ "id": "later", "done": false, "data": { "dueDate": "2026-12-01" } }),
            json!({ "id": "late", "done": false, "data": { "dueDate": "2026-01-01", "priority": "low" } }),
            json!({ "id": "none", "done": false, "data": {} }),
        ];
        let ids = |list: Vec<Value>| list.iter().map(|task| task["id"].as_str().unwrap().to_string()).collect::<Vec<_>>();
        assert_eq!(ids(visible_tasks(&tasks, "open", "2026-06-01")), ["late", "later", "none"]);
        assert_eq!(ids(visible_tasks(&tasks, "late", "2026-06-01")), ["late"]);
        assert_eq!(ids(visible_tasks(&tasks, "done", "2026-06-01")), ["done"]);
        assert_eq!(visible_tasks(&tasks, "all", "2026-06-01").last().unwrap()["id"], "done");
    }

    #[test]
    fn previews_remove_markup_and_scripts() {
        assert_eq!(item_preview("<p>Bonjour&nbsp;<b>toi</b></p><script>x()</script> &amp; moi"), "Bonjour toi & moi");
        assert_eq!(item_preview(&"a".repeat(300)).len(), 160);
    }

    #[test]
    fn events_without_a_date_go_last_and_notes_newest_first() {
        let mut events = vec![json!({ "id": "none", "startAt": null }), json!({ "id": "soon", "startAt": "2026-01-01T00:00:00Z" })];
        events_by_start(&mut events);
        assert_eq!(events[0]["id"], "soon");
        let mut notes = vec![json!({ "id": "old", "updatedAt": "2026-01-01T00:00:00Z" }), json!({ "id": "new", "updatedAt": "2026-06-01T00:00:00Z" })];
        newest_items_first(&mut notes);
        assert_eq!(notes[0]["id"], "new");
    }

    #[test]
    fn activity_grid_has_full_weeks_and_marks_the_future() {
        let today = Local.with_ymd_and_hms(2026, 11, 4, 12, 0, 0).unwrap();
        let grid = activity_weeks(&["2026-11-03T10:00:00".to_string(), "bad".to_string()], today, 4);
        assert_eq!(grid.len(), 4);
        assert!(grid.iter().all(|week| week.len() == 7));
        assert_eq!(grid.iter().flatten().find(|day| day.key == "2026-11-03").unwrap().count, 1);
        assert!(grid[3][6].future);
    }

    #[test]
    fn streak_counts_back_from_today_or_yesterday() {
        let today = Local.with_ymd_and_hms(2026, 11, 4, 12, 0, 0).unwrap();
        let days: std::collections::HashSet<String> = ["2026-11-03", "2026-11-02", "2026-10-30"].map(String::from).into();
        assert_eq!(habit_streak(&days, today), 2);
        assert_eq!(habit_streak(&Default::default(), today), 0);
    }

    #[test]
    fn date_inputs_round_trip() {
        let text = "2026-11-03T09:30";
        assert_eq!(to_input(Some(&input_to_iso(text))), text);
        assert_eq!(input_to_iso("plus tard"), "");
    }
}
