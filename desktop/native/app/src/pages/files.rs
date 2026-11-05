use crate::app::{spawn, App, Page};
use crate::i18n::{fr, t, tr};
use crate::logic::format_bytes;
use crate::logic::time;
use crate::pages::generic::{json_list, RowAction};
use crate::pages::{encode, first_array, section, set_section};
use crate::services::{api, api_m, open_site, open_url, svc, Fut};
use crate::vm::*;
use serde_json::{json, Value};
use std::rc::Rc;

pub const DRIVE_CLIENT: &str = "259857269450-m5kiejkhb1k0lt4h673mi0jsrklmtas3.apps.googleusercontent.com";
const CHUNK: u64 = 8 * 1024 * 1024;
const SECTION_KEY: &str = "ethone-section-files";

#[derive(Default)]
pub struct FilesState {
    pub path: Vec<(String, String, Option<String>)>,
    pub query: String,
    pub sending: Option<(String, u32)>,
    pub error: Option<String>,
}

pub fn content_range(start: u64, end: u64, size: u64) -> String {
    format!("bytes {start}-{end}/{size}")
}

pub fn mime_for(name: &str) -> &'static str {
    match name.rsplit('.').next().map(str::to_lowercase).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("pdf") => "application/pdf",
        Some("txt") => "text/plain",
        Some("json") => "application/json",
        Some("zip") => "application/zip",
        Some("mp4") => "video/mp4",
        Some("mp3") => "audio/mpeg",
        Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Some("xlsx") => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => "application/octet-stream",
    }
}

async fn upload(path: std::path::PathBuf, parent: Option<String>, name: String) -> Result<(), String> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt};
    let mut file = tokio::fs::File::open(&path).await.map_err(|error| error.to_string())?;
    let size = file.metadata().await.map_err(|error| error.to_string())?.len();
    let mut token: Option<String> = None;
    let mut start = 0u64;
    while start < size.max(1) {
        let end = (start + CHUNK).min(size).saturating_sub(1);
        let mut bytes = vec![0u8; (end + 1 - start) as usize];
        file.seek(std::io::SeekFrom::Start(start)).await.map_err(|error| error.to_string())?;
        file.read_exact(&mut bytes).await.map_err(|error| error.to_string())?;
        let mut headers = vec![("x-ethone-client-id", DRIVE_CLIENT.to_string()), ("x-ethone-file-name", name.clone()), ("x-ethone-file-mime", mime_for(&name).to_string()), ("x-ethone-file-size", size.to_string()), ("content-range", content_range(start, end, size))];
        if let Some(parent) = &parent {
            headers.push(("x-ethone-file-parent", parent.clone()));
        }
        if let Some(token) = &token {
            headers.push(("x-ethone-upload-token", token.clone()));
        }
        let answer = svc().auth.drive_chunk(&headers, bytes).await?;
        token = answer["data"]["token"].as_str().map(str::to_string);
        let percent = ((end + 1) as f64 / size.max(1) as f64 * 100.0).round() as u32;
        let label = name.clone();
        crate::app::post(move |app| app.state.files.sending = Some((label, percent)));
        start = end + 1;
        if size == 0 {
            break;
        }
    }
    Ok(())
}

fn sync_drive() -> Fut {
    Box::pin(async {
        let listed = crate::services::api_data(&format!("api/google-drive/files?clientId={}&pageSize=200", encode(DRIVE_CLIENT))).await?;
        let files: Vec<Value> = listed["files"].as_array().into_iter().flatten().map(|file| json!({
            "driveFileId": file["id"].as_str().unwrap_or_default(),
            "driveParentId": file["parents"][0].as_str(),
            "name": file["name"].as_str().unwrap_or_default(),
            "mimeType": file["mimeType"].as_str().unwrap_or("application/octet-stream"),
            "isFolder": file["isFolder"] == true,
            "size": file["size"].as_str().and_then(|text| text.parse::<f64>().ok()).or(file["size"].as_f64()).unwrap_or(0.0),
            "webViewLink": file["webViewLink"],
            "trashed": file["trashed"] == true,
            "createdAt": file["createdTime"],
            "date": file["modifiedTime"],
        })).collect();
        api_m("POST", "api/cloud/files/sync", Some(json!({ "clientId": DRIVE_CLIENT, "files": files }))).await
    })
}

