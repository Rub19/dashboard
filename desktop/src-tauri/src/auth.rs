use base64::prelude::{Engine, BASE64_URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::sync::Mutex;

const SUPABASE_URL: &str = "https://bvgifyzhpzkbrwdjrqsg.supabase.co";
const WORKER_URL: &str = "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";
const ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc";
pub const OAUTH_REDIRECT: &str = "ethone://auth-callback";
const PROVIDERS: [&str; 3] = ["google", "github", "discord"];
const MAX_STORED: usize = 1000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub email: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "stage", rename_all = "camelCase")]
pub enum Stage {
    SignedOut,
    MfaRequired { profile: Profile },
    SignedIn { profile: Profile, offline: bool },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct Stored {
    refresh: String,
    profile: Profile,
    mfa_pending: bool,
}

#[derive(Debug, Clone)]
struct Tokens {
    access: String,
    refresh: String,
    profile: Profile,
}

#[derive(Debug, PartialEq, Eq)]
enum Failure {
    Network,
    Status(u16, Option<String>),
}

pub struct Api {
    client: reqwest::Client,
    auth_base: String,
    worker_base: String,
}

fn profile_from(user: &Value) -> Profile {
    let email = user["email"].as_str().unwrap_or_default().to_string();
    let meta = &user["user_metadata"];
    let name = ["username", "preferred_username", "full_name", "name", "user_name"]
        .iter()
        .find_map(|key| meta[*key].as_str().filter(|text| !text.is_empty()))
        .map(str::to_string)
        .unwrap_or_else(|| email.split('@').next().unwrap_or_default().to_string());
    let avatar = meta["avatar_url"]
        .as_str()
        .filter(|url| url.starts_with("https://"))
        .map(str::to_string);
    Profile { email, name, avatar }
}

fn error_code(body: &Value) -> Option<String> {
    [&body["error_code"], &body["code"], &body["error"]["code"], &body["error"]]
        .iter()
        .find_map(|value| value.as_str().map(str::to_string))
}

fn user_error(failure: Failure, invalid: &str) -> String {
    match failure {
        Failure::Network => "network".into(),
        Failure::Status(429, _) => "rateLimited".into(),
        Failure::Status(400..=403 | 422, _) => invalid.into(),
        Failure::Status(..) => "server".into(),
    }
}

pub fn challenge(verifier: &str) -> String {
    BASE64_URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

fn random_verifier() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|e| e.to_string())?;
    Ok(BASE64_URL_SAFE_NO_PAD.encode(bytes))
}

pub fn parse_callback(url: &str) -> Result<String, String> {
    let parsed = reqwest::Url::parse(url).map_err(|_| "oauthFailed".to_string())?;
    if parsed.scheme() != "ethone" || parsed.host_str() != Some("auth-callback") {
        return Err("oauthFailed".into());
    }
    parsed
        .query_pairs()
        .find(|(key, value)| key == "code" && !value.is_empty())
        .map(|(_, value)| value.into_owned())
        .ok_or_else(|| "oauthFailed".to_string())
}

fn device_name() -> String {
    let computer = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "PC".into());
    format!("Ethone Desktop · {computer}")
}

fn stage_after_device(profile: Profile, result: Result<Value, Failure>) -> Result<Stage, ()> {
    match result {
        Ok(body) if body["data"]["mfa_pending"].as_bool() == Some(true) => Ok(Stage::MfaRequired { profile }),
        Err(Failure::Status(_, Some(code))) if code == "MFA_REQUIRED" => Ok(Stage::MfaRequired { profile }),
        Err(Failure::Status(_, Some(code))) if code == "SESSION_REVOKED" => Err(()),
        Err(Failure::Network) => Ok(Stage::SignedIn { profile, offline: true }),
        _ => Ok(Stage::SignedIn { profile, offline: false }),
    }
}

