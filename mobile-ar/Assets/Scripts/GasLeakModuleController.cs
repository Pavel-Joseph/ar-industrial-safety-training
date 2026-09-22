using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Complete room-scale Gas Leak and Confined Space lesson. The module uses
/// the same camera, palette, large touch regions and offline result pattern as
/// Fire while keeping its own ordered assessment state.
/// </summary>
public class GasLeakModuleController : MonoBehaviour
{
    private enum Step { Inactive, Place, Hazard, Ppe, Buddy, Shutoff, Ventilation, SafePoint, Result }

    [Serializable]
    private class GasResult
    {
        public int score;
        public int incorrectSelections;
        public float durationSeconds;
        public string attemptId;
        public string completedUtc;
    }

    private static readonly Color Ink = Hex("071814");
    private static readonly Color Card = Hex("1C2E27");
    private static readonly Color CardDark = Hex("0B231E");
    private static readonly Color Peach = Hex("E3A071");
    private static readonly Color Orange = Hex("F39A63");
    private static readonly Color Muted = Hex("9CA6A1");
    private static readonly Color Green = Hex("49BA59");
    private static readonly Color Blue = Hex("279DF2");
    private static readonly Color GasYellow = new Color(0.88f, 0.82f, 0.12f, 0.32f);
    private static Sprite roundedSprite;

    private Camera arCamera;
    private ARRaycastManager raycastManager;
    private Canvas canvas;
    private GameObject uiRoot;
    private GameObject scenario;
    private Transform leakTarget;
    private Transform hazardTarget;
    private Transform buddyTarget;
    private Transform shutoffTarget;
    private Transform fanTarget;
    private Transform fanBlades;
    private Transform gasExitTarget;
    private Transform safeTarget;
    private ParticleSystem gasPlume;
    private ParticleSystem groundGas;
    private ParticleSystem aerialGas;
    private TMP_Text detectorDisplay;
    private TMP_Text gasReading;
    private AudioSource hissAudio;
    private AudioSource alarmAudio;
    private TMP_Text title;
    private TMP_Text instruction;
    private TMP_Text tasks;
    private TMP_Text scoreText;
    private GameObject resultPanel;
    private GameObject ppePanel;
    private Button respiratorButton;
    private Button glovesButton;
    private Button detectorButton;
    private Button medicalMaskButton;
    private Button gardenGlovesButton;
    private GameObject equippedMask;
    private GameObject equippedGloves;
    private GameObject equippedDetector;
    private readonly List<GameObject> ppeDisplayObjects = new();
    private Step step;
    private Action returnHome;
    private int incorrect;
    private int ppeSelected;
    private bool respirator;
    private bool gloves;
    private bool detector;
    private float startedAt;
    private float hazardStartedAt;
    private float hazardScale = 0.55f;
    private bool leakIsolated;
    private bool ventilationActive;
    private float nextAlarmAt;
    private readonly List<RaycastResult> uiHits = new();
    private static readonly List<ARRaycastHit> arHits = new();

    public bool IsActive => step != Step.Inactive;

    public string GetLatestResultSummary()
    {
        string json = PlayerPrefs.GetString("gas_training_latest", "");
        if (string.IsNullOrEmpty(json)) return null;
        GasResult result = JsonUtility.FromJson<GasResult>(json);
        if (result == null) return null;
        return "GAS LEAK PROTOCOL\nScore: " + result.score + "/100   Mistakes: " +
            result.incorrectSelections + "\nTime: " + result.durationSeconds.ToString("F1") +
            "s   Attempt: #" + result.attemptId;
    }

    private void Awake()
    {
        arCamera = Camera.main;
        raycastManager = GetComponent<ARRaycastManager>();
        canvas = FindFirstObjectByType<Canvas>();
        enabled = false;
    }

    public void Begin(Action onReturnHome)
    {
        returnHome = onReturnHome;
        arCamera = arCamera != null ? arCamera : Camera.main;
        canvas = canvas != null ? canvas : FindFirstObjectByType<Canvas>();
        ResetAttempt();
        BuildInterface();
        step = Step.Place;
        enabled = true;
        startedAt = Time.unscaledTime;
        UpdateCopy();
    }

