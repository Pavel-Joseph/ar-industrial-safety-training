using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

/// <summary>
/// Builds the portrait interface supplied in the approved Figma reference.
/// The AR lesson logic stays in TapToPlace/EvacuationPractice; this component
/// only presents that state and forwards deliberate UI actions.
/// </summary>
[DefaultExecutionOrder(100)]
public class FireTrainingUIController : MonoBehaviour
{
    private enum View { Home, Permission, Placement, Training, Extinguished, Result, Help }

    private static readonly Color Ink = Hex("071814");
    private static readonly Color CameraTint = new Color(0.025f, 0.18f, 0.14f, 0.42f);
    private static readonly Color Card = Hex("1C2E27");
    private static readonly Color CardDark = Hex("0B231E");
    private static readonly Color Peach = Hex("E3A071");
    private static readonly Color Orange = Hex("F39A63");
    private static readonly Color Muted = Hex("9CA6A1");
    private static readonly Color Green = Hex("49BA59");
    private static readonly Color Blue = Hex("279DF2");
    private static readonly Color Gold = Hex("C89242");

    private TapToPlace training;
    private EvacuationPractice evacuation;
    private Canvas canvas;
    private GasLeakModuleController gasModule;
    private GameObject uiRoot;
    private GameObject homeView;
    private GameObject permissionView;
    private GameObject placementView;
    private GameObject trainingView;
    private GameObject extinguishedView;
    private GameObject resultView;
    private GameObject helpView;
    private GameObject progressCard;
    private TMP_Text progressCount;
    private TMP_Text taskOne;
    private TMP_Text taskTwo;
    private TMP_Text taskThree;
    private TMP_Text instruction;
    private TMP_Text fireMeter;
    private Image fireFill;
    private Button sprayButton;
    private TMP_Text resultTitle;
    private TMP_Text resultScore;
    private TMP_Text resultDetails;
    private View currentView;
    private View helpReturnView;
    private bool started;
    private bool resultOpened;
    private bool viewInitialized;
    private static Sprite roundedSprite;

    private void Start()
    {
        training = GetComponent<TapToPlace>();
        evacuation = GetComponent<EvacuationPractice>();
        canvas = FindFirstObjectByType<Canvas>();
        if (training == null || evacuation == null || canvas == null)
        {
            enabled = false;
            return;
        }

        gasModule = GetComponent<GasLeakModuleController>();
        if (gasModule == null)
            gasModule = gameObject.AddComponent<GasLeakModuleController>();


        CanvasScaler scaler = canvas.GetComponent<CanvasScaler>();
        if (scaler != null)
        {
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0f;
        }

        HideLegacyInterface();
        BuildInterface();
        Show(View.Home);
    }

    private void Update()
    {
        if (!started || currentView == View.Home || currentView == View.Permission ||
            currentView == View.Help || currentView == View.Result)
            return;

        if (!training.HasPlacedScenario)
        {
            Show(View.Placement);
            return;
        }

        if (!training.IdentificationComplete)
        {
            Show(View.Training);
            UpdateTraining(training.ExitIdentified
                ? "Exit identified — now tap the fire extinguisher"
                : "Find and tap the exit door", 0);
            return;
        }

        if (!training.SprayPracticeComplete)
        {
            Show(View.Training);
            if (training.CanPracticeSpray || training.IsSprayPlaying)
            {
                int remaining = training.FireRemainingPercent;
                UpdateTraining(training.IsSprayPlaying
                    ? "Keep holding and drag around every flame"
                    : "Hold Spray and drag the extinguisher", 1);
                fireMeter.gameObject.SetActive(true);
                fireMeter.text = remaining + "% remaining";
                fireFill.fillAmount = remaining / 100f;
                sprayButton.gameObject.SetActive(true);
            }
            else
            {
                UpdateTraining("Tap the aim target at the base of the fire", 1);
                fireMeter.gameObject.SetActive(false);
                sprayButton.gameObject.SetActive(false);
            }
            return;
        }

        if (!evacuation.IsActive && !evacuation.EvacuationComplete)
        {
            Show(View.Extinguished);
            return;
        }

        if (evacuation.IsActive)
        {
            Show(View.Training);
            UpdateTraining(evacuation.ExitReached
                ? "Reach the blue assembly point"
                : "Follow the exit route — tap the door", 2);
            return;
        }

        if (evacuation.EvacuationComplete)
        {
            Show(View.Result);
            PopulateResult();
        }
    }

