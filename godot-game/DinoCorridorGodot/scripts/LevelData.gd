class_name LevelData
extends RefCounted
## Portage direct du tableau LEVELS du prototype HTML — mêmes valeurs exactes
## (Désert/Jungle/Lave = Forêt x1.10 / x1.21 / x1.331, calculées précédemment).
## Pas encore utilisé par le moteur en phase 1 (juste enemy_count/hp/speed/dmg/
## weapon_chance en réserve pour l'IA et les armes de la phase 2).

static var LEVELS: Array = [
	{"name": "Couloirs", "size": 13, "enemy_count": 7, "enemy_hp": 60, "enemy_speed": 1.1, "enemy_dmg": 12, "weapon_chance": 0.30,
		"wall_a": Color8(120, 55, 40), "wall_b": Color8(104, 50, 38)},
	{"name": "Grotte", "size": 15, "enemy_count": 9, "enemy_hp": 70, "enemy_speed": 1.3, "enemy_dmg": 15, "weapon_chance": 0.20,
		"wall_a": Color8(96, 90, 86), "wall_b": Color8(66, 62, 60)},
	{"name": "Forêt", "size": 17, "enemy_count": 11, "enemy_hp": 80, "enemy_speed": 1.55, "enemy_dmg": 18, "weapon_chance": 0.10,
		"wall_a": Color8(56, 82, 40), "wall_b": Color8(92, 66, 34)},
	{"name": "Désert", "size": 19, "enemy_count": 12, "enemy_hp": 88, "enemy_speed": 1.71, "enemy_dmg": 20, "weapon_chance": 0.08,
		"wall_a": Color8(196, 164, 110), "wall_b": Color8(150, 118, 74)},
	{"name": "Jungle tropicale", "size": 21, "enemy_count": 13, "enemy_hp": 97, "enemy_speed": 1.88, "enemy_dmg": 22, "weapon_chance": 0.06,
		"wall_a": Color8(46, 78, 42), "wall_b": Color8(26, 52, 30)},
	{"name": "Lave", "size": 23, "enemy_count": 15, "enemy_hp": 106, "enemy_speed": 2.06, "enemy_dmg": 24, "weapon_chance": 0.05,
		"wall_a": Color8(132, 54, 26), "wall_b": Color8(168, 74, 24)},
]
