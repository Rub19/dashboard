use crate::services::data_dir;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::OnceLock;

const MAX_BYTES: usize = 12 * 1024 * 1024;
const MAX_SIDE: u32 = 720;

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
static LIMIT: OnceLock<tokio::sync::Semaphore> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| reqwest::Client::builder().user_agent(concat!("EthoneDesktop/", env!("CARGO_PKG_VERSION"))).timeout(std::time::Duration::from_secs(20)).build().unwrap_or_default())
}

fn cached_file(url: &str) -> PathBuf {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    url.hash(&mut hasher);
    data_dir().join("native-cache").join("images").join(format!("{:016x}", hasher.finish()))
}

pub enum Decoded {
    Pixels(u32, u32, Vec<u8>),
    Svg(Vec<u8>),
}

fn looks_like_svg(bytes: &[u8]) -> bool {
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(256)]).to_lowercase();
    head.contains("<svg")
}

pub fn decode_any(bytes: Vec<u8>) -> Result<Decoded, String> {
    if looks_like_svg(&bytes) {
        return Ok(Decoded::Svg(bytes));
    }
    decode(&bytes).map(|(width, height, pixels)| Decoded::Pixels(width, height, pixels))
}

pub fn decode(bytes: &[u8]) -> Result<(u32, u32, Vec<u8>), String> {
    let image = image::load_from_memory(bytes).map_err(|error| error.to_string())?;
    let image = if image.width() > MAX_SIDE || image.height() > MAX_SIDE { image.resize(MAX_SIDE, MAX_SIDE, image::imageops::FilterType::Triangle) } else { image };
    let rgba = image.to_rgba8();
    Ok((rgba.width(), rgba.height(), rgba.into_raw()))
}

pub async fn fetch_image(url: &str) -> Result<Decoded, String> {
    if let Some(data) = url.strip_prefix("data:") {
        use base64::Engine;
        let (_, encoded) = data.split_once(";base64,").ok_or("image")?;
        let bytes = base64::engine::general_purpose::STANDARD.decode(encoded).map_err(|_| "image")?;
        return tokio::task::spawn_blocking(move || decode_any(bytes)).await.map_err(|error| error.to_string())?;
    }
    if !url.starts_with("https://") {
        return Err("image".into());
    }
    let file = cached_file(url);
    let bytes = if let Ok(bytes) = tokio::fs::read(&file).await {
        bytes
    } else {
        let _slot = LIMIT.get_or_init(|| tokio::sync::Semaphore::new(6)).acquire().await.map_err(|error| error.to_string())?;
        let response = client().get(url).send().await.map_err(|error| error.to_string())?;
        if !response.status().is_success() {
            return Err("image".into());
        }
        let bytes = response.bytes().await.map_err(|error| error.to_string())?.to_vec();
        if bytes.len() > MAX_BYTES {
            return Err("image".into());
        }
        if let Some(parent) = file.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }
        let _ = tokio::fs::write(&file, &bytes).await;
        bytes
    };
    tokio::task::spawn_blocking(move || decode_any(bytes)).await.map_err(|error| error.to_string())?
}

pub fn online() -> bool {
    let mut flags = 0u32;
    unsafe { windows_sys::Win32::Networking::WinInet::InternetGetConnectedState(&mut flags, 0) != 0 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn broken_images_are_refused_without_a_crash() {
        assert!(decode(b"pas une image").is_err());
    }

    #[test]
    fn a_big_image_is_reduced() {
        let mut bytes = std::io::Cursor::new(Vec::new());
        image::RgbaImage::new(2000, 1000).write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        let (width, height, pixels) = decode(bytes.get_ref()).unwrap();
        assert_eq!((width, height), (720, 360));
        assert_eq!(pixels.len(), 720 * 360 * 4);
    }
}
