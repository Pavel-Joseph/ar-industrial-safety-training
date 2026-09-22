using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class FireModuleProgress : MonoBehaviour
{
    [SerializeField] private TMP_Text progressText;
    [SerializeField] private TMP_Text resultsText;

    private TapToPlace training;
    private EvacuationPractice evacuation;
    private GameObject observedScenario;
    private bool savedForCurrentScenario;
    private string previousDisplay;
    private Image resultsBackground;
    private Button viewFireRunButton;
    private Button viewEvacuationResultButton;
    private Button viewLastResultButton;
    private Button startEvacuationButton;
    private Button practiceSprayButton;
    private Button restartButton;
    private readonly List<FireActionEvent> actions = new List<FireActionEvent>();
    private string attemptId;
    private float attemptStartedAt;
    private DateTime attemptStartedUtc;
    private bool modernUI;

    private void Awake()
    {
        training = GetComponent<TapToPlace>();
        evacuation = GetComponent<EvacuationPractice>();
        StyleInterface();
        if (GetComponent<FireTrainingUIController>() == null)
            gameObject.AddComponent<FireTrainingUIController>();
        modernUI = true;
    }

    public void BeginAttempt(GameObject scenario)
    {
        observedScenario = scenario;
        savedForCurrentScenario = false;
        attemptId = Guid.NewGuid().ToString();
        attemptStartedAt = Time.unscaledTime;
        attemptStartedUtc = DateTime.UtcNow;
        actions.Clear();
        RecordAction("scenario_placed", true);
    }

    public void RecordAction(string key, bool correct)
    {
        if (string.IsNullOrEmpty(attemptId))
            return;

        actions.Add(new FireActionEvent
        {
            key = key,
            correct = correct,
            elapsedSeconds = Mathf.Max(0, Time.unscaledTime - attemptStartedAt)
        });
    }

    private void Update()
    {
        if (training == null || evacuation == null)
            return;

        if (observedScenario != training.CurrentScenario ||
            (training.CurrentScenario == null && savedForCurrentScenario))
        {
            observedScenario = training.CurrentScenario;
            savedForCurrentScenario = false;
            if (observedScenario == null)
            {
                attemptId = null;
                actions.Clear();
            }
        }

        bool identified = training.IdentificationComplete;
        bool sprayed = training.SprayPracticeComplete;
        bool evacuated = evacuation.EvacuationComplete;

        int completed = (identified ? 1 : 0) +
                        (sprayed ? 1 : 0) +
                        (evacuated ? 1 : 0);
        if (!modernUI)
        {
            SetButtonVisible(viewFireRunButton, observedScenario == null || completed == 3);
            SetButtonVisible(viewEvacuationResultButton, false);
            SetButtonVisible(viewLastResultButton, false);
            SetButtonVisible(practiceSprayButton, identified && !sprayed);
            SetButtonVisible(startEvacuationButton, sprayed && !evacuated);
            SetButtonVisible(restartButton, true);
        }

        if (completed == 3 && !savedForCurrentScenario && observedScenario != null &&
            !string.IsNullOrEmpty(attemptId))
        {
            TrainingResult identification = TrainingResultStorage.LoadLatest();
            EvacuationResult evacuationResult = EvacuationResultStorage.LoadLatest();

            if (identification != null && evacuationResult != null)
            {
                int mistakes = actions.FindAll(action => !action.correct).Count;
                int score = Mathf.Max(0, 100 - mistakes * 10);
                DateTime completedUtc = DateTime.UtcNow;
                WorkerRecord selectedWorker = WorkerSelector.Instance?.SelectedWorker;
                ModuleRecord fireModule = WorkerSelector.Instance?.Module("fire-response");
                FireModuleResult result = new FireModuleResult
                {
                    attemptId = attemptId,
                    workerId = selectedWorker?.id,
                    moduleId = "fire-response",
                    scoringVersion = fireModule != null ? fireModule.scoringVersion.ToString() : "",
                    completedAtUtc = completedUtc.ToString("O"),
                    totalDurationSeconds = Time.unscaledTime - attemptStartedAt,
                    score = score,
                    passed = score >= 70,
                    incorrectSelections = mistakes,
                    identificationScore = identification.score,
                    identificationDurationSeconds = identification.durationSeconds,
                    evacuationDurationSeconds = evacuationResult.durationSeconds,
                    sprayPracticeCompleted = true,
                    syncState = "pending",
                    events = actions.ToArray()
                };
                FireModuleResultStorage.Save(result);
                AttemptPayload payload = AttemptActionMapper.Fire(attemptId, attemptStartedUtc,
                    completedUtc, actions);
                AttemptSyncManager.Instance?.Queue(payload, score);
                savedForCurrentScenario = true;
                if (!modernUI && resultsText != null)
                    resultsText.gameObject.SetActive(false);
                if (!modernUI)
                    ViewSavedRun();
            }
        }

        if (!modernUI && resultsBackground != null && resultsText != null)
            resultsBackground.gameObject.SetActive(resultsText.gameObject.activeSelf);

        if (progressText == null)
            return;

        string stage = observedScenario == null ? "PLACE THE SCENE" :
            !identified ? "IDENTIFY EQUIPMENT" :
            !sprayed ? "PRACTICE SPRAY" :
            !evacuated ? "FOLLOW THE EXIT ROUTE" : "TRAINING COMPLETE";
        string display =
            $"FIRE RESPONSE  |  {completed}/3\n" +
            $"<color=#FFD166>{stage}</color>\n" +
            $"{(identified ? "[x]" : "[ ]")} Identify exit and extinguisher\n" +
            $"{(sprayed ? "[x]" : "[ ]")} Aim and hold spray\n" +
            $"{(evacuated ? "[x]" : "[ ]")} Exit and reach assembly\n" +
            (savedForCurrentScenario ? "<color=#88E0B2>Attempt saved on this device</color>" :
             "<color=#B9C7D4>Simulation only | follow site procedures</color>");

        if (display == previousDisplay)
            return;

        progressText.text = display;
        previousDisplay = display;
    }

    public void ViewSavedRun()
    {
        if (resultsText == null)
            return;

        if (resultsText.gameObject.activeSelf)
        {
            resultsText.gameObject.SetActive(false);
            return;
        }

        FireModuleResult result = FireModuleResultStorage.LoadLatest();

        if (result == null)
        {
            resultsText.text =
                "No completed fire training run yet.\n" +
                "Identify, practice spray, and evacuate first.";
        }
        else
        {
            resultsText.text =
                "FIRE TRAINING COMPLETE\n" +
                $"Provisional local score: {result.score}/100  |  {(result.passed ? "PASS" : "RETRY")}\n" +
                $"Mistakes: {result.incorrectSelections}\n" +
                $"Total time: {result.totalDurationSeconds:F1}s\n" +
                $"Evacuation: {result.evacuationDurationSeconds:F1}s\n" +
                $"Sync: {BackendSyncLabel(result.attemptId)}\n" +
                $"Attempt: {result.attemptId.Substring(0, 8)}";
        }

        resultsText.gameObject.SetActive(true);
    }

    private static string BackendSyncLabel(string id)
    {
        QueuedAttempt item = OfflineAttemptQueue.Load().Find(entry => entry.attemptId == id);
        if (item?.serverResult?.score != null)
            return "server " + item.serverResult.score.percentage.ToString("0.#") + "/100 " +
                (item.serverResult.score.passed ? "PASS" : "RETRY");
        return item?.state ?? "pending";
    }

    private void StyleInterface()
    {
        if (progressText == null || resultsText == null)
            return;

        Canvas canvas = progressText.GetComponentInParent<Canvas>();
        if (canvas == null)
            return;

        viewFireRunButton = FindButton(canvas, "ViewFireRunButton");
        viewEvacuationResultButton = FindButton(canvas, "ViewEvacuationResultButton");
        viewLastResultButton = FindButton(canvas, "ViewLastResultButton");
        startEvacuationButton = FindButton(canvas, "StartEvacuationButton");
        practiceSprayButton = FindButton(canvas, "PracticeSprayButton");
        restartButton = FindButton(canvas, "RestartButton");

        RectTransform progressRect = progressText.rectTransform;
        progressRect.anchorMin = progressRect.anchorMax = new Vector2(0, 1);
        progressRect.pivot = new Vector2(0, 1);
        progressRect.anchoredPosition = new Vector2(32, -245);
        progressRect.sizeDelta = new Vector2(620, 315);
        progressText.fontSize = 31;
        progressText.color = Color.white;
        progressText.raycastTarget = false;
        progressText.richText = true;
        CreateBackground("Progress Panel", progressRect, new Color(0.035f, 0.11f, 0.16f, 0.87f));

        RectTransform resultRect = resultsText.rectTransform;
        resultRect.sizeDelta = new Vector2(850, 560);
        resultsText.fontSize = 39;
        resultsText.color = Color.white;
        resultsText.raycastTarget = false;
        resultsBackground = CreateBackground("Result Panel", resultRect,
            new Color(0.035f, 0.11f, 0.16f, 0.93f));
        resultsBackground.gameObject.SetActive(resultsText.gameObject.activeSelf);

        foreach (Button button in canvas.GetComponentsInChildren<Button>(true))
        {
            Image face = button.GetComponent<Image>();
            if (face != null)
                face.color = new Color(0.06f, 0.31f, 0.40f, 0.94f);
            ColorBlock colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.76f, 0.95f, 1f);
            colors.pressedColor = new Color(0.53f, 0.82f, 0.91f);
            colors.disabledColor = new Color(0.38f, 0.44f, 0.49f, 0.65f);
            button.colors = colors;
            TMP_Text label = button.GetComponentInChildren<TMP_Text>(true);
            if (label != null)
                label.color = Color.white;
        }

        PositionActionButton(viewFireRunButton, 112);
        PositionActionButton(startEvacuationButton, 112);
        PositionActionButton(practiceSprayButton, 112);
        PositionActionButton(restartButton, 24);
    }

    private static Button FindButton(Canvas canvas, string name)
    {
        Transform child = canvas.transform.Find(name);
        return child != null ? child.GetComponent<Button>() : null;
    }

    private static void SetButtonVisible(Button button, bool visible)
    {
        if (button != null && button.gameObject.activeSelf != visible)
            button.gameObject.SetActive(visible);
    }

    private static void PositionActionButton(Button button, float bottom)
    {
        if (button == null)
            return;
        RectTransform rect = button.GetComponent<RectTransform>();
        rect.anchorMin = rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(1f, 0f);
        rect.anchoredPosition = new Vector2(-24f, bottom);
        rect.sizeDelta = new Vector2(300f, 76f);
    }

    private static Image CreateBackground(string name, RectTransform reference, Color color)
    {
        GameObject panel = new GameObject(name, typeof(RectTransform), typeof(Image));
        RectTransform rect = panel.GetComponent<RectTransform>();
        rect.SetParent(reference.parent, false);
        rect.anchorMin = reference.anchorMin;
        rect.anchorMax = reference.anchorMax;
        rect.pivot = reference.pivot;
        rect.anchoredPosition = reference.anchoredPosition;
        rect.sizeDelta = reference.sizeDelta + new Vector2(36, 30);
        rect.SetSiblingIndex(reference.GetSiblingIndex());
        Image image = panel.GetComponent<Image>();
        image.color = color;
        image.raycastTarget = false;
        return image;
    }
}
