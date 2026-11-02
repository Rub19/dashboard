use crate::catalog::Feed;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

const USER_AGENT: &str = concat!("EthoneDesktop/", env!("CARGO_PKG_VERSION"));
const PLATFORM: &str = "windows-x86_64";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Latest {
    pub version: String,
    pub notes: Option<String>,
    pub url: Option<String>,
    #[serde(skip)]
    pub signature: Option<String>,
}

#[derive(Deserialize)]
struct TauriFeed {
    version: String,
    notes: Option<String>,
    platforms: HashMap<String, TauriPlatform>,
}

#[derive(Deserialize)]
struct TauriPlatform {
    signature: String,
    url: String,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    draft: bool,
    body: Option<String>,
}

pub fn parse_tauri(text: &str) -> Result<Latest, String> {
    let feed: TauriFeed = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let platform = feed
        .platforms
        .get(PLATFORM)
        .ok_or_else(|| format!("Aucun paquet {PLATFORM} dans le flux"))?;
    if !platform.url.starts_with("https://") {
        return Err("Le paquet n'est pas servi en HTTPS".into());
    }
    Ok(Latest {
        version: feed.version,
        notes: feed.notes,
        url: Some(platform.url.clone()),
        signature: Some(platform.signature.clone()),
    })
}

pub fn parse_github(text: &str) -> Result<Latest, String> {
    let releases: Vec<GithubRelease> = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let release = releases
        .into_iter()
        .find(|r| !r.draft)
        .ok_or("Aucune version publiée")?;
    Ok(Latest {
        version: release.tag_name.trim_start_matches('v').to_string(),
        notes: release.body,
        url: None,
        signature: None,
    })
}

pub fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .connect_timeout(Duration::from_secs(10))
        .https_only(true)
        .build()
        .map_err(|e| e.to_string())
}

async fn get_text(url: &str) -> Result<String, String> {
    let response = client()?
        .get(url)
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Réponse {} du serveur", response.status().as_u16()));
    }
    response.text().await.map_err(|e| e.to_string())
}

pub async fn fetch(feed: &Feed) -> Result<Option<Latest>, String> {
    match feed {
        Feed::None => Ok(None),
        Feed::Tauri { url } => parse_tauri(&get_text(url).await?).map(Some),
        Feed::GithubReleases { repo } => {
            let url = format!("https://api.github.com/repos/{repo}/releases?per_page=5");
            parse_github(&get_text(&url).await?).map(Some)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::load;

    #[test]
    fn reads_a_tauri_feed() {
        let latest = parse_tauri(
            r#"{"version":"0.3.3","notes":"n","platforms":{"windows-x86_64":{"signature":"s","url":"https://x/y.exe"}}}"#,
        )
        .unwrap();
        assert_eq!(latest.version, "0.3.3");
        assert_eq!(latest.signature.as_deref(), Some("s"));
    }

    #[test]
    fn refuses_a_feed_without_windows_or_https() {
        assert!(parse_tauri(r#"{"version":"1.0.0","platforms":{}}"#).is_err());
        assert!(parse_tauri(
            r#"{"version":"1.0.0","platforms":{"windows-x86_64":{"signature":"s","url":"http://x/y.exe"}}}"#
        )
        .is_err());
    }

    #[test]
    fn github_feed_skips_drafts_and_keeps_previews() {
        let latest = parse_github(
            r#"[{"tag_name":"v9.0.0","draft":true,"body":null},{"tag_name":"v0.2.14-preview","draft":false,"body":"n"}]"#,
        )
        .unwrap();
        assert_eq!(latest.version, "0.2.14-preview");
        assert!(latest.url.is_none());
    }

    #[tokio::test]
    #[ignore = "réseau"]
    async fn real_feeds_answer() {
        for module in load().unwrap() {
            let latest = fetch(&module.feed).await.unwrap_or_else(|e| panic!("{} : {e}", module.id));
            if !matches!(module.feed, Feed::None) {
                let version = latest.unwrap().version;
                assert!(crate::action::version(&version).is_some(), "{} : {version}", module.id);
            }
        }
    }
}
