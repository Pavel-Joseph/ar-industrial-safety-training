using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

public class TapToPlace : MonoBehaviour
{
    public GameObject CurrentScenario => placedCube;
    public bool ExitIdentified => exitSelected;
    public bool IdentificationComplete => extinguisherSelected;
    public bool SprayPracticeComplete => sprayPracticeComplete;
    public bool IsSprayPlaying => sprayActive;
    public bool HasPlacedScenario => placedCube != null;
    public int FireRemainingPercent => fireSpread != null ? fireSpread.RemainingPercent : 100;
    public bool CanPracticeSpray => extinguisherSelected && aimSelected &&
                                    extinguisherSpray != null && fireSpread != null &&
                                    fireSpread.IsReady;

    
    [SerializeField] private GameObject cubePrefab;
    [SerializeField] private TMP_Text instructionText;
    [SerializeField] private TMP_Text resultsText;
    [SerializeField] private Camera arCamera;
    [SerializeField] private Button practiceSprayButton;
    [SerializeField] private ARRaycastManager raycastManager;
    [SerializeField] private ARPlaneManager planeManager;
    [SerializeField, Min(0.5f)] private float fallbackWallDistance = 3.2f;

    private EvacuationPractice evacuation;
    private FireModuleProgress progress;
    private GameObject placedCube;
    private GameObject aimTarget;
    private ParticleSystem extinguisherSpray;
    private FireSpreadController fireSpread;
    private ARPlane placedFloor;
    private Transform extinguisherRoot;
    private Transform exitRoot;
    private Transform assemblyRoot;
    private Transform fireRoot;
    private Vector3 sprayLocalOffset;
    private float floorY;
    private float nextWallSearch;
    private bool wallObjectsPlaced;
    private bool usingWallFallback;
    private float nextPlaneVisualHide;
    private bool sprayActive;
    private float sprayStartedAt;
    private int lastFirePercent = -1;

    private bool exitSelected;
    private bool extinguisherSelected;
    private bool aimSelected;
    private bool sprayPracticeComplete;
    private int score;
    private int incorrectSelections;
    private float startTime;

    private readonly List<RaycastResult> uiHits = new();
    private static readonly List<ARRaycastHit> arHits = new();

    private void Awake()
    {
        evacuation = GetComponent<EvacuationPractice>();
        progress = GetComponent<FireModuleProgress>();
        if (raycastManager == null)
            raycastManager = GetComponent<ARRaycastManager>();
        if (planeManager == null)
            planeManager = GetComponent<ARPlaneManager>();
        if (raycastManager != null)
            raycastManager.enabled = true;
        if (planeManager != null)
        {
            planeManager.enabled = true;
            planeManager.requestedDetectionMode =
                PlaneDetectionMode.Horizontal | PlaneDetectionMode.Vertical;
        }
    }

    private void Start()
    {
        HideResults();
        SetSprayButton(false);
        ShowStartingInstruction();
    }

