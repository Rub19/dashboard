use crate::catalog::{Module, UpdatePolicy};
use semver::Version;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Open,
    OpenWeb,
    Install,
    Update,
    CloseToUpdate,
    OpenToUpdate,
    ReleasePage,
    NeedsEthoneUpdate,
    Unavailable,
}

pub type SemVersion = Version;

pub struct Facts<'a> {
    pub installed: Option<&'a str>,
    pub latest: Option<&'a str>,
    pub running: bool,
    pub ethone: &'a str,
}

pub fn version(text: &str) -> Option<Version> {
    Version::parse(text.trim().trim_start_matches('v')).ok()
}

pub fn decide(module: &Module, facts: &Facts) -> Action {
    if module.update_policy == UpdatePolicy::Web {
        return Action::OpenWeb;
    }
    let installed = facts.installed.is_some();
    let latest_is_blocked = facts
        .latest
        .is_some_and(|latest| module.blocked_versions.iter().any(|blocked| blocked == latest));
    let ethone_too_old = match (version(facts.ethone), version(&module.min_ethone)) {
        (Some(current), Some(minimum)) => current < minimum,
        _ => true,
    };
    let newer = match (facts.installed.and_then(version), facts.latest.and_then(version)) {
        (Some(current), Some(latest)) => latest > current,
        _ => false,
    };

    if !installed {
        if ethone_too_old {
            return Action::NeedsEthoneUpdate;
        }
        if module.update_policy == UpdatePolicy::Manual {
            return Action::ReleasePage;
        }
        if facts.latest.is_none() || latest_is_blocked {
            return Action::Unavailable;
        }
        return Action::Install;
    }
    if !newer || latest_is_blocked {
        return Action::Open;
    }
    if ethone_too_old {
        return Action::NeedsEthoneUpdate;
    }
    match module.update_policy {
        UpdatePolicy::Delegated if facts.running => Action::CloseToUpdate,
        UpdatePolicy::Delegated => Action::Update,
        UpdatePolicy::Autonomous => Action::OpenToUpdate,
        UpdatePolicy::Manual => Action::ReleasePage,
        UpdatePolicy::Web => Action::OpenWeb,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::load;

    fn module(id: &str) -> Module {
        load().unwrap().into_iter().find(|m| m.id == id).unwrap()
    }

    fn facts<'a>(installed: Option<&'a str>, latest: Option<&'a str>, running: bool) -> Facts<'a> {
        Facts { installed, latest, running, ethone: "0.1.0" }
    }

    #[test]
    fn delegated_module_updates_only_when_closed() {
        let kairo = module("kairo");
        assert_eq!(decide(&kairo, &facts(Some("0.3.2"), Some("0.3.3"), false)), Action::Update);
        assert_eq!(decide(&kairo, &facts(Some("0.3.2"), Some("0.3.3"), true)), Action::CloseToUpdate);
    }

    #[test]
    fn up_to_date_or_downgrade_opens() {
        let kairo = module("kairo");
        assert_eq!(decide(&kairo, &facts(Some("0.3.3"), Some("0.3.3"), false)), Action::Open);
        assert_eq!(decide(&kairo, &facts(Some("0.4.0"), Some("0.3.3"), false)), Action::Open);
    }

    #[test]
    fn versions_compare_as_numbers() {
        let kairo = module("kairo");
        assert_eq!(decide(&kairo, &facts(Some("0.3.9"), Some("0.3.10"), false)), Action::Update);
    }

    #[test]
    fn missing_module_installs_when_a_feed_answers() {
        let kairo = module("kairo");
        assert_eq!(decide(&kairo, &facts(None, Some("0.3.3"), false)), Action::Install);
        assert_eq!(decide(&kairo, &facts(None, None, false)), Action::Unavailable);
    }

    #[test]
    fn offline_module_still_opens() {
        let kairo = module("kairo");
        assert_eq!(decide(&kairo, &facts(Some("0.3.3"), None, false)), Action::Open);
    }

    #[test]
    fn interior_installs_once_then_updates_itself() {
        let interior = module("interior-studio");
        assert_eq!(decide(&interior, &facts(None, Some("0.2.2"), false)), Action::Install);
        assert_eq!(decide(&interior, &facts(Some("0.2.1"), Some("0.2.2"), false)), Action::OpenToUpdate);
    }

    #[test]
    fn nova_is_never_installed_directly() {
        let nova = module("nova-pc-suite");
        assert_eq!(decide(&nova, &facts(None, Some("0.2.14-preview"), false)), Action::ReleasePage);
        assert_eq!(decide(&nova, &facts(Some("0.2.8"), Some("0.2.14-preview"), false)), Action::ReleasePage);
        assert_eq!(decide(&nova, &facts(Some("0.2.14"), Some("0.2.14-preview"), false)), Action::Open);
    }

    #[test]
    fn breach_opens_on_the_web() {
        assert_eq!(decide(&module("ethone-breach"), &facts(None, None, false)), Action::OpenWeb);
    }

    #[test]
    fn blocked_version_is_not_offered() {
        let mut kairo = module("kairo");
        kairo.blocked_versions = vec!["0.3.3".into()];
        assert_eq!(decide(&kairo, &facts(Some("0.3.2"), Some("0.3.3"), false)), Action::Open);
        assert_eq!(decide(&kairo, &facts(None, Some("0.3.3"), false)), Action::Unavailable);
    }

    #[test]
    fn too_old_ethone_does_not_install() {
        let mut kairo = module("kairo");
        kairo.min_ethone = "9.0.0".into();
        assert_eq!(decide(&kairo, &facts(None, Some("0.3.3"), false)), Action::NeedsEthoneUpdate);
        assert_eq!(decide(&kairo, &facts(Some("0.3.2"), Some("0.3.3"), false)), Action::NeedsEthoneUpdate);
        assert_eq!(decide(&kairo, &facts(Some("0.3.3"), Some("0.3.3"), false)), Action::Open);
    }
}
