use crate::app::{entry, danger_entry, spawn, App, Page};
use crate::i18n::{fr, tr};
use crate::logic::mail::{has_images, html_to_text, hue_color, initials, mail_time, quote, recipients, reply_subject, sender_hue};
use crate::logic::time;
use crate::pages::first_array;
use crate::pages::generic::{json_list, RowAction};
use crate::pages::{section, set_section, encode};
use crate::services::{api, api_data, api_m, Fut};
use crate::vm::*;
use serde_json::{json, Value};
use std::rc::Rc;

const SECTION_KEY: &str = "ethone-section-mail";
const FOLDERS: [&str; 6] = ["inbox", "sent", "drafts", "archive", "spam", "trash"];

#[derive(Default)]
pub struct MailState {
    pub query: String,
    pub search: String,
    pub open: Option<Value>,
    pub picked: Vec<String>,
    pub error: Option<String>,
    pub to: String,
    pub subject: String,
    pub body: String,
    pub when: String,
    pub reply_to: Option<String>,
    pub sending: bool,
    pub compose_error: Option<String>,
    pub manage: std::collections::HashMap<String, String>,
}

fn folder_label(id: &str) -> String {
    match id {
        "inbox" => tr("Réception", "Inbox"),
        "sent" => tr("Envoyés", "Sent"),
        "drafts" => tr("Brouillons", "Drafts"),
        "archive" => tr("Archives", "Archive"),
        "spam" => tr("Indésirables", "Spam"),
        _ => tr("Corbeille", "Trash"),
    }
}

fn folder_icon(id: &str) -> &'static str {
    match id {
        "inbox" => "inbox",
        "sent" => "send",
        "drafts" => "pen-line",
        "archive" => "archive",
        "spam" => "shield-alert",
        _ => "trash-2",
    }
}

fn manage_info(id: &str) -> Option<(String, &'static str, Vec<(&'static str, String, bool)>, bool)> {
    Some(match id {
        "contacts" => (tr("Contacts", "Contacts"), "api/mail/contacts", vec![], false),
        "aliases" => (tr("Adresses", "Addresses"), "api/mail/alias", vec![], false),
        "labels" => (tr("Étiquettes", "Labels"), "api/mail/labels", vec![("name", tr("Nom", "Name"), false)], true),
        "rules" => (tr("Règles", "Rules"), "api/mail/rules", vec![], false),
        "templates" => (tr("Modèles", "Templates"), "api/mail/templates", vec![("name", tr("Nom", "Name"), false), ("subject", tr("Objet", "Subject"), false), ("content", tr("Contenu", "Content"), true)], true),
        "signatures" => (tr("Signatures", "Signatures"), "api/mail/signatures", vec![("name", tr("Nom", "Name"), false), ("content", tr("Contenu", "Content"), true)], true),
        _ => return None,
    })
}

fn side() -> Vec<(String, String, String, String)> {
    let mut out = vec![(String::new(), tr("Messages", "Messages"), String::new(), String::new())];
    for folder in FOLDERS {
        out.push((format!("mail:section:{folder}"), folder_label(folder), folder_icon(folder).into(), String::new()));
    }
    out.push((String::new(), tr("Gestion", "Manage"), String::new(), String::new()));
    for id in ["contacts", "aliases", "labels", "rules", "templates", "signatures"] {
        out.push((format!("mail:section:{id}"), manage_info(id).map(|info| info.0).unwrap_or_default(), String::new(), String::new()));
    }
    out
}

fn list_key(folder: &str, search: &str) -> String {
    format!("mail:list:{folder}:{search}")
}

fn load_list(folder: &str, search: &str) -> Fut {
    let path = if search.is_empty() { format!("api/mail/inbox?folder={folder}&limit=50") } else { format!("api/mail/search?q={}&limit=50", encode(search)) };
    let inner = api(&path);
    Box::pin(async move { Ok(Value::Array(first_array(&inner.await?, None))) })
}

fn current_folder() -> String {
    section(SECTION_KEY, "inbox")
}

fn reload_list(app: &mut App) {
    let folder = current_folder();
    let search = app.state.mail.search.clone();
    app.reload(&list_key(&folder, &search), move || load_list(&folder, &search));
    app.forget("home:unread");
    app.forget("home:mail");
}

