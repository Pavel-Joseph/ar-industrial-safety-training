using UnityEngine;

public static class IntegrationRuntime
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Bootstrap()
    {
        if (Object.FindFirstObjectByType<AuthManager>() != null) return;
        GameObject root = new GameObject("Backend Integration");
        Object.DontDestroyOnLoad(root);
        root.AddComponent<AuthManager>();
        root.AddComponent<WorkerSelector>();
        root.AddComponent<AttemptSyncManager>();
    }

    public static bool TrainingContextReady => WorkerSelector.Instance != null && WorkerSelector.Instance.HasTrainingContext;
    public static void RequireSetup()
    {
        FireTrainingUIController.ShowWorkerLogin("Sign in before starting training.");
    }
}
