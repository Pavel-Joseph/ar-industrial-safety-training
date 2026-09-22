using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Spreads the prefab's fire effect across the open training floor. All
/// positions are local to the scenario, so the pattern works wherever the AR
/// scene is placed. Visual-only particles do not change training colliders.
/// </summary>
public class FireSpreadController : MonoBehaviour
{
    private const int MaximumPatches = 42;
    private const float SpreadInterval = 0.55f;
    private const float GoldenAngle = 2.3999632f;

    private class Patch
    {
        public ParticleSystem flame;
        public ParticleSystem smoke;
        public Vector2 position;
        public float heat = 1f;
        public bool active;
    }

    private readonly List<Patch> patches = new List<Patch>();
    private Light glow;
    private int nextPatch;
    private float spreadClock;
    private bool suppressing;
    private bool extinguished;
    private Vector2 suppressionPoint;
    private float suppressionRadius = 0.55f;

    public bool IsReady => patches.Count > 0;
    public bool IsSpreadComplete => patches.Count > 0 && nextPatch >= patches.Count;

    public int RemainingPercent
    {
        get
        {
            float total = 0f;
            int count = 0;
            foreach (Patch patch in patches)
            {
                if (!patch.active)
                    continue;
                total += patch.heat;
                count++;
            }
            return count == 0 ? 0 : Mathf.RoundToInt(100f * total / count);
        }
    }

    public void Initialize(ParticleSystem fireTemplate, Vector2 detectedFloorSize)
    {
        if (fireTemplate == null)
        {
            Debug.LogError("Fire spread needs the scenario's FireEffect particle system.", this);
            return;
        }

        fireTemplate.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        fireTemplate.gameObject.SetActive(false);
        Quaternion rotation = fireTemplate.transform.localRotation;

        // A sunflower spiral fills the open floor evenly. Sort by distance
        // from the ignition point so each new patch grows from the previous
        // fire front instead of appearing at a random distant location.
        float width = Mathf.Clamp(detectedFloorSize.x * 0.86f, 1.4f, 4.5f);
        float depth = Mathf.Clamp(detectedFloorSize.y * 0.86f, 1.4f, 4.5f);
        float halfWidth = width * 0.5f;
        float halfDepth = depth * 0.5f;
        suppressionRadius = Mathf.Clamp(Mathf.Min(width, depth) * 0.24f, 0.42f, 0.85f);
        List<Vector2> locations = new List<Vector2> { Vector2.zero };
        for (int index = 0; index < 180 && locations.Count < MaximumPatches; index++)
        {
            float normalizedRadius = 0.08f + 0.9f * Mathf.Sqrt((index + 1f) / 180f);
            float angle = index * GoldenAngle;
            Vector2 candidate = new Vector2(
                Mathf.Cos(angle) * halfWidth * normalizedRadius,
                Mathf.Sin(angle) * halfDepth * normalizedRadius);
            if (Mathf.Abs(candidate.x) > halfWidth || Mathf.Abs(candidate.y) > halfDepth)
                continue;
            if (Vector2.Distance(candidate, locations[0]) < 0.18f)
                continue;
            locations.Add(candidate);
        }
        Vector2 ignition = locations[0];
        locations.Sort((a, b) =>
            Vector2.Distance(a, ignition).CompareTo(Vector2.Distance(b, ignition)));

        for (int index = 0; index < locations.Count; index++)
        {
            Vector2 location = locations[index];
            GameObject flameObject = index == 0
                ? fireTemplate.gameObject
                : Instantiate(fireTemplate.gameObject, transform);
            flameObject.name = "FirePatch_" + index.ToString("00");
            flameObject.transform.localPosition = new Vector3(location.x, 0.03f, location.y);
            flameObject.transform.localRotation = rotation;
            float size = 0.73f + (index % 5) * 0.09f;
            flameObject.transform.localScale = Vector3.one * size;
            ParticleSystem flame = flameObject.GetComponent<ParticleSystem>();
            ConfigureFlame(flame);

            ParticleSystem smoke = null;
            if (index % 3 == 0)
            {
                GameObject smokeObject = Instantiate(fireTemplate.gameObject, transform);
                smokeObject.name = "FireSmoke_" + index.ToString("00");
                smokeObject.transform.localPosition =
                    new Vector3(location.x, 0.08f, location.y);
                smokeObject.transform.localRotation = rotation;
                smokeObject.transform.localScale = Vector3.one * size;
                smoke = smokeObject.GetComponent<ParticleSystem>();
                ConfigureSmoke(smoke);
            }

            patches.Add(new Patch
            {
                flame = flame,
                smoke = smoke,
                position = location
            });
        }

        GameObject lightObject = new GameObject("FireGlow");
        lightObject.transform.SetParent(transform, false);
        lightObject.transform.localPosition = new Vector3(0f, 0.25f, 0.15f);
        glow = lightObject.AddComponent<Light>();
        glow.type = LightType.Point;
        glow.color = new Color(1f, 0.32f, 0.06f);
        glow.range = 1.5f;
        glow.shadows = LightShadows.None;

        nextPatch = 0;
        spreadClock = 0f;
        suppressing = false;
        extinguished = false;
        ActivateNextPatch();
    }

