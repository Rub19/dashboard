use crate::icons_table::ICONS;
use slint::{Image, Rgba8Pixel, SharedPixelBuffer};

pub fn icon(name: &str) -> Image {
    let Some((_, bytes)) = ICONS.iter().find(|(known, _)| *known == name) else { return Image::default() };
    Image::load_from_svg_data(bytes).unwrap_or_default()
}

pub fn png(bytes: &[u8]) -> Image {
    let Ok(decoded) = image::load_from_memory(bytes) else { return Image::default() };
    let rgba = decoded.to_rgba8();
    let buffer = SharedPixelBuffer::<Rgba8Pixel>::clone_from_slice(rgba.as_raw(), rgba.width(), rgba.height());
    Image::from_rgba8(buffer)
}

pub fn logo() -> Image {
    png(include_bytes!("../assets/ethone-logo.png"))
}

pub fn app_icon(id: &str) -> Option<Image> {
    match id {
        "kairo" => return Image::load_from_svg_data(include_bytes!("../assets/kairo.svg")).ok(),
        "hdv-tracker" => return Image::load_from_svg_data(include_bytes!("../assets/argus.svg")).ok(),
        _ => {}
    }
    let bytes: &[u8] = match id {
        "interior-studio" => include_bytes!("../assets/interior-studio.png"),
        "nova-pc-suite" => include_bytes!("../assets/nova-pc-suite.png"),
        _ => return None,
    };
    let decoded = image::load_from_memory(bytes).ok()?;
    let small = decoded.resize(64, 64, image::imageops::FilterType::Triangle).to_rgba8();
    Some(Image::from_rgba8(SharedPixelBuffer::<Rgba8Pixel>::clone_from_slice(small.as_raw(), small.width(), small.height())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_icons_exist() {
        for name in ["search", "house", "valorant", "league", "provider-google", "provider-github", "provider-discord"] {
            assert!(ICONS.iter().any(|(known, _)| *known == name), "{name}");
        }
    }
}