fn find(app: &App, id: &str) -> Option<Value> {
    if let Some(open) = &app.state.mail.open {
        if open["id"] == id {
            return Some(open.clone());
        }
    }
    let folder = current_folder();
    app.res.get(&list_key(&folder, &app.state.mail.search)).and_then(|res| res.data.clone()).and_then(|data| data.as_array().and_then(|list| list.iter().find(|item| item["id"] == id).cloned()))
}

fn mutate(app: &mut App, work: Fut, close: bool, done: Option<String>, undo: Option<(Vec<String>, String)>) {
    app.state.mail.error = None;
    spawn(work, move |app, result| match result {
        Ok(_) => {
            if close {
                app.state.mail.open = None;
            }
            reload_list(app);
            if let Some(message) = done {
                match undo {
                    Some((ids, folder)) => app.push_toast(&message, "ok", Some((tr("Annuler", "Undo"), Box::new(move |app: &mut App| {
                        let work = api_data_post("api/mail/move", json!({ "ids": ids, "folder": folder }));
                        mutate(app, work, false, None, None);
                    }))), 6000),
                    None => app.toast(&message),
                }
            }
        }
        Err(error) => app.state.mail.error = Some(crate::i18n::error_text(&error)),
    });
}

fn api_data_post(path: &str, body: Value) -> Fut {
    let inner = api_m("POST", path, Some(body));
    Box::pin(async move { Ok(crate::services::unwrap_data(inner.await?)) })
}

fn move_to(app: &mut App, ids: Vec<String>, target: &str, done: String) {
    let folder = current_folder();
    let work = api_data_post("api/mail/move", json!({ "ids": ids, "folder": target }));
    mutate(app, work, true, Some(done), Some((ids, folder)));
}

fn open_message(app: &mut App, id: &str) {
    let Some(message) = find(app, id) else { return };
    app.state.mail.open = Some(message.clone());
    app.with_ui(|ui| ui.set_main_scroll(0.0));
    let has_body = message["body_text"].as_str().is_some_and(|text| !text.is_empty()) || message["body_html"].as_str().is_some_and(|text| !text.is_empty());
    if let (false, Some(thread)) = (has_body, message["thread_id"].as_str()) {
        let target = id.to_string();
        spawn(api(&format!("api/mail/thread?thread_id={}", encode(thread))), move |app, result| {
            if let Ok(thread) = result {
                if let Some(full) = first_array(&thread, None).into_iter().find(|item| item["id"] == target.as_str()) {
                    if let Some(open) = app.state.mail.open.as_mut().filter(|open| open["id"] == target.as_str()) {
                        if let (Some(target), Some(source)) = (open.as_object_mut(), full.as_object()) {
                            target.extend(source.clone());
                        }
                    }
                }
            }
        });
    }
    if message["is_read"] != true {
        let work = api_data_post("api/mail/read", json!({ "id": id, "is_read": true }));
        mutate(app, work, false, None, None);
    }
}

fn content_of(message: &Value) -> String {
    let text = message["body_text"].as_str().map(str::trim).unwrap_or_default();
    if !text.is_empty() {
        return text.to_string();
    }
    if let Some(html) = message["body_html"].as_str().filter(|html| !html.is_empty()) {
        return html_to_text(html);
    }
    message["snippet"].as_str().unwrap_or_default().to_string()
}

fn compose(app: &mut App, to: &str, subject: &str, body: &str, reply: Option<String>) {
    let state = &mut app.state.mail;
    state.to = to.into();
    state.subject = subject.into();
    state.body = body.into();
    state.when.clear();
    state.reply_to = reply;
    state.compose_error = None;
    app.open_drawer(&tr("Nouveau message", "New message"), 620.0, compose_view);
}