    private void Update()
    {
        if (step == Step.Inactive)
            return;

        if (hazardTarget != null && step != Step.Result)
        {
            float growthTarget = leakIsolated ? (ventilationActive ? 0.35f : 1.45f) : 3.2f;
            float rate = ventilationActive ? 0.7f : 0.18f;
            hazardScale = Mathf.MoveTowards(hazardScale, growthTarget, rate * Time.deltaTime);
            float spread01 = Mathf.InverseLerp(0.35f, 3.2f, hazardScale);
            float cloudRadius = Mathf.Lerp(0.35f, 2.2f, spread01);
            hazardTarget.localScale = new Vector3(cloudRadius * 2f, 0.12f, cloudRadius * 2f);
            UpdateGasSpread(cloudRadius, spread01);
            float ppm = leakIsolated
                ? Mathf.Lerp(32f, ventilationActive ? 0f : 12f,
                    Mathf.InverseLerp(3.2f, 0.35f, hazardScale))
                : Mathf.Clamp((Time.unscaledTime - hazardStartedAt) * 2.2f, 0f, 48f);
            if (detectorDisplay != null)
                detectorDisplay.text = "TOXIC GAS\n" + Mathf.RoundToInt(ppm) + " PPM";
            if (gasReading != null)
                gasReading.text = "DETECTOR  " + Mathf.RoundToInt(ppm) + " PPM";
            if (ppm >= 10f && alarmAudio != null && Time.unscaledTime >= nextAlarmAt)
            {
                nextAlarmAt = Time.unscaledTime + Mathf.Lerp(1.1f, 0.3f, ppm / 50f);
                alarmAudio.PlayOneShot(alarmAudio.clip);
            }
        }

        if (ventilationActive && fanBlades != null)
            fanBlades.Rotate(Vector3.forward, 420f * Time.deltaTime, Space.Self);

        if (step == Step.Ppe || step == Step.Result)
            return;

        Vector2 position;
        if (Touchscreen.current != null &&
            Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
            position = Touchscreen.current.primaryTouch.position.ReadValue();
        else if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
            position = Mouse.current.position.ReadValue();
        else
            return;

        if (IsOverInteractiveUI(position))
            return;

        switch (step)
        {
            case Step.Place:
                PlaceScenario(position);
                break;
            case Step.Hazard:
                if (MatchesTarget(leakTarget, position, 0.34f) ||
                    MatchesTarget(hazardTarget, position, 0.34f))
                {
                    step = Step.Ppe;
                    UpdateCopy();
                }
                else
                    RecordWrong("Tap the yellow gas cloud at the leaking pipe.");
                break;
            case Step.Buddy:
                if (MatchesTarget(buddyTarget, position, 0.34f))
                {
                    step = Step.Shutoff;
                    UpdateCopy();
                }
                else
                    RecordWrong("Locate and tap your buddy before entering the hazard area.");
                break;
            case Step.Shutoff:
                if (MatchesTarget(shutoffTarget, position, 0.35f))
                {
                    leakIsolated = true;
                    shutoffTarget.Rotate(Vector3.forward, 90f, Space.Self);
                    if (gasPlume != null)
                        gasPlume.Stop(true, ParticleSystemStopBehavior.StopEmitting);
                    if (hissAudio != null) hissAudio.Stop();
                    step = Step.Ventilation;
                    fanTarget.gameObject.SetActive(true);
                    UpdateCopy();
                }
                else
                    RecordWrong("Tap the red emergency shutoff valve from outside the hazard zone.");
                break;
            case Step.Ventilation:
                if (MatchesTarget(fanTarget, position, 0.36f))
                {
                    ventilationActive = true;
                    safeTarget.gameObject.SetActive(true);
                    step = Step.SafePoint;
                    UpdateCopy();
                }
                else
                    RecordWrong("Tap the ventilation fan to clear the remaining gas.");
                break;
            case Step.SafePoint:
                if (MatchesTarget(safeTarget, position, 0.36f))
                    CompleteAttempt();
                else
                    RecordWrong("Move together and tap the blue safe assembly point.");
                break;
        }
    }

    private void PlaceScenario(Vector2 screenPosition)
    {
        if (arCamera == null)
            return;

        Vector3 position = Vector3.zero;
        bool found = false;
        arHits.Clear();
        if (raycastManager != null && raycastManager.Raycast(screenPosition, arHits,
            TrackableType.PlaneWithinPolygon | TrackableType.PlaneEstimated |
            TrackableType.FeaturePoint) && arHits.Count > 0)
        {
            position = arHits[0].pose.position;
            found = true;
        }
        Vector3 forward = Vector3.ProjectOnPlane(arCamera.transform.forward, Vector3.up);
        if (forward.sqrMagnitude < 0.001f) forward = Vector3.forward;
        forward.Normalize();
        if (!found)
            position = arCamera.transform.position + forward * 2.6f - Vector3.up * 1.15f;

        scenario = new GameObject("GasLeakScenario");
        scenario.transform.SetPositionAndRotation(position,
            Quaternion.LookRotation(forward, Vector3.up));
        BuildGasScene();
        hazardStartedAt = Time.unscaledTime;
        step = Step.Hazard;
        UpdateCopy();
    }

    private void BuildGasScene()
    {
        Material metal = MaterialFor(new Color(0.23f, 0.27f, 0.25f, 1f));
        Material warning = MaterialFor(new Color(1f, 0.48f, 0.08f, 1f));
        Material red = MaterialFor(new Color(0.82f, 0.06f, 0.045f, 1f));
        Material dark = MaterialFor(new Color(0.055f, 0.075f, 0.07f, 1f));
        Material yellow = MaterialFor(GasYellow, true);
        Material buddy = MaterialFor(new Color(0.18f, 0.75f, 0.42f, 1f));
        Material safe = MaterialFor(new Color(0.12f, 0.58f, 1f, 1f));

        GameObject pipeRoot = ModelRoot("Gas Pipe Network", "GasTraining/PipeNetwork",
            new Vector3(0f, 1.15f, 1.8f), Quaternion.Euler(0f, 90f, 0f), 2.2f, false, false);
        if (pipeRoot == null)
        {
            GameObject pipe = Primitive("Gas Pipe", PrimitiveType.Cylinder,
                new Vector3(0f, 0.82f, 1.8f), new Vector3(0.12f, 1.1f, 0.12f), metal);
            pipe.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            Primitive("Pipe Riser", PrimitiveType.Cylinder, new Vector3(-1.05f, 1.3f, 1.8f),
                new Vector3(0.12f, 0.48f, 0.12f), metal);
        }
        GameObject cylinderRoot = ModelRoot("Gas Storage Cylinder", "GasTraining/GasCylinder",
            new Vector3(-2.05f, 0f, 1.8f), Quaternion.Euler(0f, 18f, 0f), 1.7f, true, true);
        if (cylinderRoot == null)
            Primitive("Gas Storage Tank", PrimitiveType.Cylinder,
                new Vector3(-2.05f, 0.85f, 1.8f), new Vector3(0.48f, 0.85f, 0.48f), metal);
        leakTarget = Primitive("LeakTarget", PrimitiveType.Sphere,
            new Vector3(0f, 0.82f, 1.8f), Vector3.one * 0.22f, warning).transform;
        CreateGasEffects(leakTarget);
        hazardTarget = Primitive("HazardZone", PrimitiveType.Cylinder,
            new Vector3(0f, 0.035f, 1.8f), new Vector3(0.7f, 0.035f, 0.7f), yellow).transform;
        Renderer hazardRenderer = hazardTarget.GetComponent<Renderer>();
        if (hazardRenderer != null) hazardRenderer.enabled = false;
        CreateWorldLabel("GAS LEAK - TAP HAZARD", leakTarget,
            new Vector3(0f, 0.7f, 0f), Orange);

        shutoffTarget = Primitive("EmergencyShutoff", PrimitiveType.Cylinder,
            new Vector3(2.9f, 1.25f, 1.35f), new Vector3(0.24f, 0.07f, 0.24f), red).transform;
        shutoffTarget.localRotation = Quaternion.Euler(90f, 0f, 0f);
        for (int i = 0; i < 4; i++)
        {
            GameObject spoke = Primitive("Valve Spoke", PrimitiveType.Cube,
                new Vector3(2.9f, 1.25f, 1.28f), new Vector3(0.43f, 0.045f, 0.045f), red);
            spoke.transform.localRotation = Quaternion.Euler(0f, 0f, i * 45f);
            spoke.transform.SetParent(shutoffTarget, true);
        }
        CreateWorldLabel("EMERGENCY SHUTOFF", shutoffTarget,
            new Vector3(0f, 0.65f, 0f), Color.red);

        buddyTarget = BuildBuddy(buddy);
        CreateWorldLabel("BUDDY", buddyTarget, new Vector3(0f, 1.2f, 0f), Green);
        BuildPpeVisuals();

        BuildDetector(metal, dark);
        BuildVentilationFan(metal, dark);
        BuildBarricades(warning, dark);
        BuildGasExit();

        safeTarget = TargetRoot("SafeAssembly", new Vector3(4.4f, 0f, -2.8f),
            Quaternion.Euler(0f, 180f, 0f), new Vector3(1.8f, 0.5f, 1.8f));
        GameObject safePlatform = LoadVisual("GasTraining/RoundPlatform", safeTarget,
            "Round Assembly Platform", 1.8f, false, true);
        Transform locationMount = new GameObject("Horizontal Location Marker Mount").transform;
        locationMount.SetParent(safeTarget, false);
        locationMount.localRotation = Quaternion.Euler(90f, 180f, 0f);
        GameObject safeVisual = LoadVisual("GasTraining/AssemblyLocation", locationMount,
            "Assembly Location Visual", 1.1f, false, true);
        if (safeVisual != null && safePlatform != null)
        {
            Renderer platformRenderer = safePlatform.GetComponentInChildren<Renderer>();
            if (platformRenderer != null)
                safeVisual.transform.position += Vector3.up *
                    Mathf.Max(0f, platformRenderer.bounds.max.y - safeTarget.position.y);
        }
        if (safeVisual == null)
            PrimitiveChild("Safe Point Fallback", PrimitiveType.Cylinder, safeTarget,
                new Vector3(0f, 0.035f, 0f), new Vector3(0.9f, 0.035f, 0.9f), safe);
        CreateWorldLabel("SAFE POINT", safeTarget, new Vector3(0f, 1.65f, 0f), Blue);
        buddyTarget.gameObject.SetActive(false);
        shutoffTarget.gameObject.SetActive(false);
        fanTarget.gameObject.SetActive(false);
        safeTarget.gameObject.SetActive(false);
        BuildAudio();
    }

    private Transform BuildBuddy(Material fallbackMaterial)
    {
        GameObject root = new GameObject("BuddyTarget");
        root.transform.SetParent(scenario.transform, false);
        root.transform.localPosition = new Vector3(-3.0f, 0f, -0.65f);
        root.transform.localRotation = Quaternion.Euler(0f, 28f, 0f);

        // Keep interaction dimensions independent from the source model's scale.
        CapsuleCollider tapVolume = root.AddComponent<CapsuleCollider>();
        tapVolume.center = new Vector3(0f, 1.1f, 0f);
        tapVolume.height = 2.2f;
        tapVolume.radius = 0.55f;

        GameObject visual = RuntimeGlbBuddyLoader.Create(root.transform);
        if (visual == null)
        {
            GameObject fallback = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            fallback.name = "Buddy Fallback";
            fallback.transform.SetParent(root.transform, false);
            fallback.transform.localPosition = new Vector3(0f, 0.85f, 0f);
            fallback.transform.localScale = new Vector3(0.55f, 0.85f, 0.55f);
            fallback.GetComponent<Renderer>().material = fallbackMaterial;
            Collider fallbackCollider = fallback.GetComponent<Collider>();
            if (fallbackCollider != null) Destroy(fallbackCollider);
            return root.transform;
        }

        Renderer[] renderers = visual.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length > 0)
        {
            Bounds bounds = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            float scale = 1.75f / Mathf.Max(bounds.size.y, 0.001f);
            visual.transform.localScale *= scale;

            bounds = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            Vector3 desiredCenter = root.transform.position + Vector3.up * (bounds.size.y * 0.5f);
            visual.transform.position += desiredCenter - bounds.center;
        }

        // The supplied model is visual-only; the stable root collider handles taps.
        foreach (Collider modelCollider in visual.GetComponentsInChildren<Collider>(true))
            modelCollider.enabled = false;
        return root.transform;
    }