    private void HideLegacyInterface()
    {
        foreach (Transform child in canvas.transform)
            child.gameObject.SetActive(false);
    }

    private void BuildInterface()
    {
        uiRoot = Node("FigmaFireUI", canvas.transform);
        Stretch(uiRoot.GetComponent<RectTransform>());

        homeView = BuildHome();
        permissionView = BuildPermission();
        placementView = BuildPlacement();
        trainingView = BuildTraining();
        extinguishedView = BuildExtinguished();
        resultView = BuildResult();
        helpView = BuildHelp();
    }

    private GameObject BuildHome()
    {
        GameObject root = Screen("Home", true);
        Label(root.transform, "AR Safety", 48, FontStyles.Bold,
            new Vector2(72, -150), new Vector2(600, 72), TextAlignmentOptions.Left);
        Label(root.transform, "EN", 28, FontStyles.Bold,
            new Vector2(-90, -158), new Vector2(110, 64), TextAlignmentOptions.Center,
            Peach, new Vector2(1, 1), new Vector2(1, 1), new Vector2(1, 1));

        TMP_Text title = Label(root.transform, "AR Industrial\nSafety Training", 76,
            FontStyles.Bold, new Vector2(72, -300), new Vector2(900, 190),
            TextAlignmentOptions.Left);
        title.color = Color.white;
        Label(root.transform, "Powered by augmented reality", 34, FontStyles.Normal,
            new Vector2(72, -495), new Vector2(800, 55), TextAlignmentOptions.Left, Muted);

        Button backend = OutlineButton(root.transform, "Backend Sign In / Worker",
            new Vector2(670, -205), new Vector2(350, 72));
        backend.onClick.AddListener(() => IntegrationRuntime.RequireSetup());

        GameObject module = Panel(root.transform, "Module Card", Card,
            new Vector2(60, -600), new Vector2(960, 555), new Vector2(0, 1), new Vector2(0, 1));
        Label(module.transform, "MODULE 1     <color=#63CC72>READY</color>", 28,
            FontStyles.Bold, new Vector2(48, -42), new Vector2(620, 55), TextAlignmentOptions.Left, Orange);
        Label(module.transform, "Fire Response &\nEvacuation", 46, FontStyles.Bold,
            new Vector2(48, -110), new Vector2(670, 125), TextAlignmentOptions.Left);
        Label(module.transform,
            "Train to identify equipment, extinguish a fire,\nand evacuate safely using AR simulation.",
            32, FontStyles.Normal, new Vector2(48, -255), new Vector2(820, 130),
            TextAlignmentOptions.Left, Orange);
        Label(module.transform, "Duration        Steps          Difficulty\n<color=#FFFFFF>~12 min        3 tasks        Beginner</color>",
            27, FontStyles.Normal, new Vector2(48, -430), new Vector2(820, 90),
            TextAlignmentOptions.Left, Muted);

        Button start = ActionButton(root.transform, "Start Fire Training", Peach,
            new Vector2(60, -1200), new Vector2(960, 126));
        start.onClick.AddListener(() =>
        {
            if (!IntegrationRuntime.TrainingContextReady) { IntegrationRuntime.RequireSetup(); return; }
            Show(View.Permission);
        });
        Button gas = ActionButton(root.transform, "Start Gas Leak Training", Green,
            new Vector2(60, -1345), new Vector2(960, 126));
        gas.onClick.AddListener(() =>
        {
            if (!IntegrationRuntime.TrainingContextReady) { IntegrationRuntime.RequireSetup(); return; }
            StartCoroutine(AcceptGasCamera());
        });
        Button last = OutlineButton(root.transform, "View Last Result",
            new Vector2(60, -1490), new Vector2(960, 105));
        last.onClick.AddListener(() => { resultOpened = true; Show(View.Result); PopulateResult(); });
        Label(root.transform,
            "<b>!  Simulation only.</b> This training does not replace real fire safety procedures.\nAlways follow your site's emergency protocols during an actual incident.",
            25, FontStyles.Normal, new Vector2(60, 118), new Vector2(960, 155),
            TextAlignmentOptions.Center, Muted, new Vector2(0, 0), new Vector2(0, 0), new Vector2(0, 0));
        return root;
    }