    private void Update()
    {
        if (planeManager != null && Time.unscaledTime >= nextPlaneVisualHide)
        {
            nextPlaneVisualHide = Time.unscaledTime + 0.5f;
            HidePlaneVisuals();
        }

        if (placedCube != null && !exitSelected &&
            (!wallObjectsPlaced || usingWallFallback) &&
            Time.unscaledTime >= nextWallSearch)
        {
            nextWallSearch = Time.unscaledTime + 0.5f;
            TryPlaceWallObjects(true);
        }

        if (sprayActive && fireSpread != null)
        {
            int percent = fireSpread.RemainingPercent;
            if (percent != lastFirePercent)
            {
                SetInstruction("spray_progress", percent);
                lastFirePercent = percent;
            }
        }

        Vector2 tapPosition;
        if (Touchscreen.current != null &&
            Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
            tapPosition = Touchscreen.current.primaryTouch.position.ReadValue();
        else if (Mouse.current != null &&
                 Mouse.current.leftButton.wasPressedThisFrame)
            tapPosition = Mouse.current.position.ReadValue();
        else
            return;

        if (IsOverUI(tapPosition))
            return;

        if (placedCube == null)
        {
            TryPlaceScenario(tapPosition);
            return;
        }

        if (evacuation != null && evacuation.IsActive)
            return;

        if (!extinguisherSelected)
            CheckTrainingTap(tapPosition);
        else if (!aimSelected)
            CheckAimTap(tapPosition);
    }

    private bool IsOverUI(Vector2 position)
    {
        if (EventSystem.current == null)
            return false;

        var pointer = new PointerEventData(EventSystem.current)
        {
            position = position
        };

        uiHits.Clear();
        EventSystem.current.RaycastAll(pointer, uiHits);

        foreach (RaycastResult hit in uiHits)
        {
            if (hit.module is GraphicRaycaster)
                return true;
        }

        return false;
    }

    private void TryPlaceScenario(Vector2 screenPosition)
    {
        Camera camera = arCamera != null ? arCamera : Camera.main;
        if (cubePrefab == null || camera == null)
            return;

        Vector3 placementPosition = Vector3.zero;
        bool hasPlacement = false;
        arHits.Clear();
        if (raycastManager != null && raycastManager.Raycast(screenPosition, arHits,
            TrackableType.PlaneWithinPolygon |
            TrackableType.PlaneEstimated |
            TrackableType.FeaturePoint))
        {
            // Prefer a confirmed horizontal polygon, then accept ARCore's
            // estimated surface or feature point while tracking warms up.
            foreach (ARRaycastHit hit in arHits)
            {
                ARPlane plane = planeManager != null ? planeManager.GetPlane(hit.trackableId) : null;
                if (plane != null && plane.alignment == PlaneAlignment.HorizontalUp)
                {
                    placedFloor = plane;
                    placementPosition = hit.pose.position;
                    hasPlacement = true;
                    break;
                }
            }
            if (!hasPlacement && arHits.Count > 0)
            {
                placementPosition = arHits[0].pose.position;
                hasPlacement = true;
            }
        }

        if (!hasPlacement)
        {
            // A deterministic fallback prevents low-texture floors and dim
            // rooms from blocking training. AR planes keep scanning and wall
            // props are upgraded to real planes as soon as they arrive.
            Vector3 flatForward = Vector3.ProjectOnPlane(camera.transform.forward, Vector3.up);
            if (flatForward.sqrMagnitude < 0.0001f)
                flatForward = Vector3.forward;
            flatForward.Normalize();
            placementPosition = camera.transform.position + flatForward * 1.8f - Vector3.up * 1.15f;
        }

        Vector3 direction = Vector3.ProjectOnPlane(camera.transform.forward, Vector3.up);
        if (direction.sqrMagnitude < 0.0001f)
            direction = Vector3.forward;
        direction.Normalize();
        Quaternion rotation = Quaternion.LookRotation(direction, Vector3.up);

        placedCube = Instantiate(cubePrefab, placementPosition, rotation);
        floorY = placementPosition.y;
        if (progress != null)
            progress.BeginAttempt(placedCube);

        Transform trainingFloor = placedCube.transform.Find("Trainingfloor");
        if (trainingFloor != null)
            trainingFloor.gameObject.SetActive(false);

        extinguisherRoot = placedCube.transform.Find("ExtinguisherPlaceholder");
        exitRoot = placedCube.transform.Find("ExitMarker");
        assemblyRoot = placedCube.transform.Find("AssemblyPoint");
        fireRoot = placedCube.transform.Find("FirePlaceholder");

        // Establish real-world proportions before attaching the detailed visuals.
        // Unity cubes use their transform scale as metres; the assembly cylinder's
        // diameter is twice its X/Z scale.
        if (exitRoot != null) exitRoot.localScale = new Vector3(1.05f, 2.1f, 0.12f);
        if (extinguisherRoot != null) extinguisherRoot.localScale = new Vector3(0.24f, 0.68f, 0.22f);
        if (assemblyRoot != null) assemblyRoot.localScale = new Vector3(0.8f, 0.025f, 0.8f);
        if (fireRoot != null)
        {
            fireRoot.localPosition = new Vector3(0f, 0.12f, 0.8f);
            fireRoot.localScale = new Vector3(0.45f, 0.22f, 0.45f);
        }
        AttachVisualToTarget("ExitDoorVisual", exitRoot);
        AttachVisualToTarget("ExitSignVisual", exitRoot);
        AttachVisualToTarget("ExitLabel", exitRoot);
        AttachVisualToTarget("ExtinguisherVisual", extinguisherRoot);
        AttachVisualToTarget("ExtinguisherLabel", extinguisherRoot);
        AttachVisualToTarget("AssemblyLabel", assemblyRoot);
        FitVisualHeight(exitRoot != null ? exitRoot.Find("ExitDoorVisual") : null, 2.1f);
        FitVisualHeight(extinguisherRoot != null ? extinguisherRoot.Find("ExtinguisherVisual") : null, 0.68f);
        EnsureTouchTarget(exitRoot, "ExitTouchZone", new Vector3(1.35f, 2.3f, 0.75f));
        EnsureTouchTarget(extinguisherRoot, "ExtinguisherTouchZone",
            new Vector3(0.75f, 1.25f, 0.75f));
        EnsureTouchTarget(assemblyRoot, "AssemblyTouchZone",
            new Vector3(1.8f, 0.35f, 1.8f));

        aimTarget = null;
        foreach (Transform child in
                 placedCube.GetComponentsInChildren<Transform>(true))
        {
            if (child.gameObject.name == "AimTarget")
            {
                aimTarget = child.gameObject;
                aimTarget.transform.localPosition = new Vector3(0f, 0.15f, 0f);
                aimTarget.SetActive(false);
                break;
            }
        }
        if (aimTarget != null)
            EnsureTouchTarget(aimTarget.transform, "AimTouchZone",
                new Vector3(1.2f, 1.2f, 1.2f));

        extinguisherSpray = null;

        foreach (ParticleSystem effect in
                 placedCube.GetComponentsInChildren<ParticleSystem>(true))
        {
            if (effect.gameObject.name == "ExtinguisherSpray")
            {
                extinguisherSpray = effect;
                extinguisherSpray.Stop(
                    true,
                    ParticleSystemStopBehavior.StopEmittingAndClear);
                break;
            }
        }

        if (extinguisherSpray != null && extinguisherRoot != null)
            sprayLocalOffset = extinguisherRoot.InverseTransformPoint(
                extinguisherSpray.transform.position);

        Transform fire = placedCube.transform.Find("FireEffect");
        if (fire != null)
            fire.localPosition = new Vector3(0f, 0.03f, 0f);
        fireSpread = placedCube.AddComponent<FireSpreadController>();
        Vector2 measuredFloor = placedFloor != null ? placedFloor.size : new Vector2(4f, 4f);
        Vector2 footprint = new Vector2(Mathf.Max(4f, measuredFloor.x), Mathf.Max(4f, measuredFloor.y));
        fireSpread.Initialize(fire != null ? fire.GetComponent<ParticleSystem>() : null, footprint);

        nextWallSearch = Time.unscaledTime;
        wallObjectsPlaced = false;
        usingWallFallback = false;
        if (exitRoot != null) exitRoot.gameObject.SetActive(false);
        if (extinguisherRoot != null) extinguisherRoot.gameObject.SetActive(false);
        if (assemblyRoot != null) assemblyRoot.gameObject.SetActive(false);

        TryPlaceWallObjects(true);
        startTime = Time.unscaledTime;
        SetInstruction("find_exit");
    }

    private void HidePlaneVisuals()
    {
        foreach (ARPlane plane in planeManager.trackables)
        {
            ARPlaneMeshVisualizer visualizer = plane.GetComponent<ARPlaneMeshVisualizer>();
            if (visualizer != null)
                visualizer.enabled = false;
            foreach (Renderer renderer in plane.GetComponentsInChildren<Renderer>(true))
                renderer.enabled = false;
        }
    }

    private void TryPlaceWallObjects(bool allowFallback)
    {
        if (extinguisherRoot == null || exitRoot == null)
            return;

        List<ARPlane> walls = new List<ARPlane>();
        if (planeManager != null)
            foreach (ARPlane plane in planeManager.trackables)
                if (plane.alignment == PlaneAlignment.Vertical && plane.size.x >= 0.25f)
                    walls.Add(plane);

        if (walls.Count == 0 && !allowFallback)
            return;

        walls.Sort((a, b) => b.size.sqrMagnitude.CompareTo(a.size.sqrMagnitude));
        Vector3 firePosition = placedCube.transform.position;
        if (walls.Count > 0)
        {
            PlaceOnWall(extinguisherRoot, walls[0], floorY + 1.05f, 0.06f, firePosition);
            ARPlane exitWall = walls.Count > 1 ? walls[1] : walls[0];
            float doorOffset = walls.Count == 1
                ? Mathf.Clamp(exitWall.size.x * 0.35f, 1.8f, 3.0f) : 0f;
            PlaceOnWall(exitRoot, exitWall, floorY + 1.05f, 0.07f, firePosition, doorOffset);
            usingWallFallback = false;
        }
        else
        {
            if (wallObjectsPlaced && usingWallFallback)
                return;
            Vector3 right = placedCube.transform.right;
            Vector3 forward = placedCube.transform.forward;
            PlaceFacingPoint(extinguisherRoot,
                firePosition - right * fallbackWallDistance + forward * 0.9f + Vector3.up * 1.05f,
                firePosition);
            PlaceFacingPoint(exitRoot,
                firePosition + right * fallbackWallDistance + forward * 1.4f + Vector3.up * 1.05f,
                firePosition);
            usingWallFallback = true;
        }

        extinguisherRoot.gameObject.SetActive(true);
        exitRoot.gameObject.SetActive(true);
        if (assemblyRoot != null)
        {
            Vector3 away = Vector3.ProjectOnPlane(exitRoot.position - firePosition, Vector3.up).normalized;
            if (away.sqrMagnitude < 0.01f) away = placedCube.transform.forward;
            assemblyRoot.position = new Vector3(exitRoot.position.x, floorY + 0.025f, exitRoot.position.z) + away * 2.8f;
            assemblyRoot.rotation = Quaternion.LookRotation(-away, Vector3.up);
            AttachAssemblyLocationMarker();
            assemblyRoot.gameObject.SetActive(true);
        }
        wallObjectsPlaced = true;
        if (!usingWallFallback)
            SetInstruction("find_exit");
    }

    private static void PlaceOnWall(Transform target, ARPlane wall, float desiredY,
        float normalOffset, Vector3 roomReference, float lateralOffset = 0f)
    {
        Vector3 center = wall.transform.TransformPoint(new Vector3(wall.center.x, 0f, wall.center.y));
        Vector3 normal = wall.transform.up;
        if (Vector3.Dot(normal, roomReference - center) < 0f)
            normal = -normal;
        Vector3 lateral = wall.transform.right;
        Vector3 position = center + normal * normalOffset + lateral * lateralOffset;
        position.y = desiredY;
        target.position = position;
        target.rotation = Quaternion.LookRotation(normal, Vector3.up);
    }

    private static void PlaceFacingPoint(Transform target, Vector3 position, Vector3 lookAt)
    {
        target.position = position;
        Vector3 direction = Vector3.ProjectOnPlane(lookAt - position, Vector3.up);
        target.rotation = Quaternion.LookRotation(direction.normalized, Vector3.up);
    }

    private static void EnsureTouchTarget(Transform target, string name, Vector3 worldSize)
    {
        if (target == null || target.Find(name) != null)
            return;

        GameObject zone = new GameObject(name);
        zone.transform.SetParent(target, false);
        zone.transform.localPosition = Vector3.zero;
        Vector3 scale = target.lossyScale;
        zone.transform.localScale = new Vector3(
            1f / Mathf.Max(Mathf.Abs(scale.x), 0.001f),
            1f / Mathf.Max(Mathf.Abs(scale.y), 0.001f),
            1f / Mathf.Max(Mathf.Abs(scale.z), 0.001f));
        BoxCollider collider = zone.AddComponent<BoxCollider>();
        collider.size = worldSize;
        collider.isTrigger = true;
    }

    private void AttachVisualToTarget(string visualName, Transform target)
    {
        if (placedCube == null || target == null)
            return;
        Transform visual = placedCube.transform.Find(visualName);
        if (visual != null && visual.parent != target)
            visual.SetParent(target, true);
    }

    private static void FitVisualHeight(Transform visual, float desiredHeight)
    {
        if (visual == null) return;
        Renderer[] renderers = visual.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length == 0) return;
        Bounds bounds = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        if (bounds.size.y < 0.001f) return;
        visual.localScale *= desiredHeight / bounds.size.y;
    }

