use std::collections::HashMap;
use std::f32::consts::{PI, TAU};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Mutex, OnceLock};

pub const AMBIENT_IDS: [&str; 14] = ["brown", "pink", "rain", "storm", "ocean", "wind", "forest", "nature", "fireplace", "cafe", "night", "train", "space", "binaural"];
pub const LOOP_SECONDS: usize = 12;
pub const UI_PACKS: [&str; 4] = ["off", "soft", "crisp", "retro"];
const RATE: u32 = 44100;

pub struct Tone {
    pub shape: &'static str,
    pub from: f32,
    pub to: f32,
    pub seconds: f32,
    pub level: f32,
}

pub fn pack_tone(pack: &str) -> Option<Tone> {
    Some(match pack {
        "soft" => Tone { shape: "sine", from: 520.0, to: 380.0, seconds: 0.06, level: 0.05 },
        "crisp" => Tone { shape: "triangle", from: 1500.0, to: 1100.0, seconds: 0.025, level: 0.04 },
        "retro" => Tone { shape: "square", from: 880.0, to: 660.0, seconds: 0.04, level: 0.018 },
        _ => return None,
    })
}

fn burst(data: &mut [f32], rate: f32, at: f32, seconds: f32, mut shape: impl FnMut(f32) -> f32) {
    let start = (at * rate) as usize;
    let length = (seconds * rate) as usize;
    let size = data.len();
    for index in 0..length {
        data[(start + index) % size] += shape(index as f32 / rate);
    }
}

pub fn fill_ambient(id: &str, data: &mut [f32], rate: f32, random: &mut dyn FnMut() -> f32) {
    let seconds = data.len() as f32 / rate;
    let (mut brown, mut soft, mut high) = (0f32, 0f32, 0f32);
    let mut pink = [0f32; 3];
    for (index, slot) in data.iter_mut().enumerate() {
        let time = index as f32 / rate;
        let white = random() * 2.0 - 1.0;
        brown = (brown + 0.02 * white) / 1.02;
        pink[0] = 0.997 * pink[0] + 0.029 * white;
        pink[1] = 0.985 * pink[1] + 0.033 * white;
        pink[2] = 0.95 * pink[2] + 0.07 * white;
        let rose = pink[0] + pink[1] + pink[2];
        soft = 0.97 * soft + 0.03 * white;
        high = white - soft;
        let wave = |cycles: f32| 0.5 + 0.5 * (TAU * cycles * time / seconds).sin();
        *slot = match id {
            "brown" => brown * 3.5,
            "pink" => rose * 1.6,
            "rain" => high * 0.45 + rose * 0.25,
            "storm" => high * 0.35 + brown * 2.6,
            "ocean" => (brown * 2.2 + rose * 0.9) * (0.25 + 0.75 * wave(2.0)),
            "wind" => soft * 2.4 * (0.35 + 0.65 * wave(3.0)) * (0.6 + 0.4 * wave(7.0)),
            "forest" => rose * 0.45 * (0.6 + 0.4 * wave(2.0)),
            "nature" => rose * 0.4 + high * 0.14 * (0.7 + 0.3 * wave(5.0)),
            "fireplace" => brown * 2.6,
            "cafe" => soft * 1.5 * (0.55 + 0.45 * wave(9.0)) * (0.7 + 0.3 * wave(23.0)),
            "night" => rose * 0.18,
            "train" => brown * 3.0 + soft * 0.5,
            "space" => ((TAU * 55.0 * time).sin() * 0.2 + (TAU * 82.5 * time).sin() * 0.14 + (TAU * 110.0 * time).sin() * 0.08) * (0.5 + 0.5 * wave(1.0)) + rose * 0.08,
            _ => 0.0,
        };
    }
    if id == "forest" || id == "nature" {
        for _ in 0..14 {
            let base = 2200.0 + random() * 1800.0;
            let at = random() * seconds;
            burst(data, rate, at, 0.16, |time| (TAU * (base + 5000.0 * time) * time).sin() * (PI * time / 0.16).sin() * 0.16);
        }
    }
    if id == "storm" {
        let at = 2.0 + random() * (seconds - 7.0);
        let mut rumble = 0f32;
        let mut noise: Vec<f32> = (0..(4.0 * rate) as usize).map(|_| random() * 2.0 - 1.0).collect();
        let mut cursor = 0;
        burst(data, rate, at, 4.0, |time| {
            rumble = (rumble + 0.04 * noise[cursor % noise.len()]) / 1.04;
            cursor += 1;
            rumble * 7.0 * (-time * 1.1).exp()
        });
        noise.clear();
    }
    if id == "fireplace" {
        for _ in 0..110 {
            let power = 0.1 + random() * 0.5;
            let at = random() * seconds;
            let samples: Vec<f32> = (0..(0.012 * rate) as usize + 1).map(|_| random() * 2.0 - 1.0).collect();
            let mut cursor = 0;
            burst(data, rate, at, 0.012, |time| {
                let value = samples[cursor.min(samples.len() - 1)] * power * (-time * 420.0).exp();
                cursor += 1;
                value
            });
        }
    }
    if id == "cafe" {
        for _ in 0..7 {
            let tone = 2400.0 + random() * 1600.0;
            let at = random() * seconds;
            burst(data, rate, at, 0.2, |time| (TAU * tone * time).sin() * 0.07 * (-time * 26.0).exp());
        }
    }
    if id == "night" {
        let mut at = 0.0;
        while at < seconds {
            for pulse in 0..3 {
                burst(data, rate, at + pulse as f32 * 0.07, 0.05, |time| (TAU * 4400.0 * time).sin() * (PI * time / 0.05).sin() * 0.055);
            }
            at += 0.75;
        }
    }
    if id == "train" {
        let mut at = 0.0;
        while at < seconds {
            for offset in [0.0, 0.16] {
                let mut thud = 0f32;
                let samples: Vec<f32> = (0..(0.09 * rate) as usize + 1).map(|_| random() * 2.0 - 1.0).collect();
                let mut cursor = 0;
                burst(data, rate, at + offset, 0.09, |time| {
                    thud = 0.8 * thud + 0.2 * samples[cursor.min(samples.len() - 1)];
                    cursor += 1;
                    thud * 1.1 * (-time * 45.0).exp()
                });
            }
            at += 1.0;
        }
    }
    let peak = data.iter().fold(0f32, |best, value| best.max(value.abs()));
    if peak > 0.95 {
        for value in data.iter_mut() {
            *value *= 0.95 / peak;
        }
    }
}

