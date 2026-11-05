use serde_json::Value;

pub struct Accent {
    pub id: &'static str,
    pub color: &'static str,
    pub on: &'static str,
    pub dim: &'static str,
    pub text: &'static str,
    pub text_dim: &'static str,
}

pub const ACCENTS: [Accent; 8] = [
    Accent { id: "mono", color: "#e8e8ec", on: "#111", dim: "#d4d4d8", text: "#f2f2f5", text_dim: "#3a3a40" },
    Accent { id: "ocean", color: "#0a84ff", on: "#fff", dim: "#0071e3", text: "#2997ff", text_dim: "#0066cc" },
    Accent { id: "emerald", color: "#30d158", on: "#fff", dim: "#1f8a3c", text: "#30d158", text_dim: "#1a7f37" },
    Accent { id: "violet", color: "#bf5af2", on: "#fff", dim: "#8944ab", text: "#c77dff", text_dim: "#8944ab" },
    Accent { id: "rose", color: "#ff375f", on: "#fff", dim: "#d30f45", text: "#ff6482", text_dim: "#d30f45" },
    Accent { id: "amber", color: "#ff9f0a", on: "#fff", dim: "#b25000", text: "#ffb340", text_dim: "#b25000" },
    Accent { id: "cyan", color: "#64d2ff", on: "#fff", dim: "#0071a4", text: "#64d2ff", text_dim: "#0071a4" },
    Accent { id: "blue", color: "#5e5ce6", on: "#fff", dim: "#3634a3", text: "#7d7aff", text_dim: "#3634a3" },
];