    private GameObject BuildPermission()
    {
        GameObject root = Screen("Camera Permission", true);
        BackButton(root.transform, () => Show(View.Home));
        Label(root.transform, "CAMERA", 34, FontStyles.Bold, new Vector2(390, -340),
            new Vector2(300, 170), TextAlignmentOptions.Center, Peach);
        Label(root.transform, "Camera Access\nRequired", 58, FontStyles.Bold,
            new Vector2(120, -555), new Vector2(840, 160), TextAlignmentOptions.Center);
        Label(root.transform,
            "This app uses your camera to display augmented reality\ntraining content in your real environment.",
            34, FontStyles.Normal, new Vector2(100, -735), new Vector2(880, 135),
            TextAlignmentOptions.Center, Orange);
        Label(root.transform,
            "Your camera feed is processed on-device and is never\nrecorded or transmitted.",
            29, FontStyles.Normal, new Vector2(100, -895), new Vector2(880, 100),
            TextAlignmentOptions.Center, Muted);
        Label(root.transform,
            "PLACE AR OBJECTS              PRIVATE & SECURE              REAL-TIME OVERLAY\nPosition the scene instantly        Camera stays on device         Rendered live in AR",
            24, FontStyles.Bold, new Vector2(65, -1080), new Vector2(950, 145),
            TextAlignmentOptions.Center);
        Button allow = ActionButton(root.transform, "Allow Camera", Peach,
            new Vector2(70, -1335), new Vector2(940, 126));
        allow.onClick.AddListener(() => StartCoroutine(AcceptCamera()));
        Button no = OutlineButton(root.transform, "Not Now",
            new Vector2(70, -1485), new Vector2(940, 112));
        no.onClick.AddListener(() => Show(View.Home));
        return root;
    }

    private GameObject BuildPlacement()
    {
        GameObject root = Screen("Placement", false);
        AddCameraWash(root.transform);
        BackButton(root.transform, ReturnHome);
        CircleButton(root.transform, "?", new Vector2(-76, -120), () => OpenHelp(View.Placement));
        PanelLabel(root.transform, "Tap the floor to place instantly\nTracking improves automatically",
            new Vector2(46, -260), new Vector2(988, 190), 40);
        Label(root.transform, "+\n<color=#E3A071><size=28>Tap to place</size></color>", 120,
            FontStyles.Normal, new Vector2(290, -740), new Vector2(500, 300),
            TextAlignmentOptions.Center, Peach);
        PanelLabel(root.transform, "Industrial floor plan\n<size=25><color=#D49A69>Fire · Exit · Extinguisher · Assembly</color></size>",
            new Vector2(210, 255), new Vector2(660, 125), 29, new Vector2(0, 0), new Vector2(0, 0));
        Label(root.transform, "No waiting for a full room scan", 28, FontStyles.Bold,
            new Vector2(250, 95), new Vector2(580, 55), TextAlignmentOptions.Center, Muted,
            new Vector2(0, 0), new Vector2(0, 0), new Vector2(0, 0));
        return root;
    }