fn compose_view(app: &mut App) -> Vec<B> {
    let state = &app.state.mail;
    let send_icon = app.icons.get("send").cloned().unwrap_or_default();
    let mut out = vec![
        field(&tr("À", "To"), vec![input("mail:to", &state.to, "").focus()]),
        field(&tr("Objet", "Subject"), vec![input("mail:subject", &state.subject, "")]),
        field(&tr("Message", "Message"), vec![area("mail:body", &state.body, "", 280.0)]),
        field(&tr("Envoyer plus tard, facultatif (AAAA-MM-JJ HH:MM)", "Send later, optional (YYYY-MM-DD HH:MM)"), vec![input("mail:when", &state.when, "2026-11-06T09:00")]),
    ];
    let bad_date = !state.when.trim().is_empty() && crate::logic::productivity::input_to_iso(&state.when).is_empty();
    if bad_date {
        out.push(bad(&tr("La date n'est pas lisible.", "The date cannot be read.")));
    }
    if let Some(message) = &state.compose_error {
        out.push(error(message, vec![]));
    }
    let label = if state.sending { tr("Envoi…", "Sending…") } else if !state.when.trim().is_empty() { tr("Programmer", "Schedule") } else { tr("Envoyer", "Send") };
    out.push(row(vec![primary("mail:send", &label).icon(send_icon).off(state.sending || state.to.trim().is_empty() || state.body.trim().is_empty() || bad_date)]));
    out
}