pub fn tone_samples(tone: &Tone, rate: f32) -> Vec<f32> {
    let length = (tone.seconds * rate) as usize;
    let mut phase = 0f32;
    (0..length).map(|index| {
        let progress = index as f32 / length.max(1) as f32;
        let frequency = tone.from * (tone.to / tone.from).powf(progress);
        phase += frequency / rate;
        let cycle = phase.fract();
        let wave = match tone.shape {
            "square" => if cycle < 0.5 { 1.0 } else { -1.0 },
            "triangle" => 4.0 * (cycle - 0.5).abs() - 1.0,
            _ => (TAU * cycle).sin(),
        };
        wave * tone.level * (0.0001f32 / tone.level).powf(progress)
    }).collect()
}

enum Command {
    Play(String, f32),
    Stop(String),
    Volume(String, f32),
    StopAll,
    Click(String),
}

static AUDIO: OnceLock<Mutex<Sender<Command>>> = OnceLock::new();

fn stereo_loop(id: &str) -> Vec<f32> {
    let mut seed = 0x2545_f491u32 ^ id.bytes().fold(0u32, |hash, byte| hash.wrapping_mul(31).wrapping_add(byte as u32));
    let mut random = move || {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        seed as f32 / u32::MAX as f32
    };
    let frames = RATE as usize * LOOP_SECONDS;
    let mut left = vec![0f32; frames];
    let mut right = vec![0f32; frames];
    if id == "binaural" {
        for index in 0..frames {
            let time = index as f32 / RATE as f32;
            left[index] = (TAU * 200.0 * time).sin() * 0.25;
            right[index] = (TAU * 210.0 * time).sin() * 0.25;
        }
    } else {
        fill_ambient(id, &mut left, RATE as f32, &mut random);
        fill_ambient(id, &mut right, RATE as f32, &mut random);
    }
    left.into_iter().zip(right).flat_map(|(a, b)| [a, b]).collect()
}

