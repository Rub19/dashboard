pub fn kind(code: Option<i64>) -> &'static str {
    match code.unwrap_or(0) {
        ..=1 => "clear",
        2 => "partly",
        3 => "cloudy",
        45 | 48 => "fog",
        51..=57 => "drizzle",
        71..=77 | 85 | 86 => "snow",
        95.. => "storm",
        _ => "rain",
    }
}

pub fn icon_for(code: Option<i64>, day: bool) -> &'static str {
    match kind(code) {
        "clear" => if day { "sun" } else { "moon" },
        "partly" => if day { "cloud-sun" } else { "cloud-moon" },
        "cloudy" => "cloud",
        "fog" => "cloud-fog",
        "drizzle" => "cloud-drizzle",
        "snow" => "cloud-snow",
        "storm" => "cloud-lightning",
        _ => "cloud-rain",
    }
}

pub fn hour_of(time: &str) -> String {
    time.get(11..16).unwrap_or_default().to_string()
}

pub fn city_time(iso: &str, offset_seconds: i64) -> String {
    let Some(stamp) = crate::logic::time::parse_ms(iso) else { return String::new() };
    let shifted = chrono::DateTime::from_timestamp_millis(stamp as i64 + offset_seconds * 1000);
    shifted.map_or(String::new(), |date| date.format("%H:%M").to_string())
}

pub fn compass(degrees: f64) -> &'static str {
    const POINTS: [&str; 8] = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    POINTS[(((degrees % 360.0) + 360.0) % 360.0 / 45.0).round() as usize % 8]
}

pub fn uv_level(uv: f64) -> &'static str {
    if uv < 3.0 { "low" } else if uv < 6.0 { "moderate" } else if uv < 8.0 { "high" } else { "very" }
}

pub fn air_level(aqi: f64) -> &'static str {
    if aqi <= 20.0 { "good" } else if aqi <= 40.0 { "fair" } else if aqi <= 60.0 { "moderate" } else if aqi <= 80.0 { "poor" } else { "bad" }
}

pub fn next_rain(hours: &[serde_json::Value]) -> Option<String> {
    hours.iter().find(|hour| hour["precipitationProbability"].as_f64().unwrap_or(0.0) >= 50.0).and_then(|hour| hour["time"].as_str().map(str::to_string))
}

pub fn range_bar(min: f64, max: f64, lowest: f64, highest: f64) -> (f64, f64) {
    let span = if highest - lowest == 0.0 { 1.0 } else { highest - lowest };
    ((min - lowest) / span * 100.0, ((max - min) / span * 100.0).max(4.0))
}

pub fn toggle_city(cities: &[String], city: &str) -> Vec<String> {
    crate::logic::toggle_pinned(cities, city)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn weather_codes_map_to_kinds() {
        assert_eq!(kind(Some(0)), "clear");
        assert_eq!(kind(Some(2)), "partly");
        assert_eq!(kind(Some(48)), "fog");
        assert_eq!(kind(Some(55)), "drizzle");
        assert_eq!(kind(Some(86)), "snow");
        assert_eq!(kind(Some(99)), "storm");
        assert_eq!(kind(Some(63)), "rain");
        assert_eq!(kind(None), "clear");
        assert_eq!(icon_for(Some(0), false), "moon");
    }

    #[test]
    fn helpers_read_like_the_interface() {
        assert_eq!(hour_of("2026-11-05T14:00"), "14:00");
        assert_eq!(city_time("2026-11-05T10:00:00Z", 3600), "11:00");
        assert_eq!(compass(350.0), "N");
        assert_eq!(compass(-90.0), "O");
        assert_eq!(uv_level(6.5), "high");
        assert_eq!(air_level(55.0), "moderate");
        assert_eq!(next_rain(&[json!({ "time": "a", "precipitationProbability": 10 }), json!({ "time": "b", "precipitationProbability": 60 })]).as_deref(), Some("b"));
        assert_eq!(range_bar(5.0, 5.0, 0.0, 10.0), (50.0, 4.0));
        assert_eq!(toggle_city(&["Paris".into()], "Paris"), Vec::<String>::new());
    }
}
