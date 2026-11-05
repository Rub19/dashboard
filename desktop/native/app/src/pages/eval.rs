use crate::app::App;
use crate::i18n::error_text;

pub fn login_event(app: &mut App, status: &str, message: Option<String>) {
    app.forget("eval:");
    match status {
        "failed" => {
            let text = error_text(message.as_deref().unwrap_or("riotFailed"));
            app.toast_bad(&text);
        }
        "linked" => crate::cache::clear("riot:"),
        _ => {}
    }
}