    private GameObject BuildTraining()
    {
        GameObject root = Screen("Training", false);
        AddCameraWash(root.transform);
        BackButton(root.transform, ReturnHome);

        fireMeter = Label(root.transform, "100% remaining", 30, FontStyles.Bold,
            new Vector2(340, -1030), new Vector2(520, 80), TextAlignmentOptions.Right);
        GameObject meterBack = Panel(root.transform, "Fire Meter", CardDark,
            new Vector2(250, -1010), new Vector2(580, 82), new Vector2(0, 1), new Vector2(0, 1));
        meterBack.transform.SetSiblingIndex(fireMeter.transform.GetSiblingIndex());
        GameObject fill = Node("Fill", meterBack.transform, typeof(Image));
        RectTransform fillRect = fill.GetComponent<RectTransform>();
        fillRect.anchorMin = new Vector2(0, 0.5f); fillRect.anchorMax = new Vector2(1, 0.5f);
        fillRect.pivot = new Vector2(0, 0.5f); fillRect.anchoredPosition = new Vector2(30, 0);
        fillRect.sizeDelta = new Vector2(-260, 16);
        fireFill = fill.GetComponent<Image>(); fireFill.color = Orange; fireFill.type = Image.Type.Filled;
        fireFill.fillMethod = Image.FillMethod.Horizontal;

        progressCard = Panel(root.transform, "Progress Card", CardDark,
            new Vector2(55, 380), new Vector2(970, 310), new Vector2(0, 0), new Vector2(0, 0));
        Label(progressCard.transform, "FIRE RESPONSE", 27, FontStyles.Bold,
            new Vector2(45, -30), new Vector2(500, 48), TextAlignmentOptions.Left, Orange);
        progressCount = Label(progressCard.transform, "0/3", 27, FontStyles.Bold,
            new Vector2(-45, -30), new Vector2(150, 48), TextAlignmentOptions.Right, Muted,
            new Vector2(1, 1), new Vector2(1, 1), new Vector2(1, 1));
        taskOne = Label(progressCard.transform, "○  Identify exit and extinguisher", 30,
            FontStyles.Bold, new Vector2(45, -92), new Vector2(850, 52), TextAlignmentOptions.Left);
        taskTwo = Label(progressCard.transform, "○  Aim and hold spray", 30,
            FontStyles.Normal, new Vector2(45, -155), new Vector2(850, 52), TextAlignmentOptions.Left, Muted);
        taskThree = Label(progressCard.transform, "○  Exit and reach assembly", 30,
            FontStyles.Normal, new Vector2(45, -218), new Vector2(850, 52), TextAlignmentOptions.Left, Muted);
        instruction = PanelLabel(root.transform, "Find and tap the exit door",
            new Vector2(55, 235), new Vector2(970, 112), 35, new Vector2(0, 0), new Vector2(0, 0));

        sprayButton = ActionButton(root.transform, "Hold + drag extinguisher", Peach,
            new Vector2(55, 90), new Vector2(970, 118), new Vector2(0, 0), new Vector2(0, 0));
        EventTrigger trigger = sprayButton.gameObject.AddComponent<EventTrigger>();
        AddTrigger(trigger, EventTriggerType.PointerDown, () => training.BeginSpray());
        AddPointerTrigger(trigger, EventTriggerType.PointerDown,
            eventData => training.UpdateExtinguisherDrag(eventData.position));
        AddPointerTrigger(trigger, EventTriggerType.Drag,
            eventData => training.UpdateExtinguisherDrag(eventData.position));
        AddTrigger(trigger, EventTriggerType.PointerUp, () => training.EndSpray());
        return root;
    }

    private GameObject BuildExtinguished()
    {
        GameObject root = Screen("Extinguished", false);
        AddCameraWash(root.transform);
        Label(root.transform, "DONE", 52, FontStyles.Bold, new Vector2(410, -410),
            new Vector2(260, 120), TextAlignmentOptions.Center, Color.white);
        GameObject success = Panel(root.transform, "Success Card", new Color(0.12f, 0.38f, 0.20f, 0.84f),
            new Vector2(190, -590), new Vector2(700, 330), new Vector2(0, 1), new Vector2(0, 1));
        Label(success.transform, "DONE\n<size=48>Fire Extinguished</size>\n<size=29><color=#B9C7C1>Well done. Now evacuate safely.</color></size>",
            70, FontStyles.Bold, new Vector2(35, -45), new Vector2(630, 245), TextAlignmentOptions.Center);
        BuildStaticProgress(root.transform, 2);
        Button evacuate = ActionButton(root.transform, "Practice Evacuation", Peach,
            new Vector2(65, 105), new Vector2(950, 126), new Vector2(0, 0), new Vector2(0, 0));
        evacuate.onClick.AddListener(() => evacuation.BeginEvacuation());
        return root;
    }