fn send(app: &mut App) {
    let state = &app.state.mail;
    let to = recipients(&state.to);
    if to.is_empty() || state.body.trim().is_empty() {
        return;
    }
    let when = crate::logic::productivity::input_to_iso(&state.when);
    let work = if state.when.trim().is_empty() {
        api_data_post("api/mail/send", json!({ "to": to, "subject": state.subject, "text": state.body, "in_reply_to": state.reply_to }))
    } else {
        api_data_post("api/mail/schedule", json!({ "to": to, "subject": state.subject, "text": state.body, "scheduled_at": when }))
    };
    app.state.mail.sending = true;
    app.state.mail.compose_error = None;
    spawn(work, |app, result| {
        app.state.mail.sending = false;
        match result {
            Ok(_) => {
                app.close_drawer();
                reload_list(app);
            }
            Err(error) => app.state.mail.compose_error = Some(crate::i18n::error_text(&error)),
        }
    });
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => {
            set_section(SECTION_KEY, arg);
            app.state.mail.open = None;
            app.state.mail.picked.clear();
            crate::pages::shell::restart_enter(app);
            let weak = app.ui.clone();
            let _ = slint::invoke_from_event_loop(move || {
                if let Some(ui) = weak.upgrade() {
                    ui.set_main_scroll(0.0);
                    ui.set_entered(true);
                }
            });
        }
        "query" => app.state.mail.query = value.into(),
        "query:submit" | "search" => app.state.mail.search = app.state.mail.query.trim().to_string(),
        "clear" => {
            app.state.mail.query.clear();
            app.state.mail.search.clear();
        }
        "refresh" => reload_list(app),
        "open" => open_message(app, arg),
        "back" => app.state.mail.open = None,
        "pick" => {
            let picked = &mut app.state.mail.picked;
            if let Some(at) = picked.iter().position(|item| item == arg) {
                picked.remove(at);
            } else {
                picked.push(arg.to_string());
            }
        }
        "pick-all" => {
            let folder = current_folder();
            let rows: Vec<String> = app.res.get(&list_key(&folder, &app.state.mail.search)).and_then(|res| res.data.clone()).and_then(|data| data.as_array().map(|list| list.iter().filter_map(|item| item["id"].as_str().map(str::to_string)).collect())).unwrap_or_default();
            app.state.mail.picked = if app.state.mail.picked.len() == rows.len() { Vec::new() } else { rows };
        }
        "archive" => move_to(app, vec![arg.to_string()], "archive", tr("Message archivé", "Message archived")),
        "trash" => move_to(app, vec![arg.to_string()], "trash", tr("Message mis à la corbeille", "Message moved to trash")),
        "archive-many" => {
            let ids = std::mem::take(&mut app.state.mail.picked);
            move_to(app, ids, "archive", tr("Messages archivés", "Messages archived"));
        }
        "trash-many" => {
            let ids = std::mem::take(&mut app.state.mail.picked);
            move_to(app, ids, "trash", tr("Messages mis à la corbeille", "Messages moved to trash"));
        }
        "read-many" => {
            let ids = std::mem::take(&mut app.state.mail.picked);
            let work: Fut = Box::pin(async move {
                for id in ids {
                    api_data_post("api/mail/read", json!({ "id": id, "is_read": true })).await?;
                }
                Ok(Value::Null)
            });
            mutate(app, work, false, None, None);
        }
        "star" => {
            if let Some(message) = find(app, arg) {
                let next = message["is_starred"] != true;
                if let Some(open) = app.state.mail.open.as_mut().filter(|open| open["id"] == arg) {
                    open["is_starred"] = json!(next);
                }
                let work = api_data_post("api/mail/read", json!({ "id": arg, "is_starred": next }));
                mutate(app, work, false, None, None);
            }
        }
        "snooze" => {
            let tomorrow = chrono::Local::now().date_naive().succ_opt().and_then(|day| day.and_hms_opt(9, 0, 0)).and_then(|date| chrono::TimeZone::from_local_datetime(&chrono::Local, &date).single());
            if let Some(date) = tomorrow {
                let work = api_data_post("api/mail/snooze", json!({ "id": arg, "snoozed_until": time::iso(&date) }));
                mutate(app, work, true, Some(tr("Message reporté à demain 9 h", "Message snoozed until tomorrow 9 am")), None);
            }
        }
        "copy" => {
            if let Some(message) = find(app, arg) {
                let address = message["from_address"].as_str().unwrap_or_default().to_string();
                match crate::clipboard::set(&address) {
                    Ok(()) => app.toast(&tr("Adresse copiée", "Address copied")),
                    Err(_) => app.toast_bad(&tr("Impossible de copier. Sélectionne le texte à la main.", "Could not copy. Select the text by hand.")),
                }
            }
        }
        "reply" | "reply-quote" => {
            if let Some(message) = find(app, arg) {
                let body = if verb == "reply-quote" { quote(&content_of(&message)) } else { String::new() };
                compose(app, message["from_address"].as_str().unwrap_or_default(), &reply_subject(message["subject"].as_str().unwrap_or_default()), &body, message["id"].as_str().map(str::to_string));
            }
        }
        "layout" | "layout-images" => {
            if let Some(message) = find(app, arg) {
                let html = message["body_html"].as_str().unwrap_or_default().to_string();
                let subject = message["subject"].as_str().unwrap_or_default().to_string();
                if let Err(error) = crate::web::show_mail(&html, &subject, verb == "layout-images") {
                    app.toast_bad(&crate::i18n::error_text(&error));
                }
            }
        }
        "compose" => compose(app, "", "", "", None),
        "to" => app.state.mail.to = value.into(),
        "subject" => app.state.mail.subject = value.into(),
        "body" => app.state.mail.body = value.into(),
        "when" => app.state.mail.when = value.into(),
        "send" => send(app),
        "manage-field" => {
            app.state.mail.manage.insert(arg.to_string(), value.to_string());
        }
        "manage-add" => {
            let Some((_, path, fields, _)) = manage_info(arg) else { return };
            let body: serde_json::Map<String, Value> = fields.iter().map(|(key, _, _)| (key.to_string(), json!(app.state.mail.manage.get(*key).cloned().unwrap_or_default()))).collect();
            let section = arg.to_string();
            app.state.mail.error = None;
            spawn(api_data_post(path, Value::Object(body)), move |app, result| match result {
                Ok(_) => {
                    app.state.mail.manage.clear();
                    let path = manage_info(&section).map(|info| info.1).unwrap_or_default();
                    app.reload(&format!("mail:manage:{section}"), || api(path));
                }
                Err(error) => app.state.mail.error = Some(crate::i18n::error_text(&error)),
            });
        }
        "manage-refresh" => {
            if let Some((_, path, _, _)) = manage_info(arg) {
                app.reload(&format!("mail:manage:{arg}"), || api(path));
            }
        }
        _ => {}
    }
}

pub fn view(app: &mut App) -> Page {
    let current = current_folder();
    let main = if FOLDERS.contains(&current.as_str()) {
        if app.state.mail.open.is_some() { message_view(app, &current) } else { folder_view(app, &current) }
    } else {
        manage_view(app, &current)
    };
    Page { side: side(), side_active: format!("mail:section:{current}"), main, ..Default::default() }
}

