class_name HUD
extends CanvasLayer
## Interface en jeu, portée du prototype HTML : barre de vie, score, dinos
## restants, arme équipée, nom du niveau, réticule, flash rouge à l'impact et
## vignette rouge quand la vie est basse. Tout construit en code (pas de
## scène à maintenir), avec les mêmes couleurs sobres que le prototype.

const CREAM := Color8(236, 223, 199)
const CREAM_DIM := Color8(168, 154, 128)
const EMBER := Color8(217, 85, 45)
const PANEL := Color(0.07, 0.055, 0.04, 0.72)

var _health_bar: ProgressBar
var _score_label: Label
var _enemies_label: Label
var _weapon_label: Label
var _level_label: Label
var _damage_flash: ColorRect
var _vignette: ColorRect
var _crosshair: Control

func _ready() -> void:
	layer = 5
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# Vignette + flash dégâts (plein écran, sous les panneaux)
	_vignette = ColorRect.new()
	_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	_vignette.color = Color(0.6, 0.0, 0.0, 0.0)
	_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_vignette)

	_damage_flash = ColorRect.new()
	_damage_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_damage_flash.color = Color(0.85, 0.1, 0.05, 0.0)
	_damage_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_damage_flash)

	# Panneau haut-gauche : vie
	var left := _panel(root, Control.PRESET_TOP_LEFT, Vector2(16, 16))
	_health_bar = ProgressBar.new()
	_health_bar.min_value = 0
	_health_bar.max_value = 100
	_health_bar.value = 100
	_health_bar.show_percentage = false
	_health_bar.custom_minimum_size = Vector2(220, 14)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.1, 0.08, 0.06, 0.9)
	bg.corner_radius_top_left = 4
	bg.corner_radius_top_right = 4
	bg.corner_radius_bottom_left = 4
	bg.corner_radius_bottom_right = 4
	var fill := StyleBoxFlat.new()
	fill.bg_color = EMBER
	fill.corner_radius_top_left = 4
	fill.corner_radius_top_right = 4
	fill.corner_radius_bottom_left = 4
	fill.corner_radius_bottom_right = 4
	_health_bar.add_theme_stylebox_override("background", bg)
	_health_bar.add_theme_stylebox_override("fill", fill)
	left.add_child(_stat_label("VIE"))
	left.add_child(_health_bar)

	# Panneau haut-droite : score + dinos restants
	var right := _panel(root, Control.PRESET_TOP_RIGHT, Vector2(-16, 16))
	right.alignment = BoxContainer.ALIGNMENT_BEGIN
	right.add_child(_stat_label("SCORE"))
	_score_label = _value_label("0", 26)
	right.add_child(_score_label)
	right.add_child(_stat_label("DINOSAURES RESTANTS"))
	_enemies_label = _value_label("0", 20)
	right.add_child(_enemies_label)

	# Haut-centre : nom du niveau
	_level_label = _value_label("", 14)
	_level_label.add_theme_color_override("font_color", CREAM_DIM)
	_level_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_level_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_level_label.position.y = 16
	root.add_child(_level_label)

	# Bas-centre : arme
	var bottom := _panel(root, Control.PRESET_CENTER_BOTTOM, Vector2(0, -24))
	bottom.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_weapon_label = _value_label("🔫 PISTOLET", 18)
	_weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bottom.add_child(_weapon_label)
	var hint := _stat_label("CLIC GAUCHE : TIRER · ÉCHAP : MENU")
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bottom.add_child(hint)

	# Réticule
	_crosshair = Crosshair.new()
	_crosshair.set_anchors_preset(Control.PRESET_CENTER)
	_crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_crosshair)

func _panel(parent: Control, preset: int, offset: Vector2) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.set_anchors_preset(preset)
	box.position += offset
	box.add_theme_constant_override("separation", 4)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if preset == Control.PRESET_TOP_RIGHT:
		box.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	elif preset == Control.PRESET_CENTER_BOTTOM:
		box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	parent.add_child(box)
	return box

func _stat_label(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 11)
	l.add_theme_color_override("font_color", CREAM_DIM)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _value_label(text: String, size: int) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", CREAM)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

# ---------- API ----------

func set_health(value: float) -> void:
	_health_bar.value = clampf(value, 0.0, 100.0)
	# Même seuil que le prototype : vignette progressive sous 35 PV
	var a := 0.0
	if value < 35.0:
		a = minf(0.45, (35.0 - value) / 35.0 * 0.45)
	_vignette.color.a = a

func set_score(value: int) -> void:
	_score_label.text = str(value)

func set_enemies_left(value: int) -> void:
	_enemies_label.text = str(value)

func set_weapon(weapon: String) -> void:
	_weapon_label.text = String(Weapons.get_data(weapon).label)

func set_level_name(name: String) -> void:
	_level_label.text = name.to_upper()

func flash_damage() -> void:
	_damage_flash.color.a = 0.4
	var tw := create_tween()
	tw.tween_property(_damage_flash, "color:a", 0.0, 0.18)

func flash_hit() -> void:
	if _crosshair is Crosshair:
		(_crosshair as Crosshair).flash()

## Réticule : croix fine crème, qui passe brièvement en orange lors d'un tir réussi.
class Crosshair extends Control:
	var _hit_t := 0.0
	func _ready() -> void:
		custom_minimum_size = Vector2(24, 24)
		size = Vector2(24, 24)
		position = -size / 2.0
	func flash() -> void:
		_hit_t = 0.12
		queue_redraw()
	func _process(delta: float) -> void:
		if _hit_t > 0.0:
			_hit_t -= delta
			if _hit_t <= 0.0:
				queue_redraw()
	func _draw() -> void:
		var c := HUD.EMBER if _hit_t > 0.0 else HUD.CREAM
		var m := size / 2.0
		var gap := 4.0
		var len := 8.0
		draw_line(Vector2(m.x - gap - len, m.y), Vector2(m.x - gap, m.y), c, 2.0)
		draw_line(Vector2(m.x + gap, m.y), Vector2(m.x + gap + len, m.y), c, 2.0)
		draw_line(Vector2(m.x, m.y - gap - len), Vector2(m.x, m.y - gap), c, 2.0)
		draw_line(Vector2(m.x, m.y + gap), Vector2(m.x, m.y + gap + len), c, 2.0)
