using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class AttemptSyncManager : MonoBehaviour
{
    public static AttemptSyncManager Instance { get; private set; }
    public bool IsSyncing { get; private set; }
    public string StatusMessage { get; private set; } = "Authentication required";
    public AttemptAcknowledgement LastServerResult { get; private set; }
    public event Action Changed;

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
    }

    private void Start() => StartCoroutine(RetryLoop());

    public int PendingCount()
    {
        string workerId = WorkerSelector.Instance?.SelectedWorker?.id;
        return OfflineAttemptQueue.Load().FindAll(item => item.state == "pending" &&
            (string.IsNullOrEmpty(workerId) || PayloadWorkerId(item) == workerId)).Count;
    }

    public void Queue(AttemptPayload payload, int provisionalScore)
    {
        if (payload == null)
        {
            StatusMessage = "Attempt was not queued: select a backend worker and refresh modules first.";
            Changed?.Invoke();
            return;
        }
        OfflineAttemptQueue.Enqueue(payload, provisionalScore);
        StatusMessage = "Attempt saved locally and pending synchronization.";
        Changed?.Invoke();
        SyncNow();
    }

    public void SyncNow()
    {
        if (!IsSyncing) StartCoroutine(SyncPending());
    }

    private IEnumerator RetryLoop()
    {
        while (true)
        {
            if (Application.internetReachability != NetworkReachability.NotReachable) SyncNow();
            yield return new WaitForSecondsRealtime(20f);
        }
    }

    private IEnumerator SyncPending()
    {
        if (AuthManager.Instance == null || !AuthManager.Instance.IsAuthenticated)
        {
            StatusMessage = PendingCount() > 0 ? "Authentication required to sync pending attempts." : "Authentication required";
            Changed?.Invoke(); yield break;
        }
        IsSyncing = true; StatusMessage = "Connecting to backend..."; Changed?.Invoke();
        List<QueuedAttempt> items = OfflineAttemptQueue.Load();
        foreach (QueuedAttempt item in items)
        {
            if (item.state != "pending") continue;
            if (PayloadWorkerId(item) != WorkerSelector.Instance?.SelectedWorker?.id) continue;
            ApiResult result = null;
            yield return ApiClient.Send("POST", "/api/attempts/sync", item.payloadJson,
                AuthManager.Instance.AccessToken, value => result = value);
            item.retryCount++;
            item.updatedAt = DateTime.UtcNow.ToString("O");
            if (result != null && result.Success)
            {
                AttemptSyncResponse response = null;
                try { response = JsonUtility.FromJson<AttemptSyncResponse>(result.body); } catch (ArgumentException) { }
                string state = response?.data?.syncStatus;
                if (IsSuccessfulAcknowledgement(state, item.attemptId, response?.data?.attemptId))
                {
                    item.state = "synced";
                    item.lastError = null;
                    item.serverResult = response.data;
                    LastServerResult = response.data;
                    StatusMessage = "Synced. Server score: " + response.data.score.percentage.ToString("0.#") +
                        "% (" + (response.data.score.passed ? "PASS" : "RETRY") + ")";
                    OfflineAttemptQueue.Save(items); Changed?.Invoke();
                    continue;
                }
                item.lastError = "Unexpected attempt response.";
            }
            else
            {
                long code = result?.statusCode ?? 0;
                item.lastError = ApiErrors.Message(result);
                if (code == 401)
                {
                    AuthManager.Instance.Logout();
                    StatusMessage = "Session expired. Sign in again; pending attempts were retained.";
                    OfflineAttemptQueue.Save(items); break;
                }
                item.state = ClassifyFailure(code, item.lastError);
                if (item.state == "version-mismatch" && WorkerSelector.Instance != null)
                    StartCoroutine(WorkerSelector.Instance.Refresh(null));
                StatusMessage = item.lastError;
            }
            OfflineAttemptQueue.Save(items); Changed?.Invoke();
        }
        IsSyncing = false;
        if (PendingCount() == 0 && LastServerResult == null) StatusMessage = "Connected. Nothing pending.";
        Changed?.Invoke();
    }

    public static string ClassifyFailure(long statusCode, string errorMessage)
    {
        if (statusCode == 400 || statusCode == 422) return "rejected";
        if (statusCode == 404) return "needs-correction";
        if (statusCode == 403) return "forbidden";
        if (statusCode == 409 && (errorMessage ?? "").Contains("ATTEMPT_ID_CONFLICT")) return "conflict";
        if (statusCode == 409 && (errorMessage ?? "").Contains("VERSION_MISMATCH")) return "version-mismatch";
        return "pending";
    }

    public static bool IsSuccessfulAcknowledgement(string syncStatus, string expectedAttemptId,
        string responseAttemptId)
    {
        return (syncStatus == "accepted" || syncStatus == "already-accepted") &&
            !string.IsNullOrEmpty(expectedAttemptId) && expectedAttemptId == responseAttemptId;
    }

    public static string PayloadWorkerId(QueuedAttempt item)
    {
        if (item == null || string.IsNullOrEmpty(item.payloadJson)) return null;
        try { return JsonUtility.FromJson<AttemptPayload>(item.payloadJson)?.workerId; }
        catch (ArgumentException) { return null; }
    }
}
