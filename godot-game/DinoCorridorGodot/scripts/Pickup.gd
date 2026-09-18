class_name Pickup
extends Node3D
## Arme au sol (fusil à pompe ou épée), ramassée en passant dessus — même
## rayon de collecte que le prototype (0.6 case). Rendu volontairement simple :
## un petit bloc coloré qui flotte et tourne, lisible de loin dans les couloirs
## sombres.

const CELL_SIZE := 2.0
const COLLECT_RADIUS := 0.6 * CELL_SIZE
const COLORS := {
	"shotgun": Color8(255, 150, 40),
	"sword": Color8(80, 220, 255),
}

var weapon_type := "shotgun"
var collected := false

var _mesh: MeshInstance3D
var _t := 0.0

func setup(type: String) -> void:
	weapon_type = type
	_mesh = MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.45, 0.45, 0.45)
	_mesh.mesh = box
	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLORS.get(type, Color.WHITE)
	mat.emission_enabled = true
	mat.emission = COLORS.get(type, Color.WHITE)
	mat.emission_energy_multiplier = 1.4
	_mesh.material_override = mat
	_mesh.position.y = 0.6
	add_child(_mesh)

	var light := OmniLight3D.new()
	light.light_color = COLORS.get(type, Color.WHITE)
	light.light_energy = 1.2
	light.omni_range = 4.0
	light.position.y = 0.8
	add_child(light)

func _process(delta: float) -> void:
	if collected:
		return
	_t += delta
	_mesh.position.y = 0.6 + sin(_t * 2.5) * 0.12
	_mesh.rotation.y += delta * 1.6

func is_in_reach(from: Vector3) -> bool:
	var d := global_position - from
	d.y = 0.0
	return d.length() < COLLECT_RADIUS

func collect() -> void:
	collected = true
	queue_free()
