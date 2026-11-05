use crate::app::{spawn, App};
use crate::i18n::{fr, t, tr};
use crate::logic::time;
use crate::pages::files::DRIVE_CLIENT;
use crate::pages::{encode, first_array};
use crate::prefs;
use crate::services::{api, api_data, api_m, open_url};
use crate::vm::*;
use serde_json::{json, Value};

fn brand(provider: &str) -> (String, &'static str) {
    let name = match provider {
        "spotify" => "Spotify",
        "github" => "GitHub",
        "discord" => "Discord",
        "twitch" => "Twitch",
        "google-calendar" => "Google Agenda",
        "google-drive" => "Google Drive",
        "youtube" => "YouTube",
        "reddit" => "Reddit",
        "notion" => "Notion",
        "todoist" => "Todoist",
        "minecraft" => "Minecraft",
        other => return (other.chars().next().map_or(String::new(), |first| first.to_uppercase().collect::<String>() + &other[first.len_utf8()..]), "#8e8e93"),
    };
    let color = match provider {
        "spotify" => "#1db954",
        "github" => "#8b949e",
        "discord" => "#5865f2",
        "twitch" => "#9146ff",
        "google-calendar" => "#4285f4",
        "google-drive" => "#34a853",
        "youtube" => "#ff0033",
        "reddit" => "#ff4500",
        "notion" => "#9b9a97",
        "todoist" => "#e44332",
        _ => "#62b47a",
    };
    (name.to_string(), color)
}

pub fn valid_twitch(login: &str) -> bool {
    (3..=25).contains(&login.len()) && login.chars().all(|character| character.is_ascii_alphanumeric() || character == '_')
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "link" => {
            let _ = open_url("https://ethone.dev/connections");
        }
        "refresh" => app.forget("connections:"),
        "ask" => app.state.settings.connection_confirm = Some(arg.to_string()),
        "cancel" => app.state.settings.connection_confirm = None,
        "disconnect" => {
            let provider = arg.to_string();
            spawn(api_m("POST", "api/connections/disconnect", Some(json!({ "provider": provider }))), |app, result| {
                app.state.settings.connection_confirm = None;
                match result {
                    Ok(_) => app.forget("connections:"),
                    Err(error) => app.toast_bad(&crate::i18n::error_text(&error)),
                }
            });
        }
        "twitch-draft" => app.state.settings.twitch_draft = value.into(),
        "twitch-save" | "twitch-draft:submit" => {
            let draft = app.state.settings.twitch_draft.trim().to_lowercase();
            if valid_twitch(&draft) {
                prefs::write_json("ethone-twitch-login", &draft);
                app.forget("connections:twitch");
            }
        }
        "twitch-change" => {
            app.state.settings.twitch_draft = prefs::text("ethone-twitch-login", "");
            prefs::write_json("ethone-twitch-login", &String::new());
        }
        "open" => {
            let _ = open_url(&app.get(&format!("connections:url:{arg}")));
        }
        _ => {}
    }
}

fn detail(app: &mut App, provider: &str, out: &mut Vec<B>) {
    let fr = fr();
    match provider {
        "github" => {
            let res = app.load("connections:github", || api_data("api/github/profile"));
            if let Some(data) = res.data.filter(|data| data["login"].is_string()) {
                let picture = app.img(data["avatarUrl"].as_str().unwrap_or_default());
                let mut sub = tr(&format!("{} dépôts, {} abonné(s)", data["publicRepos"].as_i64().unwrap_or(0), data["followers"].as_i64().unwrap_or(0)), &format!("{} repos, {} follower(s)", data["publicRepos"].as_i64().unwrap_or(0), data["followers"].as_i64().unwrap_or(0)));
                if let Some(repo) = data["recentEvent"]["repo"].as_str() {
                    sub.push_str(&format!(" · {} : {repo}", tr("Dernière activité", "Last activity")));
                }
                app.set("connections:url:github", data["htmlUrl"].as_str().unwrap_or_default());
                out.push(row(vec![img(picture, 32.0).round(), stack(data["login"].as_str().unwrap_or_default(), &sub)]).level(1).id("connections:open:github"));
            }
        }
        "google-calendar" => {
            let res = app.load("connections:agenda", || api_data(&format!("api/google-calendar/events?clientId={}", encode(DRIVE_CLIENT))));
            if let Some(message) = res.error {
                out.push(row(vec![muted(&error), link("connections:link", &tr("Reconnecter", "Link again"))]).level(1));
            } else if let Some(data) = res.data {
                let events = first_array(&data["events"], None);
                if events.is_empty() {
                    out.push(note(&tr("Aucun événement à venir.", "No upcoming events.")).level(1));
                }
                for event in events.iter().take(8) {
                    let when = event["start"].as_str().and_then(time::parse).map(|date| if event["allDay"] == true { time::short_date(&date, fr) } else { time::date_time(&date, fr) }).unwrap_or_default();
                    out.push(row(vec![muted(&when), text(event["title"].as_str().unwrap_or_default()).grow()]).level(1));
                }
            }
        }
        "twitch" => {
            let login = prefs::text("ethone-twitch-login", "");
            if login.is_empty() {
                let draft = app.state.settings.twitch_draft.clone();
                out.push(row(vec![input("connections:twitch-draft", &draft, &tr("Ton pseudo Twitch", "Your Twitch username")), btn("connections:twitch-save", &tr("Afficher", "Show")).off(!valid_twitch(draft.trim()))]).level(1));
                return;
            }
            let holder = login.clone();
            let res = app.load("connections:twitch", move || api_data(&format!("api/twitch/channel?login={}", encode(&holder))));
            if let Some(message) = res.error {
                out.push(row(vec![muted(&error), link("connections:twitch-change", &tr("Changer", "Change"))]).level(1));
            } else if let Some(data) = res.data {
                let picture = app.img(data["profileImageUrl"].as_str().unwrap_or_default());
                let viewers = crate::pages::generic::number_text(data["stream"]["viewers"].as_f64().unwrap_or(0.0));
                let status = if data["live"] == true { tr(&format!("En direct, {viewers} spectateur(s) : {}", data["stream"]["title"].as_str().unwrap_or_default()), &format!("Live, {viewers} viewer(s): {}", data["stream"]["title"].as_str().unwrap_or_default())) } else { tr("Hors ligne", "Offline") };
                app.set("connections:url:twitch", &format!("https://www.twitch.tv/{login}"));
                out.push(row(vec![img(picture, 32.0).round(), stack(data["displayName"].as_str().unwrap_or(&login), &status), link("connections:twitch-change", &tr("Changer", "Change"))]).level(1).id("connections:open:twitch"));
            }
        }
        _ => {}
    }
}