    private GameObject BuildResult()
    {
        GameObject root = Screen("Result", true);
        BackButton(root.transform, ReturnHome);
        resultTitle = Label(root.transform, "Fire Training Complete!", 54, FontStyles.Bold,
            new Vector2(100, -210), new Vector2(880, 80), TextAlignmentOptions.Center);
        Label(root.transform, "PASS", 35, FontStyles.Bold, new Vector2(390, -315),
            new Vector2(300, 72), TextAlignmentOptions.Center, Green);
        resultScore = Label(root.transform, "--\n<size=28><color=#9CA6A1>/ 100</color></size>",
            72, FontStyles.Bold, new Vector2(365, -445), new Vector2(350, 190), TextAlignmentOptions.Center);
        GameObject details = Panel(root.transform, "Result Details", Card,
            new Vector2(65, -690), new Vector2(950, 560), new Vector2(0, 1), new Vector2(0, 1));
        resultDetails = Label(details.transform, "No completed training result yet.", 31,
            FontStyles.Normal, new Vector2(45, -35), new Vector2(860, 470), TextAlignmentOptions.TopLeft, Muted);
        Button restart = ActionButton(root.transform, "Restart Training", Peach,
            new Vector2(65, -1320), new Vector2(950, 126));
        restart.onClick.AddListener(RestartFromResult);
        Button home = OutlineButton(root.transform, "Return Home",
            new Vector2(65, -1470), new Vector2(950, 112));
        home.onClick.AddListener(ReturnHome);
        return root;
    }

    private GameObject BuildHelp()
    {
        GameObject root = Screen("Help", true);
        BackButton(root.transform, () => Show(helpReturnView));
        Label(root.transform, "Help & Guide", 52, FontStyles.Bold,
            new Vector2(185, -150), new Vector2(760, 80), TextAlignmentOptions.Left);
        string[] titles = { "How to place the scene", "Identify equipment", "Hold to spray",
            "Follow the evacuation route", "Reach the assembly point" };
        string[] bodies = {
            "Tap the visible floor immediately. Confirmed planes are preferred, but estimated placement keeps training responsive while AR tracking improves.",
            "Turn around and inspect the room. Tap the wall mounted exit first, then the extinguisher.",
            "Aim at the fire, hold the spray button, and drag the extinguisher around every flame.",
            "Green arrows lead to the exit. Follow them and tap the door to leave the building.",
            "Tap the blue assembly marker to complete the evacuation and finish the simulation." };
        for (int i = 0; i < titles.Length; i++)
        {
            GameObject card = Panel(root.transform, "Help " + i, Card,
                new Vector2(65, -300 - i * 270), new Vector2(950, 235), new Vector2(0, 1), new Vector2(0, 1));
            Label(card.transform, titles[i], 31, FontStyles.Bold,
                new Vector2(45, -32), new Vector2(850, 48), TextAlignmentOptions.Left);
            Label(card.transform, bodies[i], 27, FontStyles.Normal,
                new Vector2(45, -90), new Vector2(850, 120), TextAlignmentOptions.TopLeft, Muted);
        }
        return root;
    }

    private void UpdateTraining(string message, int completed)
    {
        progressCount.text = completed + "/3";
        taskOne.text = completed >= 1 ? "<color=#49BA59>[x]</color>  <s>Identify exit and extinguisher</s>" : "[ ]  Identify exit and extinguisher";
        taskTwo.text = completed >= 2 ? "<color=#49BA59>[x]</color>  <s>Aim and hold spray</s>" : "[ ]  Aim and hold spray";
        taskThree.text = completed >= 3 ? "<color=#49BA59>[x]</color>  <s>Exit and reach assembly</s>" : "[ ]  Exit and reach assembly";
        taskOne.color = completed >= 1 ? Muted : Color.white;
        taskTwo.color = completed == 1 ? Color.white : Muted;
        taskThree.color = completed == 2 ? Color.white : Muted;
        instruction.text = message;
        fireMeter.gameObject.SetActive(false);
        fireFill.transform.parent.gameObject.SetActive(false);
        sprayButton.gameObject.SetActive(false);
        if (training.CanPracticeSpray || training.IsSprayPlaying)
        {
            fireFill.transform.parent.gameObject.SetActive(true);
            fireMeter.gameObject.SetActive(true);
        }
    }

