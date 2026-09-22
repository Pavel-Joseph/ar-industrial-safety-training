using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

public static class OfflineAttemptQueue
{
    private static string FilePath => Path.Combine(Application.persistentDataPath, "attempt-queue.json");

    public static List<QueuedAttempt> Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return new List<QueuedAttempt>();
            AttemptQueueFile file = JsonUtility.FromJson<AttemptQueueFile>(File.ReadAllText(FilePath));
            return file?.attempts ?? new List<QueuedAttempt>();
        }
        catch (Exception) { return new List<QueuedAttempt>(); }
    }

    public static void Save(List<QueuedAttempt> attempts)
    {
        string temp = FilePath + ".tmp";
        File.WriteAllText(temp, JsonUtility.ToJson(new AttemptQueueFile { attempts = attempts }, true));
        if (File.Exists(FilePath)) File.Delete(FilePath);
        File.Move(temp, FilePath);
    }

    public static void Enqueue(AttemptPayload payload, int localScore)
    {
        if (payload == null) return;
        List<QueuedAttempt> items = Load();
        if (items.Exists(item => item.attemptId == payload.attemptId)) return;
        items.Add(new QueuedAttempt
        {
            attemptId = payload.attemptId,
            payloadJson = JsonUtility.ToJson(payload),
            state = "pending",
            localProvisionalScore = localScore,
            updatedAt = DateTime.UtcNow.ToString("O")
        });
        Save(items);
    }
}
