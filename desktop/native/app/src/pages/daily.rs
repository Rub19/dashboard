use crate::services::{self, api, items_list, rest, rest_get, svc, Fut};
use crate::logic::productivity::{item_to_task_row, task_row_to_item};
use serde_json::{json, Value};

pub const HABITS_PATH: &str = "ethone_habits?select=*&archived=eq.false&order=created_at.desc";
pub const COMPLETIONS_PATH: &str = "ethone_habit_completions?select=id,habit_id,completed_on&order=completed_on.desc&limit=10000";

async fn absorb_old_tasks() {
    let Ok(old) = items_list("tasks").await else { return };
    let now = crate::logic::time::iso(&chrono::Local::now());
    for item in old.as_array().cloned().unwrap_or_default() {
        if rest("POST", "tasks", Some(item_to_task_row(&item, &now)), Some("return=minimal")).await.is_err() {
            continue;
        }
        if let Some(id) = item["id"].as_str() {
            if ethone_engine::sync::validate_id(id).is_ok() {
                let _ = svc().auth.worker_json(reqwest::Method::DELETE, "api/tasks", Some(json!({ "id": id }))).await;
            }
        }
    }
}

pub fn tasks_list() -> Fut {
    Box::pin(async {
        absorb_old_tasks().await;
        let rows = rest_get("tasks?select=*&order=updated_at.desc").await?;
        Ok(Value::Array(rows.as_array().into_iter().flatten().map(task_row_to_item).collect()))
    })
}

pub fn linked_google_events() -> Fut {
    Box::pin(async {
        let rows = api("api/connections").await.unwrap_or(Value::Null);
        let linked = crate::pages::first_array(&rows, None).iter().any(|row| row["provider"] == "google-calendar" && row["connected"] == true);
        if !linked {
            return Ok(json!([]));
        }
        Ok(Value::Array(crate::pages::first_array(&services::api("api/google-calendar/events").await.unwrap_or(Value::Null), None)))
    })
}
