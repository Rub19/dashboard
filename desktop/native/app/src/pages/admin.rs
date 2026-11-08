use crate::app::{spawn, App};
use crate::i18n::{fr, t, tr};
use crate::logic::format_bytes;
use crate::logic::time;
use crate::pages::generic::number_text;
use crate::services::{api_data, api_m, svc};
use crate::vm::*;
use serde_json::Value;

fn label(key: &str) -> String {
    match key {
        "items" => tr("Éléments", "Items"),
        "notes" => "Notes".into(),
        "tasks" => tr("Tâches", "Tasks"),
        "events" => tr("Événements", "Events"),
        "files" => tr("Fichiers", "Files"),
        "aliases" => tr("Alias", "Aliases"),
        "messages" => tr("Messages", "Messages"),
        "threads" => tr("Conversations", "Threads"),
        "aiUsage" => tr("Appels IA", "AI calls"),
        other => crate::pages::generic::humanize(other),
    }
}

pub fn act(app: &mut App, id: &str) {
    match id {
        "refresh" => {
            app.forget("settings:admin");
            app.forget("admin:");
        }
        "upload" => {
            let owner = app.ui.upgrade().and_then(|ui| crate::win::hwnd(&ui));
            let Some(path) = crate::dialogs::open_files(owner, "HTML|*.html;*.htm", false).into_iter().next() else { return };
            let Ok(html) = std::fs::read_to_string(path) else {
                app.toast_bad(&tr("Fichier illisible", "Unreadable file"));
                return;
            };
            spawn(async move { svc().auth.worker_text("api/games/dino/override", "text/html; charset=utf-8", html).await }, |app, result| match result {
                Ok(_) => {
                    app.toast(&tr("Jeu mis à jour", "Game updated"));
                    app.forget("admin:");
                }
                Err(error) => app.toast_bad(&crate::i18n::error_text(&error)),
            });
        }
        "remove" => spawn(api_m("DELETE", "api/games/dino/override", None), |app, result| match result {
            Ok(_) => {
                app.toast(&tr("Version manuelle retirée", "Manual version removed"));
                app.forget("admin:");
            }
            Err(error) => app.toast_bad(&crate::i18n::error_text(&error)),
        }),
        _ => {}
    }
}

fn block(title: &str, values: &Value, out: &mut Vec<B>) {
    let Some(map) = values.as_object() else { return };
    out.push(h2(title));
    let cells: Vec<C> = map.iter().map(|(key, value)| stat(&label(key), &number_text(value.as_f64().unwrap_or(0.0)), "")).collect();
    for chunk in cells.chunks(4) {
        out.push(row(chunk.to_vec()));
    }
}

pub fn view(app: &mut App) -> Vec<B> {
    let res = app.load("settings:admin", || api_data("api/admin/stats"));
    let refresh = app.icon("refresh-cw");
    let fr = fr();
    let generated = res.data.as_ref().and_then(|data| data["generatedAt"].as_str()).and_then(time::parse).map(|date| tr(&format!("Chiffres du {}", time::date_time(&date, true)), &format!("Figures from {}", time::date_time(&date, false)))).unwrap_or_default();
    let mut out = vec![head(&tr("Administration", "Administration"), &generated, vec![btn("admin:refresh", &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(data) = res.data {
        out.push(row(vec![stat(&tr("Comptes", "Accounts"), &number_text(data["users"].as_f64().unwrap_or(0.0)), "")]));
        block(&tr("Contenu", "Content"), &data["content"], &mut out);
        block("Mail", &data["mail"], &mut out);
        block(&tr("Activité", "Activity"), &data["activity"], &mut out);
    }
    let game = app.load("admin:game", || api_data("api/games/dino/override"));
    out.push(h2(&tr("Jeu Dino Corridor", "Dino Corridor game")));
    let active = game.data.as_ref().is_some_and(|data| data["active"] == true);
    let detail = game.data.as_ref().filter(|_| active).map(|data| {
        let size = format_bytes(data["sizeBytes"].as_f64().unwrap_or(0.0));
        let when = data["uploadedAt"].as_str().and_then(time::parse).map(|date| format!(", {}", time::date_time(&date, fr))).unwrap_or_default();
        format!("{size}{when}")
    }).unwrap_or_else(|| tr("Le serveur utilise GitHub, puis sa copie de secours.", "The server uses GitHub, then its backup copy."));
    let upload = app.icon("upload");
    let mut cells = vec![stack(&if active { tr("Version manuelle active", "Manual version active") } else { tr("Version automatique", "Automatic version") }, &detail), btn("admin:upload", &tr("Envoyer un fichier HTML", "Upload an HTML file")).icon(upload)];
    if active {
        cells.push(danger("admin:remove", &tr("Retirer", "Remove")));
    }
    out.push(card(cells));
    out
}