    public void SetSuppressionPoint(Vector3 worldPoint)
    {
        Vector3 local = transform.InverseTransformPoint(worldPoint);
        suppressionPoint = new Vector2(local.x, local.z);
    }

    public void BeginSuppressing()
    {
        if (!extinguished)
            suppressing = true;
    }

    public void EndSuppressing()
    {
        suppressing = false;
    }

    public void ExtinguishCompletely()
    {
        extinguished = true;
        suppressing = false;
        foreach (Patch patch in patches)
        {
            patch.heat = 0f;
            if (patch.active)
            {
                patch.flame.Stop(true, ParticleSystemStopBehavior.StopEmitting);
                if (patch.smoke != null)
                    patch.smoke.Stop(true, ParticleSystemStopBehavior.StopEmitting);
            }
        }
    }

    private void Update()
    {
        if (patches.Count == 0)
            return;

        float delta = Time.deltaTime;
        if (!extinguished && nextPatch < patches.Count)
        {
            spreadClock += delta;
            while (nextPatch < patches.Count &&
                   spreadClock >= nextPatch * SpreadInterval)
                ActivateNextPatch();
        }

        float totalHeat = 0f;
        int activeCount = 0;
        foreach (Patch patch in patches)
        {
            if (!patch.active)
                continue;

            if (suppressing)
            {
                float distance = Vector2.Distance(patch.position, suppressionPoint);
                if (distance <= suppressionRadius)
                {
                    float strength = 1f - Mathf.Clamp01(distance / suppressionRadius);
                    patch.heat = Mathf.MoveTowards(patch.heat, 0f,
                        (0.9f + 1.5f * strength) * delta);
                }
            }
            else if (!extinguished)
                patch.heat = Mathf.MoveTowards(patch.heat, 1f, 0.12f * delta);

            ApplyHeat(patch);
            totalHeat += patch.heat;
            activeCount++;
        }

        if (glow != null)
        {
            float average = activeCount == 0 ? 0f : totalHeat / activeCount;
            glow.intensity = 1.2f * average *
                (0.85f + 0.15f * Mathf.Sin(Time.time * 17f));
        }


        if (!extinguished && nextPatch >= patches.Count && RemainingPercent <= 1)
            ExtinguishCompletely();
    }

    private void ActivateNextPatch()
    {
        Patch patch = patches[nextPatch++];
        patch.active = true;
        patch.flame.gameObject.SetActive(true);
        patch.flame.Play(true);
        if (patch.smoke != null)
        {
            patch.smoke.gameObject.SetActive(true);
            patch.smoke.Play(true);
        }
        ApplyHeat(patch);
    }

