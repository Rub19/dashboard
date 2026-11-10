struct Parser<'a> {
    chars: std::iter::Peekable<std::str::Chars<'a>>,
}

impl Parser<'_> {
    fn skip(&mut self) {
        while self.chars.peek().is_some_and(|c| c.is_whitespace()) {
            self.chars.next();
        }
    }

    fn expr(&mut self) -> Option<f64> {
        let mut value = self.term()?;
        loop {
            self.skip();
            match self.chars.peek() {
                Some('+') => {
                    self.chars.next();
                    value += self.term()?;
                }
                Some('-') => {
                    self.chars.next();
                    value -= self.term()?;
                }
                _ => return Some(value),
            }
        }
    }

    fn term(&mut self) -> Option<f64> {
        let mut value = self.factor()?;
        loop {
            self.skip();
            match self.chars.peek() {
                Some('*' | 'x' | '×') => {
                    self.chars.next();
                    value *= self.factor()?;
                }
                Some('/' | '÷') => {
                    self.chars.next();
                    let divisor = self.factor()?;
                    if divisor == 0.0 {
                        return None;
                    }
                    value /= divisor;
                }
                Some('%') => {
                    self.chars.next();
                    value /= 100.0;
                }
                _ => return Some(value),
            }
        }
    }

    fn factor(&mut self) -> Option<f64> {
        self.skip();
        match self.chars.peek()? {
            '-' => {
                self.chars.next();
                Some(-self.factor()?)
            }
            '(' => {
                self.chars.next();
                let value = self.expr()?;
                self.skip();
                (self.chars.next()? == ')').then_some(value)
            }
            _ => {
                let mut text = String::new();
                while let Some(c) = self.chars.peek().copied().filter(|c| c.is_ascii_digit() || *c == '.' || *c == ',') {
                    text.push(if c == ',' { '.' } else { c });
                    self.chars.next();
                }
                text.parse().ok()
            }
        }
    }
}

pub fn evaluate(input: &str) -> Option<f64> {
    let input = input.trim().trim_start_matches('=');
    if !input.chars().any(|c| c.is_ascii_digit()) || !input.chars().any(|c| "+-*/x×÷%()".contains(c)) {
        return None;
    }
    let mut parser = Parser { chars: input.chars().peekable() };
    let value = parser.expr()?;
    parser.skip();
    (parser.chars.next().is_none() && value.is_finite()).then_some(value)
}

const UNITS: [(&str, &str, f64); 10] = [
    ("km", "mi", 0.621_371),
    ("mi", "km", 1.609_344),
    ("kg", "lb", 2.204_623),
    ("lb", "kg", 0.453_592),
    ("cm", "in", 0.393_701),
    ("in", "cm", 2.54),
    ("m", "ft", 3.280_84),
    ("ft", "m", 0.3048),
    ("l", "gal", 0.264_172),
    ("gal", "l", 3.785_41),
];

pub fn convert(input: &str) -> Option<(f64, String)> {
    let lower = input.trim().to_lowercase().replace(',', ".");
    let (left, target) = lower.split_once(" en ").or_else(|| lower.split_once(" in ")).or_else(|| lower.split_once(" to "))?;
    let target = target.trim().trim_start_matches('°');
    let left = left.trim();
    let split = left.find(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-'))?;
    let value: f64 = left[..split].trim().parse().ok()?;
    let unit = left[split..].trim().trim_start_matches('°');
    match (unit, target) {
        ("c", "f") => return Some((value * 9.0 / 5.0 + 32.0, "°F".into())),
        ("f", "c") => return Some(((value - 32.0) * 5.0 / 9.0, "°C".into())),
        _ => {}
    }
    UNITS.iter().find(|(from, to, _)| *from == unit && *to == target).map(|(_, to, factor)| (value * factor, (*to).to_string()))
}

pub fn format(value: f64) -> String {
    let rounded = (value * 1_000_000.0).round() / 1_000_000.0;
    let text = if rounded.fract() == 0.0 && rounded.abs() < 1e15 { format!("{}", rounded as i64) } else { format!("{rounded}") };
    text.replace('.', ",")
}

pub fn answer(query: &str) -> Option<String> {
    if let Some((value, unit)) = convert(query) {
        return Some(format!("{} {unit}", format(value)));
    }
    evaluate(query).map(format)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arithmetic_follows_priorities() {
        assert_eq!(evaluate("2 + 3 * 4"), Some(14.0));
        assert_eq!(evaluate("(2 + 3) * 4"), Some(20.0));
        assert_eq!(evaluate("= 10 / 4"), Some(2.5));
        assert_eq!(evaluate("1,5 x 2"), Some(3.0));
        assert_eq!(evaluate("-3 + 5"), Some(2.0));
        assert_eq!(evaluate("200 * 15%"), Some(30.0));
        assert_eq!(evaluate("1 / 0"), None);
        assert_eq!(evaluate("mail"), None);
        assert_eq!(evaluate("42"), None);
        assert_eq!(evaluate("2 +"), None);
    }

    #[test]
    fn units_convert_both_ways() {
        assert_eq!(answer("10 km en mi"), Some("6,21371 mi".into()));
        assert_eq!(answer("100 °C en °F"), Some("212 °F".into()));
        assert_eq!(answer("5 lb to kg"), Some("2,26796 kg".into()));
        assert_eq!(answer("3 pommes en poires"), None);
        assert_eq!(answer("7 * 6"), Some("42".into()));
    }
}
