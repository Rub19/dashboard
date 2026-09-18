class_name LevelBuilder
extends Node3D
## Génère la géométrie 3D d'un niveau à partir de la MÊME grille que
## generateMap() côté prototype HTML : bordure en mur, plus un pilier partout
## où x pair ET y pair. On garde donc exactement le même plan de niveau que
## la version raycasting, juste rendu en vraie 3D au lieu de colonnes 2D.

const CELL_SIZE := 2.0
const WALL_HEIGHT := 3.0

var map: Array = [] # 0 = sol, 1 = mur — réutilisable ensuite pour l'IA des dinos (phase 2)

func build(size: int, wall_color_a: Color, wall_color_b: Color) -> Array:
	map = _generate_map(size)
	for y in size:
		for x in size:
			if map[y][x] == 1:
				var c: Color = wall_color_a if (x + y) % 2 == 0 else wall_color_b
				_add_wall_cube(x, y, c)
			else:
				_add_floor_tile(x, y)
	return map

func _generate_map(size: int) -> Array:
	var m := []
	for y in size:
		var row := []
		for x in size:
			if x == 0 or y == 0 or x == size - 1 or y == size - 1:
				row.append(1)
			elif x % 2 == 0 and y % 2 == 0:
				row.append(1)
			else:
				row.append(0)
		m.append(row)
	return m

func _add_wall_cube(x: int, y: int, color: Color) -> void:
	var body := StaticBody3D.new()
	var mesh_instance := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(CELL_SIZE, WALL_HEIGHT, CELL_SIZE)
	mesh_instance.mesh = box
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mesh_instance.material_override = mat
	body.add_child(mesh_instance)

	var shape := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = box.size
	shape.shape = box_shape
	body.add_child(shape)

	body.position = Vector3(x * CELL_SIZE, WALL_HEIGHT / 2.0, y * CELL_SIZE)
	add_child(body)

const FLOOR_THICKNESS := 0.2

func _add_floor_tile(x: int, y: int) -> void:
	var mesh_instance := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(CELL_SIZE, CELL_SIZE)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color8(15, 12, 8)
	mesh_instance.material_override = mat
	mesh_instance.mesh = plane
	mesh_instance.position = Vector3(x * CELL_SIZE, 0.0, y * CELL_SIZE)
	add_child(mesh_instance)

	# Bug: this tile used to be visual-only (MeshInstance3D with no physics
	# body), so is_on_floor() in Player.gd never became true and gravity
	# just fell forever ("tombe dans le vide"). A thin StaticBody3D box
	# whose top face sits at y=0 — same plane as the visual mesh above —
	# fixes that, same pattern as _add_wall_cube()'s collision.
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = Vector3(CELL_SIZE, FLOOR_THICKNESS, CELL_SIZE)
	shape.shape = box_shape
	body.add_child(shape)
	body.position = Vector3(x * CELL_SIZE, -FLOOR_THICKNESS / 2.0, y * CELL_SIZE)
	add_child(body)