    private void BuildStaticProgress(Transform parent, int completed)
    {
        GameObject card = Panel(parent, "Progress Card", CardDark,
            new Vector2(65, 325), new Vector2(950, 310), new Vector2(0, 0), new Vector2(0, 0));
        Label(card.transform, "FIRE RESPONSE", 27, FontStyles.Bold,
            new Vector2(45, -30), new Vector2(600, 48), TextAlignmentOptions.Left, Orange);
        Label(card.transform, completed + "/3", 27, FontStyles.Bold,
            new Vector2(-45, -30), new Vector2(150, 48), TextAlignmentOptions.Right, Muted,
            new Vector2(1, 1), new Vector2(1, 1), new Vector2(1, 1));
        Label(card.transform,
            "<color=#49BA59>[x]</color>  <s>Identify exit and extinguisher</s>\n" +
            "<color=#49BA59>[x]</color>  <s>Aim and hold spray</s>\n" +
            "[ ]  <color=#FFFFFF>Exit and reach assembly</color>",
            29, FontStyles.Normal, new Vector2(45, -95), new Vector2(850, 170), TextAlignmentOptions.TopLeft, Muted);
    }

    private void PopulateResult()
    {
        FireModuleResult result = FireModuleResultStorage.LoadLatest();
        if (result == null)
        {
            string gasSummary = gasModule != null ? gasModule.GetLatestResultSummary() : null;
            resultTitle.text = resultOpened ? "Last Training Result" : "Fire Training Complete!";
            resultScore.text = "--\n<size=28><color=#9CA6A1>/ 100</color></size>";
            resultDetails.text = string.IsNullOrEmpty(gasSummary)
                ? "No saved training result yet.\nComplete a Fire or Gas module to save a result."
                : gasSummary;
            return;
        }
        QueuedAttempt queued = OfflineAttemptQueue.Load().Find(item => item.attemptId == result.attemptId);
        bool hasServerScore = queued?.serverResult?.score != null;
        float displayedScore = hasServerScore ? queued.serverResult.score.percentage : result.score;
        resultTitle.text = hasServerScore ? "Server Evaluation Complete" : "Fire Training Complete!";
        resultScore.text = displayedScore.ToString("0.#") +
            "\n<size=28><color=#9CA6A1>/ 100 " + (hasServerScore ? "SERVER" : "PROVISIONAL") + "</color></size>";
        string attempt = string.IsNullOrEmpty(result.attemptId) ? "—" : "#" + result.attemptId.Substring(0, Mathf.Min(5, result.attemptId.Length)).ToUpperInvariant();
        resultDetails.text =
            "X   Incorrect selections                         <color=#FFFFFF>" + result.incorrectSelections + "</color>\n\n" +
            "TIME   Training time                           <color=#FFFFFF>" + FormatTime(result.totalDurationSeconds) + "</color>\n\n" +
            "EXIT   Evacuation time                         <color=#FFFFFF>" + FormatTime(result.evacuationDurationSeconds) + "</color>\n\n" +
            "#   Attempt ID                                 <color=#FFFFFF>" + attempt + "</color>\n\n" +
            "SYNC   Sync status                             <color=#FFFFFF>" +
            (queued?.state ?? "Pending") + "</color>" +
            (gasModule != null && !string.IsNullOrEmpty(gasModule.GetLatestResultSummary())
                ? "\n\n" + gasModule.GetLatestResultSummary() : "");
    }

    private IEnumerator AcceptCamera()
    {
        yield return Application.RequestUserAuthorization(UserAuthorization.WebCam);
        started = true;
        Show(View.Placement);
    }

    private void RestartFromResult()
    {
        resultOpened = false;
        training.RestartTraining();
        started = true;
        Show(View.Placement);
    }

    private void ReturnHome()
    {
        training.RestartTraining();
        started = false;
        resultOpened = false;
        Show(View.Home);
    }

    private void StartGasModule()
    {
        training.RestartTraining();
        started = false;
        resultOpened = false;
        training.enabled = false;
        evacuation.enabled = false;
        uiRoot.SetActive(false);
        gasModule.Begin(ReturnFromGasModule);
    }

    private IEnumerator AcceptGasCamera()
    {
        yield return Application.RequestUserAuthorization(UserAuthorization.WebCam);
        StartGasModule();
    }

    private void ReturnFromGasModule()
    {
        training.enabled = true;
        evacuation.enabled = true;
        uiRoot.SetActive(true);
        Show(View.Home);
    }

