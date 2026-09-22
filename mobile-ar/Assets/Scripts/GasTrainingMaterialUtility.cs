using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>Applies the supplied PBR texture sets to runtime-instantiated training models.</summary>
public static class GasTrainingMaterialUtility
{
    private static readonly Dictionary<string, Material> Materials = new();

    public static void Apply(GameObject visual, string resourcePath)
    {
        if (visual == null) return;
        string model = resourcePath.Substring(resourcePath.LastIndexOf('/') + 1);
        foreach (Renderer renderer in visual.GetComponentsInChildren<Renderer>(true))
        {
            Material[] source = renderer.sharedMaterials;
            Material[] assigned = new Material[source.Length];
            for (int i = 0; i < source.Length; i++)
            {
                string sourceName = source[i] != null ? source[i].name.ToLowerInvariant() : "";
                assigned[i] = MaterialFor(model, sourceName) ?? source[i];
            }
            renderer.sharedMaterials = assigned;
        }
    }

    private static Material MaterialFor(string model, string sourceName)
    {
        string variant = model == "GasCylinder" && sourceName.Contains("glass")
            ? "GasCylinderGlass" : model;
        if (model != "GasCylinder" && model != "AssemblyLocation" && model != "RoundPlatform")
            return null;
        if (Materials.TryGetValue(variant, out Material cached)) return cached;

        Texture2D baseMap = Resources.Load<Texture2D>("GasTraining/" + variant + "_BaseColor");
        Texture2D normalMap = Resources.Load<Texture2D>("GasTraining/" + variant + "_Normal");
        Texture2D maskMap = Resources.Load<Texture2D>("GasTraining/" + variant + "_MaskMap");
        Texture2D occlusionMap = Resources.Load<Texture2D>("GasTraining/" + variant + "_OcclusionRoughness");
        if (baseMap == null) return null;

        Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        Material material = new Material(shader) { name = variant + " Runtime PBR" };
        material.color = Color.white;
        SetTexture(material, "_BaseMap", "_MainTex", baseMap);
        if (normalMap != null)
        {
            SetTexture(material, "_BumpMap", null, normalMap);
            material.EnableKeyword("_NORMALMAP");
            if (material.HasProperty("_BumpScale")) material.SetFloat("_BumpScale", 1f);
        }
        if (maskMap != null)
        {
            SetTexture(material, "_MetallicGlossMap", null, maskMap);
            material.EnableKeyword("_METALLICSPECGLOSSMAP");
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", 1f);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 1f);
        }
        else if (material.HasProperty("_Smoothness"))
            material.SetFloat("_Smoothness", model == "RoundPlatform" ? 0.4f : 0.5f);
        if (occlusionMap != null)
        {
            SetTexture(material, "_OcclusionMap", null, occlusionMap);
            if (material.HasProperty("_OcclusionStrength")) material.SetFloat("_OcclusionStrength", 1f);
        }
        if (variant == "GasCylinderGlass") ConfigureTransparent(material);
        Materials[variant] = material;
        return material;
    }

    private static void SetTexture(Material material, string property, string fallback, Texture texture)
    {
        if (material.HasProperty(property)) material.SetTexture(property, texture);
        else if (!string.IsNullOrEmpty(fallback) && material.HasProperty(fallback))
            material.SetTexture(fallback, texture);
    }

    private static void ConfigureTransparent(Material material)
    {
        if (material.HasProperty("_Surface")) material.SetFloat("_Surface", 1f);
        if (material.HasProperty("_SrcBlend")) material.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
        if (material.HasProperty("_DstBlend")) material.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
        if (material.HasProperty("_ZWrite")) material.SetFloat("_ZWrite", 0f);
        material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        material.renderQueue = (int)RenderQueue.Transparent;
    }
}
