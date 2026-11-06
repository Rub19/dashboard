use crate::app::{spawn, App, Page};
use crate::i18n::tr;
use crate::pages::{section, set_section};
use crate::prefs;
use crate::services::api_m;
use crate::vm::*;
use serde::{Deserialize, Serialize};
use serde_json::json;

const SECTION_KEY: &str = "ethone-section-brain";
const CHAT_KEY: &str = "ethone-brain-chat";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Default)]
pub struct BrainState {
    pub messages: Option<Vec<Message>>,
    pub input: String,
    pub busy: bool,
    pub error: Option<String>,
    pub reveal: Option<(usize, f64)>,
}

pub fn answer_of(value: &serde_json::Value) -> String {
    let data = crate::services::unwrap_data(value.clone());
    ["content", "text", "message", "output"].iter().find_map(|key| data[*key].as_str().map(str::to_string)).unwrap_or_default()
}

pub fn revealed(text: &str, elapsed_ms: f64) -> (String, bool) {
    let tokens: Vec<&str> = text.split_inclusive(char::is_whitespace).collect();
    let step = (tokens.len() as f64 / 150.0).ceil().max(1.0);
    let count = ((elapsed_ms / 28.0).floor() * step) as usize;
    if count >= tokens.len() {
        return (text.to_string(), true);
    }
    (tokens[..count].concat(), false)
}

fn side() -> Vec<(String, String, String, String)> {
    vec![
        ("brain:section:chat".into(), "Brain".into(), "message-square".into(), String::new()),
        ("brain:section:briefing".into(), tr("Résumé du jour", "Daily briefing"), "sparkles".into(), String::new()),
        (String::new(), tr("Automatisations", "Automation"), String::new(), String::new()),
        ("brain:section:flows".into(), "Flows".into(), "workflow".into(), String::new()),
        ("brain:section:macros".into(), "Macros".into(), "zap".into(), String::new()),
        ("brain:section:rules".into(), tr("Règles", "Rules"), "clock".into(), String::new()),
        ("brain:section:interactions".into(), tr("Interactions", "Interactions"), "activity".into(), String::new()),
        (String::new(), tr("Personnalisation", "Personalization"), String::new(), String::new()),
        ("brain:section:personas".into(), "Personas".into(), "bot".into(), String::new()),
    ]
}

fn messages(app: &mut App) -> &mut Vec<Message> {
    app.state.brain.messages.get_or_insert_with(|| prefs::read_json(CHAT_KEY).unwrap_or_default())
}

fn store(list: &[Message]) {
    let keep = list.len().saturating_sub(100);
    prefs::write_json(CHAT_KEY, &list[keep..].to_vec());
}

fn ask(app: &mut App) {
    let history: Vec<Message> = messages(app).clone();
    let keep = history.len().saturating_sub(20);
    let body = json!({ "messages": history[keep..].to_vec() });
    app.state.brain.busy = true;
    app.state.brain.error = None;
    spawn(api_m("POST", "api/brain/complete", Some(body)), |app, result| {
        app.state.brain.busy = false;
        match result {
            Ok(value) => {
                let list = messages(app);
                list.push(Message { role: "assistant".into(), content: answer_of(&value) });
                let at = list.len() - 1;
                store(list);
                app.state.brain.reveal = if crate::theme::reduced_motion() { None } else { Some((at, crate::logic::time::now_ms())) };
            }
            Err(error) => app.state.brain.error = Some(crate::i18n::error_text(&error)),
        }
    });
}

fn say(app: &mut App, text: &str) {
    let clean = text.trim().to_string();
    if clean.is_empty() || app.state.brain.busy {
        return;
    }
    let list = messages(app);
    list.push(Message { role: "user".into(), content: clean.chars().take(8000).collect() });
    store(list);
    app.state.brain.input.clear();
    ask(app);
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, arg) = id.split_once(':').unwrap_or((id, ""));
    match verb {
        "section" => set_section(SECTION_KEY, arg),
        "input" => app.state.brain.input = value.into(),
        "input:submit" | "send" => {
            let text = app.state.brain.input.clone();
            say(app, &text);
        }
        "suggest" => say(app, value_or(arg)),
        "retry" => ask(app),
        "clear" => {
            app.state.brain.messages = Some(Vec::new());
            app.state.brain.reveal = None;
            app.state.brain.error = None;
            prefs::write_json(CHAT_KEY, &Vec::<Message>::new());
        }
        "skip" => app.state.brain.reveal = None,
        "copy" => {
            let text = arg.parse::<usize>().ok().and_then(|at| messages(app).get(at).map(|message| message.content.clone())).unwrap_or_default();
            match crate::clipboard::set(&text) {
                Ok(()) => app.toast(&tr("Copié", "Copied")),
                Err(_) => app.toast_bad(&tr("Impossible de copier. Sélectionne le texte à la main.", "Could not copy. Select the text by hand.")),
            }
        }
        other => crate::pages::brain_extras::act(app, other, arg, value),
    }
}

