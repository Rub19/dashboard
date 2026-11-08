use ethone_engine::action::{decide, Action, Facts};
use ethone_engine::auth::{Api, Auth};
use ethone_engine::bot::Bot;
use ethone_engine::catalog::{self, Module};
use ethone_engine::riot::Riot;
use ethone_engine::{feed, system};
use futures_util::future::{join_all, BoxFuture};
use reqwest::Method;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::{Arc, OnceLock};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

pub struct Svc {
    pub auth: Auth,
    pub modules: Vec<Module>,
    pub installing: tokio::sync::Mutex<()>,
    pub riot: Riot,
    pub bot: Bot,
    pub host: Arc<crate::web::NativeHost>,
    pub rt: tokio::runtime::Handle,
}

static SVC: OnceLock<Svc> = OnceLock::new();

pub fn init(rt: tokio::runtime::Handle) {
    let auth = Auth::new(Api::production().expect("client HTTP"));
    let _ = SVC.set(Svc { auth, modules: catalog::load().expect("catalogue"), installing: tokio::sync::Mutex::new(()), riot: Riot::new(), bot: Bot::new(), host: Arc::new(crate::web::NativeHost::default()), rt });
}

pub fn svc() -> &'static Svc {
    SVC.get().expect("services")
}

pub fn data_dir() -> PathBuf {
    if cfg!(test) {
        return std::env::temp_dir().join("ethone-native-tests");
    }
    let base = std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir());
    base.join("dev.ethone.desktop")
}

pub fn journal_path() -> PathBuf {
    data_dir().join("logs").join("operations.jsonl")
}

pub fn record(module: &str, operation: &str, ok: bool, detail: &str) {
    let _ = ethone_engine::journal::append(&journal_path(), module, operation, ok, detail);
}

pub type Fut = BoxFuture<'static, Result<Value, String>>;

pub fn api(path: &str) -> Fut {
    api_m("GET", path, None)
}

pub fn api_m(method: &str, path: &str, body: Option<Value>) -> Fut {
    let (method, path) = (method.to_string(), path.to_string());
    Box::pin(async move {
        let method = ethone_engine::gateway::method(&method)?;
        svc().auth.worker_json(method, ethone_engine::gateway::worker_path(&path)?, body).await
    })
}

pub fn api_data(path: &str) -> Fut {
    let inner = api(path);
    Box::pin(async move { Ok(unwrap_data(inner.await?)) })
}

pub fn unwrap_data(value: Value) -> Value {
    match value {
        Value::Object(mut map) if map.contains_key("data") => map.remove("data").unwrap_or(Value::Null),
        other => other,
    }
}

pub fn rest(method: &str, path: &str, body: Option<Value>, prefer: Option<&str>) -> Fut {
    let (method, path, prefer) = (method.to_string(), path.to_string(), prefer.map(str::to_string));
    Box::pin(async move {
        let method = ethone_engine::gateway::method(&method)?;
        let path = ethone_engine::gateway::table_path(&path)?;
        let body = match body {
            Some(mut value) if method == Method::POST && value.is_object() => {
                value["user_id"] = Value::String(svc().auth.user_id().await?);
                Some(value)
            }
            other => other,
        };
        svc().auth.rest_call(method, path, body, prefer.as_deref()).await
    })
}

pub fn rest_get(path: &str) -> Fut {
    rest("GET", path, None, None)
}

pub fn bot(method: &str, path: &str, body: Option<Value>) -> Fut {
    let (method, path) = (method.to_string(), path.to_string());
    Box::pin(async move {
        if !svc().auth.is_signed_in().await {
            return Err("sessionRequired".into());
        }
        let method = ethone_engine::gateway::method(&method)?;
        svc().bot.call(method, ethone_engine::bot::clean_path(&path)?, body).await
    })
}

pub fn bot_cached(path: &str) -> Fut {
    let key = format!("bot:{path}");
    crate::cache::cached(key, 5 * 60 * 1000, false, bot("GET", path, None))
}

pub fn riot_call(host: &str, path: &str, method: &str, body: Option<Value>) -> Fut {
    let (host, path, method) = (host.to_string(), path.to_string(), method.to_string());
    Box::pin(async move {
        if !svc().auth.is_signed_in().await {
            return Err("sessionRequired".into());
        }
        let parsed = ethone_engine::gateway::method(&method)?;
        svc().riot.call(svc().host.as_ref(), &host, ethone_engine::gateway::riot_path(&path)?, parsed, body).await
    })
}

pub fn riot_get(path: &str) -> Fut {
    let key = format!("riot:{path}");
    crate::cache::cached(key, 5 * 60 * 1000, false, riot_call("pd", path, "GET", None))
}

pub fn riot_get_fresh(path: &str) -> Fut {
    riot_call("pd", path, "GET", None)
}

pub fn catalog_get(path: &str) -> Fut {
    let key = format!("catalog:{path}");
    let path = path.to_string();
    crate::cache::cached(
        key,
        24 * 60 * 60 * 1000,
        true,
        Box::pin(async move {
            if !svc().auth.is_signed_in().await {
                return Err("sessionRequired".into());
            }
            let url = ethone_engine::gateway::catalog_url(&path)?;
            Ok(unwrap_data(svc().riot.catalog(&url).await?))
        }),
    )
}

