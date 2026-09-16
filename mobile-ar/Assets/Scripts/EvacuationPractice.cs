using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;

public class EvacuationPractice : MonoBehaviour
{
    [SerializeField] private TapToPlace training;
    [SerializeField] private Camera arCamera;
    [SerializeField] private TMP_Text instructionText;
    [SerializeField] private TMP_Text resultsText;

    [SerializeField] private Button startEvacuationButton;
    [SerializeField] private Button practiceSprayButton;
    [SerializeField] private Button viewLastResultButton;

    private GameObject scenario;
    private bool active;
    private bool exitReached;
    private int incorrectSelections;
    private float startTime;

    private readonly List<RaycastResult> uiHits = new();

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
            incorrectSelections = 0;

            if (viewLastResultButton != null)
                viewLastResultButton.interactable = true;
        }

        bool ready =
            scenario != null &&
            training.IdentificationComplete &&
            !training.IsSprayPlaying;

        if (startEvacuationButton != null)
            startEvacuationButton.interactable = ready && !active;

        if (practiceSprayButton != null && active)
            practiceSprayButton.interactable = false;

        if (!active)
            return;

        var screen = Touchscreen.current;

        if (screen == null ||
            !screen.primaryTouch.press.wasPressedThisFrame)
            return;

        Vector2 position =
            screen.primaryTouch.position.ReadValue();

        if (IsOverUI(position))
            return;

        CheckSelection(position);
    }

    public void BeginEvacuation()
    {
        if (training == null ||
            training.CurrentScenario == null ||
            !training.IdentificationComplete ||
            training.IsSprayPlaying ||
            active)
            return;

        scenario = training.CurrentScenario;
        active = true;
        exitReached = false;
        incorrectSelections = 0;
        startTime = Time.unscaledTime;

        if (resultsText != null)
            resultsText.gameObject.SetActive(false);

        if (practiceSprayButton != null)
            practiceSprayButton.interactable = false;

        if (viewLastResultButton != null)
            viewLastResultButton.interactable = false;

        SetInstruction(
            "Evacuation practice: tap the green exit marker.");
    }

    private void CheckSelection(Vector2 position)
    {
        if (arCamera == null || scenario == null)
            return;

        Ray ray = arCamera.ScreenPointToRay(position);

        if (!Physics.Raycast(ray, out RaycastHit hit))
            return;

        if (!hit.transform.IsChildOf(scenario.transform))
            return;

        string selected = hit.collider.gameObject.name;

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

                SetInstruction(
                    "Exit selected. Now tap the blue assembly point.");
            }
            else
            {
                incorrectSelections++;

                SetInstruction(
                    "Select the green exit marker first.");
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

            SetInstruction(
                "Now select the blue assembly point.");
        }
    }

    private void CompleteEvacuation()
    {
        active = false;

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

            SetInstruction(
                "Sequence complete. You can repeat the practice.");
        }
        else
        {
            SetInstruction(summary);
        }

        if (practiceSprayButton != null)
            practiceSprayButton.interactable = true;

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
            instructionText.text = message;
    }

    public void ViewSavedEvacuationResult()
{
    // Avoid covering the instructions during an active exercise.
    if (active || resultsText == null)
        return;

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
