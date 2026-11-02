use reqwest::Method;

const TABLES: [&str; 9] = [
    "ethone_habits",
    "ethone_habit_completions",
    "ethone_valorant_matches",
    "ethone_valorant_accounts",
    "ethone_valorant_name_history",
    "user_settings",
    "ethone_public_profiles",
    "ethone_focus_sessions",
    "ethone_activity",
];
pub const LINEUPS_URL: &str = "https://uh5it8zn19.execute-api.us-east-1.amazonaws.com/development";
const RIOT_PREFIXES: [&str; 17] = [
    "/match-details/v1/matches/",
    "/getPreference/Ares.PlayerSettings",
    "/savePreference",
    "/core-game/v1/",
    "/pregame/v1/",
    "/store/v1/wallet/",
    "/store/v1/entitlements/",
    "/store/v3/storefront/",
    "/personalization/v2/players/",
    "/personalization/v3/players/",
    "/contracts/v1/contracts/",
    "/daily-ticket/v1/",
    "/account-xp/v1/players/",
    "/mmr/v1/",
    "/name-service/v2/players",
    "/parties/v1/",
    "/match-history/v1/history/",
];

fn clean(path: &str) -> bool {
    !path.is_empty() && !path.contains("..") && !path.contains('\\') && !path.contains("://") && !path.contains('#') && !path.chars().any(char::is_control)
}

pub fn method(value: &str) -> Result<Method, String> {
    match value {
        "GET" => Ok(Method::GET),
        "POST" => Ok(Method::POST),
        "PUT" => Ok(Method::PUT),
        "PATCH" => Ok(Method::PATCH),
        "DELETE" => Ok(Method::DELETE),
        _ => Err("Requête refusée".into()),
    }
}

pub fn worker_path(path: &str) -> Result<&str, String> {
    if path.starts_with("api/") && clean(path) {
        Ok(path)
    } else {
        Err("Requête refusée".into())
    }
}

pub fn table_path(path: &str) -> Result<&str, String> {
    let table = path.split(['?', '/']).next().unwrap_or_default();
    if TABLES.contains(&table) && clean(path) {
        Ok(path)
    } else {
        Err("Requête refusée".into())
    }
}

pub fn catalog_url(path: &str) -> Result<String, String> {
    let allowed = path.chars().all(|character| character.is_ascii_alphanumeric() || "/-=?&_".contains(character));
    if path.starts_with('/') && allowed && clean(path) {
        Ok(format!("https://valorant-api.com/v1{path}"))
    } else {
        Err("Requête refusée".into())
    }
}

pub fn riot_path(path: &str) -> Result<&str, String> {
    if clean(path) && RIOT_PREFIXES.iter().any(|prefix| path.starts_with(prefix)) {
        Ok(path)
    } else {
        Err("Requête refusée".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worker_calls_stay_on_the_api() {
        assert!(worker_path("api/notes?limit=1").is_ok());
        assert!(worker_path("health").is_err());
        assert!(worker_path("api/../secret").is_err());
        assert!(worker_path("api/x\nHost: evil").is_err());
        assert!(worker_path("https://evil.example/api/x").is_err());
    }

    #[test]
    fn only_known_tables_are_reachable() {
        assert!(table_path("ethone_habits?select=*").is_ok());
        assert!(table_path("auth_users?select=*").is_err());
        assert!(table_path("ethone_habits/../users").is_err());
    }

    #[test]
    fn the_catalog_only_reaches_valorant_api() {
        assert_eq!(catalog_url("/agents?language=fr-FR").unwrap(), "https://valorant-api.com/v1/agents?language=fr-FR");
        assert!(catalog_url("agents").is_err());
        assert!(catalog_url("/../x").is_err());
        assert!(catalog_url("/x@evil.example").is_err());
    }

    #[test]
    fn riot_calls_follow_the_allowlist() {
        assert!(riot_path("/store/v1/wallet/abc").is_ok());
        assert!(riot_path("/store/v2/purchase").is_err());
        assert!(riot_path("/mmr/v1/../store").is_err());
    }

    #[test]
    fn only_standard_methods_pass() {
        assert!(method("GET").is_ok());
        assert!(method("TRACE").is_err());
    }
}