    private void BuildPpeVisuals()
    {
        ppeDisplayObjects.Clear();
        CreatePpeDisplay("GasTraining/GasMask", "Gas Mask Display",
            new Vector3(-2.4f, 0.9f, -3.5f), 0.48f, "GAS MASK");
        CreatePpeDisplay("GasTraining/MechanicalGloves", "Mechanical Gloves Display",
            new Vector3(-1.2f, 0.9f, -3.5f), 0.5f, "PROTECTIVE GLOVES");
        CreatePpeDisplay("GasTraining/PpeDetector", "Detector Display",
            new Vector3(0f, 0.9f, -3.5f), 0.42f, "GAS DETECTOR");
        CreatePpeDisplay("GasTraining/MedicalMask", "Medical Mask Display",
            new Vector3(1.2f, 0.9f, -3.5f), 0.42f, "MEDICAL MASK");
        CreatePpeDisplay("GasTraining/GardenGloves", "Garden Gloves Display",
            new Vector3(2.4f, 0.9f, -3.5f), 0.48f, "GARDEN GLOVES");

        equippedMask = CreateEquippedPpe("GasTraining/GasMask", "Equipped Gas Mask",
            new Vector3(0f, 1.55f, -0.2f), new Vector3(0f, 180f, 0f), 0.32f);
        equippedGloves = CreateEquippedPpe("GasTraining/MechanicalGloves", "Equipped Gloves",
            new Vector3(0f, 1.02f, -0.2f), new Vector3(0f, 180f, 0f), 0.55f);
        equippedDetector = CreateEquippedPpe("GasTraining/PpeDetector", "Equipped Detector",
            new Vector3(0.32f, 1.02f, -0.2f), new Vector3(0f, 0f, 0f), 0.22f);
    }

    private void CreatePpeDisplay(string path, string name, Vector3 position,
        float size, string label)
    {
        Transform mount = new GameObject(name + " Mount").transform;
        mount.SetParent(scenario.transform, false);
        mount.localPosition = position;
        GameObject visual = LoadVisual(path, mount, name, size, false, false);
        if (visual == null) return;
        CreateWorldLabel(label, mount, new Vector3(0f, 0.55f, 0f), Peach);
        mount.gameObject.SetActive(false);
        ppeDisplayObjects.Add(mount.gameObject);
    }

    private GameObject CreateEquippedPpe(string path, string name, Vector3 position,
        Vector3 eulerAngles, float size)
    {
        Transform mount = new GameObject(name + " Mount").transform;
        mount.SetParent(buddyTarget, false);
        mount.localPosition = position;
        mount.localRotation = Quaternion.Euler(eulerAngles);
        GameObject visual = LoadVisual(path, mount, name, size, false, false);
        mount.gameObject.SetActive(false);
        return visual != null ? mount.gameObject : null;
    }

