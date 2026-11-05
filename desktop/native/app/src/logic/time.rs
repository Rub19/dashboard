use chrono::{DateTime, Datelike, Local, NaiveDate, TimeZone, Timelike, Utc};

const DAYS_FR: [&str; 7] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAYS_EN: [&str; 7] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS_FR: [&str; 12] = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_EN: [&str; 12] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

pub fn now_ms() -> f64 {
    Utc::now().timestamp_millis() as f64
}

pub fn parse(text: &str) -> Option<DateTime<Local>> {
    if let Ok(value) = DateTime::parse_from_rfc3339(text) {
        return Some(value.with_timezone(&Local));
    }
    if let Ok(value) = chrono::NaiveDateTime::parse_from_str(text, "%Y-%m-%dT%H:%M:%S%.f") {
        return Local.from_local_datetime(&value).single();
    }
    if let Ok(value) = chrono::NaiveDateTime::parse_from_str(text, "%Y-%m-%dT%H:%M") {
        return Local.from_local_datetime(&value).single();
    }
    NaiveDate::parse_from_str(text, "%Y-%m-%d").ok().and_then(|date| Local.from_local_datetime(&date.and_hms_opt(0, 0, 0)?).single())
}

pub fn parse_ms(text: &str) -> Option<f64> {
    parse(text).map(|value| value.timestamp_millis() as f64)
}

pub fn from_ms(ms: f64) -> DateTime<Local> {
    Local.timestamp_millis_opt(ms as i64).single().unwrap_or_else(Local::now)
}

pub fn long_date(date: &DateTime<Local>, fr: bool) -> String {
    let weekday = date.weekday().num_days_from_monday() as usize;
    let month = date.month0() as usize;
    if fr {
        format!("{} {} {}", DAYS_FR[weekday], date.day(), MONTHS_FR[month])
    } else {
        format!("{}, {} {}", DAYS_EN[weekday], MONTHS_EN[month], date.day())
    }
}

pub fn clock(date: &DateTime<Local>) -> String {
    format!("{:02}:{:02}", date.hour(), date.minute())
}

pub fn short_date(date: &DateTime<Local>, fr: bool) -> String {
    if fr {
        format!("{:02}/{:02}/{}", date.day(), date.month(), date.year())
    } else {
        format!("{:02}/{:02}/{}", date.month(), date.day(), date.year())
    }
}

pub fn date_time(date: &DateTime<Local>, fr: bool) -> String {
    format!("{} {}", short_date(date, fr), clock(date))
}

pub fn day_key(date: &DateTime<Local>) -> String {
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

pub fn month_name(month0: usize, fr: bool) -> &'static str {
    if fr { MONTHS_FR[month0 % 12] } else { MONTHS_EN[month0 % 12] }
}

pub fn iso(date: &DateTime<Local>) -> String {
    date.with_timezone(&Utc).to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn ago(text: Option<&str>, now: f64, fr: bool) -> String {
    let Some(at) = text.and_then(parse_ms) else { return String::new() };
    ago_ms(at, now, fr)
}

pub fn ago_ms(at: f64, now: f64, fr: bool) -> String {
    let minutes = ((now - at) / 60000.0).floor().max(0.0) as i64;
    if minutes < 1 {
        return if fr { "à l'instant".into() } else { "just now".into() };
    }
    if minutes < 60 {
        return if fr { format!("il y a {minutes} min") } else { format!("{minutes} min ago") };
    }
    let hours = minutes / 60;
    if hours < 24 {
        return if fr { format!("il y a {hours} h") } else { format!("{hours} h ago") };
    }
    let days = hours / 24;
    if fr { format!("il y a {days} j") } else { format!("{days} d ago") }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates_read_in_both_languages() {
        let date = Local.with_ymd_and_hms(2026, 11, 3, 9, 5, 0).unwrap();
        assert_eq!(long_date(&date, true), "mardi 3 novembre");
        assert_eq!(long_date(&date, false), "Tuesday, November 3");
        assert_eq!(clock(&date), "09:05");
        assert_eq!(day_key(&date), "2026-11-03");
    }

    #[test]
    fn iso_and_plain_dates_parse() {
        assert!(parse("2026-11-03T09:05:00Z").is_some());
        assert!(parse("2026-11-03T09:05:00.123+01:00").is_some());
        assert!(parse("2026-11-03").is_some());
        assert!(parse("bientôt").is_none());
    }

    #[test]
    fn ago_scales_with_time() {
        let now = 10_000_000_000.0;
        assert_eq!(ago_ms(now - 5000.0, now, true), "à l'instant");
        assert_eq!(ago_ms(now - 120000.0, now, true), "il y a 2 min");
        assert_eq!(ago_ms(now - 7200000.0, now, false), "2 h ago");
        assert_eq!(ago_ms(now - 172800000.0, now, true), "il y a 2 j");
    }
}
