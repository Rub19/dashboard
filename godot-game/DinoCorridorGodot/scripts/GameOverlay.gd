class_name GameOverlay
extends CanvasLayer
## Menu de démarrage (sélecteur de niveau + stats du profil), écran de pause
## et écrans de fin (GAME OVER / NIVEAU TERMINÉ / VICTOIRE TOTALE) — même
## logique d'overlay que le prototype HTML, en Controls Godot construits en
## code.

signal start_requested(level_index: int)
signal primary_pressed          # bouton principal des écrans de fin (REESSAYER / NIVEAU SUIVANT / REJOUER)
signal menu_pressed
signal resume_pressed

const CREAM := Color8(236, 223, 199)
const CREAM_DIM := Color8(168, 154, 128)
const EMBER := Color8(217, 85, 45)

var selected_level := 0

var _root: Control
var _title: Label
var _text: Label
var _profile: Label
var _level_box: VBoxContainer
var _level_buttons: Array[Button] = []
var _start_btn: Button
var _resume_btn: Button
var _primary_btn: Button
var _menu_btn: Button

func _ready() -> void:
	layer = 10
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.02, 0.015, 0.01, 0.86)
	_root.add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.07, 0.055, 0.04, 0.97)
	sb.border_color = Color(0.91, 0.86, 0.78, 0.18)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(14)
	sb.content_margin_left = 28
	sb.content_margin_right = 28
	sb.content_margin_top = 24
	sb.content_margin_bottom = 24
	panel.add_theme_stylebox_override("panel", sb)
	panel.custom_minimum_size = Vector2(520, 0)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 12)
	panel.add_child(col)

	_title = Label.new()
	_title.text = "DINO CORRIDOR"
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.add_theme_font_size_override("font_size", 34)
	_title.add_theme_color_override("font_color", CREAM)
	col.add_child(_title)

	_text = Label.new()
	_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text.custom_minimum_size = Vector2(460, 0)
	_text.add_theme_font_size_override("font_size", 14)
	_text.add_theme_color_override("font_color", CREAM_DIM)
	col.add_child(_text)

	_level_box = VBoxContainer.new()
	_level_box.add_theme_constant_override("separation", 6)
	col.add_child(_level_box)
	var lvl_title := Label.new()
	lvl_title.text = "CHOISIS TON NIVEAU"
	lvl_title.add_theme_font_size_override("font_size", 11)
	lvl_title.add_theme_color_override("font_color", CREAM_DIM)
	_level_box.add_child(lvl_title)
	for i in LevelData.LEVELS.size():
		var lvl: Dictionary = LevelData.LEVELS[i]
		var b := Button.new()
		b.text = "%d. %s   —   %d dinos · %d PV · dégâts %d" % [i + 1, lvl.name, lvl.enemy_count, lvl.enemy_hp, lvl.enemy_dmg]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.focus_mode = Control.FOCUS_NONE
		b.pressed.connect(_on_level_pressed.bind(i))
		_level_box.add_child(b)
		_level_buttons.append(b)

	_start_btn = _big_button(col, "COMMENCER")
	_start_btn.pressed.connect(func() -> void: start_requested.emit(selected_level))

	_resume_btn = _big_button(col, "REPRENDRE")
	_resume_btn.pressed.connect(func() -> void: resume_pressed.emit())

	_primary_btn = _big_button(col, "REESSAYER")
	_primary_btn.pressed.connect(func() -> void: primary_pressed.emit())

	_menu_btn = Button.new()
	_menu_btn.text = "MENU PRINCIPAL"
	_menu_btn.focus_mode = Control.FOCUS_NONE
	_menu_btn.pressed.connect(func() -> void: menu_pressed.emit())
	col.add_child(_menu_btn)

	_profile = Label.new()
	_profile.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_profile.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_profile.custom_minimum_size = Vector2(460, 0)
	_profile.add_theme_font_size_override("font_size", 12)
	_profile.add_theme_color_override("font_color", CREAM_DIM)
	col.add_child(_profile)

	_refresh_level_buttons()

func _big_button(parent: Control, text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 44)
	var sb := StyleBoxFlat.new()
	sb.bg_color = EMBER
	sb.set_corner_radius_all(8)
	b.add_theme_stylebox_override("normal", sb)
	var hover := sb.duplicate()
	hover.bg_color = Color8(239, 114, 72)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", hover)
	b.add_theme_color_override("font_color", Color8(20, 12, 8))
	b.add_theme_color_override("font_hover_color", Color8(20, 12, 8))
	b.add_theme_color_override("font_pressed_color", Color8(20, 12, 8))
	b.add_theme_font_size_override("font_size", 16)
	parent.add_child(b)
	return b

func _on_level_pressed(index: int) -> void:
	selected_level = index
	_refresh_level_buttons()

func _refresh_level_buttons() -> void:
	for i in _level_buttons.size():
		var b := _level_buttons[i]
		var sb := StyleBoxFlat.new()
		sb.set_corner_radius_all(6)
		sb.content_margin_left = 10
		sb.content_margin_top = 6
		sb.content_margin_bottom = 6
		if i == selected_level:
			sb.bg_color = Color(0.85, 0.33, 0.18, 0.22)
			sb.border_color = EMBER
			sb.set_border_width_all(1)
			b.add_theme_color_override("font_color", CREAM)
		else:
			sb.bg_color = Color(1, 1, 1, 0.04)
			sb.border_color = Color(0.91, 0.86, 0.78, 0.12)
			sb.set_border_width_all(1)
			b.add_theme_color_override("font_color", CREAM_DIM)
		b.add_theme_stylebox_override("normal", sb)
		var hv := sb.duplicate()
		hv.bg_color = Color(1, 1, 1, 0.09)
		b.add_theme_stylebox_override("hover", hv)
		b.add_theme_stylebox_override("pressed", hv)

# ---------- API ----------

func show_main_menu(profile_text: String, can_resume: bool) -> void:
	_title.text = "DINO CORRIDOR"
	_text.text = "Partie interrompue." if can_resume else "Survis aux couloirs, élimine tous les dinosaures pour passer au niveau suivant. ZQSD / WASD pour bouger, souris pour viser, clic gauche pour tirer."
	_profile.text = profile_text
	_level_box.visible = true
	_start_btn.visible = true
	_resume_btn.visible = can_resume
	_primary_btn.visible = false
	_menu_btn.visible = false
	visible = true

func show_result(title: String, text: String, button_label: String, profile_text: String) -> void:
	_title.text = title
	_text.text = text
	_profile.text = profile_text
	_primary_btn.text = button_label
	_level_box.visible = false
	_start_btn.visible = false
	_resume_btn.visible = false
	_primary_btn.visible = true
	_menu_btn.visible = true
	visible = true

func hide_overlay() -> void:
	visible = false