impl Api {
    pub fn production() -> Result<Self, String> {
        #[cfg(debug_assertions)]
        if let Ok(base) = std::env::var("ETHONE_AUTH_BASE") {
            return Self::new(&base, &base, false);
        }
        Self::new(SUPABASE_URL, WORKER_URL, true)
    }

    fn new(auth_base: &str, worker_base: &str, https_only: bool) -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .user_agent(concat!("EthoneDesktop/", env!("CARGO_PKG_VERSION")))
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(20))
            .https_only(https_only)
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self { client, auth_base: auth_base.into(), worker_base: worker_base.into() })
    }

    async fn send(&self, request: reqwest::RequestBuilder) -> Result<Value, Failure> {
        let response = request.send().await.map_err(|_| Failure::Network)?;
        let status = response.status().as_u16();
        let body: Value = response.json().await.unwrap_or(Value::Null);
        if (200..300).contains(&status) {
            Ok(body)
        } else {
            Err(Failure::Status(status, error_code(&body)))
        }
    }

    async fn auth_post(&self, path: &str, body: Value) -> Result<Value, Failure> {
        let url = format!("{}/auth/v1/{path}", self.auth_base);
        self.send(self.client.post(url).header("apikey", ANON_KEY).json(&body)).await
    }

    fn tokens(body: &Value) -> Result<Tokens, Failure> {
        match (body["access_token"].as_str(), body["refresh_token"].as_str()) {
            (Some(access), Some(refresh)) => Ok(Tokens {
                access: access.into(),
                refresh: refresh.into(),
                profile: profile_from(&body["user"]),
            }),
            _ => Err(Failure::Status(500, None)),
        }
    }

    async fn grant(&self, kind: &str, body: Value) -> Result<Tokens, Failure> {
        Self::tokens(&self.auth_post(&format!("token?grant_type={kind}"), body).await?)
    }

    async fn verify_otp(&self, email: &str, token: &str) -> Result<Tokens, Failure> {
        Self::tokens(&self.auth_post("verify", json!({ "email": email, "token": token, "type": "email" })).await?)
    }

    async fn worker_post(&self, path: &str, access: &str, body: Value) -> Result<Value, Failure> {
        let url = format!("{}/{path}", self.worker_base);
        self.send(self.client.post(url).bearer_auth(access).json(&body)).await
    }
}

fn vault_service() -> &'static str {
    if cfg!(debug_assertions) {
        "dev.ethone.desktop.debug"
    } else {
        "dev.ethone.desktop"
    }
}

fn vault() -> Result<keyring::Entry, String> {
    keyring::Entry::new(vault_service(), "session").map_err(|e| e.to_string())
}

fn serialize_stored(stored: &Stored) -> Result<String, String> {
    let text = serde_json::to_string(stored).map_err(|e| e.to_string())?;
    if text.len() <= MAX_STORED {
        return Ok(text);
    }
    let mut smaller = stored.clone();
    smaller.profile.avatar = None;
    serde_json::to_string(&smaller).map_err(|e| e.to_string())
}

fn vault_load() -> Option<Stored> {
    serde_json::from_str(&vault().ok()?.get_password().ok()?).ok()
}

fn vault_save(stored: &Stored) {
    if let (Ok(entry), Ok(text)) = (vault(), serialize_stored(stored)) {
        let _ = entry.set_password(&text);
    }
}

fn vault_clear() {
    if let Ok(entry) = vault() {
        let _ = entry.delete_credential();
    }
}

#[derive(Default)]
struct Inner {
    access: Option<String>,
    refresh: Option<String>,
    profile: Option<Profile>,
    stage: Option<Stage>,
    verifier: Option<String>,
    remember: bool,
}

pub struct Auth {
    api: Api,
    inner: Mutex<Inner>,
}

impl Auth {
    pub fn new(api: Api) -> Self {
        Self { api, inner: Mutex::new(Inner { remember: true, ..Default::default() }) }
    }

