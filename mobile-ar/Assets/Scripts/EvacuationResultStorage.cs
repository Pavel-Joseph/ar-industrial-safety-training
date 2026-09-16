using System;
using UnityEngine;

[Serializable]
public class EvacuationResult
{
    public string exerciseId;
    public float durationSeconds;
    public int incorrectSelections;
    public string completedAtUtc;
}

public static class EvacuationResultStorage
{
    private const string StorageKey =
        "FireTraining.LatestEvacuationResult";

    public static void Save(
        float durationSeconds,
        int incorrectSelections)
    {
        EvacuationResult result = new EvacuationResult
        {
            exerciseId = "fire-evacuation-sequence-v1",
            durationSeconds = durationSeconds,
            incorrectSelections = incorrectSelections,
            completedAtUtc = DateTime.UtcNow.ToString("o")
        };

        string json = JsonUtility.ToJson(result);

        PlayerPrefs.SetString(StorageKey, json);
        PlayerPrefs.Save();
    }

    public static EvacuationResult LoadLatest()
    {
        if (!PlayerPrefs.HasKey(StorageKey))
            return null;

        string json = PlayerPrefs.GetString(StorageKey);

        try
        {
            return JsonUtility.FromJson<EvacuationResult>(json);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }
}