    private void AttachAssemblyLocationMarker()
    {
        if (assemblyRoot == null || assemblyRoot.Find("AssemblyLocationVisual") != null)
            return;
        GameObject platform = AttachAssemblyAsset("GasTraining/RoundPlatform",
            "RoundAssemblyPlatform", 1.8f, floorY, new Vector3(0f, 180f, 0f));
        float markerBottom = floorY;
        if (platform != null)
        {
            Renderer platformRenderer = platform.GetComponentInChildren<Renderer>();
            if (platformRenderer != null) markerBottom = platformRenderer.bounds.max.y;
        }
        AttachAssemblyAsset("GasTraining/AssemblyLocation", "AssemblyLocationVisual",
            1.1f, markerBottom, new Vector3(90f, 180f, 0f));
        Renderer markerRenderer = assemblyRoot.GetComponent<Renderer>();
        if (markerRenderer != null) markerRenderer.enabled = false;
    }

    private GameObject AttachAssemblyAsset(string resourcePath, string objectName,
        float targetSize, float bottomY, Vector3 eulerAngles)
    {
        GameObject prefab = Resources.Load<GameObject>(resourcePath);
        if (prefab == null) return null;

        GameObject visual = Instantiate(prefab, assemblyRoot);
        visual.name = objectName;
        visual.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.Euler(eulerAngles));
        GasTrainingMaterialUtility.Apply(visual, resourcePath);
        Renderer[] renderers = visual.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length == 0)
        {
            Destroy(visual);
            return null;
        }
        Bounds bounds = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        float sourceSize = Mathf.Max(bounds.size.x, Mathf.Max(bounds.size.y, bounds.size.z));
        Vector3 parentScale = assemblyRoot.lossyScale;
        float factor = targetSize / Mathf.Max(sourceSize, 0.001f);
        visual.transform.localScale = Vector3.Scale(visual.transform.localScale,
            new Vector3(factor / Mathf.Max(Mathf.Abs(parentScale.x), 0.001f),
                factor / Mathf.Max(Mathf.Abs(parentScale.y), 0.001f),
                factor / Mathf.Max(Mathf.Abs(parentScale.z), 0.001f)));

        bounds = renderers[0].bounds;
        for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        visual.transform.position += Vector3.up * (bottomY - bounds.min.y);
        foreach (Collider collider in visual.GetComponentsInChildren<Collider>(true))
            collider.enabled = false;
        return visual;
    }

    private void CheckTrainingTap(Vector2 tapPosition)
    {
        Camera camera = arCamera != null ? arCamera : Camera.main;
        if (camera == null)
            return;

        Ray ray = camera.ScreenPointToRay(tapPosition);

        string selectedObject = FindScenarioTarget(ray, tapPosition, camera);
        Transform expectedTarget = exitSelected ? extinguisherRoot : exitRoot;
        string expectedName = exitSelected ? "ExtinguisherPlaceholder" : "ExitMarker";
        if (IsScreenTargetHit(expectedTarget, tapPosition, camera, 0.30f))
            selectedObject = expectedName;

        bool isTrainingObject =
            selectedObject == "ExitMarker" ||
            selectedObject == "ExtinguisherPlaceholder" ||
            selectedObject == "FirePlaceholder";

        if (!isTrainingObject)
            return;

        if (!exitSelected)
        {
            if (selectedObject == "ExitMarker")
            {
                exitSelected = true;
                score += 50;
                if (progress != null)
                    progress.RecordAction("exit_identified", true);

                SetInstruction("exit_found", score);
            }
            else
            {
                incorrectSelections++;
                if (progress != null)
                    progress.RecordAction("wrong_exit", false);
                SetInstruction("exit_first");
            }

            return;
        }

        if (selectedObject == "ExtinguisherPlaceholder")
        {
            extinguisherSelected = true;
            score += 50;
            if (progress != null)
                progress.RecordAction("extinguisher_selected", true);
            CompleteTraining();
        }
        else
        {
            incorrectSelections++;
            if (progress != null)
                progress.RecordAction("wrong_extinguisher", false);
            SetInstruction("find_extinguisher");
        }
    }

    private void CompleteTraining()
    {
        float elapsedSeconds = Time.unscaledTime - startTime;

        TrainingResultStorage.Save(
            score, incorrectSelections, elapsedSeconds);

        if (aimTarget != null)
            aimTarget.SetActive(true);

        if (aimTarget != null && extinguisherSpray != null &&
            fireSpread != null && fireSpread.IsReady)
        {
            SetSprayButton(false);
            SetInstruction("find_aim");
        }
        else
        {
            SetInstruction("missing_effect");
        }
    }

    private void CheckAimTap(Vector2 tapPosition)
    {
        Camera camera = arCamera != null ? arCamera : Camera.main;
        if (camera == null || aimTarget == null)
            return;

        Ray ray = camera.ScreenPointToRay(tapPosition);
        string tapped = FindScenarioTarget(ray, tapPosition, camera);
        bool targetLocked = tapped == "AimTarget" || tapped == "FirePlaceholder" ||
                            IsScreenTargetHit(aimTarget.transform, tapPosition, camera, 0.36f) ||
                            IsScreenTargetHit(fireRoot, tapPosition, camera, 0.36f);

        if (!targetLocked)
        {
            if (progress != null)
                progress.RecordAction("wrong_aim", false);
            SetInstruction("aim_retry");
            return;
        }

        aimSelected = true;
        if (progress != null)
            progress.RecordAction("aim_selected", true);
        aimTarget.SetActive(false);
        SetSprayButton(extinguisherSpray != null);
        SetInstruction("aim_done");
    }

    public void BeginSpray()
    {
        if (!CanPracticeSpray ||
            (evacuation != null && evacuation.IsActive) ||
            sprayActive)
            return;

        sprayActive = true;
        sprayStartedAt = Time.unscaledTime;
        lastFirePercent = -1;
        HideResults();
        SetInstruction("spray_progress", fireSpread.RemainingPercent);
        if (extinguisherRoot != null)
        {
            fireSpread.SetSuppressionPoint(extinguisherRoot.position);
            if (extinguisherSpray != null)
            {
                extinguisherSpray.transform.position =
                    extinguisherRoot.TransformPoint(sprayLocalOffset);
                Vector3 initialAim = Vector3.ProjectOnPlane(
                    placedCube.transform.position - extinguisherRoot.position, Vector3.up);
                if (initialAim.sqrMagnitude > 0.01f)
                    extinguisherSpray.transform.rotation =
                        Quaternion.LookRotation(initialAim.normalized, Vector3.up);
            }
        }
        fireSpread.BeginSuppressing();
        extinguisherSpray.Play(true);
    }

    public void UpdateExtinguisherDrag(Vector2 screenPosition)
    {
        if (!sprayActive || extinguisherRoot == null || fireSpread == null)
            return;

        Camera camera = arCamera != null ? arCamera : Camera.main;
        if (camera == null)
            return;
        Ray ray = camera.ScreenPointToRay(screenPosition);
        Plane floor = new Plane(Vector3.up, new Vector3(0f, floorY, 0f));
        if (!floor.Raycast(ray, out float distance))
            return;

        Vector3 point = ray.GetPoint(distance);
        Vector3 fromFire = Vector3.ProjectOnPlane(point - placedCube.transform.position, Vector3.up);
        float maxRadius = placedFloor != null
            ? Mathf.Clamp(Mathf.Min(placedFloor.size.x, placedFloor.size.y) * 0.48f, 0.75f, 2.5f)
            : 2f;
        if (fromFire.magnitude > maxRadius)
            point = placedCube.transform.position + fromFire.normalized * maxRadius;
        point.y = floorY + 0.15f;
        extinguisherRoot.position = point;
        Vector3 aimDirection = Vector3.ProjectOnPlane(placedCube.transform.position - point, Vector3.up);
        if (aimDirection.sqrMagnitude > 0.01f)
            extinguisherRoot.rotation = Quaternion.LookRotation(aimDirection.normalized, Vector3.up);

        if (extinguisherSpray != null)
        {
            extinguisherSpray.transform.position = extinguisherRoot.TransformPoint(sprayLocalOffset);
            extinguisherSpray.transform.rotation = Quaternion.LookRotation(aimDirection.normalized, Vector3.up);
        }
        fireSpread.SetSuppressionPoint(point);
    }

    public void EndSpray()
    {
        if (!sprayActive)
            return;

        float duration = Time.unscaledTime - sprayStartedAt;
        bool extinguished = duration >= 2f && fireSpread != null &&
                            fireSpread.IsSpreadComplete &&
                            fireSpread.RemainingPercent <= 4;
        if (extinguished)
            fireSpread.ExtinguishCompletely();
        CancelSpray();

        if (extinguished)
        {
            if (!sprayPracticeComplete && progress != null)
                progress.RecordAction("spray_completed", true);
            sprayPracticeComplete = true;
            SetInstruction("spray_done");
        }
        else if (duration < 2f)
            SetInstruction("spray_hold");
        else
            SetInstruction("spray_move", fireSpread != null ? fireSpread.RemainingPercent : 100);
    }

    private string FindScenarioTarget(Ray ray, Vector2 tapPosition, Camera camera)
    {
        if (placedCube == null)
            return null;

        // The imported meshes may carry colliders in front of the original tap
        // targets. Inspect every hit so visuals cannot make the lesson untappable.
        RaycastHit[] rayHits = Physics.RaycastAll(ray);
        System.Array.Sort(rayHits, (a, b) => a.distance.CompareTo(b.distance));
        foreach (RaycastHit hit in rayHits)
        {
            if (!hit.transform.IsChildOf(placedCube.transform))
                continue;

            Transform current = hit.transform;
            while (current != placedCube.transform)
            {
                switch (current.name)
                {
                    case "ExitMarker":
                    case "ExitDoorVisual":
                    case "ExitSignVisual":
                        return "ExitMarker";
                    case "ExtinguisherPlaceholder":
                    case "ExtinguisherVisual":
                        return "ExtinguisherPlaceholder";
                    case "FirePlaceholder":
                    case "FireEffect":
                        return "FirePlaceholder";
                    case "AimTarget":
                        return "AimTarget";
                }
                current = current.parent;
            }
        }

        // Imported meshes often have tiny scaled colliders. If physics misses,
        // accept the closest visible training target in a generous phone-sized
        // screen radius. This also remains stable while an AR wall anchor moves.
        float radius = Mathf.Clamp(Screen.width * 0.13f, 90f, 180f);
        string closest = null;
        float closestDistance = radius;
        ConsiderScreenTarget(exitRoot, "ExitMarker", tapPosition, camera,
            ref closest, ref closestDistance);
        ConsiderScreenTarget(extinguisherRoot, "ExtinguisherPlaceholder", tapPosition, camera,
            ref closest, ref closestDistance);
        ConsiderScreenTarget(fireRoot, "FirePlaceholder", tapPosition, camera,
            ref closest, ref closestDistance);
        if (aimTarget != null)
            ConsiderScreenTarget(aimTarget.transform, "AimTarget", tapPosition, camera,
                ref closest, ref closestDistance);
        return closest;
    }

    private static void ConsiderScreenTarget(Transform target, string result,
        Vector2 tapPosition, Camera camera, ref string closest, ref float closestDistance)
    {
        if (target == null || !target.gameObject.activeInHierarchy)
            return;

        Vector3 center = target.position;
        Renderer[] renderers = target.GetComponentsInChildren<Renderer>();
        if (renderers.Length > 0)
        {
            Bounds bounds = renderers[0].bounds;
            for (int index = 1; index < renderers.Length; index++)
                bounds.Encapsulate(renderers[index].bounds);
            center = bounds.center;
        }

        Vector3 screen = camera.WorldToScreenPoint(center);
        if (screen.z <= 0f)
            return;
        float distance = Vector2.Distance(tapPosition, new Vector2(screen.x, screen.y));
        if (distance < closestDistance)
        {
            closestDistance = distance;
            closest = result;
        }
    }

    private static bool IsScreenTargetHit(Transform target, Vector2 tapPosition,
        Camera camera, float screenWidthFraction)
    {
        if (target == null || !target.gameObject.activeInHierarchy)
            return false;

        Vector3 center = target.position;
        Renderer[] renderers = target.GetComponentsInChildren<Renderer>();
        if (renderers.Length > 0)
        {
            Bounds bounds = renderers[0].bounds;
            for (int index = 1; index < renderers.Length; index++)
                bounds.Encapsulate(renderers[index].bounds);
            center = bounds.center;
        }
        Vector3 screen = camera.WorldToScreenPoint(center);
        if (screen.z <= 0f)
            return false;
        float radius = Mathf.Clamp(Screen.width * screenWidthFraction, 160f, 360f);
        return Vector2.Distance(tapPosition, new Vector2(screen.x, screen.y)) <= radius;
    }

    public void CancelSpray()
    {
        sprayActive = false;

        if (fireSpread != null)
            fireSpread.EndSuppressing();

        if (extinguisherSpray != null)
            extinguisherSpray.Stop(
                true,
                ParticleSystemStopBehavior.StopEmittingAndClear);
    }

    public void RestartTraining()
    {
        CancelSpray();

        if (placedCube != null)
        {
            Destroy(placedCube);
            placedCube = null;
        }

        extinguisherSpray = null;
        fireSpread = null;
        placedFloor = null;
        extinguisherRoot = null;
        exitRoot = null;
        assemblyRoot = null;
        fireRoot = null;
        wallObjectsPlaced = false;
        usingWallFallback = false;
        aimTarget = null;
        exitSelected = false;
        extinguisherSelected = false;
        aimSelected = false;
        sprayPracticeComplete = false;
        sprayStartedAt = 0f;
        lastFirePercent = -1;
        score = 0;
        incorrectSelections = 0;
        startTime = 0f;

        uiHits.Clear();

        SetSprayButton(false);
        HideResults();
        ShowStartingInstruction();
    }

    public void ViewLastResult()
    {
        if (resultsText == null)
            return;

        if (resultsText.gameObject.activeSelf)
        {
            resultsText.gameObject.SetActive(false);
            return;
        }

        TrainingResult result = TrainingResultStorage.LoadLatest();

        if (result == null)
        {
            resultsText.text =
                "No saved result yet.\nComplete the exercise first.";
        }
        else
        {
            resultsText.text =
                "Last Saved Identification Result\n" +
                $"Score: {result.score}/100\n" +
                $"Time: {result.durationSeconds:F1} seconds\n" +
                $"Incorrect selections: {result.incorrectSelections}";
        }

        resultsText.gameObject.SetActive(true);
    }

    private void SetSprayButton(bool enabled)
    {
        if (practiceSprayButton != null)
            practiceSprayButton.interactable = enabled;
    }

    private void HideResults()
    {
        if (resultsText != null)
            resultsText.gameObject.SetActive(false);
    }

    private void ShowStartingInstruction()
    {
        SetInstruction("place");
    }

    private void SetInstruction(string key, params object[] args)
    {
        if (instructionText != null)
            instructionText.text = string.Format(FireText.Get(key), args);
    }
}