fn side() -> Vec<(String, String, String, String)> {
    vec![
        ("files:section:all".into(), tr("Mes fichiers", "My files"), "folder".into(), String::new()),
        ("files:section:favorites".into(), tr("Favoris", "Favorites"), "star".into(), String::new()),
        ("files:section:shares".into(), tr("Liens de partage", "Share links"), "link-2".into(), String::new()),
        ("files:section:drops".into(), tr("Dépôts", "Drops"), "file-text".into(), String::new()),
    ]
}

fn list_key(app: &App, favorites: bool) -> String {
    if favorites { "files:favorites".into() } else { format!("files:list:{}", app.state.files.path.last().map_or("", |item| item.0.as_str())) }
}

fn load(favorites: bool, parent: Option<String>) -> Fut {
    let path = if favorites { "api/cloud/files/favorites".to_string() } else { parent.map_or("api/cloud/files?limit=500".into(), |parent| format!("api/cloud/files?limit=500&parentId={}", encode(&parent))) };
    let inner = api(&path);
    Box::pin(async move { Ok(Value::Array(first_array(&inner.await?, None))) })
}

fn reload(app: &mut App) {
    let favorites = section(SECTION_KEY, "all") == "favorites";
    let key = list_key(app, favorites);
    let parent = app.state.files.path.last().map(|item| item.0.clone());
    app.reload(&key, move || load(favorites, parent));
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => {
            set_section(SECTION_KEY, arg);
            app.state.files.path.clear();
        }
        "query" => app.state.files.query = value.into(),
        "refresh" => spawn(sync_drive(), |app, _| {
            app.forget("files:");
            let _ = app;
        }),
        "home" => app.state.files.path.clear(),
        "crumb" => {
            if let Ok(at) = arg.parse::<usize>() {
                app.state.files.path.truncate(at + 1);
            }
        }
        "open" => open_file(app, arg),
        "add" => add_files(app),
        "site" => {
            let _ = open_site("account");
        }
        _ => {}
    }
}

fn find(app: &App, id: &str) -> Option<Value> {
    let favorites = section(SECTION_KEY, "all") == "favorites";
    app.res.get(&list_key(app, favorites)).and_then(|res| res.data.clone()).and_then(|data| data.as_array().and_then(|list| list.iter().find(|item| item["id"] == id).cloned()))
}

fn open_file(app: &mut App, id: &str) {
    let Some(file) = find(app, id) else { return };
    if file["isFolder"] == true {
        app.state.files.path.push((id.to_string(), file["name"].as_str().unwrap_or_default().to_string(), file["driveFileId"].as_str().map(str::to_string)));
        return;
    }
    let name = file["name"].as_str().unwrap_or_default().to_string();
    let holder = file.clone();
    app.open_drawer(&name, 460.0, move |app| file_drawer(app, &holder));
}

fn file_drawer(app: &mut App, file: &Value) -> Vec<B> {
    let fr = fr();
    let mut rows = vec![row(vec![muted(&tr("Taille", "Size")), text(&format_bytes(file["size"].as_f64().unwrap_or(0.0))).grow()]), row(vec![muted(&tr("Type", "Type")), text(file["mimeType"].as_str().unwrap_or_default()).grow()])];
    if let Some(date) = file["updatedAt"].as_str().and_then(time::parse) {
        rows.push(row(vec![muted(&tr("Modifié", "Modified")), text(&time::date_time(&date, fr)).grow()]));
    }
    let mut out = group(rows);
    if let Some(summary) = file["brainSummary"].as_str() {
        out.push(h2(&tr("Résumé", "Summary")));
        out.push(prose(summary));
    }
    let id = file["driveFileId"].as_str().or(file["id"].as_str()).unwrap_or_default().to_string();
    let (link, star, share, trash) = (app.icon("external-link"), app.icon("star"), app.icon("link-2"), app.icon("trash-2"));
    let mut cells = Vec::new();
    if file["webViewLink"].as_str().is_some() {
        cells.push(primary("filedrawer:open", &tr("Ouvrir", "Open")).icon(link));
    }
    let favorite = file["isFavorite"] == true;
    cells.push(btn("filedrawer:favorite", &if favorite { tr("Retirer des favoris", "Remove favorite") } else { tr("Ajouter aux favoris", "Add favorite") }).icon(star));
    cells.push(btn("filedrawer:share", &tr("Créer un lien", "Create a link")).icon(share));
    if file["driveFileId"].as_str().is_some() {
        cells.push(danger("filedrawer:trash", &tr("Mettre à la corbeille", "Move to trash")).icon(trash));
    }
    out.push(row(cells));
    if let Some(message) = app.state.files.error.clone() {
        out.push(error(&message, vec![]));
    }
    app.set("files:drawer-id", &id);
    app.set("files:drawer-link", file["webViewLink"].as_str().unwrap_or_default());
    app.set("files:drawer-fav", if favorite { "1" } else { "" });
    out
}