    private void CreateGasEffects(Transform leak)
    {
        GameObject plumeObject = new GameObject("Rising Steam Gas");
        plumeObject.transform.SetParent(leak, false);
        ParticleSystem plume = plumeObject.AddComponent<ParticleSystem>();
        var main = plume.main;
        main.loop = true;
        main.startLifetime = new ParticleSystem.MinMaxCurve(1.4f, 2.6f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(0.18f, 0.52f);
        main.startSize = new ParticleSystem.MinMaxCurve(0.12f, 0.34f);
        main.startColor = new ParticleSystem.MinMaxGradient(
            new Color(0.72f, 0.92f, 0.24f, 0.5f),
            new Color(0.95f, 0.86f, 0.18f, 0.18f));
        main.maxParticles = 90;
        var emission = plume.emission;
        emission.rateOverTime = 24f;
        var shape = plume.shape;
        shape.shapeType = ParticleSystemShapeType.Cone;
        shape.angle = 28f;
        shape.radius = 0.08f;
        var noise = plume.noise;
        noise.enabled = true;
        noise.strength = 0.18f;
        noise.frequency = 0.55f;
        ConfigureGasRenderer(plume.GetComponent<ParticleSystemRenderer>());
        plume.Play(true);
        gasPlume = plume;

        GameObject groundObject = new GameObject("Ground Smoke Gas");
        groundObject.transform.SetParent(leak, false);
        groundObject.transform.localPosition = new Vector3(0f, -0.78f, 0f);
        groundObject.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);
        groundGas = groundObject.AddComponent<ParticleSystem>();
        var groundMain = groundGas.main;
        groundMain.loop = true;
        groundMain.simulationSpace = ParticleSystemSimulationSpace.World;
        groundMain.startLifetime = new ParticleSystem.MinMaxCurve(3.5f, 6.5f);
        groundMain.startSpeed = new ParticleSystem.MinMaxCurve(0.03f, 0.14f);
        groundMain.startSize = new ParticleSystem.MinMaxCurve(0.28f, 0.62f);
        groundMain.startColor = new ParticleSystem.MinMaxGradient(
            new Color(0.55f, 0.76f, 0.24f, 0.32f),
            new Color(0.82f, 0.9f, 0.42f, 0.12f));
        groundMain.maxParticles = 180;
        var groundEmission = groundGas.emission;
        groundEmission.rateOverTime = 18f;
        var groundShape = groundGas.shape;
        groundShape.shapeType = ParticleSystemShapeType.Circle;
        groundShape.radius = 0.35f;
        var groundNoise = groundGas.noise;
        groundNoise.enabled = true;
        groundNoise.strength = 0.28f;
        groundNoise.frequency = 0.35f;
        groundNoise.scrollSpeed = 0.18f;
        var velocity = groundGas.velocityOverLifetime;
        velocity.enabled = true;
        velocity.space = ParticleSystemSimulationSpace.World;
        velocity.x = new ParticleSystem.MinMaxCurve(-0.16f, 0.16f);
        velocity.y = new ParticleSystem.MinMaxCurve(0.01f, 0.08f);
        velocity.z = new ParticleSystem.MinMaxCurve(-0.16f, 0.16f);
        ConfigureGasRenderer(groundGas.GetComponent<ParticleSystemRenderer>());
        groundGas.Play(true);

        GameObject aerialObject = new GameObject("Aerial Smoke Cloud Gas");
        aerialObject.transform.SetParent(leak, false);
        aerialObject.transform.localPosition = new Vector3(0f, 0.4f, 0f);
        aerialGas = aerialObject.AddComponent<ParticleSystem>();
        var aerialMain = aerialGas.main;
        aerialMain.loop = true;
        aerialMain.simulationSpace = ParticleSystemSimulationSpace.World;
        aerialMain.startLifetime = new ParticleSystem.MinMaxCurve(4f, 7.5f);
        aerialMain.startSpeed = new ParticleSystem.MinMaxCurve(0.025f, 0.1f);
        aerialMain.startSize = new ParticleSystem.MinMaxCurve(0.45f, 0.9f);
        aerialMain.startColor = new ParticleSystem.MinMaxGradient(
            new Color(0.62f, 0.78f, 0.3f, 0.2f),
            new Color(0.78f, 0.86f, 0.48f, 0.08f));
        aerialMain.maxParticles = 100;
        var aerialEmission = aerialGas.emission;
        aerialEmission.rateOverTime = 8f;
        var aerialShape = aerialGas.shape;
        aerialShape.shapeType = ParticleSystemShapeType.Sphere;
        aerialShape.radius = 0.3f;
        aerialShape.radiusThickness = 1f;
        var aerialNoise = aerialGas.noise;
        aerialNoise.enabled = true;
        aerialNoise.strength = 0.38f;
        aerialNoise.frequency = 0.22f;
        aerialNoise.scrollSpeed = 0.12f;
        ConfigureGasRenderer(aerialGas.GetComponent<ParticleSystemRenderer>());
        aerialGas.Play(true);
    }

    private void UpdateGasSpread(float radius, float spread01)
    {
        if (groundGas == null) return;
        var shape = groundGas.shape;
        shape.radius = radius;
        var main = groundGas.main;
        main.startSize = new ParticleSystem.MinMaxCurve(
            Mathf.Lerp(0.22f, 0.55f, spread01), Mathf.Lerp(0.48f, 1.05f, spread01));
        var emission = groundGas.emission;
        emission.rateOverTime = ventilationActive ? 0f : leakIsolated ? 3f : Mathf.Lerp(14f, 34f, spread01);
        if (aerialGas != null)
        {
            var aerialShape = aerialGas.shape;
            aerialShape.radius = radius * 0.65f;
            var aerialMain = aerialGas.main;
            aerialMain.startSize = new ParticleSystem.MinMaxCurve(
                Mathf.Lerp(0.35f, 0.7f, spread01), Mathf.Lerp(0.7f, 1.35f, spread01));
            var aerialEmission = aerialGas.emission;
            aerialEmission.rateOverTime = ventilationActive ? 0f : leakIsolated ? 1.5f :
                Mathf.Lerp(6f, 16f, spread01);
        }
    }

    private static void ConfigureGasRenderer(ParticleSystemRenderer renderer)
    {
        Shader shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
        if (shader == null) shader = Shader.Find("Particles/Standard Unlit");
        if (shader == null) shader = Shader.Find("Sprites/Default");
        if (shader != null)
        {
            Material material = new Material(shader) { color = Color.white };
            Texture2D softParticle = CreateSoftGasTexture();
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", softParticle);
            if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", softParticle);
            renderer.material = material;
        }
        renderer.renderMode = ParticleSystemRenderMode.Billboard;
        renderer.sortMode = ParticleSystemSortMode.Distance;
    }

