using System;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// Loads the supplied, self-contained buddy GLB directly from Resources.
/// This keeps the Android build independent of an Editor-only GLB importer.
/// The constants describe the four uncompressed accessors in this specific asset.
/// </summary>
public static class RuntimeGlbBuddyLoader
{
    private const int BinaryChunkOffset = 2672;
    private const int VertexCount = 186171;
    private const int IndexCount = 942036;
    private const int PositionOffset = BinaryChunkOffset;
    private const int NormalOffset = BinaryChunkOffset + 2234052;
    private const int UvOffset = BinaryChunkOffset + 4468104;
    private const int IndexOffset = BinaryChunkOffset + 5957472;
    private const int BaseColorOffset = BinaryChunkOffset + 16986204;
    private const int BaseColorLength = 5512972;
    private const float NodeScale = 0.00011590246867854148f;
    private static readonly Vector3 NodeTranslation =
        new(-0.5027179718f, -0.9503341317f, -0.3676011562f);

    public static GameObject Create(Transform parent)
    {
        TextAsset source = Resources.Load<TextAsset>("GasTraining/BuddyWorker");
        if (source == null || source.bytes.Length < BaseColorOffset + BaseColorLength)
            return null;

        byte[] data = source.bytes;
        Vector3[] vertices = new Vector3[VertexCount];
        Vector3[] normals = new Vector3[VertexCount];
        Vector2[] uvs = new Vector2[VertexCount];
        for (int i = 0; i < VertexCount; i++)
        {
            int p = PositionOffset + i * 12;
            Vector3 sourcePosition = new(ReadFloat(data, p), ReadFloat(data, p + 4), ReadFloat(data, p + 8));
            sourcePosition = sourcePosition * NodeScale + NodeTranslation;
            vertices[i] = new Vector3(sourcePosition.x, sourcePosition.y, -sourcePosition.z);

            int n = NormalOffset + i * 12;
            normals[i] = new Vector3(ReadFloat(data, n), ReadFloat(data, n + 4), -ReadFloat(data, n + 8));
            int uv = UvOffset + i * 8;
            uvs[i] = new Vector2(ReadFloat(data, uv), 1f - ReadFloat(data, uv + 4));
        }

        int[] triangles = new int[IndexCount];
        for (int i = 0; i < IndexCount; i += 3)
        {
            triangles[i] = ReadInt(data, IndexOffset + i * 4);
            triangles[i + 1] = ReadInt(data, IndexOffset + (i + 2) * 4);
            triangles[i + 2] = ReadInt(data, IndexOffset + (i + 1) * 4);
        }

        Mesh mesh = new Mesh { name = "Construction Worker Mesh", indexFormat = IndexFormat.UInt32 };
        mesh.vertices = vertices;
        mesh.normals = normals;
        mesh.uv = uvs;
        mesh.triangles = triangles;
        mesh.RecalculateBounds();
        mesh.UploadMeshData(true);

        byte[] imageBytes = new byte[BaseColorLength];
        Buffer.BlockCopy(data, BaseColorOffset, imageBytes, 0, BaseColorLength);
        Texture2D texture = new Texture2D(2, 2, TextureFormat.RGBA32, true)
        {
            name = "Construction Worker Base Color",
            wrapMode = TextureWrapMode.Repeat,
            filterMode = FilterMode.Trilinear
        };
        if (!texture.LoadImage(imageBytes, true)) UnityEngine.Object.Destroy(texture);

        Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        Material material = new Material(shader) { name = "Construction Worker Material" };
        if (texture != null)
        {
            material.mainTexture = texture;
            material.mainTextureScale = new Vector2(15.978813f, 16.002985f);
            material.mainTextureOffset = new Vector2(0.000021125f, 0.000020981f);
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
        }
        if (material.HasProperty("_Cull")) material.SetFloat("_Cull", 0f);

        GameObject visual = new GameObject("Construction Worker Visual");
        visual.transform.SetParent(parent, false);
        visual.AddComponent<MeshFilter>().sharedMesh = mesh;
        visual.AddComponent<MeshRenderer>().sharedMaterial = material;
        return visual;
    }

    private static float ReadFloat(byte[] data, int offset) => BitConverter.ToSingle(data, offset);
    private static int ReadInt(byte[] data, int offset) => unchecked((int)BitConverter.ToUInt32(data, offset));
}