    private void OpenHelp(View returnView)
    {
        helpReturnView = returnView;
        Show(View.Help);
    }

    private void Show(View view)
    {
        if (uiRoot == null || (viewInitialized && currentView == view && GetView(view).activeSelf))
            return;
        viewInitialized = true;
        currentView = view;
        homeView.SetActive(view == View.Home);
        permissionView.SetActive(view == View.Permission);
        placementView.SetActive(view == View.Placement);
        trainingView.SetActive(view == View.Training);
        extinguishedView.SetActive(view == View.Extinguished);
        resultView.SetActive(view == View.Result);
        helpView.SetActive(view == View.Help);
    }

    private GameObject GetView(View view)
    {
        return view switch
        {
            View.Home => homeView, View.Permission => permissionView,
            View.Placement => placementView, View.Training => trainingView,
            View.Extinguished => extinguishedView, View.Result => resultView,
            _ => helpView
        };
    }

    private GameObject Screen(string name, bool opaque)
    {
        GameObject root = Node(name, uiRoot.transform, typeof(Image));
        Stretch(root.GetComponent<RectTransform>());
        Image image = root.GetComponent<Image>();
        image.color = opaque ? Ink : CameraTint;
        image.raycastTarget = false;
        return root;
    }

    private void AddCameraWash(Transform parent)
    {
        GameObject wash = Node("Camera Contrast", parent, typeof(Image));
        Stretch(wash.GetComponent<RectTransform>());
        Image image = wash.GetComponent<Image>();
        image.color = CameraTint;
        image.raycastTarget = false;
        wash.transform.SetAsFirstSibling();
    }

    private static GameObject Node(string name, Transform parent, params System.Type[] components)
    {
        System.Type[] types = new System.Type[components.Length + 1];
        types[0] = typeof(RectTransform);
        components.CopyTo(types, 1);
        GameObject go = new GameObject(name, types);
        go.layer = 5;
        go.transform.SetParent(parent, false);
        return go;
    }

    private static GameObject Panel(Transform parent, string name, Color color,
        Vector2 position, Vector2 size, Vector2 anchorMin, Vector2 anchorMax)
    {
        GameObject panel = Node(name, parent, typeof(Image));
        Rect(panel.GetComponent<RectTransform>(), position, size, anchorMin, anchorMax, anchorMin);
        Image image = panel.GetComponent<Image>();
        image.sprite = Rounded(); image.type = Image.Type.Sliced; image.color = color;
        image.raycastTarget = false;
        return panel;
    }

    private static TMP_Text PanelLabel(Transform parent, string text, Vector2 position,
        Vector2 size, float fontSize, Vector2? anchorMin = null, Vector2? anchorMax = null)
    {
        GameObject panel = Panel(parent, text + " Panel", new Color(CardDark.r, CardDark.g, CardDark.b, 0.9f),
            position, size, anchorMin ?? new Vector2(0, 1), anchorMax ?? new Vector2(0, 1));
        TMP_Text label = Label(panel.transform, text, fontSize, FontStyles.Bold,
            Vector2.zero, size - new Vector2(40, 20), TextAlignmentOptions.Center);
        label.rectTransform.anchorMin = label.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
        label.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        return label;
    }

    private static TMP_Text Label(Transform parent, string text, float fontSize,
        FontStyles style, Vector2 position, Vector2 size, TextAlignmentOptions alignment,
        Color? color = null, Vector2? anchorMin = null, Vector2? anchorMax = null, Vector2? pivot = null)
    {
        GameObject go = Node("Label", parent, typeof(TextMeshProUGUI));
        TMP_Text label = go.GetComponent<TMP_Text>();
        label.text = text; label.fontSize = fontSize; label.fontStyle = style;
        label.alignment = alignment; label.color = color ?? Color.white;
        label.textWrappingMode = TextWrappingModes.Normal;
        label.raycastTarget = false; label.richText = true;
        Rect(label.rectTransform, position, size, anchorMin ?? new Vector2(0, 1),
            anchorMax ?? new Vector2(0, 1), pivot ?? new Vector2(0, 1));
        return label;
    }

