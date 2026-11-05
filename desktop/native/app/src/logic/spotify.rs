use serde_json::Value;

pub const CLIENT: &str = "6619fbf6315e4e68948dc08532251912";

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Track {
    pub id: Option<String>,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub cover: Option<String>,
    pub cover_small: Option<String>,
    pub duration_ms: f64,
    pub progress_ms: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct State {
    pub linked: bool,
    pub playing: bool,
    pub track: Option<Track>,
    pub at: f64,
}

impl Default for State {
    fn default() -> Self {
        Self { linked: true, playing: false, track: None, at: 0.0 }
    }
}

pub fn clock(ms: f64) -> String {
    let seconds = (ms / 1000.0).floor().max(0.0) as u64;
    format!("{}:{:02}", seconds / 60, seconds % 60)
}

pub fn live_progress(state: &State, now: f64) -> f64 {
    let Some(track) = &state.track else { return 0.0 };
    let moved = if state.playing { track.progress_ms + (now - state.at).max(0.0) } else { track.progress_ms };
    if track.duration_ms > 0.0 { moved.min(track.duration_ms) } else { moved }
}

pub fn poll_delay(state: &State) -> u64 {
    if !state.linked {
        300_000
    } else if state.playing {
        8_000
    } else {
        20_000
    }
}

pub fn parse_track(value: &Value) -> Option<Track> {
    let title = value["title"].as_str()?.to_string();
    let covers = value["covers"].as_array();
    let cover_at = |at: usize| covers.and_then(|list| list.get(at)).and_then(Value::as_str).map(str::to_string);
    let art = value["artworkUrl"].as_str().map(str::to_string);
    Some(Track {
        id: value["id"].as_str().map(str::to_string),
        title,
        artist: value["artist"].as_str().map(str::to_string),
        album: value["album"].as_str().map(str::to_string),
        cover: cover_at(0).or_else(|| art.clone()),
        cover_small: cover_at(2).or_else(|| art.clone()).or_else(|| cover_at(0)),
        duration_ms: value["durationMs"].as_f64().unwrap_or(0.0),
        progress_ms: value["progressMs"].as_f64().unwrap_or(0.0),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clock_pads_seconds() {
        assert_eq!(clock(65000.0), "1:05");
        assert_eq!(clock(-5.0), "0:00");
    }

    #[test]
    fn progress_moves_only_while_playing_and_stops_at_the_end() {
        let track = Track { title: "x".into(), progress_ms: 1000.0, duration_ms: 5000.0, ..Default::default() };
        let mut state = State { linked: true, playing: true, track: Some(track), at: 100.0 };
        assert_eq!(live_progress(&state, 1100.0), 2000.0);
        assert_eq!(live_progress(&state, 100000.0), 5000.0);
        state.playing = false;
        assert_eq!(live_progress(&state, 100000.0), 1000.0);
    }

    #[test]
    fn polling_slows_down_when_idle_or_unlinked() {
        assert_eq!(poll_delay(&State { linked: false, ..Default::default() }), 300000);
        assert_eq!(poll_delay(&State { playing: true, ..Default::default() }), 8000);
        assert_eq!(poll_delay(&State::default()), 20000);
    }
}
