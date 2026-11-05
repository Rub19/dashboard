use reqwest::Method;
use serde_json::{json, Value};
use std::time::Duration;

const BOT_URL: &str = "https://bot.ethone.dev";
pub const LOGIN_URL: &str = "https://bot.ethone.dev/api/auth/login?return_to=ethone%3A%2F%2Fdiscord-auth";

fn token_entry() -> Result<keyring::Entry, String> {
    let service = if cfg!(debug_assertions) { "dev.ethone.desktop.debug" } else { "dev.ethone.desktop" };
    keyring::Entry::new(service, "discord-bot").map_err(|error| error.to_string())
}

pub fn linked() -> bool {
    token_entry().and_then(|entry| entry.get_password().map_err(|error| error.to_string())).is_ok()
}

pub fn sign_out() {
    if let Ok(entry) = token_entry() {
        let _ = entry.delete_credential();
    }
}

pub fn code_from_url(url: &str) -> Option<String> {
    let query = url.strip_prefix("ethone://discord-auth")?.strip_prefix(['?', '/'])?;
    let query = query.strip_prefix('?').unwrap_or(query);
    query.split('&').find_map(|pair| pair.strip_prefix("code=")).filter(|code| !code.is_empty()).map(str::to_string)
}

pub fn clean_path(path: &str) -> Result<&str, String> {
    let valid = path.starts_with("api/") && !path.starts_with("api/auth") && !path.starts_with("api/internal") && !path.contains("..") && !path.contains("://") && !path.chars().any(char::is_control);
    if valid {
        Ok(path)
    } else {
        Err("Requête refusée".into())
    }
}

pub struct Bot {
    client: reqwest::Client,
}

impl Bot {
    pub fn new() -> Self {
        Self { client: reqwest::Client::builder().timeout(Duration::from_secs(30)).build().unwrap_or_default() }
    }

    pub async fn exchange(&self, code: &str) -> Result<(), String> {
        let response = self
            .client
            .post(format!("{BOT_URL}/api/auth/mobile/exchange"))
            .json(&json!({ "code": code }))
            .send()
            .await
            .map_err(|_| "discordUnreachable".to_string())?;
        if !response.status().is_success() {
            return Err("discordLoginFailed".into());
        }
        let value: Value = response.json().await.map_err(|_| "discordLoginFailed".to_string())?;
        let token = value["token"].as_str().ok_or("discordLoginFailed")?;
        token_entry()?.set_password(token).map_err(|error| error.to_string())
    }

    pub async fn call(&self, method: Method, path: &str, body: Option<Value>) -> Result<Value, String> {
        let token = token_entry()?.get_password().map_err(|_| "discordRequired".to_string())?;
        let mut request = self.client.request(method, format!("{BOT_URL}/{path}")).bearer_auth(token);
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request.send().await.map_err(|_| "discordUnreachable".to_string())?;
        let status = response.status();
        if status == 401 {
            sign_out();
            return Err("discordRequired".into());
        }
        let text = response.text().await.map_err(|_| "discordUnreachable".to_string())?;
        let value: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        if !status.is_success() {
            let message = value["error"].as_str().or(value["message"].as_str()).map(str::to_string);
            return Err(message.unwrap_or_else(|| format!("Le bot a répondu {}", status.as_u16())));
        }
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_discord_link_gives_a_code() {
        assert_eq!(code_from_url("ethone://discord-auth?code=abc"), Some("abc".into()));
        assert_eq!(code_from_url("ethone://discord-auth/?code=abc&x=1"), Some("abc".into()));
        assert_eq!(code_from_url("ethone://auth-callback?code=abc"), None);
        assert_eq!(code_from_url("ethone://discord-authx?code=abc"), None);
        assert_eq!(code_from_url("ethone://discord-auth?code="), None);
    }

    #[test]
    fn bot_calls_cannot_reach_auth_or_internal_routes() {
        assert!(clean_path("api/guilds").is_ok());
        assert!(clean_path("api/auth/me").is_err());
        assert!(clean_path("api/internal/x").is_err());
        assert!(clean_path("api/../x").is_err());
        assert!(clean_path("guilds").is_err());
    }
}
