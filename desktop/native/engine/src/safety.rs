const SERVICE: &str = if cfg!(debug_assertions) { "dev.ethone.desktop.debug" } else { "dev.ethone.desktop" };
const SAVED: [(&str, &str); 3] = [("session", "session-avant-natif"), ("riot-identity", "riot-identity-avant-natif"), ("discord-bot", "discord-bot-avant-natif")];

pub fn backup_name(entry: &str) -> Option<&'static str> {
    SAVED.iter().find(|(name, _)| *name == entry).map(|(_, backup)| *backup)
}

pub fn backup_identities() -> Result<usize, String> {
    let mut copied = 0;
    for (name, backup) in SAVED {
        let target = keyring::Entry::new(SERVICE, backup).map_err(|error| error.to_string())?;
        if target.get_password().is_ok() {
            continue;
        }
        let Ok(value) = keyring::Entry::new(SERVICE, name).and_then(|entry| entry.get_password()) else {
            continue;
        };
        target.set_password(&value).map_err(|error| error.to_string())?;
        if target.get_password().ok().as_deref() != Some(value.as_str()) {
            return Err("sauvegarde illisible".into());
        }
        copied += 1;
    }
    Ok(copied)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_identity_has_its_own_backup() {
        assert_eq!(backup_name("session"), Some("session-avant-natif"));
        assert_eq!(backup_name("riot-identity"), Some("riot-identity-avant-natif"));
        assert_eq!(backup_name("autre"), None);
    }
}
