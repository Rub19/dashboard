use crate::action::{decide, Action, Facts};
use crate::catalog::Module;
use crate::{feed, system};
use base64::prelude::{Engine, BASE64_STANDARD};
use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "stage", rename_all = "camelCase")]
pub enum Progress {
    Downloading { received: u64, total: Option<u64> },
    Verifying,
    Installing,
    Checking,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub from: Option<String>,
    pub to: String,
}

fn decode(text: &str) -> Result<String, String> {
    let bytes = BASE64_STANDARD
        .decode(text.trim())
        .map_err(|_| "Signature ou clé mal encodée".to_string())?;
    String::from_utf8(bytes).map_err(|_| "Signature ou clé mal encodée".to_string())
}

pub fn verify(data: &[u8], signature: &str, pubkey: &str) -> Result<(), String> {
    let key = PublicKey::decode(&decode(pubkey)?).map_err(|e| format!("Clé invalide : {e}"))?;
    let signature = Signature::decode(&decode(signature)?).map_err(|e| format!("Signature invalide : {e}"))?;
    key.verify(data, &signature, true)
        .map_err(|_| "La signature du paquet ne correspond pas".to_string())
}

fn download_path(module: &Module, version: &str) -> Result<PathBuf, String> {
    crate::action::version(version).ok_or("Numéro de version invalide")?;
    let dir = std::env::temp_dir().join("ethone-downloads");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{}-{version}.exe", module.id)))
}

async fn download(url: &str, path: &Path, on: &(dyn Fn(Progress) + Send + Sync)) -> Result<(), String> {
    let response = feed::client()?.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Téléchargement refusé (code {})", response.status().as_u16()));
    }
    let total = response.content_length();
    let mut file = tokio::fs::File::create(path).await.map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    let mut received = 0u64;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        received += chunk.len() as u64;
        on(Progress::Downloading { received, total });
    }
    file.flush().await.map_err(|e| e.to_string())?;
    if total.is_some_and(|expected| expected != received) {
        return Err("Téléchargement incomplet".into());
    }
    Ok(())
}

pub async fn fetch_and_verify(module: &Module, latest: &feed::Latest, on: &(dyn Fn(Progress) + Send + Sync)) -> Result<PathBuf, String> {
    let url = latest.url.as_deref().ok_or("Ce flux ne propose pas de paquet")?;
    let signature = latest.signature.as_deref().ok_or("Ce flux n'est pas signé")?;
    let pubkey = module.pubkey.as_deref().ok_or("Clé publique absente du catalogue")?;
    let path = download_path(module, &latest.version)?;
    let result = async {
        download(url, &path, on).await?;
        on(Progress::Verifying);
        let data = tokio::fs::read(&path).await.map_err(|e| e.to_string())?;
        verify(&data, signature, pubkey)
    }
    .await;
    if let Err(error) = result {
        let _ = std::fs::remove_file(&path);
        return Err(error);
    }
    Ok(path)
}

pub async fn run(module: &Module, ethone: &str, on: &(dyn Fn(Progress) + Send + Sync)) -> Result<Outcome, String> {
    let detect = module.detect.as_ref().ok_or("Ce module ne s'installe pas")?;
    let latest = feed::fetch(&module.feed).await?.ok_or("Aucune version disponible")?;
    let before = system::read_installed(detect).map(|i| i.version);
    let running = system::app_running(detect)?;
    let facts = Facts { installed: before.as_deref(), latest: Some(&latest.version), running, ethone };
    let args = match decide(module, &facts) {
        Action::Install => module.install_args.clone(),
        Action::Update => module.update_args.clone(),
        Action::CloseToUpdate => return Err(format!("Ferme {} avant de le mettre à jour", module.name)),
        _ => return Err("Cette opération n'est pas autorisée pour ce module".into()),
    };

    let path = fetch_and_verify(module, &latest, on).await?;

    if system::app_running(detect)? {
        let _ = std::fs::remove_file(&path);
        return Err(format!("{} vient de démarrer, installation annulée", module.name));
    }
    on(Progress::Installing);
    let result = tokio::task::spawn_blocking({
        let path = path.clone();
        move || system::run_installer(&path, &args)
    })
    .await
    .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&path);
    result?;

    on(Progress::Checking);
    let after = system::read_installed(detect).map(|i| i.version);
    if after.as_deref() != Some(latest.version.as_str()) {
        return Err(format!(
            "Windows indique la version {} au lieu de {}",
            after.as_deref().unwrap_or("aucune"),
            latest.version
        ));
    }
    Ok(Outcome { from: before, to: latest.version })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::load;

    const FIXTURE: &[u8] = include_bytes!("../tests/fixture.bin");
    const FIXTURE_SIG: &str = include_str!("../tests/fixture.bin.sig");
    const FIXTURE_KEY: &str = include_str!("../tests/fixture.key.pub");

    fn silent(_: Progress) {}

    #[test]
    fn accepts_a_valid_signature() {
        verify(FIXTURE, FIXTURE_SIG, FIXTURE_KEY).unwrap();
    }

    #[test]
    fn refuses_a_modified_file() {
        let mut data = FIXTURE.to_vec();
        data[0] ^= 1;
        assert!(verify(&data, FIXTURE_SIG, FIXTURE_KEY).is_err());
    }

    #[test]
    fn refuses_another_modules_key() {
        let modules = load().unwrap();
        let kairo = modules.iter().find(|m| m.id == "kairo").unwrap();
        assert!(verify(FIXTURE, FIXTURE_SIG, kairo.pubkey.as_ref().unwrap()).is_err());
    }

    #[test]
    fn refuses_garbage() {
        assert!(verify(FIXTURE, "pas de la base64 !", FIXTURE_KEY).is_err());
    }

    #[test]
    fn download_name_cannot_escape_the_folder() {
        let modules = load().unwrap();
        assert!(download_path(&modules[0], "..\\..\\x").is_err());
    }

