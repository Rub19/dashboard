extends Node3D
## Chef d'orchestre du jeu (Phase 2) : menu + sélecteur de niveau, partie
## (niveau 3D, dinosaures, armes au sol, joueur), HUD, pause, écrans de fin,
## progression de niveau et profil persistant. Même déroulé que le prototype
## HTML (resetGame / beginGame / update / showOverlay / pauseToMenu).

enum State { MENU, PLAYING, PAUSED, RESULT }

const CELL_SIZE := 2.0
const SCORE_PER_KILL := 100

var state: int = State.MENU
var current_level := 0
var pending_level := 0
var score := 0

var world: Node3D
var player: Player
var hud: HUD
var overlay: GameOverlay
var sfx: Sfx
var profile: Profile
var textures: Dictionary = {}
var pickups: Array[Pickup] = []
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()
	_add_lighting()

	sfx = Sfx.new()
	add_child(sfx)

	textures["trex"] = load("res://assets/trex.png")
	textures["carno"] = load("res://assets/carno.png")

	profile = Profile.load_profile()

	world = Node3D.new()
	world.name = "World"
	add_child(world)

	player = Player.new()
	player.name = "Player"
	player.sfx = sfx
	player.damaged.connect(_on_player_damaged)
	player.died.connect(_on_player_died)
	player.weapon_changed.connect(func(w: String) -> void: hud.set_weapon(w))
	player.dino_hit.connect(func(_d: Dino) -> void: hud.flash_hit())
	add_child(player)

	hud = HUD.new()
	add_child(hud)
	hud.visible = false

	overlay = GameOverlay.new()
	overlay.start_requested.connect(begin_game)
	overlay.primary_pressed.connect(func() -> void: begin_game(pending_level))
	overlay.menu_pressed.connect(func() -> void: _show_menu(false))
	overlay.resume_pressed.connect(_resume)
	add_child(overlay)

	_show_menu(false)

# ---------- cycle de vie d'une partie ----------

func begin_game(level_index: int) -> void:
	current_level = clampi(level_index, 0, LevelData.LEVELS.size() - 1)
	var cfg: Dictionary = LevelData.LEVELS[current_level]

	_clear_world()

	var builder := LevelBuilder.new()
	world.add_child(builder)
	builder.build(cfg.size, cfg.wall_a, cfg.wall_b)

	var used := {}
	_spawn_dinos(cfg, used)
	_spawn_pickups(cfg, used)

	# Même point de départ que le prototype (1.5, 1.5), regard vers +X
	player.reset_state()
	player.global_position = Vector3(1.5 * CELL_SIZE, 1.0, 1.5 * CELL_SIZE)
	player.rotation = Vector3(0, -PI / 2.0, 0)
	player.controls_enabled = true

	score = 0
	hud.set_score(score)
	hud.set_health(player.health)
	hud.set_weapon(player.weapon)
	hud.set_level_name("%d · %s" % [current_level + 1, cfg.name])
	hud.set_enemies_left(_alive_count())
	hud.visible = true

	profile.total_games += 1
	profile.save()

	overlay.hide_overlay()
	state = State.PLAYING
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	sfx.play("click", -8.0)

func _clear_world() -> void:
	for child in world.get_children():
		child.queue_free()
	pickups.clear()

## Portage de pickOpenSpots() : cases libres (pas bordure, pas pilier), pas
## trop près du départ, mélangées, sans doublon avec `used`.
func _pick_open_spots(size: int, count: int, used: Dictionary) -> Array:
	var cells: Array = []
	for y in range(1, size - 1):
		for x in range(1, size - 1):
			if x % 2 == 0 and y % 2 == 0:
				continue
			if Vector2(x - 1, y - 1).length() < 3.2:
				continue
			var key := "%d,%d" % [x, y]
			if used.has(key):
				continue
			cells.append(Vector2i(x, y))
	for i in range(cells.size() - 1, 0, -1):
		var j := _rng.randi_range(0, i)
		var tmp = cells[i]
		cells[i] = cells[j]
		cells[j] = tmp
	return cells.slice(0, count)

func _spawn_dinos(cfg: Dictionary, used: Dictionary) -> void:
	var spots := _pick_open_spots(cfg.size, cfg.enemy_count, used)
	for i in spots.size():
		var cell: Vector2i = spots[i]
		used["%d,%d" % [cell.x, cell.y]] = true
		var type := "trex" if i % 2 == 0 else "carno"
		var dino := Dino.new()
		world.add_child(dino)
		dino.setup(type, cfg, _rng.randf_range(0.0, 360.0), textures[type], player, sfx)
		dino.global_position = Vector3((cell.x + 0.5) * CELL_SIZE, 0.0, (cell.y + 0.5) * CELL_SIZE)
		dino.died.connect(_on_dino_died)
		dino.attacked_player.connect(_on_dino_attacked_player)