    private static Texture2D CreateSoftGasTexture()
    {
        const int size = 64;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        texture.name = "Soft Gas Particle";
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float dx = (x + 0.5f) / size * 2f - 1f;
            float dy = (y + 0.5f) / size * 2f - 1f;
            float distance = Mathf.Sqrt(dx * dx + dy * dy);
            float alpha = Mathf.Pow(Mathf.Clamp01(1f - distance), 2.2f);
            texture.SetPixel(x, y, new Color(0.82f, 0.9f, 0.62f, alpha));
        }
        texture.Apply();
        texture.wrapMode = TextureWrapMode.Clamp;
        texture.filterMode = FilterMode.Bilinear;
        return texture;
    }

    private void BuildDetector(Material body, Material screenMaterial)
    {
        Transform detector = TargetRoot("Portable Gas Detector",
            new Vector3(-1.15f, 1.05f, -1.65f), Quaternion.Euler(0f, 18f, 0f),
            new Vector3(0.42f, 0.55f, 0.3f));
        GameObject detectorVisual = LoadVisual("GasTraining/PpeDetector", detector,
            "Gas Detector Visual", 0.24f, true, false);
        if (detectorVisual == null)
            PrimitiveChild("Detector Fallback", PrimitiveType.Cube, detector,
                Vector3.zero, new Vector3(0.14f, 0.24f, 0.065f), body);
        GameObject display = new GameObject("Detector Reading");
        display.transform.SetParent(detector, false);
        display.transform.localPosition = new Vector3(0f, 0.42f, 0f);
        display.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
        detectorDisplay = display.AddComponent<TextMeshPro>();
        detectorDisplay.text = "TOXIC GAS\n0 PPM";
        detectorDisplay.fontSize = 2.1f;
        detectorDisplay.alignment = TextAlignmentOptions.Center;
        detectorDisplay.color = new Color(0.45f, 1f, 0.35f);
        detectorDisplay.rectTransform.sizeDelta = new Vector2(2.2f, 1f);
    }

    private void BuildVentilationFan(Material metal, Material dark)
    {
        fanTarget = TargetRoot("VentilationFan", new Vector3(2.8f, 1.65f, -1.0f),
            Quaternion.Euler(0f, -38f, 0f), new Vector3(1.25f, 1.25f, 0.6f));
        GameObject fanVisual = LoadVisual("GasTraining/ExhaustFan", fanTarget,
            "Exhaust Fan Visual", 0.95f, false, false);
        if (fanVisual == null)
        {
            GameObject fallback = PrimitiveChild("Fan Fallback", PrimitiveType.Cylinder,
                fanTarget, Vector3.zero, new Vector3(0.48f, 0.1f, 0.48f), metal);
            fallback.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        }
        fanBlades = FindNamedPart(fanVisual != null ? fanVisual.transform : null,
            "blade", "rotor", "propeller");
        CreateWorldLabel("VENTILATION", fanTarget, new Vector3(0f, 1.1f, 0f), Blue);
    }

    private void BuildGasExit()
    {
        gasExitTarget = TargetRoot("GasExit", new Vector3(4.2f, 0f, 0.2f),
            Quaternion.Euler(0f, -90f, 0f), new Vector3(1.35f, 2.35f, 0.75f));
        GameObject door = LoadVisual("GasTraining/ExitDoorDouble", gasExitTarget,
            "Exit Door Visual", 2.1f, true, true);
        if (door == null)
            PrimitiveChild("Exit Door Fallback", PrimitiveType.Cube, gasExitTarget,
                new Vector3(0f, 1.05f, 0f), new Vector3(1.05f, 2.1f, 0.12f),
                MaterialFor(new Color(0.16f, 0.24f, 0.2f, 1f)));
        Transform signMount = new GameObject("Exit Sign Mount").transform;
        signMount.SetParent(gasExitTarget, false);
        signMount.localPosition = new Vector3(0f, 2.28f, 0f);
        LoadVisual("GasTraining/ExitSign", signMount,
            "Exit Sign Visual", 0.62f, false, false);
        CreateWorldLabel("EMERGENCY EXIT", gasExitTarget, new Vector3(0f, 2.72f, 0f), Green);
    }

    private void BuildBarricades(Material warning, Material dark)
    {
        for (int side = -1; side <= 1; side += 2)
        {
            Primitive("Barrier Post", PrimitiveType.Cylinder,
                new Vector3(side * 1.65f, 0.48f, 0.55f), new Vector3(0.07f, 0.48f, 0.07f), dark);
            Primitive("Warning Barrier", PrimitiveType.Cube,
                new Vector3(side * 0.82f, 0.72f, 0.55f), new Vector3(1.58f, 0.1f, 0.055f), warning);
        }
    }

    private void BuildAudio()
    {
        GameObject hissObject = new GameObject("Gas Hiss");
        hissObject.transform.SetParent(leakTarget, false);
        hissAudio = hissObject.AddComponent<AudioSource>();
        hissAudio.clip = CreateNoiseClip("Gas Hiss", 1.5f);
        hissAudio.loop = true;
        hissAudio.volume = 0.18f;
        hissAudio.spatialBlend = 1f;
        hissAudio.Play();

        GameObject alarmObject = new GameObject("Detector Alarm");
        alarmObject.transform.SetParent(scenario.transform, false);
        alarmAudio = alarmObject.AddComponent<AudioSource>();
        alarmAudio.clip = CreateToneClip("Detector Beep", 1550f, 0.12f);
        alarmAudio.volume = 0.28f;
        alarmAudio.spatialBlend = 0f;
    }

    private static AudioClip CreateNoiseClip(string name, float duration)
    {
        const int rate = 22050;
        int count = Mathf.RoundToInt(rate * duration);
        float[] data = new float[count];
        float last = 0f;
        System.Random random = new System.Random(1847);
        for (int i = 0; i < count; i++)
        {
            float noise = (float)(random.NextDouble() * 2.0 - 1.0);
            last = Mathf.Lerp(last, noise, 0.16f);
            data[i] = last * 0.35f;
        }
        AudioClip clip = AudioClip.Create(name, count, 1, rate, false);
        clip.SetData(data, 0);
        return clip;
    }

    private static AudioClip CreateToneClip(string name, float frequency, float duration)
    {
        const int rate = 22050;
        int count = Mathf.RoundToInt(rate * duration);
        float[] data = new float[count];
        for (int i = 0; i < count; i++)
        {
            float envelope = Mathf.Sin(Mathf.PI * i / count);
            data[i] = Mathf.Sin(2f * Mathf.PI * frequency * i / rate) * envelope * 0.35f;
        }
        AudioClip clip = AudioClip.Create(name, count, 1, rate, false);
        clip.SetData(data, 0);
        return clip;
    }

    private GameObject Primitive(string name, PrimitiveType type, Vector3 localPosition,
        Vector3 localScale, Material material)
    {
        GameObject go = GameObject.CreatePrimitive(type);
        go.name = name;
        go.transform.SetParent(scenario.transform, false);
        go.transform.localPosition = localPosition;
        go.transform.localScale = localScale;
        go.GetComponent<Renderer>().material = material;
        return go;
    }

    private Transform TargetRoot(string name, Vector3 localPosition, Quaternion localRotation,
        Vector3 colliderSize)
    {
        GameObject root = new GameObject(name);
        root.transform.SetParent(scenario.transform, false);
        root.transform.localPosition = localPosition;
        root.transform.localRotation = localRotation;
        BoxCollider collider = root.AddComponent<BoxCollider>();
        collider.center = new Vector3(0f, colliderSize.y * 0.5f, 0f);
        collider.size = colliderSize;
        collider.isTrigger = true;
        return root.transform;
    }

    private GameObject ModelRoot(string name, string resourcePath, Vector3 localPosition,
        Quaternion localRotation, float targetMeasure, bool measureHeight, bool alignFloor)
    {
        Transform root = TargetRoot(name, localPosition, localRotation, Vector3.one * 0.2f);
        GameObject visual = LoadVisual(resourcePath, root, name + " Visual",
            targetMeasure, measureHeight, alignFloor);
        if (visual != null) return root.gameObject;
        Destroy(root.gameObject);
        return null;
    }

    private static GameObject LoadVisual(string resourcePath, Transform parent, string name,
        float targetMeasure, bool measureHeight, bool alignFloor)
    {
        GameObject prefab = Resources.Load<GameObject>(resourcePath);
        if (prefab == null) return null;
        GameObject visual = Instantiate(prefab, parent);
        visual.name = name;
        visual.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
        GasTrainingMaterialUtility.Apply(visual, resourcePath);

        Renderer[] renderers = visual.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length == 0)
        {
            Destroy(visual);
            return null;
        }
        Bounds bounds = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        float sourceMeasure = measureHeight ? bounds.size.y : Mathf.Max(bounds.size.x,
            Mathf.Max(bounds.size.y, bounds.size.z));
        visual.transform.localScale *= targetMeasure / Mathf.Max(sourceMeasure, 0.001f);

        bounds = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        Vector3 adjustment = alignFloor
            ? Vector3.up * (parent.position.y - bounds.min.y)
            : parent.position - bounds.center;
        visual.transform.position += adjustment;
        foreach (Collider collider in visual.GetComponentsInChildren<Collider>(true))
            collider.enabled = false;
        return visual;
    }

    private static GameObject PrimitiveChild(string name, PrimitiveType type, Transform parent,
        Vector3 localPosition, Vector3 localScale, Material material)
    {
        GameObject go = GameObject.CreatePrimitive(type);
        go.name = name;
        go.transform.SetParent(parent, false);
        go.transform.localPosition = localPosition;
        go.transform.localScale = localScale;
        go.GetComponent<Renderer>().material = material;
        Collider collider = go.GetComponent<Collider>();
        if (collider != null) collider.enabled = false;
        return go;
    }

    private static Transform FindNamedPart(Transform root, params string[] terms)
    {
        if (root == null) return null;
        foreach (Transform candidate in root.GetComponentsInChildren<Transform>(true))
        {
            string lowered = candidate.name.ToLowerInvariant();
            foreach (string term in terms)
                if (lowered.Contains(term)) return candidate;
        }
        return null;
    }

    private void CreateWorldLabel(string text, Transform parent, Vector3 offset, Color color)
    {
        GameObject labelObject = new GameObject(text);
        labelObject.transform.SetParent(parent, false);
        labelObject.transform.localPosition = offset;
        TextMeshPro label = labelObject.AddComponent<TextMeshPro>();
        label.text = text;
        label.alignment = TextAlignmentOptions.Center;
        label.fontSize = 3.2f;
        label.color = color;
        label.rectTransform.sizeDelta = new Vector2(4f, 1f);
        labelObject.AddComponent<FaceCamera>();
    }

    private bool MatchesTarget(Transform target, Vector2 tap, float widthFraction)
    {
        if (target == null || !target.gameObject.activeInHierarchy || arCamera == null)
            return false;
        Vector3 center = target.position;
        Renderer renderer = target.GetComponentInChildren<Renderer>();
        if (renderer != null) center = renderer.bounds.center;
        Vector3 screen = arCamera.WorldToScreenPoint(center);
        if (screen.z <= 0f) return false;
        float radius = Mathf.Clamp(Screen.width * widthFraction, 180f, 420f);
        return Vector2.Distance(tap, new Vector2(screen.x, screen.y)) <= radius;
    }

    private void SelectPpe(string item, Button button)
    {
        bool accepted = false;
        switch (item)
        {
            case "respirator":
                accepted = !respirator; respirator = true;
                if (equippedMask != null) equippedMask.SetActive(true);
                break;
            case "gloves":
                accepted = !gloves; gloves = true;
                if (equippedGloves != null) equippedGloves.SetActive(true);
                break;
            case "detector":
                accepted = !detector; detector = true;
                if (equippedDetector != null) equippedDetector.SetActive(true);
                break;
            default:
                button.GetComponent<Image>().color = new Color(0.72f, 0.12f, 0.12f, 1f);
                RecordWrong(item == "medical"
                    ? "A medical mask does not protect against toxic industrial gas."
                    : "Garden gloves do not provide chemical protection.");
                return;
        }
        if (!accepted) return;
        ppeSelected++;
        button.interactable = false;
        button.GetComponent<Image>().color = Green;
        if (ppeSelected >= 3)
        {
            step = Step.Buddy;
            buddyTarget.gameObject.SetActive(true);
            UpdateCopy();
        }
        else
            instruction.text = "Select all required PPE: " + ppeSelected + "/3";
    }

    private void RecordWrong(string message)
    {
        incorrect++;
        if (instruction != null) instruction.text = message;
    }

    private void CompleteAttempt()
    {
        step = Step.Result;
        int score = Mathf.Max(0, 100 - incorrect * 10);
        GasResult result = new GasResult
        {
            score = score,
            incorrectSelections = incorrect,
            durationSeconds = Time.unscaledTime - startedAt,
            attemptId = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant(),
            completedUtc = DateTime.UtcNow.ToString("O")
        };
        PlayerPrefs.SetString("gas_training_latest", JsonUtility.ToJson(result));
        PlayerPrefs.Save();
        UpdateCopy();
        scoreText.text = (score >= 70 ? "PASS" : "RETRY") + "  " + score + "/100\n" +
            "Mistakes: " + incorrect + "    Time: " + result.durationSeconds.ToString("F1") + "s\n" +
            "Attempt: #" + result.attemptId;
    }

    private void UpdateCopy()
    {
        if (uiRoot == null) return;
        ppePanel.SetActive(step == Step.Ppe);
        foreach (GameObject display in ppeDisplayObjects)
            if (display != null) display.SetActive(step == Step.Ppe);
        buddyTarget?.gameObject.SetActive(step == Step.Buddy || step == Step.SafePoint);
        shutoffTarget?.gameObject.SetActive(step == Step.Shutoff);
        fanTarget?.gameObject.SetActive(step == Step.Ventilation || step == Step.SafePoint);
        safeTarget?.gameObject.SetActive(step == Step.SafePoint);
        resultPanel.SetActive(step == Step.Result);
        switch (step)
        {
            case Step.Place:
                title.text = "Gas Leak & Confined Space";
                instruction.text = "Tap the floor to place the gas leak scenario";
                tasks.text = "1  Recognize hazard  2  PPE  3  Buddy\n4  Isolate leak  5  Ventilate and evacuate";
                break;
            case Step.Hazard:
                instruction.text = "Identify and tap the gas leak hazard zone";
                tasks.text = "1  <b>Recognize hazard zone</b>\n2  PPE  3  Buddy  4  Isolate  5  Evacuate";
                break;
            case Step.Ppe:
                instruction.text = "Select gas mask, protective gloves, and gas detector";
                tasks.text = "1  <s>Hazard recognized</s>\n2  <b>Select required PPE</b>  3  Buddy  4  Isolate";
                break;
            case Step.Buddy:
                instruction.text = "Never enter alone - find and tap your buddy";
                tasks.text = "1  <s>Hazard</s>  2  <s>PPE</s>\n3  <b>Verify buddy</b>  4  Isolate  5  Evacuate";
                break;
            case Step.Shutoff:
                instruction.text = "Tap the red remote emergency shutoff valve";
                tasks.text = "1  <s>Hazard</s>  2  <s>PPE</s>  3  <s>Buddy</s>\n4  <b>Isolate the leak</b>  5  Ventilate";
                break;
            case Step.Ventilation:
                instruction.text = "Activate mechanical ventilation from the safe side";
                tasks.text = "1  <s>Hazard</s>  2  <s>PPE</s>  3  <s>Buddy</s>\n4  <s>Leak isolated</s>  5  <b>Ventilate</b>";
                break;
            case Step.SafePoint:
                instruction.text = "Move together and tap the blue safe point";
                tasks.text = "1  <s>Hazard</s>  2  <s>PPE</s>  3  <s>Buddy</s>\n4  <s>Isolated</s>  5  <b>Reach safety</b>";
                break;
            case Step.Result:
                instruction.text = "Gas leak protocol complete";
                tasks.text = "All required procedures completed";
                break;
        }
    }

    private void BuildInterface()
    {
        if (uiRoot != null) Destroy(uiRoot);
        uiRoot = Node("GasModuleUI", canvas.transform, typeof(Image));
        Stretch(uiRoot.GetComponent<RectTransform>());
        Image background = uiRoot.GetComponent<Image>();
        background.color = new Color(Ink.r, Ink.g, Ink.b, 0.34f);
        background.raycastTarget = false;

        Button home = ActionButton(uiRoot.transform, "‹", CardDark,
            new Vector2(45, -95), new Vector2(120, 120));
        TMP_Text backGlyph = home.GetComponentInChildren<TMP_Text>();
        backGlyph.fontSize = 72;
        backGlyph.color = Color.white;
        backGlyph.alignment = TextAlignmentOptions.Center;
        Navigation noNavigation = new Navigation { mode = Navigation.Mode.None };
        home.navigation = noNavigation;
        home.onClick.AddListener(ReturnHome);
        title = Label(uiRoot.transform, "Gas Leak & Confined Space", 40, FontStyles.Bold,
            new Vector2(190, -105), new Vector2(535, 72), TextAlignmentOptions.Left);
        ConfigureAutoSize(title, 31f, 40f);
        gasReading = Label(uiRoot.transform, "DETECTOR  -- PPM", 27, FontStyles.Bold,
            new Vector2(750, -112), new Vector2(280, 60), TextAlignmentOptions.Right, Green);
        ConfigureAutoSize(gasReading, 21f, 27f);
        instruction = PanelLabel(uiRoot.transform, "Tap the floor to place",
            new Vector2(55, -245), new Vector2(970, 135), 32);
        ConfigureAutoSize(instruction, 24f, 32f);
        GameObject taskCard = Panel(uiRoot.transform, "Gas Tasks", CardDark,
            new Vector2(55, 385), new Vector2(970, 290), new Vector2(0, 0), new Vector2(0, 0));
        Label(taskCard.transform, "GAS LEAK PROTOCOL", 27, FontStyles.Bold,
            new Vector2(40, -25), new Vector2(850, 45), TextAlignmentOptions.Left, Orange);
        tasks = Label(taskCard.transform, "", 29, FontStyles.Normal,
            new Vector2(40, -85), new Vector2(870, 170), TextAlignmentOptions.TopLeft, Color.white);
        ConfigureAutoSize(tasks, 23f, 29f);

        ppePanel = Panel(uiRoot.transform, "PPE Selection", Card,
            new Vector2(55, 45), new Vector2(970, 320), new Vector2(0, 0), new Vector2(0, 0));
        Label(ppePanel.transform, "SELECT REQUIRED PPE", 26, FontStyles.Bold,
            new Vector2(35, -22), new Vector2(880, 42), TextAlignmentOptions.Center, Orange);
        respiratorButton = ActionButton(ppePanel.transform, "Gas Mask / Respirator", Peach,
            new Vector2(25, -85), new Vector2(285, 85));
        glovesButton = ActionButton(ppePanel.transform, "Protective Gloves", Peach,
            new Vector2(342, -85), new Vector2(285, 85));
        detectorButton = ActionButton(ppePanel.transform, "Gas Detector", Peach,
            new Vector2(659, -85), new Vector2(285, 85));
        medicalMaskButton = ActionButton(ppePanel.transform, "Medical Mask", CardDark,
            new Vector2(180, -190), new Vector2(285, 75));
        gardenGlovesButton = ActionButton(ppePanel.transform, "Garden Gloves", CardDark,
            new Vector2(505, -190), new Vector2(285, 75));
        respiratorButton.onClick.AddListener(() => SelectPpe("respirator", respiratorButton));
        glovesButton.onClick.AddListener(() => SelectPpe("gloves", glovesButton));
        detectorButton.onClick.AddListener(() => SelectPpe("detector", detectorButton));
        medicalMaskButton.onClick.AddListener(() => SelectPpe("medical", medicalMaskButton));
        gardenGlovesButton.onClick.AddListener(() => SelectPpe("garden", gardenGlovesButton));

        scoreText = PanelLabel(uiRoot.transform, "", new Vector2(110, -620),
            new Vector2(860, 330), 38);
        resultPanel = scoreText.transform.parent.gameObject;
        scoreText.rectTransform.anchorMin = scoreText.rectTransform.anchorMax = new Vector2(0.5f, 1f);
        scoreText.rectTransform.pivot = new Vector2(0.5f, 1f);
        scoreText.rectTransform.anchoredPosition = new Vector2(0f, -28f);
        scoreText.rectTransform.sizeDelta = new Vector2(800f, 150f);
        ConfigureAutoSize(scoreText, 28f, 38f);
        Button restart = ActionButton(resultPanel.transform, "Restart Gas Training", Peach,
            new Vector2(70, -220), new Vector2(720, 82));
        restart.onClick.AddListener(ResetAttempt);
    }

    private void ResetAttempt()
    {
        if (scenario != null) Destroy(scenario);
        scenario = null;
        leakTarget = hazardTarget = buddyTarget = shutoffTarget = fanTarget = gasExitTarget = safeTarget = null;
        fanBlades = null;
        gasPlume = null;
        groundGas = null;
        aerialGas = null;
        detectorDisplay = null;
        equippedMask = equippedGloves = equippedDetector = null;
        ppeDisplayObjects.Clear();
        hissAudio = alarmAudio = null;
        incorrect = 0;
        ppeSelected = 0;
        respirator = gloves = detector = false;
        leakIsolated = false;
        ventilationActive = false;
        hazardScale = 0.55f;
        nextAlarmAt = 0f;
        if (respiratorButton != null)
        {
            ResetPpeButton(respiratorButton);
            ResetPpeButton(glovesButton);
            ResetPpeButton(detectorButton);
            ResetPpeButton(medicalMaskButton);
            ResetPpeButton(gardenGlovesButton);
        }
        step = Step.Place;
        startedAt = Time.unscaledTime;
        UpdateCopy();
    }

    private static void ResetPpeButton(Button button)
    {
        button.interactable = true;
        button.GetComponent<Image>().color = Peach;
    }

    private void ReturnHome()
    {
        if (scenario != null) Destroy(scenario);
        if (uiRoot != null) Destroy(uiRoot);
        scenario = null;
        uiRoot = null;
        step = Step.Inactive;
        enabled = false;
        Action callback = returnHome;
        returnHome = null;
        callback?.Invoke();
    }

    private bool IsOverInteractiveUI(Vector2 position)
    {
        if (EventSystem.current == null) return false;
        PointerEventData pointer = new PointerEventData(EventSystem.current) { position = position };
        uiHits.Clear();
        EventSystem.current.RaycastAll(pointer, uiHits);
        foreach (RaycastResult hit in uiHits)
            if (hit.gameObject.GetComponentInParent<Selectable>() != null)
                return true;
        return false;
    }

    private static Material MaterialFor(Color color, bool transparent = false)
    {
        Shader shader = Shader.Find(transparent ? "Universal Render Pipeline/Unlit" :
            "Universal Render Pipeline/Lit");
        if (shader == null) shader = Shader.Find("Standard");
        Material material = new Material(shader) { color = color };
        if (transparent)
        {
            material.SetFloat("_Surface", 1f);
            material.SetFloat("_Blend", 0f);
            material.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.SrcAlpha);
            material.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            material.SetFloat("_ZWrite", 0f);
            material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            material.renderQueue = 3000;
        }
        return material;
    }

    private static GameObject Node(string name, Transform parent, params Type[] components)
    {
        Type[] types = new Type[components.Length + 1];
        types[0] = typeof(RectTransform);
        components.CopyTo(types, 1);
        GameObject go = new GameObject(name, types);
        go.layer = 5;
        go.transform.SetParent(parent, false);
        return go;
    }

    private static GameObject Panel(Transform parent, string name, Color color,
        Vector2 position, Vector2 size, Vector2? anchorMin = null, Vector2? anchorMax = null)
    {
        GameObject go = Node(name, parent, typeof(Image));
        Rect(go.GetComponent<RectTransform>(), position, size,
            anchorMin ?? new Vector2(0, 1), anchorMax ?? new Vector2(0, 1));
        Image image = go.GetComponent<Image>();
        image.sprite = Rounded();
        image.type = Image.Type.Sliced;
        image.color = color;
        image.raycastTarget = false;
        return go;
    }

    private static TMP_Text Label(Transform parent, string value, float fontSize,
        FontStyles style, Vector2 position, Vector2 size, TextAlignmentOptions alignment,
        Color? color = null)
    {
        GameObject go = Node("Label", parent, typeof(TextMeshProUGUI));
        TMP_Text label = go.GetComponent<TMP_Text>();
        label.text = value;
        label.fontSize = fontSize;
        label.fontStyle = style;
        label.alignment = alignment;
        label.color = color ?? Color.white;
        label.raycastTarget = false;
        label.richText = true;
        label.textWrappingMode = TextWrappingModes.Normal;
        label.overflowMode = TextOverflowModes.Overflow;
        label.margin = new Vector4(10f, 4f, 10f, 4f);
        Rect(label.rectTransform, position, size, new Vector2(0, 1), new Vector2(0, 1));
        return label;
    }

    private static TMP_Text PanelLabel(Transform parent, string value,
        Vector2 position, Vector2 size, float fontSize)
    {
        GameObject panel = Panel(parent, value + " Panel", CardDark, position, size);
        TMP_Text label = Label(panel.transform, value, fontSize, FontStyles.Bold,
            Vector2.zero, size - new Vector2(35, 20), TextAlignmentOptions.Center);
        label.rectTransform.anchorMin = label.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
        label.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        return label;
    }

    private static Button ActionButton(Transform parent, string value, Color color,
        Vector2 position, Vector2 size)
    {
        GameObject go = Panel(parent, value, color, position, size);
        Image image = go.GetComponent<Image>();
        image.raycastTarget = true;
        Button button = go.AddComponent<Button>();
        TMP_Text label = Label(go.transform, value, 27, FontStyles.Bold,
            Vector2.zero, size, TextAlignmentOptions.Center, Ink);
        label.rectTransform.anchorMin = label.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
        label.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        return button;
    }

    private static void ConfigureAutoSize(TMP_Text label, float minimum, float maximum)
    {
        label.enableAutoSizing = true;
        label.fontSizeMin = minimum;
        label.fontSizeMax = maximum;
    }

    private static void Rect(RectTransform rect, Vector2 position, Vector2 size,
        Vector2 anchorMin, Vector2 anchorMax)
    {
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.pivot = anchorMin;
        rect.anchoredPosition = position;
        rect.sizeDelta = size;
    }

    private static void Stretch(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
    }

    private static Sprite Rounded()
    {
        if (roundedSprite != null) return roundedSprite;
        const int size = 64;
        const float radius = 18f;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        texture.name = "Gas UI Rounded Rectangle";
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float dx = Mathf.Max(radius - x, 0f) + Mathf.Max(x - (size - radius - 1), 0f);
            float dy = Mathf.Max(radius - y, 0f) + Mathf.Max(y - (size - radius - 1), 0f);
            float alpha = Mathf.Clamp01(radius + 0.5f - Mathf.Sqrt(dx * dx + dy * dy));
            texture.SetPixel(x, y, new Color(1f, 1f, 1f, alpha));
        }
        texture.Apply();
        texture.wrapMode = TextureWrapMode.Clamp;
        roundedSprite = Sprite.Create(texture, new UnityEngine.Rect(0, 0, size, size),
            new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect,
            new Vector4(20f, 20f, 20f, 20f));
        return roundedSprite;
    }

    private static Color Hex(string value)
    {
        ColorUtility.TryParseHtmlString("#" + value, out Color color);
        return color;
    }
}