    private static void ApplyHeat(Patch patch)
    {
        if (patch.heat <= 0.01f)
        {
            if (patch.flame.isEmitting)
                patch.flame.Stop(true, ParticleSystemStopBehavior.StopEmitting);
        }
        else if (!patch.flame.isEmitting)
            patch.flame.Play(true);

        var emission = patch.flame.emission;
        emission.rateOverTime = 23f * patch.heat;
        var main = patch.flame.main;
        main.startSizeMultiplier = 0.55f + 0.45f * patch.heat;
        if (patch.smoke != null)
        {
            var smokeEmission = patch.smoke.emission;
            smokeEmission.rateOverTime = 4f * patch.heat;
        }
    }

    private static void ConfigureFlame(ParticleSystem system)
    {
        var main = system.main;
        main.playOnAwake = false;
        main.loop = true;
        main.maxParticles = 48;
        main.startLifetime = new ParticleSystem.MinMaxCurve(0.5f, 0.9f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(0.18f, 0.48f);
        main.startSize = new ParticleSystem.MinMaxCurve(0.07f, 0.17f);
        main.startColor = new ParticleSystem.MinMaxGradient(
            new Color(1f, 0.22f, 0.02f, 0.92f),
            new Color(1f, 0.82f, 0.13f, 1f));
        var shape = system.shape;
        shape.radius = 0.065f;
        var noise = system.noise;
        noise.enabled = true;
        noise.strength = 0.1f;
        noise.frequency = 0.6f;
        var color = system.colorOverLifetime;
        color.enabled = true;
        color.color = new ParticleSystem.MinMaxGradient(FlameGradient());
        ParticleSystemRenderer renderer = system.GetComponent<ParticleSystemRenderer>();
        if (renderer != null)
        {
            renderer.renderMode = ParticleSystemRenderMode.Stretch;
            renderer.lengthScale = 2.2f;
            renderer.velocityScale = 0.45f;
        }
    }

    private static void ConfigureSmoke(ParticleSystem system)
    {
        var main = system.main;
        main.playOnAwake = false;
        main.maxParticles = 18;
        main.startLifetime = new ParticleSystem.MinMaxCurve(1.3f, 2.1f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(0.08f, 0.2f);
        main.startSize = new ParticleSystem.MinMaxCurve(0.15f, 0.27f);
        main.startColor = new ParticleSystem.MinMaxGradient(
            new Color(0.24f, 0.22f, 0.2f, 0.16f),
            new Color(0.45f, 0.42f, 0.38f, 0.28f));
        var emission = system.emission;
        emission.rateOverTime = 4f;
        var noise = system.noise;
        noise.enabled = true;
        noise.strength = 0.07f;
        noise.frequency = 0.45f;
        var color = system.colorOverLifetime;
        color.enabled = true;
        Gradient fade = new Gradient();
        fade.SetKeys(
            new[] { new GradientColorKey(Color.white, 0f),
                    new GradientColorKey(Color.gray, 1f) },
            new[] { new GradientAlphaKey(0f, 0f),
                    new GradientAlphaKey(0.45f, 0.25f),
                    new GradientAlphaKey(0f, 1f) });
        color.color = new ParticleSystem.MinMaxGradient(fade);
    }

    private static Gradient FlameGradient()
    {
        Gradient gradient = new Gradient();
        gradient.SetKeys(
            new[] { new GradientColorKey(Color.yellow, 0f),
                    new GradientColorKey(new Color(1f, 0.36f, 0.04f), 0.55f),
                    new GradientColorKey(new Color(0.45f, 0.05f, 0.01f), 1f) },
            new[] { new GradientAlphaKey(0f, 0f),
                    new GradientAlphaKey(1f, 0.18f),
                    new GradientAlphaKey(0.75f, 0.58f),
                    new GradientAlphaKey(0f, 1f) });
        return gradient;
    }
}
