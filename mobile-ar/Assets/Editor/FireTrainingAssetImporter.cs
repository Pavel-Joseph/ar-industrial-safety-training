using System;
using UnityEditor;
using UnityEngine;

public static class FireTrainingAssetImporter
{
    private const string Art = "Assets/Art/FireTraining";
    private const string PrefabPath = "Assets/Prefabs/FireSceneraio.prefab";

    [MenuItem("Tools/Fire Training/Apply Imported Models")]
    public static void Apply()
    {
        AssetDatabase.Refresh();

        GameObject door = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Models/ExitDoorDouble.fbx");
        GameObject extinguisher = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Models/FireExtinguisher.fbx");
        GameObject sign = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Models/ExitSign.fbx");
        Texture2D extinguisherTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/extincteur_baseColor.jpeg");
        Texture2D signTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/ExitSign.png");

        if (door == null || extinguisher == null || sign == null ||
            extinguisherTexture == null || signTexture == null)
            throw new InvalidOperationException("One or more imported fire training models or textures are missing.");

        Material extinguisherMaterial = GetMaterial("Extinguisher", extinguisherTexture, Color.white);
        Material signFaceMaterial = GetMaterial("ExitSignFace", signTexture, Color.white);
        Material signFrameMaterial = GetMaterial("ExitSignFrame", null, new Color(0.49f, 0.49f, 0.49f));

        GameObject root = PrefabUtility.LoadPrefabContents(PrefabPath);
        try
        {
            Transform exitMarker = RequireChild(root.transform, "ExitMarker");
            Transform extinguisherMarker = RequireChild(root.transform, "ExtinguisherPlaceholder");
            Transform exitLabel = RequireChild(root.transform, "ExitLabel");

            exitMarker.GetComponent<MeshRenderer>().enabled = false;
            exitMarker.localScale = new Vector3(0.65f, 0.6f, 0.08f);
            extinguisherMarker.GetComponent<MeshRenderer>().enabled = false;
            exitLabel.gameObject.SetActive(false);

            GameObject doorVisual = ReplaceVisual(root.transform, "ExitDoorVisual", door);
            doorVisual.transform.localPosition = new Vector3(0.5f, 0f, 0.65f);

            GameObject extinguisherVisual = ReplaceVisual(root.transform, "ExtinguisherVisual", extinguisher);
            extinguisherVisual.transform.localPosition = new Vector3(-0.45f, 0f, -0.3f);
            extinguisherVisual.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);
            // Unity's single-mesh FBX importer applies a 0.01 scale without the
            // compensating child transform used for the multi-mesh models.
            extinguisherVisual.transform.localScale = Vector3.one * 100f;
            SetAllMaterials(extinguisherVisual, extinguisherMaterial);

            GameObject signVisual = ReplaceVisual(root.transform, "ExitSignVisual", sign);
            signVisual.transform.localPosition = new Vector3(0.5f, 0.64f, 0.6f);
            signVisual.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            foreach (Renderer renderer in signVisual.GetComponentsInChildren<Renderer>(true))
            {
                Material[] materials = renderer.sharedMaterials;
                for (int index = 0; index < materials.Length; index++)
                    materials[index] = materials[index] != null && materials[index].name.Contains("Frame")
                        ? signFrameMaterial : signFaceMaterial;
                renderer.sharedMaterials = materials;
            }

            LogVisualBounds(doorVisual);
            LogVisualBounds(extinguisherVisual);
            LogVisualBounds(signVisual);

            PrefabUtility.SaveAsPrefabAsset(root, PrefabPath);
        }
        finally
        {
            PrefabUtility.UnloadPrefabContents(root);
        }

        AssetDatabase.SaveAssets();
        Debug.Log("Fire training door, extinguisher, and exit sign models applied to the scenario prefab.");
    }

    private static Transform RequireChild(Transform root, string name)
    {
        Transform child = root.Find(name);
        if (child == null)
            throw new InvalidOperationException("Missing fire scenario object: " + name);
        return child;
    }

    private static GameObject ReplaceVisual(Transform parent, string name, GameObject model)
    {
        Transform oldVisual = parent.Find(name);
        if (oldVisual != null)
            UnityEngine.Object.DestroyImmediate(oldVisual.gameObject);

        GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(model, parent);
        instance.name = name;
        instance.transform.localPosition = Vector3.zero;
        instance.transform.localRotation = Quaternion.identity;
        instance.transform.localScale = Vector3.one;
        return instance;
    }

    private static void SetAllMaterials(GameObject model, Material material)
    {
        foreach (Renderer renderer in model.GetComponentsInChildren<Renderer>(true))
        {
            Material[] materials = renderer.sharedMaterials;
            for (int index = 0; index < materials.Length; index++)
                materials[index] = material;
            renderer.sharedMaterials = materials;
        }
    }

    private static void LogVisualBounds(GameObject visual)
    {
        Renderer[] renderers = visual.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length == 0)
            throw new InvalidOperationException("Imported model has no renderers: " + visual.name);

        Bounds bounds = renderers[0].bounds;
        for (int index = 1; index < renderers.Length; index++)
            bounds.Encapsulate(renderers[index].bounds);
        Debug.Log($"{visual.name} renderer bounds: center={bounds.center}, size={bounds.size}");
        foreach (MeshFilter filter in visual.GetComponentsInChildren<MeshFilter>(true))
            Debug.Log($"{visual.name} mesh {filter.name}: vertices={filter.sharedMesh?.vertexCount ?? 0}, localBounds={filter.sharedMesh?.bounds}, scale={filter.transform.lossyScale}");
    }

    private static Material GetMaterial(string name, Texture2D texture, Color color)
    {
        string path = Art + "/Materials/" + name + ".mat";
        Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            material = new Material(shader);
            AssetDatabase.CreateAsset(material, path);
        }

        if (material.HasProperty("_BaseColor"))
            material.SetColor("_BaseColor", color);
        if (material.HasProperty("_Color"))
            material.SetColor("_Color", color);
        if (texture != null)
        {
            if (material.HasProperty("_BaseMap"))
                material.SetTexture("_BaseMap", texture);
            if (material.HasProperty("_MainTex"))
                material.SetTexture("_MainTex", texture);
        }
        if (material.HasProperty("_Cull"))
            material.SetFloat("_Cull", 0f);
        EditorUtility.SetDirty(material);
        return material;
    }
}
