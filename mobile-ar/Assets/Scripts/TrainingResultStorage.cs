using System;
using UnityEngine;

[Serializable]
public class TrainingResult
{
    public string exerciseId;
    public int score;
    public int incorrectSelections;
    public float durationSeconds;
    public string completedAtUtc;
}

public static class TrainingResultStorage
{
    private const string StorageKey =
        "FireTraining.LatestIdentificationResult";

    public static void Save(
        int score,
        int incorrectSelections,
        float durationSeconds)
    {
        TrainingResult result = new TrainingResult
        {
            exerciseId = "fire-object-identification-v1",
            score = score,
            incorrectSelections = incorrectSelections,
            durationSeconds = durationSeconds,
            completedAtUtc = DateTime.UtcNow.ToString("o")
        };

        string json = JsonUtility.ToJson(result);

        PlayerPrefs.SetString(StorageKey, json);
        PlayerPrefs.Save();
    }

    public static TrainingResult LoadLatest()
    {
        if (!PlayerPrefs.HasKey(StorageKey))
            return null;

        string json = PlayerPrefs.GetString(StorageKey);

        try
        {
            return JsonUtility.FromJson<TrainingResult>(json);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }
}