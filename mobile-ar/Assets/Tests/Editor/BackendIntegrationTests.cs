using System;
using System.Collections.Generic;
using NUnit.Framework;

public class BackendIntegrationTests
{
    [Test]
    public void AttemptPayloadUsesFullUuidAndIntegerVersions()
    {
        string id = Guid.NewGuid().ToString();
        AttemptPayload payload = AttemptPayloadFactory.Create(id,
            new WorkerRecord { id = Guid.NewGuid().ToString(), active = true, preferredLanguage = "hi" },
            new ModuleRecord { id = "fire-response", currentVersion = 2, scoringVersion = 3, active = true },
            DateTime.UtcNow.AddMinutes(-1).ToString("O"), DateTime.UtcNow.ToString("O"),
            new[] { new AttemptAction { stepId = "identify_exit", selectedValue = "safe-exit", occurredAt = DateTime.UtcNow.ToString("O") } });
        Assert.That(payload.attemptId, Does.Match("^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"));
        Assert.AreEqual(2, payload.moduleVersion);
        Assert.AreEqual(3, payload.scoringVersion);
        Assert.AreEqual(0, payload.actions[0].sequenceNumber);
    }

    [Test]
    public void FireMappingUsesOnlyContractStepsAndPreservesWrongSelection()
    {
        DateTime start = DateTime.UtcNow.AddMinutes(-2);
        AttemptAction[] actions = AttemptActionMapper.MapFireActions(start, new List<FireActionEvent>
        {
            new FireActionEvent { key = "wrong_exit", correct = false, elapsedSeconds = 2 },
            new FireActionEvent { key = "exit_identified", correct = true, elapsedSeconds = 4 },
            new FireActionEvent { key = "spray_completed", correct = true, elapsedSeconds = 9 },
            new FireActionEvent { key = "assembly_reached", correct = true, elapsedSeconds = 14 }
        });
        CollectionAssert.AreEqual(new[] { "identify_exit", "extinguisher_use", "evacuation_sequence" },
            Array.ConvertAll(actions, action => action.stepId));
        Assert.AreEqual("incorrect-object", actions[0].selectedValue);
        Assert.AreEqual("correct-sequence", actions[1].selectedValue);
        Assert.AreEqual("assembly-point", actions[2].selectedValue);
    }

    [Test]
    public void GasMappingHasOrderedContractActions()
    {
        DateTime start = DateTime.UtcNow.AddMinutes(-1);
        AttemptAction[] actions = AttemptActionMapper.MapGasActions("outside-hazard-zone", start,
            "approved-ppe", start.AddSeconds(3), "buddy-confirmed", start.AddSeconds(8));
        CollectionAssert.AreEqual(new[] { "recognise_hazard_zone", "select_ppe", "buddy_system" },
            Array.ConvertAll(actions, action => action.stepId));
        for (int i = 0; i < actions.Length; i++)
        {
            Assert.AreEqual(i, actions[i].sequenceNumber);
            if (i > 0) Assert.GreaterOrEqual(DateTime.Parse(actions[i].occurredAt), DateTime.Parse(actions[i - 1].occurredAt));
        }
    }

    [TestCase("accepted")]
    [TestCase("already-accepted")]
    public void AcceptedStatesAreRecognized(string state)
    {
        string id = Guid.NewGuid().ToString();
        Assert.IsTrue(AttemptSyncManager.IsSuccessfulAcknowledgement(state, id, id));
        Assert.IsFalse(AttemptSyncManager.IsSuccessfulAcknowledgement(state, id, Guid.NewGuid().ToString()));
    }

    [Test]
    public void AttemptPayloadSerializesContractFields()
    {
        string id = Guid.NewGuid().ToString();
        AttemptPayload payload = AttemptPayloadFactory.Create(id,
            new WorkerRecord { id = Guid.NewGuid().ToString(), active = true, preferredLanguage = "en" },
            new ModuleRecord { id = "fire-response", currentVersion = 1, scoringVersion = 1, active = true },
            DateTime.UtcNow.AddSeconds(-5).ToString("O"), DateTime.UtcNow.ToString("O"),
            new[] { new AttemptAction { stepId = "identify_exit", selectedValue = "safe-exit", occurredAt = DateTime.UtcNow.ToString("O") } });
        string json = UnityEngine.JsonUtility.ToJson(payload);
        StringAssert.Contains("\"attemptId\":\"" + id + "\"", json);
        StringAssert.Contains("\"moduleVersion\":1", json);
        StringAssert.Contains("\"sequenceNumber\":0", json);
        StringAssert.DoesNotContain("password", json.ToLowerInvariant());
    }

    [TestCase(0, "network", "pending")]
    [TestCase(408, "timeout", "pending")]
    [TestCase(429, "rate limited", "pending")]
    [TestCase(503, "unavailable", "pending")]
    [TestCase(422, "validation", "rejected")]
    [TestCase(404, "worker missing", "needs-correction")]
    [TestCase(409, "ATTEMPT_ID_CONFLICT", "conflict")]
    [TestCase(409, "VERSION_MISMATCH", "version-mismatch")]
    public void SyncFailuresAreClassified(long status, string message, string expected)
    {
        Assert.AreEqual(expected, AttemptSyncManager.ClassifyFailure(status, message));
    }

    [Test]
    public void OfflineQueueSavesLoadsAndDeduplicatesAttempt()
    {
        string id = Guid.NewGuid().ToString();
        List<QueuedAttempt> original = OfflineAttemptQueue.Load();
        try
        {
            AttemptPayload payload = new AttemptPayload { attemptId = id, workerId = Guid.NewGuid().ToString() };
            OfflineAttemptQueue.Enqueue(payload, 72);
            OfflineAttemptQueue.Enqueue(payload, 72);
            List<QueuedAttempt> loaded = OfflineAttemptQueue.Load();
            Assert.AreEqual(1, loaded.FindAll(item => item.attemptId == id).Count);
            Assert.AreEqual("pending", loaded.Find(item => item.attemptId == id).state);
        }
        finally
        {
            OfflineAttemptQueue.Save(original);
        }
    }
}
