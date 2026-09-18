class_name Dino
extends CharacterBody3D
## Dinosaure : portage de l'IA du prototype HTML (poursuite du joueur dès
## qu'il est à moins de 6.5 cases, morsure au contact des hitboxes avec
## 0.7 s de recharge, hurtbox de visée distincte de la hitbox physique).
## Rendu : sprite billboard (T-Rex / Carnotaure du prototype), recoloré par
## teinte aléatoire comme le hue-rotate d'origine. Tout est en unités monde
## (1 case = CELL_SIZE), d'où les x CELL_SIZE sur les valeurs du prototype.

signal died(dino: Dino)
signal attacked_player(damage: int)

const CELL_SIZE := 2.0
const CHASE_RANGE := 6.5 * CELL_SIZE
const PLAYER_RADIUS := 0.22 * CELL_SIZE
const HIT_PADDING := 0.10 * CELL_SIZE
const ATTACK_COOLDOWN := 0.7
const GRAVITY := 20.0

# Rayons du prototype (en cases) : hurt = corps réel visé, body = collision
# physique légèrement plus large (évite de traverser murs/joueur).
const HURT_RADIUS := { "trex": 0.34, "carno": 0.27 }
const BODY_RADIUS := { "trex": 0.5, "carno": 0.4 }
const SPRITE_HEIGHT := { "trex": 2.0, "carno": 1.55 }

var dino_type := "trex"
var hp := 60.0
var max_hp := 60.0
var speed := 1.1 * CELL_SIZE
var damage := 12
var hurt_radius := 0.34 * CELL_SIZE
var body_radius := 0.5 * CELL_SIZE
var alive := true

var _attack_cooldown := 0.0
var _hit_flash := 0.0
var _growl_timer := 0.0
var _base_tint := Color.WHITE
var _sprite: Sprite3D
var _audio: AudioStreamPlayer3D
var _player: Node3D
var _sfx: Sfx
var _rng := RandomNumberGenerator.new()

func setup(type: String, cfg: Dictionary, hue: float, texture: Texture2D, player: Node3D, sfx: Sfx) -> void:
	dino_type = type
	max_hp = float(cfg.enemy_hp)
	hp = max_hp
	speed = float(cfg.enemy_speed) * CELL_SIZE
	damage = int(cfg.enemy_dmg)
	hurt_radius = float(HURT_RADIUS[type]) * CELL_SIZE
	body_radius = float(BODY_RADIUS[type]) * CELL_SIZE
	_player = player
	_sfx = sfx
	_rng.randomize()
	_growl_timer = _rng.randf_range(2.0, 6.0)

	add_to_group("dinos")
	# Couche 2 = dinos. Les rayons de visée ne testent que la couche 1 (murs) :
	# un dino n'en masque jamais un autre, exactement comme le z-buffer du
	# prototype ne contenait que les murs.
	collision_layer = 2
	collision_mask = 3

	var height: float = SPRITE_HEIGHT[type]
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = body_radius
	capsule.height = maxf(height, body_radius * 2.0 + 0.1)
	shape.shape = capsule
	shape.position.y = capsule.height / 2.0
	add_child(shape)

	_sprite = Sprite3D.new()
	_sprite.texture = texture
	_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	_sprite.shaded = false
	_sprite.pixel_size = height / float(texture.get_height())
	_sprite.position.y = height / 2.0
	# Équivalent du hue-rotate(hue) saturate(1.2) : teinte aléatoire, un peu
	# saturée, luminosité conservée.
	_base_tint = Color.from_hsv(fmod(hue, 360.0) / 360.0, 0.55, 1.0)
	_sprite.modulate = _base_tint
	add_child(_sprite)

	_audio = AudioStreamPlayer3D.new()
	_audio.unit_size = 6.0
	_audio.max_distance = 40.0
	_audio.position.y = height / 2.0
	add_child(_audio)

func _physics_process(delta: float) -> void:
	if not alive or _player == null:
		return

	if _hit_flash > 0.0:
		_hit_flash -= delta
		_sprite.modulate = Color(1.0, 0.33, 0.27) if _hit_flash > 0.0 else _base_tint

	var to_player := _player.global_position - global_position
	to_player.y = 0.0
	var dist := to_player.length()
	# Portée d'attaque = contact réel des deux hitboxes (+ petite marge),
	# comme dans le prototype — cohérent avec la taille de chaque dino.
	var attack_range := body_radius + PLAYER_RADIUS + 0.05 * CELL_SIZE

	if dist < CHASE_RANGE and dist > attack_range:
		var dir := to_player / dist
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
		_growl_timer -= delta
		if _growl_timer <= 0.0:
			_play("roar", -6.0)
			_growl_timer = _rng.randf_range(4.0, 9.0)
	else:
		velocity.x = 0.0
		velocity.z = 0.0
		if dist <= attack_range and _attack_cooldown <= 0.0:
			_attack_cooldown = ATTACK_COOLDOWN
			_play("roar", 0.0)
			attacked_player.emit(damage)

	if _attack_cooldown > 0.0:
		_attack_cooldown -= delta

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0.0

	move_and_slide()

func take_damage(amount: float) -> void:
	if not alive:
		return
	hp -= amount
	_hit_flash = 0.15
	_sprite.modulate = Color(1.0, 0.33, 0.27)
	if hp <= 0.0:
		_die()

func _die() -> void:
	alive = false
	remove_from_group("dinos")
	# Plus de collision ni de rendu, mais on garde le nœud le temps que le
	# cri de mort (positionnel) se termine avant de le libérer.
	collision_layer = 0
	collision_mask = 0
	_sprite.visible = false
	set_physics_process(false)
	_play("dino_death", 2.0)
	died.emit(self)
	get_tree().create_timer(1.2).timeout.connect(queue_free)

func _play(sound: String, volume_db: float) -> void:
	if _sfx == null or _audio == null:
		return
	var s := _sfx.stream(sound)
	if s == null:
		return
	_audio.stream = s
	_audio.volume_db = volume_db
	_audio.play()
