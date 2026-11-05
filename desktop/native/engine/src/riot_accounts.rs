use crate::riot::Identity;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const FILE: &str = "riot-accounts.json";
pub const MAX_ACCOUNTS: usize = 10;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct Account {
    pub slot: String,
    pub identity: Identity,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
pub struct Book {
    pub active: String,
    pub accounts: Vec<Account>,
}

impl Book {
    pub fn find(&self, slot: &str) -> Option<&Account> {
        self.accounts.iter().find(|account| account.slot == slot)
    }

    pub fn current(&self) -> Option<&Account> {
        self.find(&self.active)
    }

    pub fn record(&mut self, slot: &str, identity: Identity) {
        self.accounts.retain(|account| account.slot != slot && account.identity.puuid != identity.puuid);
        self.accounts.insert(0, Account { slot: slot.to_string(), identity });
        self.accounts.truncate(MAX_ACCOUNTS);
        self.active = slot.to_string();
    }

    pub fn remove(&mut self, slot: &str) -> Option<Identity> {
        self.accounts.retain(|account| account.slot != slot);
        if self.active == slot {
            self.active = self.accounts.first().map(|account| account.slot.clone()).unwrap_or_default();
        }
        self.current().map(|account| account.identity.clone())
    }
}

pub fn path_in(directory: &Path) -> PathBuf {
    directory.join(FILE)
}

pub fn load(directory: &Path, legacy: Option<Identity>) -> Book {
    let stored = std::fs::read_to_string(path_in(directory)).ok().and_then(|text| serde_json::from_str::<Book>(&text).ok());
    match (stored, legacy) {
        (Some(book), _) => book,
        (None, Some(identity)) => Book { active: String::new(), accounts: vec![Account { slot: String::new(), identity }] },
        (None, None) => Book::default(),
    }
}

pub fn save(directory: &Path, book: &Book) -> Result<(), String> {
    std::fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    let text = serde_json::to_string(book).map_err(|error| error.to_string())?;
    std::fs::write(path_in(directory), text).map_err(|error| error.to_string())
}

pub fn web_directory(slot: &str) -> String {
    if slot.is_empty() { "riot-web".to_string() } else { format!("riot-web-{slot}") }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn identity(puuid: &str) -> Identity {
        Identity { puuid: puuid.into(), name: puuid.into(), tag: "EUW".into(), region: "eu".into() }
    }

    #[test]
    fn the_last_signed_in_account_becomes_active_without_duplicates() {
        let mut book = Book::default();
        book.record("a", identity("one"));
        book.record("b", identity("two"));
        assert_eq!(book.active, "b");
        assert_eq!(book.accounts.len(), 2);
        book.record("c", identity("one"));
        assert_eq!(book.accounts.iter().map(|account| account.slot.as_str()).collect::<Vec<_>>(), ["c", "b"]);
    }

    #[test]
    fn removing_the_active_account_moves_to_the_next_one() {
        let mut book = Book::default();
        book.record("a", identity("one"));
        book.record("b", identity("two"));
        assert_eq!(book.remove("b"), Some(identity("one")));
        assert_eq!(book.active, "a");
        assert_eq!(book.remove("a"), None);
        assert_eq!(book.active, "");
        assert!(book.accounts.is_empty());
    }

    #[test]
    fn removing_another_account_keeps_the_active_one() {
        let mut book = Book::default();
        book.record("a", identity("one"));
        book.record("b", identity("two"));
        assert_eq!(book.remove("a"), Some(identity("two")));
        assert_eq!(book.active, "b");
    }

    #[test]
    fn the_account_list_is_capped() {
        let mut book = Book::default();
        for index in 0..(MAX_ACCOUNTS + 2) {
            book.record(&format!("s{index}"), identity(&format!("p{index}")));
        }
        assert_eq!(book.accounts.len(), MAX_ACCOUNTS);
        assert_eq!(book.active, format!("s{}", MAX_ACCOUNTS + 1));
    }

    #[test]
    fn an_existing_login_is_kept_on_first_run_and_the_file_round_trips() {
        let directory = std::env::temp_dir().join(format!("ethone-riot-book-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&directory);
        assert_eq!(load(&directory, None), Book::default());
        let first = load(&directory, Some(identity("old")));
        assert_eq!((first.active.as_str(), first.accounts[0].slot.as_str()), ("", ""));
        assert_eq!(web_directory(""), "riot-web");
        assert_eq!(web_directory("x1"), "riot-web-x1");
        let mut book = first;
        book.record("x1", identity("new"));
        save(&directory, &book).unwrap();
        assert_eq!(load(&directory, Some(identity("ignored"))), book);
        let _ = std::fs::remove_dir_all(&directory);
    }
}
