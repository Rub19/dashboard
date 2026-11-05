use chrono::{DateTime, Datelike, Local};

pub fn initials(name: Option<&str>, address: &str) -> String {
    let value = name.map(str::trim).filter(|text| !text.is_empty()).map_or_else(|| address.split('@').next().filter(|text| !text.is_empty()).unwrap_or("?").to_string(), str::to_string);
    let parts: Vec<&str> = value.split(|character: char| character.is_whitespace() || matches!(character, '.' | '_' | '-')).filter(|part| !part.is_empty()).collect();
    if parts.len() > 1 {
        let first = parts[0].chars().next().unwrap_or('?');
        let last = parts[parts.len() - 1].chars().next().unwrap_or('?');
        return format!("{first}{last}").to_uppercase();
    }
    value.chars().take(2).collect::<String>().to_uppercase()
}

pub fn sender_hue(address: &str) -> u32 {
    let mut hash: u32 = 0;
    for unit in address.encode_utf16() {
        hash = hash.wrapping_mul(31).wrapping_add(unit as u32);
    }
    hash % 360
}

pub fn hue_color(hue: u32) -> slint::Color {
    let h = hue as f32 / 60.0;
    let (s, l) = (0.55f32, 0.42f32);
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - (h % 2.0 - 1.0).abs());
    let (r, g, b) = match h as u32 {
        0 => (c, x, 0.0),
        1 => (x, c, 0.0),
        2 => (0.0, c, x),
        3 => (0.0, x, c),
        4 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let m = l - c / 2.0;
    let byte = |value: f32| ((value + m) * 255.0).round().clamp(0.0, 255.0) as u8;
    slint::Color::from_rgb_u8(byte(r), byte(g), byte(b))
}

pub fn mail_time(date: &DateTime<Local>, now: &DateTime<Local>, fr: bool) -> String {
    if date.date_naive() == now.date_naive() {
        return crate::logic::time::clock(date);
    }
    let month = crate::logic::time::month_name(date.month0() as usize, fr);
    let short: String = month.chars().take(if fr { 4 } else { 3 }).collect();
    let short = if fr && month.chars().count() > 4 { format!("{short}.") } else { short };
    if date.year() == now.year() {
        if fr { format!("{} {short}", date.day()) } else { format!("{short} {}", date.day()) }
    } else if fr {
        format!("{} {short} {}", date.day(), date.year())
    } else {
        format!("{short} {}, {}", date.day(), date.year())
    }
}

pub fn html_to_text(html: &str) -> String {
    let mut out = String::new();
    let lower = html.to_lowercase();
    let mut at = 0;
    while at < html.len() {
        let rest = &lower[at..];
        let mut skipped = false;
        for tag in ["script", "style", "head"] {
            if rest.starts_with(&format!("<{tag}")) {
                let close = format!("</{tag}>");
                at += rest.find(&close).map_or(rest.len(), |end| end + close.len());
                skipped = true;
                break;
            }
        }
        if skipped {
            continue;
        }
        if rest.starts_with('<') {
            let end = rest.find('>').map_or(rest.len(), |end| end + 1);
            let tag = &rest[1..end.saturating_sub(1).max(1)];
            let name: String = tag.trim_start_matches('/').chars().take_while(|character| character.is_ascii_alphanumeric()).collect();
            if name == "br" || (tag.starts_with('/') && matches!(name.as_str(), "p" | "div" | "tr" | "li" | "h1" | "h2" | "h3")) {
                out.push('\n');
            }
            at += end;
            continue;
        }
        let character = html[at..].chars().next().unwrap_or(' ');
        out.push(character);
        at += character.len_utf8();
    }
    let decoded = out.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&");
    let mut clean = String::new();
    let mut blank = 0;
    for line in decoded.lines().map(str::trim_end) {
        if line.trim().is_empty() {
            blank += 1;
            if blank > 1 {
                continue;
            }
        } else {
            blank = 0;
        }
        clean.push_str(line);
        clean.push('\n');
    }
    clean.trim().to_string()
}

pub fn has_images(html: &str) -> bool {
    let lower = html.to_lowercase();
    lower.contains("<img") || lower.contains("background-image") || lower.contains("background=")
}

pub fn recipients(text: &str) -> Vec<String> {
    text.split([',', ';']).map(str::trim).filter(|item| !item.is_empty()).map(str::to_string).collect()
}

pub fn reply_subject(subject: &str) -> String {
    if subject.starts_with("Re:") { subject.to_string() } else { format!("Re: {subject}") }
}

pub fn quote(body: &str) -> String {
    format!("\n\n> {}", body.split('\n').collect::<Vec<_>>().join("\n> "))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn initials_use_the_name_or_the_address() {
        assert_eq!(initials(Some("Jean Dupont"), "x@y"), "JD");
        assert_eq!(initials(None, "marie.curie@x"), "MC");
        assert_eq!(initials(Some(""), "bob@x"), "BO");
    }

    #[test]
    fn the_hue_is_stable_and_bounded() {
        assert_eq!(sender_hue("a@x"), sender_hue("a@x"));
        assert!(sender_hue("quelqu'un@exemple.fr") < 360);
    }

    #[test]
    fn times_are_short_today_and_dated_otherwise() {
        let now = Local.with_ymd_and_hms(2026, 11, 5, 18, 0, 0).unwrap();
        assert_eq!(mail_time(&Local.with_ymd_and_hms(2026, 11, 5, 9, 7, 0).unwrap(), &now, true), "09:07");
        assert_eq!(mail_time(&Local.with_ymd_and_hms(2026, 3, 2, 9, 0, 0).unwrap(), &now, true), "2 mars");
        assert_eq!(mail_time(&Local.with_ymd_and_hms(2025, 11, 2, 9, 0, 0).unwrap(), &now, false), "Nov 2, 2025");
    }

    #[test]
    fn html_becomes_readable_text() {
        let text = html_to_text("<html><head><title>x</title></head><body><p>Bonjour&nbsp;toi</p><script>alert(1)</script><div>Ligne<br>deux</div></body></html>");
        assert_eq!(text, "Bonjour toi\nLigne\ndeux");
        assert!(has_images("<IMG src=x>"));
        assert!(!has_images("<p>rien</p>"));
    }

    #[test]
    fn replies_and_recipients() {
        assert_eq!(recipients("a@x, b@y;c@z ,"), ["a@x", "b@y", "c@z"]);
        assert_eq!(reply_subject("Re: x"), "Re: x");
        assert_eq!(reply_subject("x"), "Re: x");
        assert_eq!(quote("a\nb"), "\n\n> a\n> b");
    }
}
