using UnityEditor;
using System.Linq;

/// <summary>Keeps imported training PBR maps in the correct Unity texture format.</summary>
public sealed class GasTrainingTextureImporter : AssetPostprocessor
{
    [InitializeOnLoadMethod]
    private static void RefreshSuppliedTextures()
    {
        const string sessionKey = "GasTrainingTexturesConfiguredV2";
        if (SessionState.GetBool(sessionKey, false)) return;
        SessionState.SetBool(sessionKey, true);
        EditorApplication.delayCall += () =>
        {
            string[] paths = AssetDatabase.FindAssets("t:Texture2D",
                    new[] { "Assets/Resources/GasTraining" })
                .Select(AssetDatabase.GUIDToAssetPath).ToArray();
            foreach (string path in paths)
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);
        };
    }

    private void OnPreprocessTexture()
    {
        if (!assetPath.Contains("/Resources/GasTraining/")) return;
        TextureImporter importer = (TextureImporter)assetImporter;
        string name = System.IO.Path.GetFileNameWithoutExtension(assetPath);
        if (name.EndsWith("_Normal"))
        {
            importer.textureType = TextureImporterType.NormalMap;
            importer.sRGBTexture = false;
        }
        else if (name.EndsWith("_MaskMap") || name.EndsWith("_Metallic") ||
                 name.EndsWith("_Roughness") || name.EndsWith("_OcclusionRoughness"))
        {
            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = false;
        }
        importer.maxTextureSize = 2048;
        importer.mipmapEnabled = true;
    }
}