fn folder_view(app: &mut App, folder: &str) -> Vec<B> {
    let search = app.state.mail.search.clone();
    let holder = (folder.to_string(), search.clone());
    let res = app.load(&list_key(folder, &search), move || load_list(&holder.0, &holder.1));
    let (search_icon, pen, refresh, close, archive, trash, open_icon, star, star_on, clip, check, circle) = (app.icon("search"), app.icon("pen-line"), app.icon("refresh-cw"), app.icon("x"), app.icon("archive"), app.icon("trash-2"), app.icon("mail-open"), app.icon("star"), app.icon("star"), app.icon("paperclip"), app.icon("circle-check"), app.icon("circle"));
    let query = app.state.mail.query.clone();
    let mut top = vec![input("mail:query", &query, &tr("Rechercher dans les messages", "Search mail")).icon(search_icon)];
    if !search.is_empty() {
        top.push(ibtn("mail:clear", close, &tr("Effacer la recherche", "Clear search")));
    }
    top.push(primary("mail:compose", &tr("Nouveau message", "Compose")).icon(pen));
    let mut out = vec![head(&folder_label(folder), "", vec![]), row(top)];
    let rows: Vec<Value> = res.data.as_deref().and_then(Value::as_array).cloned().unwrap_or_default();
    let picked = app.state.mail.picked.clone();
    let all = !rows.is_empty() && picked.len() == rows.len();
    let mut tools = vec![ibtn("mail:pick-all", if all { check.clone() } else { circle.clone() }, &tr("Tout sélectionner", "Select all")).on(!picked.is_empty())];
    if picked.is_empty() {
        tools.push(ibtn("mail:refresh", refresh, &tr("Actualiser", "Refresh")).off(res.loading));
    } else {
        tools.push(muted(&tr(&format!("{} sélectionné(s)", picked.len()), &format!("{} selected", picked.len()))));
        if folder != "archive" {
            tools.push(ibtn("mail:archive-many", archive.clone(), &tr("Archiver", "Archive")));
        }
        if folder != "trash" {
            tools.push(ibtn("mail:trash-many", trash.clone(), &tr("Corbeille", "Trash")));
        }
        tools.push(ibtn("mail:read-many", open_icon, &tr("Marquer comme lu", "Mark as read")));
    }
    tools.push(gap());
    if !rows.is_empty() {
        tools.push(muted(&format!("{} message(s)", rows.len())));
    }
    out.push(row(tools));
    if let Some(message) = app.state.mail.error.clone().or(res.error.clone()) {
        out.push(error_block(&error, "mail:refresh"));
    }
    if res.data.is_none() {
        if res.loading {
            out.extend(skeletons(8, 40.0));
        }
        return out;
    }
    if rows.is_empty() {
        out.push(empty(&if search.is_empty() { tr("Aucun message", "No messages") } else { tr("Aucun résultat", "No results") }, ""));
        return out;
    }
    let now = chrono::Local::now();
    let fr = fr();
    let lines: Vec<B> = rows.iter().map(|message| {
        let id = message["id"].as_str().unwrap_or_default();
        let unread = message["is_read"] != true;
        let starred = message["is_starred"] == true;
        let address = message["from_address"].as_str().unwrap_or_default();
        let sender = if message["direction"] == "outbound" { message["to_addresses"][0].as_str().unwrap_or_default().to_string() } else { message["from_name"].as_str().filter(|name| !name.is_empty()).unwrap_or(address).to_string() };
        let subject = message["subject"].as_str().filter(|text| !text.is_empty()).map_or_else(|| tr("(sans objet)", "(no subject)"), str::to_string);
        let stamp = message["received_at"].as_str().or(message["sent_at"].as_str()).and_then(time::parse).map(|date| mail_time(&date, &now, fr)).unwrap_or_default();
        let on = picked.iter().any(|item| item == id);
        let mut face = avatar(&initials(message["from_name"].as_str(), address), slint::Image::default(), 30.0);
        face.color = Some(hue_color(sender_hue(address)));
        let mut cells = vec![
            ibtn(&format!("mail:pick:{id}"), if on { check.clone() } else { circle.clone() }, &tr("Sélectionner", "Select")).on(on),
            ibtn(&format!("mail:star:{id}"), if starred { star_on.clone() } else { star.clone() }, &if starred { tr("Retirer l'étoile", "Unstar") } else { tr("Ajouter une étoile", "Star") }).on(starred),
            face,
            C { kind: "stack", title: format!("{}{sender}", if unread { "● " } else { "" }), sub: format!("{subject}{}", message["snippet"].as_str().map_or(String::new(), |snippet| format!(" · {snippet}"))), weight: 1.0, ..Default::default() },
        ];
        if message["attachments"].as_array().is_some_and(|list| !list.is_empty()) {
            cells.push(icon(clip.clone()));
        }
        cells.push(muted(&stamp));
        if folder != "archive" {
            cells.push(ibtn(&format!("mail:archive:{id}"), archive.clone(), &tr("Archiver", "Archive")));
        }
        if folder != "trash" {
            cells.push(ibtn(&format!("mail:trash:{id}"), trash.clone(), &tr("Corbeille", "Trash")));
        }
        let menu = format!("mail-menu:{id}");
        let mut entries = vec![entry(&format!("mail:open:{id}"), &tr("Ouvrir", "Open")), entry(&format!("mail:reply:{id}"), &tr("Répondre", "Reply")), entry(&format!("mail:copy:{id}"), &tr("Copier l'adresse", "Copy address"))];
        if folder != "archive" {
            entries.push(entry(&format!("mail:archive:{id}"), &tr("Archiver", "Archive")));
        }
        if folder != "trash" {
            entries.push(danger_entry(&format!("mail:trash:{id}"), &tr("Corbeille", "Trash")));
        }
        app.menu_for(&menu, entries);
        row(cells).id(&format!("mail:open:{id}")).menu(&menu).on(on)
    }).collect();
    out.extend(group(lines));
    out
}

