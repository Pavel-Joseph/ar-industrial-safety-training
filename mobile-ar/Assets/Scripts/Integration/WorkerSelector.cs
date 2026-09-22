using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public sealed class WorkerSelector : MonoBehaviour
{
    [Serializable] private class ContextCache { public WorkerRecord worker; public ModuleRecord[] modules; }
    public static WorkerSelector Instance { get; private set; }
    public readonly List<WorkerRecord> Workers = new();
    public readonly List<ModuleRecord> Modules = new();
    public WorkerRecord SelectedWorker { get; private set; }
    public bool HasTrainingContext => SelectedWorker != null && Module("fire-response") != null && Module("gas-confined-space") != null;
    public event Action Changed;
    private string CachePath => System.IO.Path.Combine(Application.persistentDataPath, "backend-context.json");

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        LoadCache();
    }

    public IEnumerator Refresh(Action<string> completed)
    {
        if (AuthManager.Instance == null || !AuthManager.Instance.IsAuthenticated)
        { completed?.Invoke("Authentication required."); yield break; }
        ApiResult workersResult = null;
        yield return ApiClient.Send("GET", "/api/workers?active=true&limit=100&offset=0", null,
            AuthManager.Instance.AccessToken, value => workersResult = value);
        if (workersResult == null || !workersResult.Success)
        { completed?.Invoke(ApiErrors.Message(workersResult)); yield break; }
        ApiResult modulesResult = null;
        yield return ApiClient.Send("GET", "/api/modules", null, AuthManager.Instance.AccessToken,
            value => modulesResult = value);
        if (modulesResult == null || !modulesResult.Success)
        { completed?.Invoke(ApiErrors.Message(modulesResult)); yield break; }
        WorkerListResponse workerResponse = JsonUtility.FromJson<WorkerListResponse>(workersResult.body);
        ModuleListResponse moduleResponse = JsonUtility.FromJson<ModuleListResponse>(modulesResult.body);
        Workers.Clear(); Modules.Clear();
        if (workerResponse?.data != null)
            foreach (WorkerRecord worker in workerResponse.data) if (worker.active) Workers.Add(worker);
        if (moduleResponse?.data != null)
            foreach (ModuleRecord module in moduleResponse.data) if (module.active) Modules.Add(module);
        string previousId = SelectedWorker?.id;
        SelectedWorker = Workers.Find(w => w.id == previousId);
        if (SelectedWorker == null && Workers.Count > 0) SelectedWorker = Workers[0];
        SaveCache(); Changed?.Invoke();
        completed?.Invoke(workerResponse?.meta != null && workerResponse.meta.total > ApiConfig.WorkerPageSize
            ? "Showing the first 100 active workers." : null);
    }

    public void Select(int index)
    {
        if (index < 0 || index >= Workers.Count || !Workers[index].active) return;
        SelectedWorker = Workers[index]; SaveCache(); Changed?.Invoke();
    }

    public ModuleRecord Module(string id) => Modules.Find(module => module.id == id && module.active);

    private void SaveCache()
    {
        try { System.IO.File.WriteAllText(CachePath, JsonUtility.ToJson(new ContextCache
            { worker = SelectedWorker, modules = Modules.ToArray() })); } catch (Exception) { }
    }

    private void LoadCache()
    {
        try
        {
            if (!System.IO.File.Exists(CachePath)) return;
            ContextCache cache = JsonUtility.FromJson<ContextCache>(System.IO.File.ReadAllText(CachePath));
            if (cache?.worker != null && cache.worker.active) SelectedWorker = cache.worker;
            if (cache?.modules != null) Modules.AddRange(cache.modules);
        }
        catch (Exception) { }
    }
}
