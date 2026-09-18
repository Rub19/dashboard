class_name Weapons
extends RefCounted
## Portage exact de la table WEAPONS du prototype HTML : mêmes cadences,
## mêmes tolérances de visée, mêmes formules de dégâts.
## - cooldown  : délai entre deux tirs (s)
## - angle_tol : latitude de visée ajoutée à la hurtbox angulaire du dino
## - melee     : arme de contact, portée limitée (melee_range, en cases)
## - dmg       : dégâts en fonction des PV max de la cible (fusil/épée)

const DATA := {
	"pistol":  { "label": "🔫 PISTOLET",      "fire_label": "TIRER",   "cooldown": 0.28, "angle_tol": 0.18, "melee": false, "melee_range": 0.0 },
	"shotgun": { "label": "💥 FUSIL À POMPE", "fire_label": "TIRER",   "cooldown": 0.55, "angle_tol": 0.32, "melee": false, "melee_range": 0.0 },
	"sword":   { "label": "🗡️ ÉPÉE",          "fire_label": "FRAPPER", "cooldown": 0.38, "angle_tol": 0.55, "melee": true,  "melee_range": 1.3 },
}

static func get_data(weapon: String) -> Dictionary:
	return DATA.get(weapon, DATA["pistol"])

## Dégâts d'un coup : pistolet 30 fixe, fusil = moitié des PV max + 2,
## épée = PV max + 5 (tue en un coup, mais il faut être au contact).
static func damage(weapon: String, target_max_hp: float) -> float:
	match weapon:
		"shotgun":
			return ceilf(target_max_hp / 2.0) + 2.0
		"sword":
			return target_max_hp + 5.0
		_:
			return 30.0

## Son associé au tir de chaque arme (cf. Sfx.gd).
static func sound(weapon: String) -> String:
	match weapon:
		"shotgun":
			return "shotgun"
		"sword":
			return "sword"
		_:
			return "pistol"
