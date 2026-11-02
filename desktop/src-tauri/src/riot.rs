use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tokio::sync::{oneshot, Mutex};

const AUTHORIZE: &str = "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid";
const CLIENT_PLATFORM: &str = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";
const LOGIN_LABEL: &str = "riot-login";
const SILENT_LABEL: &str = "riot-silent";
const SILENT_TIMEOUT: Duration = Duration::from_secs(20);
const SILENT_RETRY: Duration = Duration::from_secs(300);

#[derive(Debug, PartialEq)]
pub struct Tokens {
    access: String,
    id: String,
    expires_in: u64,
}

#[derive(Clone)]
struct Credentials {
    access: String,
    entitlements: String,
    expires: Instant,
    puuid: String,
    shard: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Identity {
    pub puuid: String,
    pub name: String,
    pub tag: String,
    pub region: String,
}

#[derive(Debug, PartialEq, Serialize)]
pub struct HistoryPoint {
    #[serde(rename = "match")]
    id: String,
    tier: i64,
    rr: i64,
    change: i64,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rank {
    tier: i64,
    rr: i64,
    peak_tier: i64,
    leaderboard_rank: i64,
    history: Vec<HistoryPoint>,
}

#[derive(Clone, Serialize)]
struct LoginEvent {
    status: &'static str,
    message: Option<String>,
}

pub fn tokens_from_url(url: &Url) -> Option<Tokens> {
    let host = url.host_str()?;
    if host != "playvalorant.com" && !host.ends_with(".playvalorant.com") {
        return None;
    }
    let mut access = None;
    let mut id = None;
    let mut expires_in = 3600;
    for pair in url.fragment()?.split('&') {
        match pair.split_once('=')? {
            ("access_token", value) => access = Some(value.to_string()),
            ("id_token", value) => id = Some(value.to_string()),
            ("expires_in", value) => expires_in = value.parse().unwrap_or(3600),
            _ => {}
        }
    }
    Some(Tokens { access: access?, id: id?, expires_in })
}

pub fn shard_for(region: &str) -> &str {
    if region == "latam" || region == "br" {
        "na"
    } else {
        region
    }
}

pub fn parse_rank(player: &Value, updates: &Value) -> Rank {
    let latest = &player["LatestCompetitiveUpdate"];
    let seasons = player["QueueSkills"]["competitive"]["SeasonalInfoBySeasonID"].as_object();
    let season = latest["SeasonID"].as_str().and_then(|id| seasons?.iter().find(|(key, _)| key.eq_ignore_ascii_case(id)).map(|(_, value)| value));
    let number = |value: &Value| value.as_i64().unwrap_or(0);
    let mut tier = number(&latest["TierAfterUpdate"]);
    if tier == 0 {
        tier = season.map_or(0, |info| number(&info["CompetitiveTier"]));
    }
    let peak_tier = seasons
        .into_iter()
        .flat_map(|all| all.values())
        .filter_map(|info| info["WinsByTier"].as_object())
        .flat_map(|wins| wins.keys())
        .filter_map(|key| key.parse::<i64>().ok())
        .max()
        .unwrap_or(0)
        .max(tier);
    let history = updates["Matches"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|update| {
            Some(HistoryPoint {
                id: update["MatchID"].as_str()?.to_lowercase(),
                tier: number(&update["TierAfterUpdate"]),
                rr: number(&update["RankedRatingAfterUpdate"]),
                change: number(&update["RankedRatingEarned"]),
            })
        })
        .collect();
    Rank {
        tier,
        rr: number(&latest["RankedRatingAfterUpdate"]),
        peak_tier,
        leaderboard_rank: season.map_or(0, |info| number(&info["LeaderboardRank"])),
        history,
    }
}

fn identity_entry() -> Result<keyring::Entry, String> {
    let service = if cfg!(debug_assertions) { "dev.ethone.desktop.debug" } else { "dev.ethone.desktop" };
    keyring::Entry::new(service, "riot-identity").map_err(|error| error.to_string())
}

pub fn load_identity() -> Option<Identity> {
    serde_json::from_str(&identity_entry().ok()?.get_password().ok()?).ok()
}

fn open_window(app: &AppHandle, label: &str, visible: bool, sender: oneshot::Sender<Tokens>) -> Result<WebviewWindow, String> {
    let directory = app.path().app_local_data_dir().map_err(|error| error.to_string())?.join("riot-web");
    let authorize: Url = AUTHORIZE.parse().map_err(|_| "riotFailed".to_string())?;
    let sender = Arc::new(StdMutex::new(Some(sender)));
    let on_navigate = sender.clone();
    let window = WebviewWindowBuilder::new(app, label, WebviewUrl::External(authorize))
        .title("Compte Riot")
        .inner_size(480.0, 720.0)
        .visible(visible)
        .data_directory(directory)
        .on_navigation(move |url| {
            if let Some(tokens) = tokens_from_url(url) {
                if let Some(sender) = on_navigate.lock().ok().and_then(|mut slot| slot.take()) {
                    let _ = sender.send(tokens);
                }
                return false;
            }
            url.scheme() == "https"
        })
        .build()
        .map_err(|error| error.to_string())?;
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Ok(mut slot) = sender.lock() {
                slot.take();
            }
        }
    });
    Ok(window)
}

