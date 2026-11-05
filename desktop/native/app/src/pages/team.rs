use crate::app::{spawn, App, Page};
use crate::i18n::tr;
use crate::logic::mail::{hue_color, initials, sender_hue};
use crate::pages::first_array;
use crate::pages::generic::row_title;
use crate::services::{api, api_m, Fut};
use crate::vm::*;
use serde_json::{json, Value};

#[derive(Default)]
pub struct TeamState {
    pub email: String,
    pub sent: Option<String>,
    pub error: Option<String>,
    pub confirm: Option<String>,
    pub kind: String,
    pub adding: bool,
    pub name: String,
}

fn space_path(kind: &str) -> &'static str {
    if kind == "mine" { "api/user-data/spaces" } else { "api/shared-spaces" }
}

fn mutate(app: &mut App, work: Fut, reload: &'static str, after: impl FnOnce(&mut App) + Send + 'static) {
    app.state.team.error = None;
    spawn(work, move |app, result| match result {
        Ok(_) => {
            app.state.team.confirm = None;
            after(app);
            app.reload(&format!("team:{reload}"), move || api(reload));
        }
        Err(error) => app.state.team.error = Some(crate::i18n::error_text(&error)),
    });
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "refresh" => app.forget("team:"),
        "email" => app.state.team.email = value.into(),
        "invite" | "email:submit" => {
            let address = app.state.team.email.trim().to_string();
            if !address.contains('@') {
                return;
            }
            app.state.team.sent = None;
            let holder = address.clone();
            mutate(app, api_m("POST", "api/team/invite", Some(json!({ "email": address }))), "api/team/members", move |app| {
                app.state.team.email.clear();
                app.state.team.sent = Some(holder);
            });
        }
        "ask" => app.state.team.confirm = Some(arg.to_string()),
        "cancel" => app.state.team.confirm = None,
        "remove-member" => mutate(app, api_m("DELETE", "api/team/members", Some(json!({ "id": arg }))), "api/team/members", |_| {}),
        "remove-space" => {
            let path = space_path(&app.state.team.kind);
            let id = arg.parse::<i64>().map(Value::from).unwrap_or_else(|_| Value::String(arg.to_string()));
            mutate(app, api_m("DELETE", path, Some(json!({ "id": id }))), path, |_| {});
        }
        "kind" => {
            app.state.team.kind = arg.to_string();
            app.state.team.adding = false;
            app.state.team.error = None;
        }
        "adding" => app.state.team.adding = !app.state.team.adding,
        "name" => app.state.team.name = value.into(),
        "create" | "name:submit" => {
            let label = app.state.team.name.trim().chars().take(60).collect::<String>();
            if label.is_empty() {
                return;
            }
            let kind = app.state.team.kind.clone();
            let path = space_path(&kind);
            let body = if kind == "mine" { json!({ "slug": format!("spaces-{}", crate::logic::time::now_ms() as i64), "label": label, "data": { "color": "#3aa8ff" } }) } else { json!({ "name": label }) };
            mutate(app, api_m("POST", path, Some(body)), path, |app| {
                app.state.team.name.clear();
                app.state.team.adding = false;
            });
        }
        _ => {}
    }
}

fn confirmed(app: &mut App, key: &str, action: &str, label: &str) -> Vec<C> {
    let trash = app.icon("trash-2");
    let check = app.icon("check");
    if app.state.team.confirm.as_deref() == Some(key) {
        vec![btn("team:cancel", &tr("Annuler", "Cancel")), danger(action, &tr("Confirmer", "Confirm")).icon(check)]
    } else {
        vec![ibtn(&format!("team:ask:{key}"), trash, label)]
    }
}