    async fn establish(&self, tokens: Tokens, remember: bool) -> Stage {
        let device = self
            .api
            .worker_post("api/auth/device", &tokens.access, json!({ "name": device_name() }))
            .await;
        let stage = stage_after_device(tokens.profile.clone(), device).unwrap_or(Stage::SignedOut);
        let mut inner = self.inner.lock().await;
        inner.remember = remember;
        if stage == Stage::SignedOut {
            vault_clear();
            *inner = Inner { remember: true, stage: Some(Stage::SignedOut), ..Default::default() };
            return Stage::SignedOut;
        }
        if remember {
            vault_save(&Stored {
                refresh: tokens.refresh.clone(),
                profile: tokens.profile.clone(),
                mfa_pending: matches!(stage, Stage::MfaRequired { .. }),
            });
        } else {
            vault_clear();
        }
        inner.access = Some(tokens.access);
        inner.refresh = Some(tokens.refresh);
        inner.profile = Some(tokens.profile);
        inner.stage = Some(stage.clone());
        stage
    }

    pub async fn current(&self) -> Stage {
        if let Some(stage) = self.inner.lock().await.stage.clone() {
            return stage;
        }
        self.restore().await
    }

    pub async fn is_signed_in(&self) -> bool {
        matches!(self.inner.lock().await.stage, Some(Stage::SignedIn { .. }))
    }

    async fn restore(&self) -> Stage {
        let Some(stored) = vault_load() else {
            self.inner.lock().await.stage = Some(Stage::SignedOut);
            return Stage::SignedOut;
        };
        match self.api.grant("refresh_token", json!({ "refresh_token": stored.refresh })).await {
            Ok(tokens) => self.establish(tokens, true).await,
            Err(Failure::Network) | Err(Failure::Status(500..=599, _)) => {
                let stage = if stored.mfa_pending {
                    Stage::MfaRequired { profile: stored.profile.clone() }
                } else {
                    Stage::SignedIn { profile: stored.profile.clone(), offline: true }
                };
                let mut inner = self.inner.lock().await;
                inner.refresh = Some(stored.refresh);
                inner.profile = Some(stored.profile);
                inner.stage = Some(stage.clone());
                stage
            }
            Err(_) => {
                vault_clear();
                self.inner.lock().await.stage = Some(Stage::SignedOut);
                Stage::SignedOut
            }
        }
    }

    pub async fn password(&self, email: &str, password: &str, remember: bool) -> Result<Stage, String> {
        let tokens = self
            .api
            .grant("password", json!({ "email": email, "password": password }))
            .await
            .map_err(|e| user_error(e, "invalidCredentials"))?;
        Ok(self.establish(tokens, remember).await)
    }

    pub async fn otp_send(&self, email: &str) -> Result<(), String> {
        self.api
            .auth_post("otp", json!({ "email": email, "create_user": false }))
            .await
            .map(|_| ())
            .map_err(|e| user_error(e, "otpRefused"))
    }

    pub async fn otp_verify(&self, email: &str, code: &str, remember: bool) -> Result<Stage, String> {
        let tokens = self.api.verify_otp(email, code).await.map_err(|e| user_error(e, "invalidCode"))?;
        Ok(self.establish(tokens, remember).await)
    }

    pub async fn oauth_url(&self, provider: &str) -> Result<String, String> {
        if !PROVIDERS.contains(&provider) {
            return Err("oauthFailed".into());
        }
        let verifier = random_verifier()?;
        let mut url = reqwest::Url::parse(&format!("{}/auth/v1/authorize", self.api.auth_base)).map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .append_pair("provider", provider)
            .append_pair("redirect_to", OAUTH_REDIRECT)
            .append_pair("code_challenge", &challenge(&verifier))
            .append_pair("code_challenge_method", "s256");
        self.inner.lock().await.verifier = Some(verifier);
        Ok(url.into())
    }

