using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

[RequireComponent(typeof(ARRaycastManager))]
public class TapToPlace : MonoBehaviour
{
    public GameObject CurrentScenario => placedCube;
    public bool IdentificationComplete => extinguisherSelected;
    public bool IsSprayPlaying => sprayRoutine != null;

    
    [SerializeField] private GameObject cubePrefab;
    [SerializeField] private TMP_Text instructionText;
    [SerializeField] private TMP_Text resultsText;
    [SerializeField] private Camera arCamera;
    [SerializeField] private Button practiceSprayButton;

    private ARRaycastManager raycastManager;
    private GameObject placedCube;
    private ParticleSystem extinguisherSpray;
    private Coroutine sprayRoutine;

    private bool exitSelected;
    private bool extinguisherSelected;
    private int score;
    private int incorrectSelections;
    private float startTime;

    private readonly List<ARRaycastHit> hits = new();
    private readonly List<RaycastResult> uiHits = new();

    private void Awake()
    {
        raycastManager = GetComponent<ARRaycastManager>();
    }

    private void Start()
    {
        HideResults();
        SetSprayButton(false);
        ShowStartingInstruction();
    }

    private void Update()
    {
        var screen = Touchscreen.current;

        if (screen == null)
            return;

        if (!screen.primaryTouch.press.wasPressedThisFrame)
            return;

        Vector2 tapPosition =
            screen.primaryTouch.position.ReadValue();

        if (IsOverUI(tapPosition))
            return;

        if (placedCube == null)
        {
            PlaceScenario(tapPosition);
            return;
        }

        if (!extinguisherSelected)
            CheckTrainingTap(tapPosition);
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

    private void PlaceScenario(Vector2 tapPosition)
    {
        if (cubePrefab == null)
            return;

        if (!raycastManager.Raycast(
                tapPosition, hits, TrackableType.PlaneWithinPolygon))
            return;

        Pose pose = hits[0].pose;

        placedCube = Instantiate(
            cubePrefab, pose.position, pose.rotation);

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

        startTime = Time.unscaledTime;

        SetInstruction(
            "Training area placed. Tap the green exit marker.");
    }

    private void CheckTrainingTap(Vector2 tapPosition)
    {
        if (arCamera == null)
            return;

        Ray ray = arCamera.ScreenPointToRay(tapPosition);

        if (!Physics.Raycast(ray, out RaycastHit hit))
            return;

        if (!hit.transform.IsChildOf(placedCube.transform))
            return;

        string selectedObject = hit.collider.gameObject.name;

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

                SetInstruction(
                    $"Exit identified! Score: {score}/100\n" +
                    "Now tap the red extinguisher.");
            }
            else
            {
                incorrectSelections++;
                SetInstruction(
                    "First, locate and tap the green exit marker.");
            }

            return;
        }

        if (selectedObject == "ExtinguisherPlaceholder")
        {
            extinguisherSelected = true;
            score += 50;
            CompleteTraining();
        }
        else
        {
            incorrectSelections++;
            SetInstruction(
                "Locate and tap the red extinguisher.");
        }
    }

    private void CompleteTraining()
    {
        float elapsedSeconds = Time.unscaledTime - startTime;

        TrainingResultStorage.Save(
            score, incorrectSelections, elapsedSeconds);

        string summary =
            "Identification Exercise Complete\n" +
            $"Score: {score}/100\n" +
            $"Time: {elapsedSeconds:F1} seconds\n" +
            $"Incorrect selections: {incorrectSelections}";

        if (resultsText != null)
        {
            resultsText.text = summary;
            resultsText.gameObject.SetActive(true);
        }

        if (extinguisherSpray != null)
        {
            SetSprayButton(true);
            SetInstruction(
                "Identification complete. Tap Practice Spray " +
                "to preview the effect.");
        }
        else
        {
            SetInstruction(
                "Identification complete. Spray effect is missing.");
        }
    }

    public void PracticeSpray()
    {
        if (!extinguisherSelected ||
            extinguisherSpray == null ||
            sprayRoutine != null)
            return;

        sprayRoutine = StartCoroutine(PlaySprayPreview());
    }

    private IEnumerator PlaySprayPreview()
    {
        SetSprayButton(false);
        HideResults();

        SetInstruction("Spray preview playing...");
        extinguisherSpray.Play(true);

        yield return new WaitForSeconds(2f);

        if (extinguisherSpray != null)
        {
            extinguisherSpray.Stop(
                true,
                ParticleSystemStopBehavior.StopEmitting);
        }

        SetInstruction(
            "Preview complete. You can repeat it or restart training.");

        sprayRoutine = null;
        SetSprayButton(true);
    }

    public void RestartTraining()
    {
        if (sprayRoutine != null)
        {
            StopCoroutine(sprayRoutine);
            sprayRoutine = null;
        }

        if (placedCube != null)
        {
            Destroy(placedCube);
            placedCube = null;
        }

        extinguisherSpray = null;
        exitSelected = false;
        extinguisherSelected = false;
        score = 0;
        incorrectSelections = 0;
        startTime = 0f;

        hits.Clear();
        uiHits.Clear();

        SetSprayButton(false);
        HideResults();
        ShowStartingInstruction();
    }

    public void ViewLastResult()
    {
        if (resultsText == null)
            return;

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
        SetInstruction(
            "Scan the floor, then tap a detected surface " +
            "to place the training area.");
    }

    private void SetInstruction(string message)
    {
        if (instructionText != null)
            instructionText.text = message;
    }
}