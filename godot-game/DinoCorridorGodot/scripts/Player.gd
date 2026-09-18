class_name Player
extends CharacterBody3D
## Contrôleur FPS du joueur.
## Portage direct de la logique update()/mouseLook du prototype HTML :
## - même schéma d'accélération/décélération exponentielle (fonction approach()
##   du JS) pour un déplacement fluide, sans départ/arrêt instantané ;
## - la souris pilote directement le regard (yaw sur le corps, pitch sur la
##   caméra), pas de zones de clic comme dans l'ancien système web ;
## - le clavier lit les touches brutes (pas de mappage "input actions" à
##   configurer dans l'éditeur -> rien à casser côté projet).

@export var move_speed: float = 4.8       # unités Godot/s (équivalent MOVE_SPEED=2.4 du prototype, x2 car CELL_SIZE=2)
@export var move_accel: float = 16.0      # identique en proportion à MOVE_ACCEL du prototype
@export var move_decel: float = 11.0      # identique en proportion à MOVE_DECEL du prototype
@export var mouse_sens_x: float = 0.0022  # même valeur par défaut que MOUSE_SENS_X côté HTML
@export var mouse_sens_y: float = 0.0018
@export var invert_y: bool = false
@export var pitch_limit_deg: float = 80.0 # évite de pouvoir retourner la caméra à 180°

var velocity_h: Vector3 = Vector3.ZERO
var camera: Camera3D

func _ready() -> void:
	camera = get_node_or_null("Camera3D")
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	# Échap : libère la souris (équivalent du menu pause qui rendait la main
	# au curseur classique dans la version HTML). Un clic sur la fenêtre la
	# recapture (comportement standard des jeux FPS).
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		return
	if event is InputEventMouseButton and event.pressed:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		# Horizontal : on tourne le corps entier (comme dirX/dirY dans le raycaster JS)
		rotate_y(-event.relative.x * mouse_sens_x)
		# Vertical : seulement la caméra, avec la même idée de limite que le
		# "pitch" cosmétique du prototype (sauf qu'ici c'est une vraie caméra 3D)
		if camera:
			var dy: float = event.relative.y if not invert_y else -event.relative.y
			camera.rotate_x(-dy * mouse_sens_y)
			camera.rotation.x = clampf(camera.rotation.x, deg_to_rad(-pitch_limit_deg), deg_to_rad(pitch_limit_deg))

func _physics_process(delta: float) -> void:
	# Lecture clavier brute : WASD + flèches, exactement comme GAME_KEYS côté HTML
	var fwd := 0.0
	var strafe := 0.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		fwd += 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		fwd -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		strafe += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		strafe -= 1.0

	# Normalise la diagonale (même correctif que sur la version HTML : on
	# n'avance pas plus vite en diagonale qu'en ligne droite)
	var input_len := Vector2(strafe, fwd).length()
	if input_len > 1.0:
		fwd /= input_len
		strafe /= input_len

	var forward: Vector3 = -global_transform.basis.z
	var right: Vector3 = global_transform.basis.x
	var target_h: Vector3 = (forward * fwd + right * strafe) * move_speed

	# Lissage exponentiel indépendant du framerate == fonction approach() du JS
	var rate: float = move_accel if target_h.length() > velocity_h.length() else move_decel
	var t: float = 1.0 - exp(-rate * delta)
	velocity_h = velocity_h.lerp(target_h, t)

	velocity.x = velocity_h.x
	velocity.z = velocity_h.z

	# Gravité simple pour rester collé au sol (le prototype HTML était en 2D pure,
	# ici on est en vraie 3D donc il faut un minimum de gravité)
	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = 0.0

	move_and_slide()
