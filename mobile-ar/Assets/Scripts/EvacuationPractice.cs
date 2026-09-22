using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;

public class EvacuationPractice : MonoBehaviour
{
    public bool EvacuationComplete => evacuationComplete;
    public bool IsActive => active;
    public bool ExitReached => exitReached;

    [SerializeField] private TapToPlace training;
    [SerializeField] private Camera arCamera;
    [SerializeField] private TMP_Text instructionText;
    [SerializeField] private TMP_Text resultsText;

    [SerializeField] private Button startEvacuationButton;
    [SerializeField] private Button practiceSprayButton;
    [SerializeField] private Button viewLastResultButton;

    private GameObject scenario;
    private FireModuleProgress progress;
    private bool active;
    private bool exitReached;
    private bool evacuationComplete;
    private int incorrectSelections;
    private float startTime;
    private Transform exitTarget;
    private Transform assemblyTarget;

    private readonly List<RaycastResult> uiHits = new();

    private void Awake()
    {
        progress = GetComponent<FireModuleProgress>();
    }

    private void Update()
    {
        if (training == null)
            return;

        // Reset this exercise when the main scenario changes.
        if (scenario != training.CurrentScenario)
        {
            scenario = training.CurrentScenario;
            active = false;
            exitReached = false;
            evacuationComplete = false;
            incorrectSelections = 0;
            exitTarget = scenario != null ? scenario.transform.Find("ExitMarker") : null;
            assemblyTarget = scenario != null ? scenario.transform.Find("AssemblyPoint") : null;

            if (viewLastResultButton != null)
                viewLastResultButton.interactable = true;
        }

        bool ready =
            scenario != null &&
            training.SprayPracticeComplete &&
            !training.IsSprayPlaying;

        if (startEvacuationButton != null)
            startEvacuationButton.interactable = ready && !active && !evacuationComplete;

        if (practiceSprayButton != null && active)
            practiceSprayButton.interactable = false;

        if (!active)
            return;

        Vector2 position;
        if (Touchscreen.current != null &&
            Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
            position = Touchscreen.current.primaryTouch.position.ReadValue();
        else if (Mouse.current != null &&
                 Mouse.current.leftButton.wasPressedThisFrame)
            position = Mouse.current.position.ReadValue();
        else
            return;

        if (IsOverUI(position))
            return;

        CheckSelection(position);
    }

    public void BeginEvacuation()
    {
        if (training == null ||
            training.CurrentScenario == null ||
            !training.SprayPracticeComplete ||
            training.IsSprayPlaying ||
            active || evacuationComplete)
            return;

        scenario = training.CurrentScenario;
        active = true;
        exitReached = false;
        evacuationComplete = false;
        incorrectSelections = 0;
        startTime = Time.unscaledTime;
        if (progress != null)
            progress.RecordAction("evacuation_started", true);

        if (resultsText != null && GetComponent<FireTrainingUIController>() == null)
            resultsText.gameObject.SetActive(false);

        if (practiceSprayButton != null)
            practiceSprayButton.interactable = false;

        if (viewLastResultButton != null)
            viewLastResultButton.interactable = false;

        SetInstruction("evac_start");
    }

    private void CheckSelection(Vector2 position)
    {
        Camera camera = arCamera != null ? arCamera : Camera.main;
        if (camera == null || scenario == null)
            return;

        Ray ray = camera.ScreenPointToRay(position);

        string selected = FindScenarioTarget(ray);
        Transform expected = exitReached ? assemblyTarget : exitTarget;
        if (IsScreenTargetHit(expected, position, camera, 0.32f))
            selected = exitReached ? "AssemblyPoint" : "ExitMarker";

        bool isTarget =
            selected == "ExitMarker" ||
            selected == "AssemblyPoint" ||
            selected == "ExtinguisherPlaceholder" ||
            selected == "FirePlaceholder";

        if (!isTarget)
            return;

        if (!exitReached)
        {
            if (selected == "ExitMarker")
            {
                exitReached = true;
                if (progress != null)
                    progress.RecordAction("evac_exit", true);

                SetInstruction("evac_assembly");
            }
            else
            {
                incorrectSelections++;
                if (progress != null)
                    progress.RecordAction("wrong_evac_exit", false);

                SetInstruction("evac_exit_retry");
            }

            return;
        }

        if (selected == "AssemblyPoint")
        {
            CompleteEvacuation();
        }
        else
        {
            incorrectSelections++;
            if (progress != null)
                progress.RecordAction("wrong_assembly", false);

            SetInstruction("evac_assembly_retry");
        }
    }

    private string FindScenarioTarget(Ray ray)
    {
        RaycastHit[] rayHits = Physics.RaycastAll(ray);
        System.Array.Sort(rayHits, (a, b) => a.distance.CompareTo(b.distance));
        foreach (RaycastHit hit in rayHits)
        {
            if (!hit.transform.IsChildOf(scenario.transform))
                continue;

            Transform current = hit.transform;
            while (current != scenario.transform)
            {
                switch (current.name)
                {
                    case "ExitMarker":
                    case "ExitDoorVisual":
                    case "ExitSignVisual":
                        return "ExitMarker";
                    case "AssemblyPoint":
                        return "AssemblyPoint";
                    case "ExtinguisherPlaceholder":
                    case "ExtinguisherVisual":
                        return "ExtinguisherPlaceholder";
                    case "FirePlaceholder":
                    case "FireEffect":
                        return "FirePlaceholder";
                }
                current = current.parent;
            }
        }
        return null;
    }

    private static bool IsScreenTargetHit(Transform target, Vector2 tapPosition,
        Camera camera, float widthFraction)
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
        float radius = Mathf.Clamp(Screen.width * widthFraction, 170f, 380f);
        return Vector2.Distance(tapPosition, new Vector2(screen.x, screen.y)) <= radius;
    }

    private void CompleteEvacuation()
    {
        active = false;
        evacuationComplete = true;
        if (progress != null)
            progress.RecordAction("assembly_reached", true);

        float seconds = Time.unscaledTime - startTime;

        EvacuationResultStorage.Save(
            seconds, incorrectSelections);

        string summary =
            "Evacuation Sequence Complete\n" +
            "Exit → Assembly point\n" +
            $"Time: {seconds:F1} seconds\n" +
            $"Incorrect selections: {incorrectSelections}";

        if (resultsText != null)
        {
            resultsText.text = summary;
            resultsText.gameObject.SetActive(true);

            SetInstruction("evac_done");
        }
        else
        {
            SetInstruction(summary);
        }

        if (practiceSprayButton != null)
            practiceSprayButton.interactable = training != null && training.CanPracticeSpray;

        if (viewLastResultButton != null)
            viewLastResultButton.interactable = true;
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

    private void SetInstruction(string message)
    {
        if (instructionText != null)
            instructionText.text = FireText.Get(message);
    }

    public void ViewSavedEvacuationResult()
{
    // Avoid covering the instructions during an active exercise.
    if (active || resultsText == null)
        return;

    if (resultsText.gameObject.activeSelf)
    {
        resultsText.gameObject.SetActive(false);
        return;
    }

    EvacuationResult result =
        EvacuationResultStorage.LoadLatest();

    if (result == null)
    {
        resultsText.text =
            "No saved evacuation result yet.\n" +
            "Complete evacuation practice first.";
    }
    else
    {
        resultsText.text =
            "Last Saved Evacuation Result\n" +
            $"Time: {result.durationSeconds:F1} seconds\n" +
            $"Incorrect selections: {result.incorrectSelections}";
    }

    resultsText.gameObject.SetActive(true);
}
}