fn message_view(app: &mut App, folder: &str) -> Vec<B> {
    let Some(message) = app.state.mail.open.clone() else { return Vec::new() };
    let id = message["id"].as_str().unwrap_or_default().to_string();
    let (back, archive, trash, clock, copy, star, reply, clip, layout) = (app.icon("arrow-left"), app.icon("archive"), app.icon("trash-2"), app.icon("clock"), app.icon("copy"), app.icon("star"), app.icon("reply"), app.icon("paperclip"), app.icon("external-link"));
    let mut tools = vec![ibtn("mail:back", back, &tr("Retour à la liste", "Back to the list"))];
    if folder != "archive" {
        tools.push(ibtn(&format!("mail:archive:{id}"), archive, &tr("Archiver", "Archive")));
    }
    if folder != "trash" {
        tools.push(ibtn(&format!("mail:trash:{id}"), trash, &tr("Corbeille", "Trash")));
    }
    tools.push(ibtn(&format!("mail:snooze:{id}"), clock, &tr("Reporter à demain 9 h", "Snooze until tomorrow 9 am")));
    tools.push(ibtn(&format!("mail:copy:{id}"), copy, &tr("Copier l'adresse", "Copy address")));
    let mut out = vec![row(tools)];
    if let Some(message) = app.state.mail.error.clone() {
        out.push(error_block(&error, "mail:refresh"));
    }
    let subject = message["subject"].as_str().filter(|text| !text.is_empty()).map_or_else(|| tr("(sans objet)", "(no subject)"), str::to_string);
    out.push(head(&subject, "", vec![]));
    let address = message["from_address"].as_str().unwrap_or_default();
    let name = message["from_name"].as_str().filter(|name| !name.is_empty());
    let to = message["to_addresses"].as_array().map(|list| list.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(", ")).unwrap_or_default();
    let detail = format!("{}{}", if name.is_some() { address.to_string() } else { String::new() }, if to.is_empty() { String::new() } else { format!(" {} {to}", tr("à", "to")) });
    let stamp = message["received_at"].as_str().or(message["sent_at"].as_str()).and_then(time::parse).map(|date| time::date_time(&date, fr())).unwrap_or_default();
    let mut face = avatar(&initials(name, address), slint::Image::default(), 40.0);
    face.color = Some(hue_color(sender_hue(address)));
    let starred = message["is_starred"] == true;
    out.push(card(vec![face, stack(name.unwrap_or(address), detail.trim()), muted(&stamp), ibtn(&format!("mail:star:{id}"), star, &if starred { tr("Retirer l'étoile", "Unstar") } else { tr("Ajouter une étoile", "Star") }).on(starred)]));
    for attachment in message["attachments"].as_array().into_iter().flatten() {
        let size = attachment["size"].as_f64().unwrap_or(0.0);
        out.push(row(vec![icon(clip.clone()), stack(attachment["filename"].as_str().unwrap_or_default(), &format!("{} Ko", (size / 1024.0).round().max(1.0)))]));
    }
    let html = message["body_html"].as_str().unwrap_or_default();
    if !html.is_empty() {
        let mut cells = vec![muted(&tr("Message mis en forme : le texte est affiché ci-dessous.", "Formatted message: the text is shown below.")).grow(), btn(&format!("mail:layout:{id}"), &tr("Voir la mise en page", "See the layout")).icon(layout)];
        if has_images(html) {
            cells.push(btn(&format!("mail:layout-images:{id}"), &tr("Avec les images", "With images")));
        }
        out.push(row(cells));
        if has_images(html) {
            out.push(note(&tr("Les images ne s'affichent que si tu le demandes : elles préviennent l'expéditeur que tu as ouvert le mail.", "Images only show if you ask: they tell the sender you opened the mail.")));
        }
    }
    let content = content_of(&message);
    if content.is_empty() {
        out.push(note(&tr("Ce message ne contient pas de texte.", "This message has no text.")));
    } else {
        out.push(B { kind: "read", title: content, ..Default::default() });
    }
    out.push(row(vec![btn(&format!("mail:reply-quote:{id}"), &tr("Répondre", "Reply")).icon(reply)]));
    out
}