pub struct Look {
    pub id: &'static str,
    pub theme: &'static str,
    pub accent: &'static str,
    pub fr: &'static str,
    pub en: &'static str,
    pub text_fr: &'static str,
    pub text_en: &'static str,
    pub colors: [&'static str; 3],
}

pub const LOOKS: [Look; 9] = [
    Look { id: "ethone", theme: "dark", accent: "ocean", fr: "Ethone", en: "Ethone", text_fr: "Bleu nuit lumineux", text_en: "Bright midnight blue", colors: ["#0b1020", "#2f6bff", "#7c4dff"] },
    Look { id: "obsidian", theme: "dark", accent: "violet", fr: "Obsidienne", en: "Obsidian", text_fr: "Noir violet profond", text_en: "Deep violet black", colors: ["#0e0b16", "#7c4dff", "#ff4fd8"] },
    Look { id: "neon", theme: "dark", accent: "cyan", fr: "Cyber Neon", en: "Cyber Neon", text_fr: "Cyan et magenta électriques", text_en: "Electric cyan and magenta", colors: ["#070b14", "#00e5ff", "#ff2bd6"] },
    Look { id: "aurora", theme: "dark", accent: "emerald", fr: "Aurore", en: "Aurora", text_fr: "Vert et violet boréal", text_en: "Northern green and violet", colors: ["#07141a", "#17e6a1", "#7a5cff"] },
    Look { id: "sunset", theme: "dark", accent: "rose", fr: "Crépuscule", en: "Sunset", text_fr: "Prune, rose et orange", text_en: "Plum, pink and orange", colors: ["#170c1a", "#ff5c7a", "#ff9f43"] },
    Look { id: "solar", theme: "dark", accent: "amber", fr: "Éclipse solaire", en: "Solar eclipse", text_fr: "Noir chaud, couronne dorée", text_en: "Warm black, golden corona", colors: ["#120a06", "#ff7a18", "#ffd166"] },
    Look { id: "mono", theme: "dark", accent: "mono", fr: "Monochrome", en: "Monochrome", text_fr: "Noir et blanc, sans couleur", text_en: "Black and white, no color", colors: ["#0e0e10", "#6b6b73", "#34343a"] },
    Look { id: "daylight", theme: "light", accent: "ocean", fr: "Jour", en: "Daylight", text_fr: "Clair et lumineux", text_en: "Light and bright", colors: ["#eef2fb", "#6ea8ff", "#c8a6ff"] },
    Look { id: "windows", theme: "system", accent: "ocean", fr: "Windows", en: "Windows", text_fr: "Suit Windows, avec transparence", text_en: "Follows Windows, with transparency", colors: ["#2a2a2e", "#55555c", "#3a3a40"] },
];

pub struct Surface {
    pub window: &'static str,
    pub sidebar: &'static str,
    pub sidebar_edge: &'static str,
    pub row: &'static str,
    pub row_hover: &'static str,
    pub row_solid: &'static str,
    pub control: &'static str,
    pub control_hover: &'static str,
    pub control_solid: &'static str,
    pub line: &'static str,
    pub input_edge: &'static str,
    pub fg: &'static str,
    pub muted: &'static str,
    pub faint: &'static str,
    pub popup: &'static str,
    pub glow_a: &'static str,
    pub glow_b: &'static str,
}

pub fn surface(look: &str, light_system: bool) -> Surface {
    match look {
        "obsidian" => Surface { window: "#0e0b16", sidebar: "#aa8cff0f", sidebar_edge: "#bea5ff1c", row: "#bea5ff12", row_hover: "#bea5ff20", row_solid: "#191427", control: "#bea5ff17", control_hover: "#bea5ff29", control_solid: "#241d38", line: "#c8b4ff1c", input_edge: "#c8b4ff2e", fg: "#f5f2ff", muted: "#a9a2bf", faint: "#70698a", popup: "#191428e6", glow_a: "#7c4dff", glow_b: "#ff4fd8" },
        "neon" => Surface { window: "#070b14", sidebar: "#00e5ff0d", sidebar_edge: "#00e5ff29", row: "#78dcff11", row_hover: "#78dcff1f", row_solid: "#0f1726", control: "#78dcff16", control_hover: "#78dcff29", control_solid: "#172236", line: "#00e5ff26", input_edge: "#00e5ff3d", fg: "#eefbff", muted: "#9db2c9", faint: "#607590", popup: "#0d1523eb", glow_a: "#00e5ff", glow_b: "#ff2bd6" },
        "aurora" => Surface { window: "#07141a", sidebar: "#5af0be0d", sidebar_edge: "#78f0cd1f", row: "#82f0d211", row_hover: "#82f0d21f", row_solid: "#0f2028", control: "#82f0d216", control_hover: "#82f0d226", control_solid: "#172c35", line: "#8cf0d71f", input_edge: "#8cf0d733", fg: "#effdf9", muted: "#9fb9b6", faint: "#66807e", popup: "#0e1e25eb", glow_a: "#17e6a1", glow_b: "#7a5cff" },
        "sunset" => Surface { window: "#170c1a", sidebar: "#ff82960f", sidebar_edge: "#ffa0aa1f", row: "#ffaaaa12", row_hover: "#ffaaaa20", row_solid: "#241528", control: "#ffaaaa17", control_hover: "#ffaaaa29", control_solid: "#301d35", line: "#ffb4b41f", input_edge: "#ffb4b433", fg: "#fff4f4", muted: "#c0a6b6", faint: "#876d7e", popup: "#241528eb", glow_a: "#ff5c7a", glow_b: "#ff9f43" },
        "solar" => Surface { window: "#120a06", sidebar: "#ffaa5a0e", sidebar_edge: "#ffbe7821", row: "#ffbe8212", row_hover: "#ffbe8220", row_solid: "#21140c", control: "#ffbe8217", control_hover: "#ffbe8229", control_solid: "#2e1c11", line: "#ffc38c1f", input_edge: "#ffc38c33", fg: "#fff6ee", muted: "#c2ab99", faint: "#89725f", popup: "#21140ceb", glow_a: "#ff7a18", glow_b: "#ffd166" },
        "mono" => Surface { window: "#0e0e10", sidebar: "#ffffff0a", sidebar_edge: "#ffffff1a", row: "#ffffff0f", row_hover: "#ffffff1c", row_solid: "#1a1a1d", control: "#ffffff14", control_hover: "#ffffff26", control_solid: "#26262a", line: "#ffffff1c", input_edge: "#ffffff2e", fg: "#f6f6f8", muted: "#a8a8ae", faint: "#6f6f76", popup: "#1a1a1deb", glow_a: "#6b6b73", glow_b: "#34343a" },
        "daylight" => Surface { window: "#eef2fb", sidebar: "#ffffff8c", sidebar_edge: "#00000012", row: "#ffffff", row_hover: "#fafafc", row_solid: "#ffffff", control: "#0000000e", control_hover: "#00000017", control_solid: "#e8e8ed", line: "#00000017", input_edge: "#00000024", fg: "#1d1d1f", muted: "#6e6e73", faint: "#8e8e93", popup: "#ffffffeb", glow_a: "#6ea8ff", glow_b: "#c8a6ff" },
        "windows" if light_system => Surface { window: "#f5f5f7", sidebar: "#ffffff8c", sidebar_edge: "#00000012", row: "#ffffff", row_hover: "#fafafc", row_solid: "#ffffff", control: "#0000000e", control_hover: "#00000017", control_solid: "#e8e8ed", line: "#00000017", input_edge: "#00000024", fg: "#1d1d1f", muted: "#6e6e73", faint: "#8e8e93", popup: "#ffffffcc", glow_a: "#55555c00", glow_b: "#3a3a4000" },
        "windows" => Surface { window: "#1c1c1e", sidebar: "#ffffff0a", sidebar_edge: "#ffffff1a", row: "#ffffff0f", row_hover: "#ffffff1c", row_solid: "#2a2a2e", control: "#ffffff14", control_hover: "#ffffff26", control_solid: "#3a3a40", line: "#ffffff1c", input_edge: "#ffffff2e", fg: "#f5f5f7", muted: "#a1a1a6", faint: "#6e6e73", popup: "#2a2a2ee6", glow_a: "#55555c00", glow_b: "#3a3a4000" },
        _ => Surface { window: "#0b1020", sidebar: "#7896ff12", sidebar_edge: "#96afff1f", row: "#96afff13", row_hover: "#96afff21", row_solid: "#151c33", control: "#96afff1a", control_hover: "#96afff2b", control_solid: "#1f2845", line: "#a5b9ff1f", input_edge: "#a5b9ff2e", fg: "#f3f5ff", muted: "#a3acc7", faint: "#6d7692", popup: "#131a30e6", glow_a: "#2f6bff", glow_b: "#7c4dff" },
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct InterfacePreferences {
    pub density: String,
    pub motion: String,
    pub transparency: String,
    pub text_scale: i64,
}

impl Default for InterfacePreferences {
    fn default() -> Self {
        Self { density: "comfortable".into(), motion: "system".into(), transparency: "system".into(), text_scale: 100 }
    }
}

pub fn normalize_interface(value: &Value) -> InterfacePreferences {
    let base = InterfacePreferences::default();
    let pick = |key: &str, allowed: &[&str], fallback: String| value[key].as_str().filter(|text| allowed.contains(text)).map_or(fallback, str::to_string);
    InterfacePreferences {
        density: pick("density", &["comfortable", "compact"], base.density),
        motion: pick("motion", &["system", "reduced"], base.motion),
        transparency: pick("transparency", &["system", "reduced"], base.transparency),
        text_scale: value["textScale"].as_i64().filter(|scale| [90, 100, 110, 125].contains(scale)).unwrap_or(base.text_scale),
    }
}

pub fn interface_json(preferences: &InterfacePreferences) -> Value {
    serde_json::json!({ "density": preferences.density, "motion": preferences.motion, "transparency": preferences.transparency, "textScale": preferences.text_scale })
}

pub const SETTINGS_KEYS: [&str; 18] = ["ethone-weather-city", "ethone-weather-cities", "ethone-start-page", "ethone-contrast", "ethone-automations", "ethone-lol-lp", "ethone-ui-sound", "ethone-look", "ethone-theme", "ethone-accent-choice", "ethone-interface-preferences", "ethone-language", "ethone-home-hidden", "ethone-pinned-apps", "ethone-rss-feeds", "ethone-sidebar-compact", "ethone-focus-minutes", "ethone-desktop-prefs"];

pub fn parse_settings(text: &str) -> Result<Vec<(String, String)>, String> {
    let parsed: Value = serde_json::from_str(text).map_err(|_| "invalid".to_string())?;
    if parsed["app"] != "ethone-desktop" {
        return Err("invalid".into());
    }
    let values = parsed["values"].as_object().ok_or("invalid")?;
    Ok(values.iter().filter(|(key, _)| SETTINGS_KEYS.contains(&key.as_str())).filter_map(|(key, value)| value.as_str().map(|text| (key.clone(), text.to_string()))).collect())
}

pub fn export_settings(read: impl Fn(&str) -> Option<String>) -> String {
    let values: serde_json::Map<String, Value> = SETTINGS_KEYS.iter().filter_map(|key| read(key).map(|value| (key.to_string(), Value::String(value)))).collect();
    serde_json::to_string_pretty(&serde_json::json!({ "app": "ethone-desktop", "values": values })).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn invalid_interface_preferences_fall_back_to_defaults() {
        assert_eq!(normalize_interface(&json!({ "density": "tiny", "motion": 3, "transparency": null, "textScale": 42 })), InterfacePreferences::default());
        let kept = normalize_interface(&json!({ "density": "compact", "motion": "reduced", "transparency": "reduced", "textScale": 125 }));
        assert_eq!(kept.density, "compact");
        assert_eq!(kept.text_scale, 125);
        assert_eq!(normalize_interface(&interface_json(&kept)), kept);
    }

    #[test]
    fn settings_round_trip_keeps_only_known_keys() {
        let text = export_settings(|key| (key == "ethone-look").then(|| "neon".to_string()));
        assert_eq!(parse_settings(&text).unwrap(), vec![("ethone-look".to_string(), "neon".to_string())]);
        let foreign = r#"{"app":"ethone-desktop","values":{"ethone-look":"neon","secret":"x","ethone-theme":3}}"#;
        assert_eq!(parse_settings(foreign).unwrap(), vec![("ethone-look".to_string(), "neon".to_string())]);
        assert!(parse_settings(r#"{"app":"autre","values":{}}"#).is_err());
        assert!(parse_settings("pas du json").is_err());
    }

    #[test]
    fn every_look_points_to_a_real_accent() {
        for look in &LOOKS {
            assert!(ACCENTS.iter().any(|accent| accent.id == look.accent), "{}", look.id);
        }
    }
}