    private static Button ActionButton(Transform parent, string text, Color color,
        Vector2 position, Vector2 size, Vector2? anchorMin = null, Vector2? anchorMax = null)
    {
        GameObject go = Panel(parent, text, color, position, size,
            anchorMin ?? new Vector2(0, 1), anchorMax ?? new Vector2(0, 1));
        Image image = go.GetComponent<Image>(); image.raycastTarget = true;
        Button button = go.AddComponent<Button>();
        TMP_Text label = Label(go.transform, text, 34, FontStyles.Bold, Vector2.zero,
            size, TextAlignmentOptions.Center, Ink, new Vector2(0.5f, 0.5f),
            new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f));
        ColorBlock colors = button.colors; colors.highlightedColor = new Color(1f, .82f, .67f);
        colors.pressedColor = new Color(.78f, .47f, .29f); button.colors = colors;
        return button;
    }

    private static Button OutlineButton(Transform parent, string text, Vector2 position, Vector2 size)
    {
        Button button = ActionButton(parent, text, Card, position, size);
        button.GetComponent<Image>().color = Card;
        button.GetComponentInChildren<TMP_Text>().color = Orange;
        return button;
    }

    private static void BackButton(Transform parent, UnityEngine.Events.UnityAction action)
    {
        Button button = ActionButton(parent, "‹", CardDark, new Vector2(45, -95), new Vector2(120, 120));
        button.GetComponentInChildren<TMP_Text>().fontSize = 72;
        button.GetComponentInChildren<TMP_Text>().color = Color.white;
        button.onClick.AddListener(action);
    }

    private static void CircleButton(Transform parent, string text, Vector2 position,
        UnityEngine.Events.UnityAction action)
    {
        Button button = ActionButton(parent, text, CardDark, position, new Vector2(120, 120),
            new Vector2(1, 1), new Vector2(1, 1));
        button.GetComponentInChildren<TMP_Text>().color = Color.white;
        button.onClick.AddListener(action);
    }

    private static void AddTrigger(EventTrigger trigger, EventTriggerType type,
        UnityEngine.Events.UnityAction callback)
    {
        EventTrigger.Entry entry = new EventTrigger.Entry { eventID = type };
        entry.callback.AddListener(_ => callback());
        trigger.triggers.Add(entry);
    }

    private static void AddPointerTrigger(EventTrigger trigger, EventTriggerType type,
        UnityEngine.Events.UnityAction<PointerEventData> callback)
    {
        EventTrigger.Entry entry = new EventTrigger.Entry { eventID = type };
        entry.callback.AddListener(data => callback((PointerEventData)data));
        trigger.triggers.Add(entry);
    }

    private static void Stretch(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero; rect.offsetMax = Vector2.zero;
    }

    private static void Rect(RectTransform rect, Vector2 position, Vector2 size,
        Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot)
    {
        rect.anchorMin = anchorMin; rect.anchorMax = anchorMax; rect.pivot = pivot;
        rect.anchoredPosition = position; rect.sizeDelta = size;
    }

    private static Sprite Rounded()
    {
        if (roundedSprite != null) return roundedSprite;
        const int size = 64; const float radius = 18f;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        texture.name = "Runtime Rounded Rectangle";
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float dx = Mathf.Max(radius - x, 0f) + Mathf.Max(x - (size - radius - 1), 0f);
            float dy = Mathf.Max(radius - y, 0f) + Mathf.Max(y - (size - radius - 1), 0f);
            float alpha = Mathf.Clamp01(radius + .5f - Mathf.Sqrt(dx * dx + dy * dy));
            texture.SetPixel(x, y, new Color(1, 1, 1, alpha));
        }
        texture.Apply(); texture.wrapMode = TextureWrapMode.Clamp;
        roundedSprite = Sprite.Create(texture, new UnityEngine.Rect(0, 0, size, size),
            new Vector2(.5f, .5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(20, 20, 20, 20));
        return roundedSprite;
    }

    private static string FormatTime(float seconds)
    {
        int total = Mathf.Max(0, Mathf.RoundToInt(seconds));
        return (total / 60) + ":" + (total % 60).ToString("00");
    }

    private static Color Hex(string hex)
    {
        ColorUtility.TryParseHtmlString("#" + hex, out Color color);
        return color;
    }
}