pub fn view(app: &mut App) -> Vec<B> {
    let res = app.load("connections:list", || api("api/connections"));
    let (refresh, plug) = (app.icon("refresh-cw"), app.icon("plug"));
    let mut out = vec![head(&tr("Connexions", "Connections"), &tr("Tes services reliés à Ethone.", "Your services linked to Ethone."), vec![btn("connections:refresh", &t("refresh")).icon(refresh).off(res.loading), primary("connections:link", &tr("Connecter un service", "Link a service")).icon(plug)])];
    if let Some(message) = res.error.clone() {
        out.push(error(&message, vec![btn("connections:refresh", &t("retry"))]));
    }
    let Some(data) = res.data else {
        if res.loading {
            out.extend(skeletons(4, 56.0));
        }
        return out;
    };
    let rows = first_array(&data, None);
    let (linked, others): (Vec<&Value>, Vec<&Value>) = rows.iter().partition(|row| row["connected"] == true);
    if linked.is_empty() {
        out.push(empty(&tr("Aucun service relié", "No linked service"), &tr("Relie Spotify, GitHub, Google ou d'autres services sur ethone.dev.", "Link Spotify, GitHub, Google or others on ethone.dev.")));
    }
    for row_data in linked {
        let provider = row_data["provider"].as_str().unwrap_or_default().to_string();
        let (name, color) = brand(&provider);
        let mut badge = avatar(&name.chars().next().map_or(String::new(), |first| first.to_string()), slint::Image::default(), 34.0);
        badge.color = Some(hex(color));
        let mut cells = vec![badge, C { kind: "stack", title: name, sub: tr("Connecté", "Connected"), tone: "ok", weight: 1.0, ..Default::default() }];
        if app.state.settings.connection_confirm.as_deref() == Some(provider.as_str()) {
            cells.push(btn("connections:cancel", &tr("Annuler", "Cancel")));
            cells.push(danger(&format!("connections:disconnect:{provider}"), &tr("Confirmer", "Confirm")));
        } else {
            cells.push(btn(&format!("connections:ask:{provider}"), &tr("Déconnecter", "Disconnect")));
        }
        out.push(card(cells));
        detail(app, &provider, &mut out);
    }
    if !others.is_empty() {
        out.push(h2(&tr("Disponibles", "Available")));
        let lines = others.iter().map(|row_data| {
            let provider = row_data["provider"].as_str().unwrap_or_default();
            let (name, color) = brand(provider);
            let mut badge = avatar(&name.chars().next().map_or(String::new(), |first| first.to_string()), slint::Image::default(), 30.0);
            badge.color = Some(hex(color));
            row(vec![badge, strong(&name).grow(), link("connections:link", &tr("Connecter sur ethone.dev", "Link on ethone.dev"))])
        }).collect();
        out.extend(group(lines));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn twitch_logins_are_checked() {
        assert!(valid_twitch("rub_19"));
        assert!(!valid_twitch("ab"));
        assert!(!valid_twitch("nom avec espace"));
    }
}
