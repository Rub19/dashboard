class_name Profile
extends RefCounted
## Stats persistantes du joueur (équivalent du profil window.storage du
## prototype, qui n'existait que dans l'aperçu Claude). Ici : un ConfigFile
## dans user:// -> survit aux relances du .exe, propre à chaque machine.

const PATH := "user://profile.cfg"

var total_kills := 0
var total_games := 0
var best_score := 0
var cleared: Array = []

static func load_profile() -> Profile:
	var p := Profile.new()
	p.cleared.resize(LevelData.LEVELS.size())
	p.cleared.fill(0)
	var cfg := ConfigFile.new()
	if cfg.load(PATH) == OK:
		p.total_kills = int(cfg.get_value("stats", "total_kills", 0))
		p.total_games = int(cfg.get_value("stats", "total_games", 0))
		p.best_score = int(cfg.get_value("stats", "best_score", 0))
		var saved: Array = cfg.get_value("stats", "cleared", [])
		for i in mini(saved.size(), p.cleared.size()):
			p.cleared[i] = int(saved[i])
	return p

func save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("stats", "total_kills", total_kills)
	cfg.set_value("stats", "total_games", total_games)
	cfg.set_value("stats", "best_score", best_score)
	cfg.set_value("stats", "cleared", cleared)
	cfg.save(PATH)

func summary() -> String:
	var levels_done := 0
	for c in cleared:
		levels_done += int(c)
	return "🦖 %d dinosaures éliminés · 🏆 meilleur score %d · 🚪 %d niveaux réussis" % [total_kills, best_score, levels_done]