fn manage_view(app: &mut App, id: &str) -> Vec<B> {
    let Some((title, path, fields, deletable)) = manage_info(id) else { return Vec::new() };
    let res = app.load(&format!("mail:manage:{id}"), move || api(path));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(&title, "", vec![btn(&format!("mail:manage-refresh:{id}"), &crate::i18n::t("refresh")).icon(refresh).off(res.loading)])];
    if !fields.is_empty() {
        let ready = fields.iter().all(|(key, _, _)| app.state.mail.manage.get(*key).is_some_and(|value| !value.trim().is_empty()));
        for (key, label, multi) in &fields {
            let value = app.state.mail.manage.get(*key).cloned().unwrap_or_default();
            let cell = if *multi { area(&format!("mail:manage-field:{key}"), &value, "", 100.0) } else { input(&format!("mail:manage-field:{key}"), &value, "") };
            out.push(field(label, vec![cell]));
        }
        out.push(row(vec![primary(&format!("mail:manage-add:{id}"), &tr("Ajouter", "Add")).off(!ready)]));
    }
    if let Some(message) = app.state.mail.error.clone().or(res.error.clone()) {
        out.push(error_block(&error, &format!("mail:manage-refresh:{id}")));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 52.0));
        }
        return out;
    };
    let rows = first_array(&data, None);
    let section = id.to_string();
    let actions: Rc<dyn Fn() -> Vec<RowAction>> = Rc::new(move || {
        if !deletable {
            return Vec::new();
        }
        vec![RowAction { title: tr("Supprimer", "Delete"), destructive: true, prompt: None, run: Rc::new(move |row: &Value, _: &str| api_m("DELETE", path, Some(json!({ "id": row["id"] })))) }]
    });
    let changed: Rc<dyn Fn(&mut App)> = Rc::new(move |app: &mut App| app.reload(&format!("mail:manage:{section}"), move || api(path)));
    out.extend(json_list(app, &format!("mail-{id}"), &rows, actions, changed, None, None));
    let _ = api_data;
    out
}

fn error_block(message: &str, retry: &str) -> B {
    error(message, vec![btn(retry, &crate::i18n::t("retry"))])
}