    pub async fn oauth_cancel(&self) {
        self.inner.lock().await.verifier = None;
    }

    pub async fn oauth_finish(&self, url: &str) -> Result<Stage, String> {
        let code = parse_callback(url)?;
        let verifier = self.inner.lock().await.verifier.take().ok_or("oauthFailed")?;
        let tokens = self
            .api
            .grant("pkce", json!({ "auth_code": code, "code_verifier": verifier }))
            .await
            .map_err(|e| user_error(e, "oauthFailed"))?;
        Ok(self.establish(tokens, true).await)
    }

    pub async fn mfa(&self, code: Option<String>, backup_code: Option<String>) -> Result<Stage, String> {
        let (access, profile, remember, refresh) = {
            let inner = self.inner.lock().await;
            (inner.access.clone(), inner.profile.clone(), inner.remember, inner.refresh.clone())
        };
        let (access, profile) = access.zip(profile).ok_or("network")?;
        self.api
            .worker_post("api/auth/totp/challenge", &access, json!({ "code": code, "backupCode": backup_code }))
            .await
            .map_err(|e| user_error(e, "invalidCode"))?;
        let stage = Stage::SignedIn { profile: profile.clone(), offline: false };
        if remember {
            if let Some(refresh) = refresh {
                vault_save(&Stored { refresh, profile, mfa_pending: false });
            }
        }
        self.inner.lock().await.stage = Some(stage.clone());
        Ok(stage)
    }

