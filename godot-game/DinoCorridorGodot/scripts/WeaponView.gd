class_name WeaponView
extends Node3D
## Vue à la première personne de l'arme équipée : un petit modèle 3D bas-poly
## attaché à la caméra (aucun asset requis, tout est généré en primitives),
## avec recul/estoc à chaque tir, un flash au canon pour les armes à feu et
## un léger mouvement de respiration au repos. Corrige l'absence totale de
## modèle d'arme visible (Player n'avait qu'une caméra + un collider).

const MOUNT_POS := Vector3(0.32, -0.26, -0.5)

var _bob: Node3D
var _recoil: Node3D
var _models: Dictionary = {}   # weapon -> Node3D
var _muzzles: Dictionary = {}  # weapon -> { light: OmniLight3D, flash: MeshInstance3D }
var _current := "pistol"
var _t := 0.0
var _tween: Tween

func _ready() -> void:
	position = MOUNT_POS

	_bob = Node3D.new()
	add_child(_bob)

	_recoil = Node3D.new()
	_bob.add_child(_recoil)

	_models["pistol"] = _build_pistol()
	_models["shotgun"] = _build_shotgun()
	_models["sword"] = _build_sword()
	for w in _models:
		_recoil.add_child(_models[w])
		_models[w].visible = (w == _current)

func _process(delta: float) -> void:
	_t += delta
	# Léger mouvement de respiration — sur un noeud dédié, jamais touché par
	# le recul, pour ne pas entrer en conflit avec le Tween ci-dessous.
	_bob.position.y = sin(_t * 1.8) * 0.008

func set_weapon(weapon: String) -> void:
	if not _models.has(weapon):
		return
	_current = weapon
	for w in _models:
		_models[w].visible = (w == weapon)

func play_fire() -> void:
	if _tween and _tween.is_valid():
		_tween.kill()
	var data: Dictionary = Weapons.get_data(_current)
	if bool(data.melee):
		_play_swing()
	else:
		_play_recoil()
		_flash_muzzle(_current)

func _play_recoil() -> void:
	_recoil.position = Vector3.ZERO
	_recoil.rotation = Vector3.ZERO
	_tween = create_tween()
	_tween.tween_property(_recoil, "position", Vector3(0.0, 0.025, 0.09), 0.035)
	_tween.parallel().tween_property(_recoil, "rotation:x", -0.09, 0.035)
	_tween.tween_property(_recoil, "position", Vector3.ZERO, 0.16).set_trans(Tween.TRANS_SINE)
	_tween.parallel().tween_property(_recoil, "rotation:x", 0.0, 0.16).set_trans(Tween.TRANS_SINE)

func _play_swing() -> void:
	_recoil.position = Vector3.ZERO
	_recoil.rotation = Vector3.ZERO
	_tween = create_tween()
	_tween.tween_property(_recoil, "rotation:x", -0.55, 0.07).set_trans(Tween.TRANS_SINE)
	_tween.parallel().tween_property(_recoil, "rotation:y", -0.25, 0.07).set_trans(Tween.TRANS_SINE)
	_tween.tween_property(_recoil, "rotation:x", 0.0, 0.22).set_trans(Tween.TRANS_SINE)
	_tween.parallel().tween_property(_recoil, "rotation:y", 0.0, 0.22).set_trans(Tween.TRANS_SINE)

func _flash_muzzle(weapon: String) -> void:
	if not _muzzles.has(weapon):
		return
	var m: Dictionary = _muzzles[weapon]
	var light: OmniLight3D = m.light
	var flash: MeshInstance3D = m.flash
	flash.visible = true
	light.light_energy = 3.0
	var tw := create_tween()
	tw.tween_interval(0.03)
	tw.tween_callback(_end_muzzle_flash.bind(weapon))

func _end_muzzle_flash(weapon: String) -> void:
	if not _muzzles.has(weapon):
		return
	var m: Dictionary = _muzzles[weapon]
	(m.flash as MeshInstance3D).visible = false
	(m.light as OmniLight3D).light_energy = 0.0

