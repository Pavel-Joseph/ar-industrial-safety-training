"""Import every supplied gas-cylinder texture and create Unity mask maps."""

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "Downloads" / "gas-cylinder"
OUTPUT = ROOT / "mobile-ar" / "Assets" / "Resources" / "GasTraining"
OUTPUT.mkdir(parents=True, exist_ok=True)


def optimized_copy(source_name: str, output_name: str):
    with Image.open(SOURCE / "textures" / source_name) as image:
        image.load()
        image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        image.save(OUTPUT / output_name, "PNG", optimize=True)


maps = {
    "Canister_Gas_Lp_M_Canister_Gas_BaseColor.png": "GasCylinder_BaseColor.png",
    "Canister_Gas_Lp_M_Canister_Gas_Normal.png": "GasCylinder_Normal.png",
    "Canister_Gas_Lp_M_Canister_Gas_OcclusionRo.png": "GasCylinder_OcclusionRoughness.png",
    "Canister_Gas_Lp_M_Glass_Canister_Gas_BaseC.png": "GasCylinderGlass_BaseColor.png",
    "Canister_Gas_Lp_M_Glass_Canister_Gas_Norma.png": "GasCylinderGlass_Normal.png",
    "Canister_Gas_Lp_M_Glass_Canister_Gas_Occlu.png": "GasCylinderGlass_OcclusionRoughness.png",
}

for source_name, output_name in maps.items():
    optimized_copy(source_name, output_name)


def build_mask(source_name: str, output_name: str):
    with Image.open(OUTPUT / source_name).convert("RGB") as packed:
        red, green, blue = packed.split()
        # Supplied Occlusion/Roughness maps use R for occlusion and G for roughness.
        smoothness = green.point(lambda value: 255 - value)
        zero = Image.new("L", packed.size, 0)
        Image.merge("RGBA", (zero, red, blue, smoothness)).save(
            OUTPUT / output_name, "PNG", optimize=True)


build_mask("GasCylinder_OcclusionRoughness.png", "GasCylinder_MaskMap.png")
build_mask("GasCylinderGlass_OcclusionRoughness.png", "GasCylinderGlass_MaskMap.png")
shutil.copy2(SOURCE / "source" / "Gas_Cylinder_SM.fbx", OUTPUT / "GasCylinder.fbx")
print("Imported latest gas cylinder and all six supplied texture maps")