pub fn drawer_act(app: &mut App, id: &str) {
    let target = app.get("files:drawer-id");
    let work = match id {
        "open" => {
            let link = app.get("files:drawer-link");
            let _ = open_url(&link);
            return;
        }
        "favorite" => api_m("POST", &format!("api/cloud/file/favorite?driveFileId={}", encode(&target)), Some(json!({ "favorite": app.get("files:drawer-fav").is_empty() }))),
        "share" => api_m("POST", "api/cloud/shares", Some(json!({ "fileId": target, "visibility": "link" }))),
        "trash" => api_m("POST", "api/google-drive/files/trash", Some(json!({ "clientId": DRIVE_CLIENT, "fileId": target }))),
        _ => return,
    };
    app.state.files.error = None;
    spawn(work, |app, result| match result {
        Ok(_) => {
            app.close_drawer();
            reload(app);
        }
        Err(error) => app.state.files.error = Some(crate::i18n::error_text(&error)),
    });
}

fn add_files(app: &mut App) {
    let owner = app.ui.upgrade().and_then(|ui| crate::win::hwnd(&ui));
    let chosen = crate::dialogs::open_files(owner, &format!("{}|*.*", tr("Tous les fichiers", "All files")), true);
    if chosen.is_empty() {
        return;
    }
    let parent = app.state.files.path.last().and_then(|item| item.2.clone());
    app.state.files.error = None;
    spawn(
        async move {
            for path in chosen {
                let name = path.file_name().map(|name| name.to_string_lossy().to_string()).unwrap_or_default();
                upload(path, parent.clone(), name).await?;
            }
            sync_drive().await.map(|_| ())
        },
        |app, result| {
            app.state.files.sending = None;
            match result {
                Ok(()) => {
                    app.forget("files:");
                }
                Err(error) => {
                    app.state.files.error = Some(match error.as_str() {
                        "driveNotLinked" => tr("Connecte Google Drive dans Réglages > Connexions pour ajouter des fichiers.", "Link Google Drive in Settings > Connections to add files."),
                        "fileTooLarge" => tr("Ce fichier est trop lourd.", "This file is too large."),
                        other => crate::i18n::error_text(other),
                    });
                }
            }
        },
    );
}

fn browser(app: &mut App, favorites: bool) -> Vec<B> {
    let key = list_key(app, favorites);
    let parent = app.state.files.path.last().map(|item| item.0.clone());
    let res = app.load(&key, move || load(favorites, parent.clone()));
    let (refresh, upload_icon, search, folder, file_icon, star, chevron) = (app.icon("refresh-cw"), app.icon("upload"), app.icon("search"), app.icon("folder"), app.icon("file-text"), app.icon("star"), app.icon("chevron-right"));
    let mut actions = vec![btn("files:refresh", &t("refresh")).icon(refresh).off(res.loading).tip("F5")];
    if !favorites {
        actions.push(primary("files:add", &tr("Ajouter des fichiers", "Add files")).icon(upload_icon).off(app.state.files.sending.is_some()));
    }
    let mut out = vec![head(&if favorites { tr("Favoris", "Favorites") } else { tr("Mes fichiers", "My files") }, "", actions)];
    if !favorites && !app.state.files.path.is_empty() {
        let mut crumbs = vec![link("files:home", &tr("Accueil", "Home"))];
        for (at, (_, name, _)) in app.state.files.path.iter().enumerate() {
            crumbs.push(icon(chevron.clone()));
            crumbs.push(link(&format!("files:crumb:{at}"), name));
        }
        out.push(row(crumbs).gap(4.0));
    }
    let query = app.state.files.query.clone();
    out.push(row(vec![input("files:query", &query, &tr("Chercher un fichier", "Find a file")).icon(search)]));
    if let Some((name, percent)) = &app.state.files.sending {
        out.push(row(vec![muted(&tr(&format!("Envoi de {name} : {percent} %"), &format!("Sending {name}: {percent}%"))), bar(*percent as f32 / 100.0)]));
    }
    if let Some(message) = app.state.files.error.clone().or(res.error.clone()) {
        out.push(error(&message, vec![btn("files:refresh", &t("retry"))]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(5, 48.0));
        }
        return out;
    };
    let all = data.as_array().cloned().unwrap_or_default();
    let in_folder = app.state.files.path.last().is_some();
    let text_query = query.trim().to_lowercase();
    let mut files: Vec<Value> = all.iter().filter(|file| file["trashed"] != true && (favorites || in_folder || file["parentId"].is_null() || !all.iter().any(|other| other["id"] == file["parentId"]))).filter(|file| text_query.is_empty() || file["name"].as_str().unwrap_or_default().to_lowercase().contains(&text_query)).cloned().collect();
    files.sort_by(|left, right| (right["isFolder"] == true).cmp(&(left["isFolder"] == true)).then_with(|| left["name"].as_str().unwrap_or_default().to_lowercase().cmp(&right["name"].as_str().unwrap_or_default().to_lowercase())));
    if files.is_empty() {
        out.push(empty_with(&tr("Aucun fichier", "No files"), &tr("Ajoute un fichier ou connecte Google Drive.", "Add a file or link Google Drive."), vec![btn("files:site", &tr("Ouvrir ethone.dev", "Open ethone.dev"))]));
        return out;
    }
    let fr = fr();
    let rows = files.iter().map(|file| {
        let is_folder = file["isFolder"] == true;
        let mut cells = vec![icon(if is_folder { folder.clone() } else { file_icon.clone() }), strong(file["name"].as_str().unwrap_or_default()).grow()];
        if file["isFavorite"] == true {
            cells.push(icon(star.clone()).tone("warn"));
        }
        cells.push(muted(&if is_folder { String::new() } else { format_bytes(file["size"].as_f64().unwrap_or(0.0)) }));
        cells.push(muted(&file["updatedAt"].as_str().and_then(time::parse).map(|date| time::short_date(&date, fr)).unwrap_or_default()));
        row(cells).id(&format!("files:open:{}", file["id"].as_str().unwrap_or_default()))
    }).collect();
    out.extend(group(rows));
    out
}