# ---------- construction des modèles (primitives, aucun asset requis) ----------

func _metal_material(color: Color, emissive: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = 0.35
	mat.roughness = 0.55
	if emissive > 0.0:
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = emissive
	return mat

func _box(size: Vector3, pos: Vector3, mat: StandardMaterial3D, rot_deg: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.material_override = mat
	mesh.position = pos
	mesh.rotation_degrees = rot_deg
	return mesh

func _cylinder(radius: float, height: float, pos: Vector3, mat: StandardMaterial3D, rot_deg: Vector3) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = radius
	cyl.bottom_radius = radius
	cyl.height = height
	mesh.mesh = cyl
	mesh.material_override = mat
	mesh.position = pos
	mesh.rotation_degrees = rot_deg
	return mesh

func _make_muzzle(weapon: String, parent: Node3D, tip_z: float) -> void:
	var light := OmniLight3D.new()
	light.light_color = Color8(255, 200, 120)
	light.light_energy = 0.0
	light.omni_range = 2.0
	light.position = Vector3(0.0, 0.02, tip_z)
	parent.add_child(light)

	var flash := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.045
	sphere.height = 0.09
	flash.mesh = sphere
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color8(255, 220, 150)
	mat.emission_enabled = true
	mat.emission = Color8(255, 200, 120)
	mat.emission_energy_multiplier = 4.0
	flash.material_override = mat
	flash.position = Vector3(0.0, 0.02, tip_z)
	flash.visible = false
	parent.add_child(flash)
	_muzzles[weapon] = { "light": light, "flash": flash }

func _build_pistol() -> Node3D:
	var rig := Node3D.new()
	var steel := _metal_material(Color8(58, 60, 66))
	var dark := _metal_material(Color8(24, 24, 26))
	rig.add_child(_box(Vector3(0.10, 0.15, 0.26), Vector3(0.0, 0.0, 0.0), steel))
	rig.add_child(_box(Vector3(0.08, 0.16, 0.08), Vector3(0.0, -0.13, 0.07), dark, Vector3(12, 0, 0)))
	rig.add_child(_cylinder(0.022, 0.20, Vector3(0.0, 0.025, -0.22), dark, Vector3(90, 0, 0)))
	_make_muzzle("pistol", rig, -0.34)
	return rig

func _build_shotgun() -> Node3D:
	var rig := Node3D.new()
	var wood := _metal_material(Color8(92, 60, 34))
	var metal := _metal_material(Color8(48, 50, 55))
	rig.add_child(_box(Vector3(0.11, 0.13, 0.34), Vector3(0.0, 0.0, 0.06), wood))
	rig.add_child(_box(Vector3(0.09, 0.10, 0.20), Vector3(0.0, -0.02, 0.32), wood, Vector3(-6, 0, 0)))
	rig.add_child(_cylinder(0.032, 0.5, Vector3(0.0, 0.03, -0.28), metal, Vector3(90, 0, 0)))
	rig.add_child(_box(Vector3(0.10, 0.06, 0.14), Vector3(0.0, -0.02, -0.14), wood))
	_make_muzzle("shotgun", rig, -0.53)
	return rig

func _build_sword() -> Node3D:
	var rig := Node3D.new()
	var steel := _metal_material(Color8(200, 205, 212), 0.4)
	var brass := _metal_material(Color8(180, 140, 60))
	var leather := _metal_material(Color8(60, 40, 28))
	rig.add_child(_box(Vector3(0.045, 0.018, 0.55), Vector3(0.0, 0.02, -0.30), steel))
	rig.add_child(_box(Vector3(0.15, 0.03, 0.03), Vector3(0.0, 0.0, -0.02), brass))
	rig.add_child(_cylinder(0.024, 0.16, Vector3(0.0, -0.01, 0.06), leather, Vector3(90, 0, 0)))
	return rig