pub struct Riot {
    client: reqwest::Client,
    credentials: Mutex<Option<Credentials>>,
    version: Mutex<String>,
    silent: Mutex<Option<Instant>>,
}

impl Riot {
    pub fn new() -> Self {
        let client = reqwest::Client::builder().timeout(Duration::from_secs(15)).build().unwrap_or_default();
        Self { client, credentials: Mutex::new(None), version: Mutex::new(String::new()), silent: Mutex::new(None) }
    }

    async fn json(&self, request: reqwest::RequestBuilder) -> Result<Value, String> {
        let Some(retry) = request.try_clone() else { return Err("riotFailed".into()) };
        let mut response = request.send().await.map_err(|_| "riotUnreachable".to_string())?;
        if response.status() == 429 {
            tokio::time::sleep(Duration::from_secs(3)).await;
            response = retry.send().await.map_err(|_| "riotUnreachable".to_string())?;
        }
        match response.status().as_u16() {
            401 | 403 => Err("riotExpired".into()),
            status if !(200..300).contains(&status) => Err("riotFailed".into()),
            _ => response.json().await.map_err(|_| "riotFailed".to_string()),
        }
    }

    async fn complete(&self, tokens: Tokens) -> Result<Identity, String> {
        let entitlements = self.json(self.client.post("https://entitlements.auth.riotgames.com/api/token/v1").bearer_auth(&tokens.access).json(&json!({}))).await?;
        let info = self.json(self.client.get("https://auth.riotgames.com/userinfo").bearer_auth(&tokens.access)).await?;
        let geo = self
            .json(self.client.put("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant").bearer_auth(&tokens.access).json(&json!({ "id_token": tokens.id })))
            .await
            .unwrap_or(Value::Null);
        let region = geo["affinities"]["live"].as_str().unwrap_or("eu").to_string();
        let puuid = info["sub"].as_str().ok_or("riotFailed")?.to_string();
        let identity = Identity {
            puuid: puuid.clone(),
            name: info["acct"]["game_name"].as_str().unwrap_or_default().to_string(),
            tag: info["acct"]["tag_line"].as_str().unwrap_or_default().to_string(),
            region: region.clone(),
        };
        *self.credentials.lock().await = Some(Credentials {
            access: tokens.access,
            entitlements: entitlements["entitlements_token"].as_str().ok_or("riotFailed")?.to_string(),
            expires: Instant::now() + Duration::from_secs(tokens.expires_in.saturating_sub(60)),
            puuid,
            shard: shard_for(&region).to_string(),
        });
        *self.silent.lock().await = None;
        let text = serde_json::to_string(&identity).map_err(|error| error.to_string())?;
        identity_entry()?.set_password(&text).map_err(|error| error.to_string())?;
        Ok(identity)
    }

