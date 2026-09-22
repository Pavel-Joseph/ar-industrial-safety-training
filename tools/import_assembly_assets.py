"""Import the supplied assembly platform and location marker with their textures.

Run with Blender:
blender -b --python tools/import_assembly_assets.py
"""

from pathlib import Path
import shutil

import bpy


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
OUTPUT = ROOT / "mobile-ar" / "Assets" / "Resources" / "GasTraining"
OUTPUT.mkdir(parents=True, exist_ok=True)


def export_round_platform():
    source = DOWNLOADS / "round_platform" / "scene.gltf"
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    bpy.ops.export_scene.fbx(
        filepath=str(OUTPUT / "RoundPlatform.fbx"),
        use_selection=False,
        axis_forward="-Z",
        axis_up="Y",
        path_mode="COPY",
        embed_textures=True,
        add_leaf_bones=False,
    )
    texture_source = source.parent / "textures"
    shutil.copy2(texture_source / "defaultPolygonShader1_baseColor.png",
                 OUTPUT / "RoundPlatform_BaseColor.png")
    shutil.copy2(texture_source / "defaultPolygonShader1_normal.png",
                 OUTPUT / "RoundPlatform_Normal.png")
    shutil.copy2(source.parent / "license.txt", OUTPUT / "RoundPlatform_license.txt")


def extract_location_textures():
    source = DOWNLOADS / "11_location.fbx"
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source))
    names = {
        "texture_pbr_v128.png": "AssemblyLocation_BaseColor.png",
        "texture_pbr_v128_normal.png": "AssemblyLocation_Normal.png",
        "texture_pbr_v128_roughness.png": "AssemblyLocation_Roughness.png",
        "texture_pbr_v128_metallic.png": "AssemblyLocation_Metallic.png",
    }
    for image in bpy.data.images:
        source_name = Path(image.filepath).name
        output_name = names.get(source_name)
        if output_name is None:
            continue
        image.filepath_raw = str(OUTPUT / output_name)
        image.file_format = "PNG"
        image.save()


export_round_platform()
extract_location_textures()
print("Imported RoundPlatform and extracted all assembly location textures")
