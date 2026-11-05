use semver::Version;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SCHEMA_VERSION: u32 = 1;
const EMBEDDED: &str = include_str!("../../../catalog/catalog.json");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdatePolicy {
    Delegated,
    Autonomous,
    Manual,
    Web,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Feed {
    Tauri { url: String },
    GithubReleases { repo: String },
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Detect {
    pub uninstall_key: String,
    pub exe: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Module {
    pub id: String,
    pub name: String,
    pub summary: BTreeMap<String, String>,
    pub repo: String,
    pub feed: Feed,
    pub pubkey: Option<String>,
    pub detect: Option<Detect>,
    pub update_policy: UpdatePolicy,
    pub install_args: Vec<String>,
    pub update_args: Vec<String>,
    pub min_ethone: String,
    pub blocked_versions: Vec<String>,
    pub releases_url: Option<String>,
    pub launch_url: Option<String>,
    pub platforms: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Catalog {
    schema_version: u32,
    modules: Vec<Module>,
}

pub fn parse(text: &str) -> Result<Vec<Module>, String> {
    let catalog: Catalog = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if catalog.schema_version != SCHEMA_VERSION {
        return Err(format!("Version de catalogue inconnue : {}", catalog.schema_version));
    }
    for module in &catalog.modules {
        Version::parse(&module.min_ethone).map_err(|e| format!("{} : {e}", module.id))?;
        let needs_key = module.update_policy == UpdatePolicy::Delegated
            || module.update_policy == UpdatePolicy::Autonomous;
        if needs_key && module.pubkey.is_none() {
            return Err(format!("{} : clé publique manquante", module.id));
        }
        if needs_key && module.install_args.is_empty() {
            return Err(format!("{} : arguments d'installation manquants", module.id));
        }
        if module.update_policy == UpdatePolicy::Web && module.launch_url.is_none() {
            return Err(format!("{} : adresse manquante", module.id));
        }
    }
    Ok(catalog.modules)
}

pub fn load() -> Result<Vec<Module>, String> {
    parse(EMBEDDED)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_catalog_is_valid_and_ids_are_unique() {
        let modules = load().unwrap();
        let mut ids: Vec<_> = modules.iter().map(|m| m.id.clone()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), modules.len());
        assert_eq!(modules.len(), 5);
    }

    #[test]
    fn interior_keeps_its_own_updates() {
        let modules = load().unwrap();
        let interior = modules.iter().find(|m| m.id == "interior-studio").unwrap();
        assert_eq!(interior.update_policy, UpdatePolicy::Autonomous);
        assert!(interior.update_args.is_empty());
    }

    #[test]
    fn rejects_an_unknown_schema() {
        assert!(parse(r#"{"schemaVersion":99,"modules":[]}"#).is_err());
    }

    #[test]
    fn rejects_a_delegated_module_without_key() {
        let text = EMBEDDED.replacen("\"pubkey\": \"dW50", "\"pubkey\": null, \"x\": \"dW50", 1);
        assert!(parse(&text).is_err());
    }
}