pub fn ddragon_get(file: &'static str) -> Fut {
    Box::pin(async move {
        let versions = svc().riot.catalog("https://ddragon.leagueoflegends.com/api/versions.json").await?;
        let version = versions[0].as_str().ok_or("server")?;
        svc().riot.catalog(&format!("https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/{file}.json")).await
    })
}

pub fn items_list(kind: &str) -> Fut {
    let kind = kind.to_string();
    Box::pin(async move {
        let kind = ethone_engine::sync::ItemKind::try_from(kind.as_str())?;
        let items = ethone_engine::sync::parse_list(svc().auth.worker_get(kind.path()).await?)?;
        serde_json::to_value(items).map_err(|error| error.to_string())
    })
}

#[derive(Clone)]
pub struct ModuleStatus {
    pub module: Module,
    pub installed: Option<String>,
    pub latest_version: Option<String>,
    pub latest_notes: Option<String>,
    pub feed_error: Option<String>,
    pub running: bool,
    pub action: Action,
}

impl ModuleStatus {
    pub fn action_name(&self) -> &'static str {
        match self.action {
            Action::Open => "open",
            Action::OpenWeb => "openWeb",
            Action::Install => "install",
            Action::Update => "update",
            Action::CloseToUpdate => "closeToUpdate",
            Action::OpenToUpdate => "openToUpdate",
            Action::ReleasePage => "releasePage",
            Action::NeedsEthoneUpdate => "needsEthoneUpdate",
            Action::Unavailable => "unavailable",
        }
    }

    pub fn policy_name(&self) -> &'static str {
        match self.module.update_policy {
            catalog::UpdatePolicy::Delegated => "delegated",
            catalog::UpdatePolicy::Autonomous => "autonomous",
            catalog::UpdatePolicy::Manual => "manual",
            catalog::UpdatePolicy::Web => "web",
        }
    }

    pub fn can_run(&self) -> bool {
        matches!(self.action, Action::Open | Action::OpenWeb | Action::Install | Action::Update | Action::OpenToUpdate | Action::ReleasePage)
    }

    pub fn has_update(&self) -> bool {
        crate::logic::home::has_module_update(self.action_name(), self.installed.is_some())
    }
}

pub fn status(module: &Module, latest: Option<feed::Latest>, feed_error: Option<String>) -> ModuleStatus {
    let (installed, running) = match &module.detect {
        Some(detect) => (system::read_installed(detect).map(|info| info.version), system::app_running(detect).unwrap_or(false)),
        None => (None, false),
    };
    let action = decide(module, &Facts { installed: installed.as_deref(), latest: latest.as_ref().map(|item| item.version.as_str()), running, ethone: VERSION });
    let (latest_version, latest_notes) = latest.map_or((None, None), |item| (Some(item.version), item.notes));
    ModuleStatus { module: module.clone(), installed, latest_version, latest_notes, feed_error, running, action }
}

pub async fn modules_local() -> Vec<ModuleStatus> {
    svc().modules.iter().map(|module| status(module, None, None)).collect()
}

pub async fn modules_remote() -> Vec<ModuleStatus> {
    let feeds = join_all(svc().modules.iter().map(|module| feed::fetch(&module.feed))).await;
    svc().modules.iter().zip(feeds).map(|(module, result)| match result {
        Ok(latest) => status(module, latest, None),
        Err(error) => status(module, None, Some(error)),
    }).collect()
}

pub fn open_url(url: &str) -> Result<(), String> {
    if url.chars().any(char::is_control) || !(url.starts_with("https://") || url.starts_with("ethone://")) {
        return Err("Requête refusée".into());
    }
    std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]).spawn().map(|_| ()).map_err(|error| error.to_string())
}

pub fn site_path(page: &str) -> Option<&'static str> {
    Some(match page {
        "register" => "register",
        "recovery" => "password-recovery",
        "terms" => "terms",
        "privacy" => "privacy",
        "cookies" => "cookies",
        "legal" => "legal",
        "account" => "profile",
        _ => return None,
    })
}

pub fn open_site(page: &str) -> Result<(), String> {
    let path = site_path(page).ok_or("Page inconnue")?;
    open_url(&format!("https://ethone.dev/{path}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn the_worker_envelope_is_removed_when_present() {
        assert_eq!(unwrap_data(json!({ "data": [1] })), json!([1]));
        assert_eq!(unwrap_data(json!({ "x": 1 })), json!({ "x": 1 }));
        assert_eq!(unwrap_data(json!([1])), json!([1]));
    }

    #[test]
    fn only_known_site_pages_open() {
        assert_eq!(site_path("recovery"), Some("password-recovery"));
        assert_eq!(site_path("../admin"), None);
    }

    #[test]
    fn urls_must_be_safe() {
        assert!(open_url("http://exemple").is_err());
        assert!(open_url("https://x\ny").is_err());
    }
}