    pub async fn login(&'static self, app: AppHandle) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(LOGIN_LABEL) {
            let _ = window.set_focus();
            return Ok(());
        }
        let (sender, receiver) = oneshot::channel();
        let window = open_window(&app, LOGIN_LABEL, true, sender)?;
        tauri::async_runtime::spawn(async move {
            let event = match receiver.await {
                Ok(tokens) => match self.complete(tokens).await {
                    Ok(_) => LoginEvent { status: "linked", message: None },
                    Err(message) => LoginEvent { status: "failed", message: Some(message) },
                },
                Err(_) => LoginEvent { status: "cancelled", message: None },
            };
            let _ = window.close();
            let _ = app.emit_to("main", "riot-login", event);
        });
        Ok(())
    }

    async fn silent_login(&self, app: &AppHandle) -> Result<(), String> {
        let (sender, receiver) = oneshot::channel();
        let window = open_window(app, SILENT_LABEL, false, sender)?;
        let result = tokio::time::timeout(SILENT_TIMEOUT, receiver).await;
        let _ = window.close();
        match result {
            Ok(Ok(tokens)) => self.complete(tokens).await.map(|_| ()),
            _ => Err("riotExpired".into()),
        }
    }

    async fn valid(&self, app: &AppHandle) -> Result<Credentials, String> {
        let fresh = |credentials: &Option<Credentials>| credentials.as_ref().filter(|current| current.expires > Instant::now()).cloned();
        if let Some(current) = fresh(&*self.credentials.lock().await) {
            return Ok(current);
        }
        if load_identity().is_none() {
            return Err("riotRequired".into());
        }
        let mut blocked = self.silent.lock().await;
        if blocked.is_some_and(|until| until > Instant::now()) || app.get_webview_window(LOGIN_LABEL).is_some() {
            return Err("riotExpired".into());
        }
        if let Some(current) = fresh(&*self.credentials.lock().await) {
            return Ok(current);
        }
        drop(blocked);
        let outcome = self.silent_login(app).await;
        blocked = self.silent.lock().await;
        if let Err(message) = outcome {
            *blocked = Some(Instant::now() + SILENT_RETRY);
            return Err(message);
        }
        fresh(&*self.credentials.lock().await).ok_or_else(|| "riotExpired".to_string())
    }

    async fn client_version(&self) -> String {
        let mut version = self.version.lock().await;
        if version.is_empty() {
            if let Ok(value) = self.json(self.client.get("https://valorant-api.com/v1/version")).await {
                *version = value["data"]["riotClientVersion"].as_str().unwrap_or_default().to_string();
            }
        }
        version.clone()
    }

    async fn game(&self, credentials: &Credentials, path: &str) -> Result<Value, String> {
        let version = self.client_version().await;
        let url = format!("https://pd.{}.a.pvp.net{path}", credentials.shard);
        let result = self
            .json(
                self.client
                    .get(url)
                    .bearer_auth(&credentials.access)
                    .header("X-Riot-Entitlements-JWT", &credentials.entitlements)
                    .header("X-Riot-ClientPlatform", CLIENT_PLATFORM)
                    .header("X-Riot-ClientVersion", version),
            )
            .await;
        if result.as_ref().is_err_and(|message| message == "riotExpired") {
            *self.credentials.lock().await = None;
        }
        result
    }

    pub async fn rank(&self, app: &AppHandle) -> Result<Rank, String> {
        let credentials = self.valid(app).await?;
        let puuid = credentials.puuid.clone();
        let player = self.game(&credentials, &format!("/mmr/v1/players/{puuid}")).await?;
        let updates = self
            .game(&credentials, &format!("/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex=20&queue=competitive"))
            .await
            .unwrap_or(Value::Null);
        Ok(parse_rank(&player, &updates))
    }

    pub async fn logout(&self, app: &AppHandle) -> Result<(), String> {
        *self.credentials.lock().await = None;
        *self.silent.lock().await = None;
        if let Ok(entry) = identity_entry() {
            let _ = entry.delete_credential();
        }
        let (sender, _receiver) = oneshot::channel();
        let window = open_window(app, SILENT_LABEL, false, sender)?;
        let cleared = window.clear_all_browsing_data().map_err(|error| error.to_string());
        let _ = window.close();
        cleared
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_only_come_from_the_expected_redirect() {
        let url: Url = "https://playvalorant.com/opt_in#access_token=abc&scope=x&id_token=def&expires_in=3600".parse().unwrap();
        assert_eq!(tokens_from_url(&url), Some(Tokens { access: "abc".into(), id: "def".into(), expires_in: 3600 }));
        let other: Url = "https://evil.example/opt_in#access_token=abc&id_token=def".parse().unwrap();
        assert_eq!(tokens_from_url(&other), None);
        let lookalike: Url = "https://notplayvalorant.com/#access_token=abc&id_token=def".parse().unwrap();
        assert_eq!(tokens_from_url(&lookalike), None);
        let partial: Url = "https://playvalorant.com/opt_in#access_token=abc".parse().unwrap();
        assert_eq!(tokens_from_url(&partial), None);
    }

    #[test]
    fn latam_and_brazil_use_the_na_shard() {
        assert_eq!(shard_for("br"), "na");
        assert_eq!(shard_for("latam"), "na");
        assert_eq!(shard_for("eu"), "eu");
    }

    #[test]
    fn the_rank_reads_the_latest_update_and_the_best_tier_ever_won() {
        let player = json!({
            "LatestCompetitiveUpdate": { "SeasonID": "ACT2", "TierAfterUpdate": 18, "RankedRatingAfterUpdate": 64 },
            "QueueSkills": { "competitive": { "SeasonalInfoBySeasonID": {
                "act1": { "WinsByTier": { "21": 3, "0": 1 }, "LeaderboardRank": 9 },
                "act2": { "WinsByTier": { "18": 2 }, "LeaderboardRank": 42, "CompetitiveTier": 18 },
                "act3": { "WinsByTier": null }
            } } }
        });
        let updates = json!({ "Matches": [{ "MatchID": "ABC", "TierAfterUpdate": 18, "RankedRatingAfterUpdate": 64, "RankedRatingEarned": -12 }] });
        let rank = parse_rank(&player, &updates);
        assert_eq!((rank.tier, rank.rr, rank.peak_tier, rank.leaderboard_rank), (18, 64, 21, 42));
        assert_eq!(rank.history, vec![HistoryPoint { id: "abc".into(), tier: 18, rr: 64, change: -12 }]);
    }

    #[test]
    fn an_empty_profile_has_no_rank() {
        let rank = parse_rank(&json!({}), &Value::Null);
        assert_eq!((rank.tier, rank.rr, rank.peak_tier, rank.leaderboard_rank), (0, 0, 0, 0));
        assert!(rank.history.is_empty());
    }
}