fn sender() -> Option<Sender<Command>> {
    let lock = AUDIO.get_or_init(|| {
        let (send, receive) = channel::<Command>();
        std::thread::spawn(move || {
            use rodio::Source;
            let Ok((_stream, handle)) = rodio::OutputStream::try_default() else { return };
            let mut sinks: HashMap<String, rodio::Sink> = HashMap::new();
            while let Ok(command) = receive.recv() {
                match command {
                    Command::Play(id, level) => {
                        if let Ok(sink) = rodio::Sink::try_new(&handle) {
                            sink.set_volume(level);
                            sink.append(rodio::buffer::SamplesBuffer::new(2, RATE, stereo_loop(&id)).repeat_infinite().fade_in(std::time::Duration::from_millis(600)));
                            sinks.insert(id, sink);
                        }
                    }
                    Command::Stop(id) => {
                        if let Some(sink) = sinks.remove(&id) {
                            sink.stop();
                        }
                    }
                    Command::Volume(id, level) => {
                        if let Some(sink) = sinks.get(&id) {
                            sink.set_volume(level);
                        }
                    }
                    Command::StopAll => {
                        for (_, sink) in sinks.drain() {
                            sink.stop();
                        }
                    }
                    Command::Click(pack) => {
                        if let Some(tone) = pack_tone(&pack) {
                            let _ = handle.play_raw(rodio::buffer::SamplesBuffer::new(1, RATE, tone_samples(&tone, RATE as f32)));
                        }
                    }
                }
            }
        });
        Mutex::new(send)
    });
    lock.lock().ok().map(|guard| guard.clone())
}

fn send(command: Command) {
    if let Some(sender) = sender() {
        let _ = sender.send(command);
    }
}

pub fn play(id: &str, level: f32) {
    send(Command::Play(id.into(), level));
}
pub fn stop(id: &str) {
    send(Command::Stop(id.into()));
}
pub fn volume(id: &str, level: f32) {
    send(Command::Volume(id.into(), level));
}
pub fn stop_all() {
    send(Command::StopAll);
}

pub fn current_pack() -> String {
    crate::prefs::read_json::<String>("ethone-ui-sound").filter(|pack| UI_PACKS.contains(&pack.as_str())).unwrap_or_else(|| "off".into())
}

pub fn click() {
    let pack = current_pack();
    if pack != "off" {
        send(Command::Click(pack));
    }
}

pub fn choose_pack(pack: &str) {
    crate::prefs::write_json("ethone-ui-sound", &pack.to_string());
    if pack != "off" {
        send(Command::Click(pack.into()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_ambience_makes_a_real_safe_signal() {
        assert_eq!(AMBIENT_IDS.len(), 14);
        let mut seed = 1u64;
        let mut random = move || {
            seed = seed * 16807 % 2147483647;
            seed as f32 / 2147483647.0
        };
        for id in AMBIENT_IDS.iter().filter(|id| **id != "binaural") {
            let mut data = vec![0f32; 8000 * 12];
            fill_ambient(id, &mut data, 8000.0, &mut random);
            let peak = data.iter().fold(0f32, |best, value| best.max(value.abs()));
            assert!(data.iter().all(|value| value.is_finite()), "{id}");
            assert!(peak > 0.01, "{id} est silencieux");
            assert!(peak <= 0.96, "{id} sature");
        }
    }

    #[test]
    fn interface_packs_are_short_and_fade_out() {
        for pack in UI_PACKS.iter().filter(|pack| **pack != "off") {
            let tone = pack_tone(pack).unwrap();
            assert!(tone.seconds < 0.1);
            let samples = tone_samples(&tone, 8000.0);
            assert!(samples.last().unwrap().abs() < samples.iter().fold(0f32, |best, value| best.max(value.abs())));
        }
        assert!(pack_tone("off").is_none());
    }
}
