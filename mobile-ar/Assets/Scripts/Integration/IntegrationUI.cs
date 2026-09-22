using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public sealed class IntegrationUI : MonoBehaviour
{
    private static IntegrationUI instance;
    private GameObject panel;
    private InputField email;
    private InputField password;
    private Dropdown workers;
    private Text status;
    private Text selected;
    private Text pending;
    private Font font;

    private void Awake() => instance = this;
    private IEnumerator Start()
    {
        while (FindFirstObjectByType<Canvas>() == null) yield return null;
        Build();
        if (WorkerSelector.Instance != null) WorkerSelector.Instance.Changed += Refresh;
        if (AttemptSyncManager.Instance != null) AttemptSyncManager.Instance.Changed += Refresh;
        if (AuthManager.Instance != null) AuthManager.Instance.SessionChanged += Refresh;
        Refresh();
    }

    public static void Show(string message = null)
    {
        if (instance?.panel == null) return;
        instance.panel.SetActive(true);
        if (!string.IsNullOrEmpty(message)) instance.status.text = message;
    }

    private void Build()
    {
        font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        GameObject canvasObject = new GameObject("BackendIntegrationCanvas", typeof(Canvas),
            typeof(CanvasScaler), typeof(GraphicRaycaster));
        canvasObject.transform.SetParent(transform, false);
        Canvas canvas = canvasObject.GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 500;
        CanvasScaler scaler = canvasObject.GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);

        Button toggle = Button(canvas.transform, "Backend", new Vector2(825, -70), new Vector2(220, 75));
        toggle.onClick.AddListener(() => panel.SetActive(!panel.activeSelf));

        panel = Rect("Backend Panel", canvas.transform, new Vector2(100, -190), new Vector2(880, 1160),
            new Color(0.025f, 0.09f, 0.075f, 0.97f));
        Label(panel.transform, "Backend integration", new Vector2(40, -35), new Vector2(650, 65), 38);
        Button close = Button(panel.transform, "×", new Vector2(750, -25), new Vector2(85, 70));
        close.onClick.AddListener(() => panel.SetActive(false));
        Label(panel.transform, "Admin or safety-officer login", new Vector2(40, -125), new Vector2(800, 45), 26);
        email = Input(panel.transform, "Email", new Vector2(40, -185), new Vector2(800, 75), false);
        password = Input(panel.transform, "Password", new Vector2(40, -280), new Vector2(800, 75), true);
        Button login = Button(panel.transform, "Sign in", new Vector2(40, -375), new Vector2(380, 75));
        login.onClick.AddListener(() => StartCoroutine(Login()));
        Button logout = Button(panel.transform, "Sign out", new Vector2(460, -375), new Vector2(380, 75));
        logout.onClick.AddListener(() => { AuthManager.Instance?.Logout(); Refresh(); });
        Label(panel.transform, "Active worker", new Vector2(40, -480), new Vector2(800, 40), 26);
        workers = Dropdown(panel.transform, new Vector2(40, -535), new Vector2(800, 75));
        workers.onValueChanged.AddListener(index => WorkerSelector.Instance?.Select(index));
        selected = Label(panel.transform, "No worker selected", new Vector2(40, -630), new Vector2(800, 80), 25);
        status = Label(panel.transform, "Authentication required", new Vector2(40, -735), new Vector2(800, 150), 25);
        pending = Label(panel.transform, "Pending attempts: 0", new Vector2(40, -900), new Vector2(800, 45), 25);
        Button sync = Button(panel.transform, "Sync now", new Vector2(40, -970), new Vector2(800, 80));
        sync.onClick.AddListener(() => AttemptSyncManager.Instance?.SyncNow());
        panel.SetActive(false);
    }

    private IEnumerator Login()
    {
        status.text = "Connecting...";
        string error = null;
        yield return AuthManager.Instance.Login(email.text, password.text, value => error = value);
        password.text = "";
        if (!string.IsNullOrEmpty(error)) { status.text = error; Refresh(); yield break; }
        yield return WorkerSelector.Instance.Refresh(value => error = value);
        status.text = string.IsNullOrEmpty(error) ? "Connected" : error;
        AttemptSyncManager.Instance?.SyncNow();
        RefreshWorkers(); Refresh();
    }

    private void RefreshWorkers()
    {
        if (workers == null || WorkerSelector.Instance == null) return;
        workers.ClearOptions();
        List<string> options = new();
        foreach (WorkerRecord worker in WorkerSelector.Instance.Workers)
            options.Add(worker.employeeCode + " — " + worker.fullName);
        if (options.Count == 0) options.Add("No active workers available");
        workers.AddOptions(options);
        int index = WorkerSelector.Instance.Workers.FindIndex(w =>
            w.id == WorkerSelector.Instance.SelectedWorker?.id);
        workers.SetValueWithoutNotify(Mathf.Max(0, index));
    }

    private void Refresh()
    {
        if (status == null) return;
        RefreshWorkers();
        bool authenticated = AuthManager.Instance != null && AuthManager.Instance.IsAuthenticated;
        if (!authenticated && AttemptSyncManager.Instance?.PendingCount() == 0)
            status.text = "Authentication required";
        else if (AttemptSyncManager.Instance != null)
            status.text = AttemptSyncManager.Instance.StatusMessage;
        WorkerRecord worker = WorkerSelector.Instance?.SelectedWorker;
        selected.text = worker == null ? "No worker selected" :
            "Selected: " + worker.employeeCode + " — " + worker.fullName + "\nWorker UUID: " + worker.id;
        pending.text = "Pending attempts: " + (AttemptSyncManager.Instance?.PendingCount() ?? 0);
    }

    private GameObject Rect(string name, Transform parent, Vector2 position, Vector2 size, Color color)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false); Set(go.GetComponent<RectTransform>(), position, size);
        go.GetComponent<Image>().color = color; return go;
    }
    private Text Label(Transform parent, string value, Vector2 position, Vector2 size, int fontSize)
    {
        GameObject go = new GameObject("Text", typeof(RectTransform), typeof(Text));
        go.transform.SetParent(parent, false); Set(go.GetComponent<RectTransform>(), position, size);
        Text text = go.GetComponent<Text>(); text.font = font; text.text = value; text.fontSize = fontSize;
        text.color = Color.white; text.alignment = TextAnchor.MiddleLeft; return text;
    }
    private Button Button(Transform parent, string value, Vector2 position, Vector2 size)
    {
        GameObject go = Rect(value, parent, position, size, new Color(0.88f, 0.57f, 0.35f, 1f));
        Button button = go.AddComponent<Button>();
        Text label = Label(go.transform, value, Vector2.zero, size, 27);
        RectTransform textRect = label.rectTransform; textRect.anchorMin = Vector2.zero; textRect.anchorMax = Vector2.one;
        textRect.offsetMin = textRect.offsetMax = Vector2.zero; label.alignment = TextAnchor.MiddleCenter;
        return button;
    }
    private InputField Input(Transform parent, string placeholder, Vector2 position, Vector2 size, bool secret)
    {
        GameObject go = Rect(placeholder, parent, position, size, new Color(0.12f, 0.2f, 0.17f, 1f));
        InputField input = go.AddComponent<InputField>();
        Text text = Label(go.transform, "", new Vector2(18, 0), new Vector2(size.x - 36, size.y), 25);
        Text hint = Label(go.transform, placeholder, new Vector2(18, 0), new Vector2(size.x - 36, size.y), 25);
        hint.color = new Color(0.65f, 0.7f, 0.68f); input.textComponent = text; input.placeholder = hint;
        if (secret) input.contentType = InputField.ContentType.Password;
        return input;
    }
    private Dropdown Dropdown(Transform parent, Vector2 position, Vector2 size)
    {
        GameObject go = Rect("Worker dropdown", parent, position, size, new Color(0.12f, 0.2f, 0.17f, 1f));
        Dropdown dropdown = go.AddComponent<Dropdown>();
        Text caption = Label(go.transform, "", new Vector2(18, 0), new Vector2(size.x - 60, size.y), 24);
        dropdown.captionText = caption;
        dropdown.template = BuildDropdownTemplate(go.transform, size);
        return dropdown;
    }
    private RectTransform BuildDropdownTemplate(Transform parent, Vector2 size)
    {
        GameObject template = Rect("Template", parent, new Vector2(0, -size.y), new Vector2(size.x, 360),
            new Color(0.08f, 0.14f, 0.12f, 1f));
        ScrollRect scroll = template.AddComponent<ScrollRect>();
        GameObject viewport = Rect("Viewport", template.transform, Vector2.zero, new Vector2(size.x, 360), Color.clear);
        viewport.AddComponent<Mask>().showMaskGraphic = false;
        GameObject content = Rect("Content", viewport.transform, Vector2.zero, new Vector2(size.x, 360), Color.clear);
        GameObject item = Rect("Item", content.transform, Vector2.zero, new Vector2(size.x, 65), Color.clear);
        Toggle toggle = item.AddComponent<Toggle>();
        Text label = Label(item.transform, "Option", new Vector2(18, 0), new Vector2(size.x - 36, 65), 23);
        toggle.targetGraphic = item.GetComponent<Image>();
        Dropdown owner = parent.GetComponent<Dropdown>();
        if (owner != null) owner.itemText = label;
        scroll.viewport = viewport.GetComponent<RectTransform>(); scroll.content = content.GetComponent<RectTransform>();
        template.SetActive(false); return template.GetComponent<RectTransform>();
    }
    private static void Set(RectTransform rect, Vector2 position, Vector2 size)
    {
        rect.anchorMin = rect.anchorMax = new Vector2(0, 1); rect.pivot = new Vector2(0, 1);
        rect.anchoredPosition = position; rect.sizeDelta = size;
    }
}
