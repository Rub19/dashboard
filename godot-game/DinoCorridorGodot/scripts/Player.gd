class_name Player
extends CharacterBody3D
## Contrôleur FPS du joueur — portage de la logique du prototype HTML :
## - déplacement lissé (accélération/décélération exponentielle = approach() du JS),
## - souris = regard direct (yaw sur le corps, pitch sur la caméra),
## - tir : sélection de la cible par hurtbox angulaire + test d'occlusion par
##   les murs, exactement comme shoot() côté prototype,
## - vie / arme / recharge de tir.
## Les touches sont lues par POSITION physique : ZQSD sur AZERTY, WASD sur
## QWERTY, sans rien configurer.

signal damaged(health: float)
signal died
signal weapon_changed(weapon: String)
signal dino_hit(dino: Dino)

const CELL_SIZE := 2.0
const HIT_PADDING := 0.10 * CELL_SIZE

@export var move_speed: float = 4.8       # 2.4 cases/s du prototype x CELL_SIZE
@export var move_accel: float = 16.0
@export var move_decel: float = 11.0
@export var mouse_sens_x: float = 0.0022
@export var mouse_sens_y: float = 0.0018
@export var invert_y: bool = false
@export var pitch_limit_deg: float = 80.0

var health := 100.0
var weapon := "pistol"
var fire_cooldown := 0.0
var controls_enabled := false
var sfx: Sfx

var velocity_h: Vector3 = Vector3.ZERO
var camera: Camera3D
var weapon_view: WeaponView

func _ready() -> void:
	# Couche 1 (monde) ; entre en collision avec les murs (1) et les dinos (2).
	collision_layer = 1
	collision_mask = 3

	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.35
	capsule.height = 1.6
	collider.shape = capsule
	collider.position.y = 0.8
	add_child(collider)

	camera = Camera3D.new()
	camera.name = "Camera3D"
	camera.position = Vector3(0, 0.7, 0) # hauteur des yeux
	camera.current = true
	add_child(camera)

	weapon_view = WeaponView.new()
	camera.add_child(weapon_view)

func reset_state() -> void:
	health = 100.0
	weapon = "pistol"
	fire_cooldown = 0.0
	velocity = Vector3.ZERO
	velocity_h = Vector3.ZERO
	if camera:
		camera.rotation.x = 0.0
	if weapon_view:
		weapon_view.set_weapon(weapon)
	weapon_changed.emit(weapon)
	damaged.emit(health)

func set_weapon(new_weapon: String) -> void:
	weapon = new_weapon
	if weapon_view:
		weapon_view.set_weapon(weapon)
	weapon_changed.emit(weapon)

func take_damage(amount: float) -> void:
	if health <= 0.0:
		return
	health -= amount
	if sfx:
		sfx.play("hurt", -2.0)
	damaged.emit(health)
	if health <= 0.0:
		died.emit()

func _unhandled_input(event: InputEvent) -> void:
	if not controls_enabled or Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		return
	if event is InputEventMouseMotion:
		# Horizontal : on tourne le corps entier ; vertical : seulement la caméra.
		rotate_y(-event.relative.x * mouse_sens_x)
		if camera:
			var dy: float = event.relative.y if not invert_y else -event.relative.y
			camera.rotate_x(-dy * mouse_sens_y)
			camera.rotation.x = clampf(camera.rotation.x, deg_to_rad(-pitch_limit_deg), deg_to_rad(pitch_limit_deg))
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		shoot()

func _physics_process(delta: float) -> void:
	if fire_cooldown > 0.0:
		fire_cooldown -= delta

	var fwd := 0.0
	var strafe := 0.0
	if controls_enabled:
		# is_physical_key_pressed() lit la POSITION de la touche, pas le
		# caractère produit : KEY_W/A/S/D = l'emplacement de WASD sur un clavier
		# QWERTY, c'est-à-dire ZQSD sur un AZERTY.
		if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):
			fwd += 1.0
		if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):
			fwd -= 1.0
		if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT):
			strafe += 1.0
		if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT):
			strafe -= 1.0

	# Normalise la diagonale
	var input_len := Vector2(strafe, fwd).length()
	if input_len > 1.0:
		fwd /= input_len
		strafe /= input_len

	var forward: Vector3 = -global_transform.basis.z
	var right: Vector3 = global_transform.basis.x
	var target_h: Vector3 = (forward * fwd + right * strafe) * move_speed

	# Lissage exponentiel indépendant du framerate == approach() du JS
	var rate: float = move_accel if target_h.length() > velocity_h.length() else move_decel
	var t: float = 1.0 - exp(-rate * delta)
	velocity_h = velocity_h.lerp(target_h, t)

	velocity.x = velocity_h.x
	velocity.z = velocity_h.z

	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = 0.0

	move_and_slide()

## Portage de shoot() : parmi les dinos vivants devant la caméra, garde le plus
## proche dont le corps tombe dans le cône de visée (hurtbox angulaire = demi-
## largeur du corps à cette distance + latitude de l'arme) et qu'aucun mur ne
## cache. Un dino lointain, petit à l'écran, a donc une hurtbox plus stricte
## qu'un dino proche : on vise le corps, pas une boîte fixe.
func shoot() -> void:
	if fire_cooldown > 0.0 or camera == null:
		return
	var w := Weapons.get_data(weapon)
	fire_cooldown = float(w.cooldown)
	if sfx:
		sfx.play(Weapons.sound(weapon))
	if weapon_view:
		weapon_view.play_fire()

	var cam_inv := camera.global_transform.affine_inverse()
	var space := get_world_3d().direct_space_state
	var best_depth := INF
	var target: Dino = null

	for node in get_tree().get_nodes_in_group("dinos"):
		var dino := node as Dino
		if dino == null or not dino.alive:
			continue
		var center: Vector3 = dino.global_position + Vector3(0, 0.9, 0)
		var local: Vector3 = cam_inv * center
		var depth := -local.z
		if depth <= 0.15 * CELL_SIZE:
			continue
		if bool(w.melee) and depth > float(w.melee_range) * CELL_SIZE:
			continue
		var hurt_half_width := (dino.hurt_radius + HIT_PADDING) / depth
		var angle_ratio := absf(local.x / depth)
		if angle_ratio > hurt_half_width + float(w.angle_tol):
			continue
		# Occlusion : seuls les murs (couche 1) bloquent le tir, comme le z-buffer
		# du prototype qui ne contenait que les murs.
		var query := PhysicsRayQueryParameters3D.create(camera.global_position, center, 1, [get_rid()])
		if not space.intersect_ray(query).is_empty():
			continue
		if depth < best_depth:
			best_depth = depth
			target = dino

	if target:
		target.take_damage(Weapons.damage(weapon, target.max_hp))
		if sfx:
			sfx.play("hit", -4.0)
		dino_hit.emit(target)
