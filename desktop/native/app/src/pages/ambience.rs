use crate::app::App;
use crate::i18n::tr;
use crate::prefs;
use crate::sounds;
use crate::vm::*;
use serde_json::Value;

fn label(id: &str) -> (String, String) {
    match id {
        "rain" => (tr("Pluie", "Rain"), tr("Pluie continue.", "Steady rain.")),
        "storm" => (tr("Orage", "Storm"), tr("Pluie et tonnerre lointain.", "Rain and distant thunder.")),
        "ocean" => (tr("Océan", "Ocean"), tr("Vagues lentes.", "Slow waves.")),
        "wind" => (tr("Vent", "Wind"), tr("Rafales douces.", "Soft gusts.")),
        "forest" => (tr("Forêt", "Forest"), tr("Feuillage et oiseaux.", "Leaves and birds.")),
        "nature" => ("Nature".into(), tr("Ruisseau et oiseaux.", "Stream and birds.")),
        "fireplace" => (tr("Cheminée", "Fireplace"), tr("Feu de bois qui crépite.", "Crackling wood fire.")),
        "cafe" => (tr("Café", "Café"), tr("Brouhaha et tasses.", "Murmur and cups.")),
        "night" => (tr("Nuit", "Night"), tr("Grillons au calme.", "Quiet crickets.")),
        "train" => ("Train".into(), tr("Roulement régulier.", "Steady rolling.")),
        "space" => (tr("Espace", "Space"), tr("Nappe grave et lente.", "Slow deep drone.")),
        "brown" => (tr("Bruit brun", "Brown noise"), tr("Grave et enveloppant.", "Deep and enveloping.")),
        "pink" => (tr("Bruit rose", "Pink noise"), tr("Doux et équilibré.", "Soft and balanced.")),
        _ => (tr("Ondes alpha", "Alpha waves"), tr("Battement binaural de 10 Hz, à écouter au casque.", "10 Hz binaural beat, best on headphones.")),
    }
}

fn levels() -> serde_json::Map<String, Value> {
    prefs::read_json("ethone-ambience").unwrap_or_default()
}

fn level(id: &str) -> f32 {
    levels().get(id).and_then(Value::as_f64).unwrap_or(0.4) as f32
}

pub fn playing(app: &App) -> Vec<String> {
    app.get("ambience:on").split(',').filter(|item| !item.is_empty()).map(str::to_string).collect()
}

pub fn stop_all(app: &mut App) {
    if !playing(app).is_empty() {
        sounds::stop_all();
        app.set("ambience:on", "");
    }
}

pub fn act(app: &mut App, id: &str, value: &str) {
    let (verb, sound) = id.split_once(':').unwrap_or((id, ""));
    let mut on = playing(app);
    match verb {
        "toggle" => {
            if let Some(at) = on.iter().position(|item| item == sound) {
                on.remove(at);
                sounds::stop(sound);
            } else {
                sounds::play(sound, level(sound));
                on.push(sound.to_string());
            }
            app.set("ambience:on", &on.join(","));
        }
        "level" => {
            let Ok(next) = value.parse::<f32>() else { return };
            let next = next.clamp(0.0, 1.0);
            let mut all = levels();
            all.insert(sound.to_string(), serde_json::json!(next));
            prefs::write_json("ethone-ambience", &all);
            sounds::volume(sound, next);
        }
        "down" | "up" => {
            let step = if verb == "up" { 0.1 } else { -0.1 };
            act(app, &format!("level:{sound}"), &(level(sound) + step).to_string());
        }
        _ => {}
    }
}

pub fn view(app: &mut App) -> Vec<B> {
    let on = playing(app);
    let (play, pause, minus, plus) = (app.icon("play"), app.icon("pause"), app.icon("minus"), app.icon("plus"));
    let mut out = vec![head(&tr("Ambiance", "Ambience"), &tr("14 sons générés sur ce PC, que tu peux mélanger. Ils s'arrêtent quand tu quittes cette page.", "Sounds generated on this PC that you can mix. They stop when you leave this page."), vec![])];
    let rows = sounds::AMBIENT_IDS.iter().map(|id| {
        let (name, text) = label(id);
        let active = on.iter().any(|item| item == id);
        let value = level(id);
        row(vec![
            ibtn(&format!("ambience:toggle:{id}"), if active { pause.clone() } else { play.clone() }, &name).on(active),
            stack(&name, &text),
            ibtn(&format!("ambience:down:{id}"), minus.clone(), &tr("Moins fort", "Quieter")),
            C { weight: 0.5, ..bar(value) },
            ibtn(&format!("ambience:up:{id}"), plus.clone(), &tr("Plus fort", "Louder")),
            muted(&format!("{} %", (value * 100.0).round() as i64)),
        ])
    }).collect();
    out.extend(group(rows));
    out
}
