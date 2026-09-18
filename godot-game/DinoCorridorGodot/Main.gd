extends Node3D
## Point d'entrée de la Phase 1 du portage natif.
## Construit tout au chargement : lumière, niveau 3D (à partir de LevelData +
## LevelBuilder), joueur (Player.gd). Volontairement fait en code plutôt que
## dans la scène pour rester sur des fichiers texte simples et sûrs.
## Rien ici sur les dinosaures / armes / HUD / menus : c'est la phase 2.

const CELL_SIZE := 2.0
const START_LEVEL := 0 # 0=Couloirs ... 5=Lave, cf. LevelData.LEVELS

func _ready() -> void:
	_add_lighting()

	var level: Dictionary = LevelData.LEVELS[START_LEVEL]

	var builder := LevelBuilder.new()
	add_child(builder)
	builder.build(level.size, level.wall_a, level.wall_b)

	_spawn_player()

func _spawn_player() -> void:
	var player := Player.new()

	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.35
	capsule.height = 1.6
	collider.shape = capsule
	collider.position.y = 0.8
	player.add_child(collider)

	var camera := Camera3D.new()
	camera.position = Vector3(0, 0.7, 0) # hauteur des yeux
	camera.current = true
	player.add_child(camera)

	# Même point de départ que le prototype HTML (player.x=1.5, player.y=1.5)
	player.position = Vector3(1.5 * CELL_SIZE, 1.0, 1.5 * CELL_SIZE)
	add_child(player)

func _add_lighting() -> void:
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-45, -30, 0)
	light.light_energy = 0.9
	add_child(light)

	var env_node := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color8(6, 5, 4) # même ambiance très sombre que le prototype
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color8(35, 30, 25)
	environment.ambient_light_energy = 0.6
	env_node.environment = environment
	add_child(env_node)
