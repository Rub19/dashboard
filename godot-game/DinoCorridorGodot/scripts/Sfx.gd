class_name Sfx
extends Node
## Sons du jeu, générés procéduralement au démarrage (le repo n'a aucun
## fichier audio et le prototype HTML n'avait pas de son du tout). Chaque
## effet est synthétisé en PCM 16 bits puis mis dans un AudioStreamWAV :
## aucun asset à fournir, rien qui puisse manquer à l'export.

const RATE := 22050

var _streams: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []

func _ready() -> void:
	_streams["pistol"] = _to_wav(_gen_gun(0.18, 28.0, 180.0, 0.9))
	_streams["shotgun"] = _to_wav(_gen_gun(0.38, 11.0, 95.0, 1.0))
	_streams["sword"] = _to_wav(_gen_whoosh(0.28))
	_streams["hit"] = _to_wav(_gen_tone_burst(0.09, 1400.0, 40.0, 0.35))
	_streams["hurt"] = _to_wav(_gen_gun(0.26, 16.0, 80.0, 0.8))
	_streams["pickup"] = _to_wav(_gen_notes([660.0, 990.0], 0.11, 0.5))
	_streams["level_clear"] = _to_wav(_gen_notes([523.25, 659.25, 783.99, 1046.5], 0.14, 0.5))
	_streams["victory"] = _to_wav(_gen_notes([523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98], 0.15, 0.5))
	_streams["game_over"] = _to_wav(_gen_notes([392.0, 311.13, 233.08], 0.32, 0.55))
	_streams["roar"] = _to_wav(_gen_roar(0.7, 120.0, 70.0, 0.9))
	_streams["dino_death"] = _to_wav(_gen_roar(1.0, 130.0, 35.0, 0.85))
	_streams["click"] = _to_wav(_gen_tone_burst(0.05, 900.0, 60.0, 0.25))

	for i in 8:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)

func play(sound: String, volume_db := 0.0) -> void:
	if not _streams.has(sound):
		return
	for p in _players:
		if not p.playing:
			p.stream = _streams[sound]
			p.volume_db = volume_db
			p.play()
			return
	# Toutes les voix occupées : on vole la première (mieux qu'un silence).
	var p: AudioStreamPlayer = _players[0]
	p.stream = _streams[sound]
	p.volume_db = volume_db
	p.play()

func stream(sound: String) -> AudioStreamWAV:
	return _streams.get(sound)

# ---------- synthèse ----------

static func _to_wav(samples: PackedFloat32Array) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in samples.size():
		bytes.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32767.0))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.data = bytes
	return wav

static func _noise(rng: RandomNumberGenerator) -> float:
	return rng.randf_range(-1.0, 1.0)

## Détonation : souffle de bruit blanc à décroissance rapide + coup sourd grave.
static func _gen_gun(dur: float, decay: float, thump_hz: float, gain: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1337
	var prev := 0.0
	for i in n:
		var t := float(i) / RATE
		var env := exp(-decay * t)
		var raw := _noise(rng)
		# Filtre passe-bas 1 pôle : bruit moins "aigu/criard"
		prev = prev + (raw - prev) * 0.35
		var thump := sin(TAU * thump_hz * t) * exp(-18.0 * t) * 0.8
		out[i] = clampf((prev * env + thump) * gain, -1.0, 1.0)
	return out

## Sifflement d'épée : bruit filtré avec une enveloppe en cloche.
static func _gen_whoosh(dur: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var prev := 0.0
	for i in n:
		var t := float(i) / RATE
		var x := t / dur
		var env := sin(PI * x)
		var cutoff := 0.08 + 0.4 * env
		prev = prev + (_noise(rng) - prev) * cutoff
		out[i] = prev * env * 0.9
	return out

## Petit "tic" tonal (impact réussi, clic d'interface).
static func _gen_tone_burst(dur: float, hz: float, decay: float, gain: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		out[i] = sin(TAU * hz * t) * exp(-decay * t) * gain
	return out

## Suite de notes carrées adoucies (ramassage, niveau terminé, défaite).
static func _gen_notes(freqs: Array, note_dur: float, gain: float) -> PackedFloat32Array:
	var per := int(note_dur * RATE)
	var out := PackedFloat32Array()
	out.resize(per * freqs.size())
	for k in freqs.size():
		var hz: float = freqs[k]
		for i in per:
			var t := float(i) / RATE
			var x := t / note_dur
			var env := minf(1.0, x * 12.0) * (1.0 - x * 0.85)
			var s := sin(TAU * hz * t) + 0.35 * sin(TAU * hz * 2.0 * t)
			out[k * per + i] = s * env * gain * 0.6
	return out

## Rugissement : dent de scie grave avec vibrato + glissando + souffle.
static func _gen_roar(dur: float, hz_from: float, hz_to: float, gain: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var phase := 0.0
	var prev := 0.0
	for i in n:
		var t := float(i) / RATE
		var x := t / dur
		var hz := lerpf(hz_from, hz_to, x) * (1.0 + 0.06 * sin(TAU * 9.0 * t))
		phase += hz / RATE
		var saw: float = 2.0 * (phase - floorf(phase)) - 1.0
		var env := minf(1.0, x * 6.0) * (1.0 - x) * (1.0 - x)
		prev = prev + (_noise(rng) - prev) * 0.12
		out[i] = (saw * 0.7 + prev * 0.5) * env * gain
	return out
