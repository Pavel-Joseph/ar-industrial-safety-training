"""Convert the supplied glTF models to FBX for the Unity fire scenario.

Run with Blender: blender -b --python tools/convert_fire_models.py
"""

from pathlib import Path
import shutil

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "third_party" / "fire_training"
ART = ROOT / "mobile-ar" / "Assets" / "Art" / "FireTraining"
MODELS = ART / "Models"
TEXTURES = ART / "Textures"
MODELS.mkdir(parents=True, exist_ok=True)
TEXTURES.mkdir(parents=True, exist_ok=True)

inputs = (
    ("ExitDoorDouble", SOURCE / "exit_door_double" / "scene.gltf", 0.60),
    ("FireExtinguisher", SOURCE / "fire_extinguisher" / "scene.gltf", 0.30),
    ("ExitSign", SOURCE / "exit_sign" / "exit_sign_3d_model_free.glb", 0.18),
)

for name, source, desired_height in inputs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    bpy.context.view_layer.update()

    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    bounds = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    lower = Vector(tuple(min(point[axis] for point in bounds) for axis in range(3)))
    upper = Vector(tuple(max(point[axis] for point in bounds) for axis in range(3)))
    factor = desired_height / (upper.z - lower.z)
    center = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))

    for obj in meshes:
        world = obj.matrix_world.copy()
        obj.data = obj.data.copy()
        for vertex in obj.data.vertices:
            vertex.co = (world @ vertex.co - center) * factor
        obj.parent = None
        obj.matrix_world.identity()

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)

    if name == "ExitSign":
        for image in bpy.data.images:
            if image.source == "FILE" and image.packed_file:
                destination = TEXTURES / "ExitSign.png"
                image.filepath_raw = str(destination)
                image.file_format = "PNG"
                image.save()
                image.filepath = str(destination)

    bpy.ops.export_scene.fbx(
        filepath=str(MODELS / f"{name}.fbx"),
        use_selection=False,
        axis_forward="-Z",
        axis_up="Y",
        path_mode="RELATIVE",
        add_leaf_bones=False,
    )
    print(f"Converted {name}: {len(meshes)} meshes, height {desired_height:.2f} m")

for texture in (SOURCE / "fire_extinguisher" / "textures").iterdir():
    shutil.copy2(texture, TEXTURES / texture.name)