fn remote(app: &mut App, title: &str, path: &'static str, revoke: &'static str, key: &'static str) -> Vec<B> {
    let res = app.load(&format!("files:remote:{path}"), move || api(path));
    let refresh = app.icon("refresh-cw");
    let mut out = vec![head(title, "", vec![btn(&format!("files:refresh"), &t("refresh")).icon(refresh).off(res.loading)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(3, 52.0));
        }
        return out;
    };
    let actions: Rc<dyn Fn() -> Vec<RowAction>> = Rc::new(move || vec![RowAction { title: tr("Révoquer", "Revoke"), destructive: true, prompt: None, run: Rc::new(move |row: &Value, _: &str| api_m("POST", revoke, Some(json!({ key: row["id"] })))) }]);
    let changed: Rc<dyn Fn(&mut App)> = Rc::new(move |app: &mut App| app.forget(&format!("files:remote:{path}")));
    out.extend(json_list(app, &format!("files-{path}"), &first_array(&data, None), actions, changed, None, None));
    out
}

pub fn view(app: &mut App) -> Page {
    let current = section(SECTION_KEY, "all");
    let quota = app.load("files:quota", || {
        let inner = api(&format!("api/google-drive/quota?clientId={}", encode(DRIVE_CLIENT)));
        Box::pin(async move { Ok(inner.await.unwrap_or(Value::Null)) })
    });
    let mut main = match current.as_str() {
        "favorites" => browser(app, true),
        "shares" => remote(app, &tr("Liens de partage", "Share links"), "api/cloud/shares", "api/cloud/shares/revoke", "shareId"),
        "drops" => remote(app, &tr("Dépôts", "Drops"), "api/cloud/drops", "api/cloud/drops/revoke", "dropId"),
        _ => browser(app, false),
    };
    if let Some(data) = quota.data {
        let usage = if data["data"].is_object() { &data["data"] } else { &*data };
        if let Some(total) = usage["total"].as_f64().filter(|total| *total > 0.0) {
            let used = usage["used"].as_f64().unwrap_or(0.0);
            main.insert(1, row(vec![muted(&format!("{} / {}", format_bytes(used), format_bytes(total))), bar((used / total) as f32)]));
        }
    }
    Page { side: side(), side_active: format!("files:section:{current}"), main, ..Default::default() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chunks_describe_their_range() {
        assert_eq!(content_range(0, 8388607, 10000000), "bytes 0-8388607/10000000");
    }

    #[test]
    fn mime_types_follow_the_extension() {
        assert_eq!(mime_for("photo.JPG"), "image/jpeg");
        assert_eq!(mime_for("sans-extension"), "application/octet-stream");
    }
}