func _spawn_pickups(cfg: Dictionary, used: Dictionary) -> void:
	for type in ["shotgun", "sword"]:
		if _rng.randf() < float(cfg.weapon_chance):
			var spots := _pick_open_spots(cfg.size, 1, used)
			if spots.is_empty():
				continue
			var cell: Vector2i = spots[0]
			used["%d,%d" % [cell.x, cell.y]] = true
			var pickup := Pickup.new()
			world.add_child(pickup)
			pickup.setup(type)
			pickup.global_position = Vector3((cell.x + 0.5) * CELL_SIZE, 0.0, (cell.y + 0.5) * CELL_SIZE)
			pickups.append(pickup)

func _alive_count() -> int:
	var n := 0
	for node in get_tree().get_nodes_in_group("dinos"):
		if node is Dino and (node as Dino).alive:
			n += 1
	return n

func _process(_delta: float) -> void:
	if state != State.PLAYING:
		return
	# Ramassage des armes au sol
	for pickup in pickups:
		if is_instance_valid(pickup) and not pickup.collected and pickup.is_in_reach(player.global_position):
			player.set_weapon(pickup.weapon_type)
			pickup.collect()
			sfx.play("pickup", -3.0)

# ---------- événements de jeu ----------

func _on_dino_died(_dino: Dino) -> void:
	score += SCORE_PER_KILL
	profile.total_kills += 1
	profile.save()
	hud.set_score(score)
	hud.set_enemies_left(_alive_count())
	if state == State.PLAYING and _alive_count() == 0:
		_level_complete()

func _on_dino_attacked_player(damage: int) -> void:
	if state != State.PLAYING:
		return
	player.take_damage(float(damage))
	hud.flash_damage()

func _on_player_damaged(health: float) -> void:
	hud.set_health(health)

func _on_player_died() -> void:
	if state != State.PLAYING:
		return
	var cfg: Dictionary = LevelData.LEVELS[current_level]
	_end_round()
	pending_level = current_level
	profile.best_score = maxi(profile.best_score, score)
	profile.save()
	sfx.play("game_over")
	overlay.show_result("GAME OVER", "Les dinosaures ont gagné cette manche (%s). Score : %d." % [cfg.name, score], "REESSAYER", profile.summary())

func _level_complete() -> void:
	var cfg: Dictionary = LevelData.LEVELS[current_level]
	_end_round()
	profile.best_score = maxi(profile.best_score, score)
	profile.cleared[current_level] = int(profile.cleared[current_level]) + 1
	profile.save()
	if current_level < LevelData.LEVELS.size() - 1:
		pending_level = current_level + 1
		sfx.play("level_clear")
		overlay.show_result("NIVEAU TERMINÉ", "%s nettoyé ! Score : %d. Prêt pour %s ?" % [cfg.name, score, LevelData.LEVELS[current_level + 1].name], "NIVEAU SUIVANT", profile.summary())
	else:
		pending_level = current_level
		sfx.play("victory")
		overlay.show_result("VICTOIRE TOTALE", "Les six niveaux sont terminés. Bravo ! Score final : %d." % score, "REJOUER", profile.summary())

func _end_round() -> void:
	state = State.RESULT
	player.controls_enabled = false
	_freeze_dinos(true)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

# ---------- menu / pause ----------

func _show_menu(can_resume: bool) -> void:
	if not can_resume:
		state = State.MENU
		player.controls_enabled = false
		hud.visible = false
		_clear_world()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	overlay.selected_level = current_level
	overlay.show_main_menu(profile.summary(), can_resume)

func _pause() -> void:
	state = State.PAUSED
	player.controls_enabled = false
	_freeze_dinos(true)
	_show_menu(true)

func _resume() -> void:
	if state != State.PAUSED:
		return
	overlay.hide_overlay()
	state = State.PLAYING
	player.controls_enabled = true
	_freeze_dinos(false)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _freeze_dinos(frozen: bool) -> void:
	for node in get_tree().get_nodes_in_group("dinos"):
		if node is Dino:
			(node as Dino).set_physics_process(not frozen and (node as Dino).alive)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		if state == State.PLAYING:
			_pause()
		elif state == State.PAUSED:
			_resume()
	elif event is InputEventMouseButton and event.pressed and state == State.PLAYING:
		# Clic dans la fenêtre : recapture la souris si elle avait été libérée
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

# ---------- décor ----------

func _add_lighting() -> void:
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-45, -30, 0)
	light.light_energy = 0.9
	add_child(light)

	var env_node := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color8(6, 5, 4)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color8(35, 30, 25)
	environment.ambient_light_energy = 0.6
	env_node.environment = environment
	add_child(env_node)