    pub async fn sign_out(&self) {
        let access = self.inner.lock().await.access.clone();
        if let Some(access) = access {
            let url = format!("{}/auth/v1/logout?scope=local", self.api.auth_base);
            let request = self.api.client.post(url).header("apikey", ANON_KEY).bearer_auth(access);
            let _ = self.api.send(request).await;
        }
        vault_clear();
        *self.inner.lock().await = Inner { remember: true, stage: Some(Stage::SignedOut), ..Default::default() };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn mock(routes: HashMap<&'static str, (u16, String)>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                let mut stream = stream.unwrap();
                let mut buffer = [0u8; 8192];
                let read = stream.read(&mut buffer).unwrap_or(0);
                let head = String::from_utf8_lossy(&buffer[..read]);
                let path = head.split_whitespace().nth(1).unwrap_or_default().to_string();
                let (status, body) = routes
                    .iter()
                    .find(|(route, _)| path.starts_with(**route))
                    .map(|(_, reply)| reply.clone())
                    .unwrap_or((404, "{}".into()));
                let reply = format!("HTTP/1.1 {status} X\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
                let _ = stream.write_all(reply.as_bytes());
            }
        });
        format!("http://{address}")
    }

    const TOKEN: &str = r#"{"access_token":"a","refresh_token":"r","user":{"email":"t@example.test","user_metadata":{"username":"Test"}}}"#;

    #[test]
    fn pkce_matches_the_rfc_7636_vector() {
        assert_eq!(challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn callback_must_be_ours_and_hold_a_code() {
        assert_eq!(parse_callback("ethone://auth-callback?code=abc").unwrap(), "abc");
        assert!(parse_callback("ethone://auth-callback?error=denied").is_err());
        assert!(parse_callback("ethone://other?code=abc").is_err());
        assert!(parse_callback("https://evil.test/auth-callback?code=abc").is_err());
    }

    #[test]
    fn profile_prefers_the_username_then_the_address() {
        let named = profile_from(&json!({"email":"a@b.c","user_metadata":{"full_name":"Rub","avatar_url":"https://x/y.png"}}));
        assert_eq!(named.name, "Rub");
        assert_eq!(named.avatar.as_deref(), Some("https://x/y.png"));
        let bare = profile_from(&json!({"email":"rub@b.c","user_metadata":{"avatar_url":"http://x/y.png"}}));
        assert_eq!(bare.name, "rub");
        assert_eq!(bare.avatar, None);
    }

    #[test]
    fn device_answer_decides_the_stage() {
        let profile = Profile { email: "a".into(), name: "a".into(), avatar: None };
        let signed = |offline| Stage::SignedIn { profile: profile.clone(), offline };
        assert_eq!(stage_after_device(profile.clone(), Ok(json!({"data":{"mfa_pending":false}}))), Ok(signed(false)));
        assert_eq!(
            stage_after_device(profile.clone(), Ok(json!({"data":{"mfa_pending":true}}))),
            Ok(Stage::MfaRequired { profile: profile.clone() })
        );
        assert_eq!(
            stage_after_device(profile.clone(), Err(Failure::Status(401, Some("MFA_REQUIRED".into())))),
            Ok(Stage::MfaRequired { profile: profile.clone() })
        );
        assert_eq!(stage_after_device(profile.clone(), Err(Failure::Status(401, Some("SESSION_REVOKED".into())))), Err(()));
        assert_eq!(stage_after_device(profile.clone(), Err(Failure::Network)), Ok(signed(true)));
    }

    #[test]
    fn stored_session_fits_credential_manager() {
        let stored = Stored {
            refresh: "r".into(),
            mfa_pending: false,
            profile: Profile { email: "a".into(), name: "a".into(), avatar: Some("x".repeat(3000)) },
        };
        let text = serialize_stored(&stored).unwrap();
        assert!(text.len() <= MAX_STORED);
        assert!(!text.contains("xxx"));
    }

    #[tokio::test]
    async fn password_grant_reads_tokens_and_maps_errors() {
        let good = mock(HashMap::from([("/auth/v1/token", (200, TOKEN.to_string()))]));
        let api = Api::new(&good, &good, false).unwrap();
        let tokens = api.grant("password", json!({})).await.unwrap();
        assert_eq!(tokens.refresh, "r");
        assert_eq!(tokens.profile.name, "Test");

        let bad = mock(HashMap::from([("/auth/v1/token", (400, r#"{"error_code":"invalid_credentials"}"#.to_string()))]));
        let api = Api::new(&bad, &bad, false).unwrap();
        let failure = api.grant("password", json!({})).await.unwrap_err();
        assert_eq!(user_error(failure, "invalidCredentials"), "invalidCredentials");

        let limited = mock(HashMap::from([("/auth/v1/token", (429, "{}".to_string()))]));
        let api = Api::new(&limited, &limited, false).unwrap();
        assert_eq!(user_error(api.grant("password", json!({})).await.unwrap_err(), "x"), "rateLimited");
    }

    #[tokio::test]
    async fn an_unreachable_server_is_a_network_failure() {
        let api = Api::new("http://127.0.0.1:9", "http://127.0.0.1:9", false).unwrap();
        assert_eq!(api.grant("password", json!({})).await.unwrap_err(), Failure::Network);
    }

    #[tokio::test]
    async fn oauth_needs_a_known_provider_and_a_pending_login() {
        let auth = Auth::new(Api::new("http://127.0.0.1:9", "http://127.0.0.1:9", false).unwrap());
        assert!(auth.oauth_url("evil").await.is_err());
        assert_eq!(auth.oauth_finish("ethone://auth-callback?code=x").await.unwrap_err(), "oauthFailed");
        let url = auth.oauth_url("discord").await.unwrap();
        assert!(url.contains("redirect_to=ethone%3A%2F%2Fauth-callback"));
        assert!(url.contains("code_challenge_method=s256"));
        auth.oauth_cancel().await;
        assert_eq!(auth.oauth_finish("ethone://auth-callback?code=x").await.unwrap_err(), "oauthFailed");
    }

    #[tokio::test]
    async fn modules_stay_locked_until_signed_in() {
        let auth = Auth::new(Api::new("http://127.0.0.1:9", "http://127.0.0.1:9", false).unwrap());
        assert!(!auth.is_signed_in().await);
    }
}