fn value_or(arg: &str) -> &str {
    arg
}

fn suggestions() -> Vec<String> {
    vec![tr("Écris un mail pour décaler un rendez-vous", "Write an email to move a meeting"), tr("Aide-moi à organiser ma semaine", "Help me plan my week"), tr("Explique-moi un sujet simplement", "Explain a topic simply"), tr("Traduis un texte en anglais", "Translate a text into English")]
}

fn chat(app: &mut App) -> Vec<B> {
    let list = messages(app).clone();
    let state = &app.state.brain;
    let (busy, input_text, error_text, reveal) = (state.busy, state.input.clone(), state.error.clone(), state.reveal);
    let orb = if busy { "thinking" } else if reveal.is_some() { "speaking" } else { "idle" };
    let (trash, copy, retry, send) = (app.icon("trash2"), app.icon("copy"), app.icon("rotate-ccw"), app.icon("arrow-up"));
    let status = match orb { "thinking" => tr("Réfléchit…", "Thinking…"), "speaking" => tr("Répond…", "Answering…"), _ => tr("La conversation reste sur ce PC", "The conversation stays on this PC") };
    let mut top = vec![C { kind: "orb", tone: orb, size: 26.0, ..Default::default() }, stack("Brain", &status)];
    if !list.is_empty() {
        top.push(btn("brain:clear", &tr("Effacer", "Clear")).icon(trash));
    }
    let mut out = vec![row(top)];
    if list.is_empty() && !busy {
        out.push(B { kind: "orb", tone: "idle", height: 92.0, ..Default::default() });
        out.push(B { kind: "head", title: tr("Que veux-tu faire ?", "What do you want to do?"), extra: "center", ..Default::default() });
        let picks: Vec<C> = suggestions().iter().map(|label| chip(&format!("brain:suggest:{label}"), label)).collect();
        for chunk in picks.chunks(2) {
            out.push(row(chunk.to_vec()).center().gap(8.0));
        }
    }
    let mut finished_reveal = false;
    for (at, message) in list.iter().enumerate() {
        if message.role == "user" {
            out.push(B { kind: "bubble", tone: "user", title: message.content.clone(), ..Default::default() });
            continue;
        }
        let (shown, done) = match reveal {
            Some((index, started)) if index == at => revealed(&message.content, crate::logic::time::now_ms() - started),
            _ => (message.content.clone(), true),
        };
        if !done || reveal.is_some_and(|(index, _)| index == at) {
            finished_reveal = done;
        }
        let mut bubble = B { kind: "bubble", tone: "assistant", title: shown, id: if done { String::new() } else { "brain:skip".into() }, ..Default::default() };
        if done {
            bubble.cells = vec![ibtn(&format!("brain:copy:{at}"), copy.clone(), &tr("Copier la réponse", "Copy the answer"))];
        }
        bubble.on = !done;
        out.push(bubble);
    }
    if finished_reveal {
        app.state.brain.reveal = None;
    }
    if busy {
        out.push(B { kind: "bubble", tone: "assistant", title: "…".into(), busy: true, ..Default::default() });
    }
    if let Some(message) = error_text {
        let mut cells = Vec::new();
        if list.last().is_some_and(|last| last.role == "user") {
            cells.push(btn("brain:retry", &tr("Réessayer", "Retry")).icon(retry));
        }
        out.push(error(&message, cells));
    }
    out.push(row(vec![input("brain:input", &input_text, &tr("Écris à Brain", "Message Brain")).tip(&tr("Message pour Brain", "Message for Brain")), ibtn("brain:send", send, &tr("Envoyer (Entrée)", "Send (Enter)")).off(busy || input_text.trim().is_empty())]));
    out
}

pub fn view(app: &mut App) -> Page {
    let current = section(SECTION_KEY, "chat");
    let main = match current.as_str() {
        "chat" => chat(app),
        other => crate::pages::brain_extras::view(app, other),
    };
    Page { side: side(), side_active: format!("brain:section:{current}"), main, ..Default::default() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_answer_comes_from_any_known_field() {
        assert_eq!(answer_of(&json!({ "data": { "content": "a" } })), "a");
        assert_eq!(answer_of(&json!({ "output": "b" })), "b");
        assert_eq!(answer_of(&json!({})), "");
    }

    #[test]
    fn words_appear_over_time_then_all_at_once() {
        let (start, done) = revealed("un deux trois", 0.0);
        assert!(start.is_empty() && !done);
        let (some, _) = revealed("un deux trois", 60.0);
        assert_eq!(some, "un deux ");
        assert_eq!(revealed("un deux trois", 100000.0), ("un deux trois".to_string(), true));
    }
}