#[test]
    #[ignore]
    fn published_files_verify() {
        let dir = std::path::PathBuf::from(std::env::var("ETHONE_PUBLISH_DIR").expect("ETHONE_PUBLISH_DIR"));
        let feed = crate::feed::parse_tauri(&std::fs::read_to_string(dir.join("latest.json")).expect("latest.json")).expect("flux");
        let name = feed.url.as_deref().and_then(|url| url.rsplit('/').next()).expect("url").to_string();
        let data = std::fs::read(dir.join(name)).expect("installeur");
        let key = std::env::var("ETHONE_PUBLISH_PUB").expect("ETHONE_PUBLISH_PUB");
        verify(&data, feed.signature.as_deref().expect("signature"), key.trim()).expect("signature valide");
        let mut altered = data.clone();
        altered[0] ^= 1;
        assert!(verify(&altered, feed.signature.as_deref().expect("signature"), key.trim()).is_err());
    }

        async fn verify_real(id: &str) {
        let modules = load().unwrap();
        let module = modules.iter().find(|m| m.id == id).unwrap();
        let latest = feed::fetch(&module.feed).await.unwrap().unwrap();
        let path = fetch_and_verify(module, &latest, &silent).await.unwrap();
        let size = std::fs::metadata(&path).unwrap().len();
        std::fs::remove_file(&path).unwrap();
        println!("{id} {} : {size} octets, signature valide", latest.version);
    }

    #[tokio::test]
    #[ignore = "réseau"]
    async fn real_packages_pass_their_signature() {
        verify_real("kairo").await;
        verify_real("hdv-tracker").await;
        verify_real("interior-studio").await;
    }

    #[tokio::test]
    #[ignore = "installe réellement : Windows Sandbox uniquement"]
    async fn sandbox_install_of_kairo_and_hdv() {
        assert_eq!(std::env::var("ETHONE_SANDBOX").as_deref(), Ok("1"), "réservé à la Windows Sandbox");
        let modules = load().unwrap();
        for id in ["kairo", "hdv-tracker"] {
            let module = modules.iter().find(|m| m.id == id).unwrap();
            let detect = module.detect.as_ref().unwrap();
            assert_eq!(system::read_installed(detect), None, "{id} déjà présent");
            let outcome = run(module, "0.1.0", &silent).await.unwrap();
            let installed = system::read_installed(detect).unwrap();
            assert_eq!(installed.version, outcome.to);
            assert!(installed.dir.unwrap().join(&installed.exe).is_file());
            println!("{id} installé : {}", outcome.to);
            let again = run(module, "0.1.0", &silent).await;
            assert!(again.is_err(), "{id} : une seconde installation doit être refusée");

            let key = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
                .open_subkey_with_flags(
                    format!(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\{}", detect.uninstall_key),
                    winreg::enums::KEY_SET_VALUE,
                )
                .unwrap();
            key.set_value("DisplayVersion", &"0.0.1").unwrap();

            system::launch(detect).unwrap();
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            if system::is_running(&detect.exe).unwrap() {
                let refused = run(module, "0.1.0", &silent).await.unwrap_err();
                assert!(refused.contains("Ferme"), "{id} : {refused}");
                println!("{id} refusé pendant l'exécution : {refused}");
                std::process::Command::new("taskkill").args(["/F", "/IM", &detect.exe]).output().unwrap();
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            } else {
                println!("{id} : ne reste pas ouvert ici, refus pendant l'exécution non testé");
            }

            let updated = run(module, "0.1.0", &silent).await.unwrap();
            assert_eq!(updated.from.as_deref(), Some("0.0.1"));
            assert_eq!(system::read_installed(detect).unwrap().version, updated.to);
            println!("{id} mis à jour : 0.0.1 -> {}", updated.to);
        }
    }
}