pub fn view(app: &mut App) -> Page {
    let refresh = app.icon("refresh-cw");
    let mut main = vec![head(&tr("Équipe", "Team"), &tr("Les personnes et les espaces avec qui tu travailles.", "The people and spaces you work with."), vec![btn("team:refresh", &tr("Actualiser", "Refresh")).icon(refresh)])];
    if let Some(message) = app.state.team.error.clone() {
        main.push(error(&message, vec![]));
    }
    let members = app.load("team:api/team/members", || api("api/team/members"));
    let rows = members.data.as_ref().map(|data| first_array(data, None));
    let (users, send) = (app.icon("users"), app.icon("send"));
    main.push(h2x(&tr("Membres", "Members"), &rows.as_ref().map_or(String::new(), |rows| tr(&format!("{} personne(s)", rows.len()), &format!("{} people", rows.len()))), vec![icon(users)]));
    let email = app.state.team.email.clone();
    main.push(row(vec![input("team:email", &email, &tr("Adresse e-mail à inviter", "Email to invite")), primary("team:invite", &tr("Inviter", "Invite")).icon(send).off(!email.contains('@'))]));
    if let Some(sent) = &app.state.team.sent {
        main.push(B { tone: "ok", ..prose(&tr(&format!("Invitation envoyée à {sent}."), &format!("Invitation sent to {sent}."))) });
    }
    match rows {
        None if members.loading => main.extend(skeletons(3, 48.0)),
        None => {
            if let Some(message) = members.error {
                main.push(error(&message, vec![btn("team:refresh", &crate::i18n::t("retry"))]));
            }
        }
        Some(rows) if rows.is_empty() => main.push(empty(&tr("Tu es seul pour l'instant", "You're on your own for now"), &tr("Invite quelqu'un par e-mail pour travailler à plusieurs.", "Invite someone by email to work together."))),
        Some(rows) => {
            let lines: Vec<B> = rows.iter().map(|row_data| {
                let address = row_data["email"].as_str().unwrap_or_default().to_string();
                let name = row_data["name"].as_str().or(row_data["display_name"].as_str()).unwrap_or(&address).to_string();
                let id = row_data["id"].as_str().map(str::to_string).unwrap_or_else(|| row_data["id"].to_string());
                let mut face = avatar(&initials(Some(&name), &address), slint::Image::default(), 32.0);
                face.color = Some(hue_color(sender_hue(if address.is_empty() { &name } else { &address })));
                let mut cells = vec![face, stack(&name, if address != name { &address } else { "" })];
                for key in ["status", "role"] {
                    if let Some(value) = row_data[key].as_str() {
                        cells.push(chip("", value));
                    }
                }
                cells.extend(confirmed(app, &format!("member-{id}"), &format!("team:remove-member:{id}"), &tr(&format!("Retirer {name}"), &format!("Remove {name}"))));
                row(cells)
            }).collect();
            main.extend(group(lines));
        }
    }
    let kind = if app.state.team.kind.is_empty() { "shared".to_string() } else { app.state.team.kind.clone() };
    let shared = app.load("team:api/shared-spaces", || api("api/shared-spaces"));
    let mine = app.load("team:api/user-data/spaces", || api("api/user-data/spaces"));
    let count = |res: &crate::app::Res| res.data.as_ref().map_or(String::new(), |data| { let size = first_array(data, None).len(); if size > 0 { format!(" {size}") } else { String::new() } });
    let (shared_label, mine_label) = (format!("{}{}", tr("Partagés", "Shared"), count(&shared)), format!("{}{}", tr("Personnels", "Personal"), count(&mine)));
    let layers = app.icon("layers");
    main.push(h2x(&tr("Espaces", "Spaces"), &if kind == "shared" { tr("Visibles par ton équipe", "Visible to your team") } else { tr("Visibles par toi seul", "Visible only to you") }, vec![icon(layers)]));
    main.push(seg(&[("shared", shared_label.as_str()), ("mine", mine_label.as_str())], &kind, "team:kind:"));
    let state = if kind == "shared" { shared } else { mine };
    match state.data {
        None if state.loading => main.extend(skeletons(2, 60.0)),
        None => {}
        Some(data) => {
            let mut lines: Vec<B> = Vec::new();
            for space in first_array(&data, None) {
                let id = space["id"].as_str().map(str::to_string).unwrap_or_else(|| space["id"].to_string());
                let color = space["data"]["color"].as_str().map(hex);
                let mut swatch = C { kind: "swatch", color: Some(color.unwrap_or(hex("#3aa8ff"))), ..Default::default() };
                swatch.tip = row_title(&space);
                let mut cells = vec![swatch, strong(&row_title(&space)).grow()];
                cells.extend(confirmed(app, &format!("space-{id}"), &format!("team:remove-space:{id}"), &tr(&format!("Supprimer {}", row_title(&space)), &format!("Delete {}", row_title(&space)))));
                lines.push(row(cells));
            }
            main.extend(group(lines));
            let plus = app.icon("plus");
            if app.state.team.adding {
                let name = app.state.team.name.clone();
                main.push(row(vec![input("team:name", &name, &tr("Nom de l'espace", "Space name")).focus(), primary("team:create", &tr("Créer", "Create")).off(name.trim().is_empty()), btn("team:adding", &tr("Annuler", "Cancel"))]));
            } else {
                main.push(row(vec![btn("team:adding", &tr("Nouvel espace", "New space")).icon(plus)]));
            }
        }
    }
    Page { main, ..Default::default() }
}
