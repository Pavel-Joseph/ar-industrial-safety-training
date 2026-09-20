using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class FireActionEvent
{
    public string key;
    public bool correct;
    public float elapsedSeconds;
}

[Serializable]
public class FireModuleResult
{
    public string attemptId;
    public string workerId;
    public string moduleId;
    public string scoringVersion;
    public string completedAtUtc;
    public float totalDurationSeconds;
    public int score;
    public bool passed;
    public int incorrectSelections;
    public int identificationScore;
    public float identificationDurationSeconds;
    public float evacuationDurationSeconds;
    public bool sprayPracticeCompleted;
    public string syncState;
    public FireActionEvent[] events;
}

[Serializable]
internal class FireAttemptCollection
{
    public List<FireModuleResult> attempts = new List<FireModuleResult>();
}

public static class FireModuleResultStorage
{
    private const string StorageKey = "FireTraining.Attempts.v2";

    public static void Save(FireModuleResult result)
    {
        if (result == null || string.IsNullOrEmpty(result.attemptId))
            return;

        FireAttemptCollection collection = LoadAll();
        int existing = collection.attempts.FindIndex(a => a.attemptId == result.attemptId);
        if (existing >= 0)
            collection.attempts[existing] = result;
        else
            collection.attempts.Add(result);

        PlayerPrefs.SetString(StorageKey, JsonUtility.ToJson(collection));
        PlayerPrefs.Save();
    }

    public static FireModuleResult LoadLatest()
    {
        List<FireModuleResult> attempts = LoadAll().attempts;
        return attempts.Count == 0 ? null : attempts[attempts.Count - 1];
    }

    public static List<FireModuleResult> Pending()
    {
        return LoadAll().attempts.FindAll(a => a.syncState != "synced");
    }

    public static void MarkSynced(string attemptId)
    {
        FireAttemptCollection collection = LoadAll();
        FireModuleResult result = collection.attempts.Find(a => a.attemptId == attemptId);
        if (result == null)
            return;

        result.syncState = "synced";
        PlayerPrefs.SetString(StorageKey, JsonUtility.ToJson(collection));
        PlayerPrefs.Save();
    }

    private static FireAttemptCollection LoadAll()
    {
        if (!PlayerPrefs.HasKey(StorageKey))
            return new FireAttemptCollection();

        try
        {
            FireAttemptCollection loaded = JsonUtility.FromJson<FireAttemptCollection>(
                PlayerPrefs.GetString(StorageKey));
            return loaded != null && loaded.attempts != null
                ? loaded : new FireAttemptCollection();
        }
        catch (ArgumentException)
        {
            return new FireAttemptCollection();
        }
    }
}
