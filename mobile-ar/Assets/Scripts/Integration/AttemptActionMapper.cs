using System;
using System.Collections.Generic;
using UnityEngine;

public static class AttemptActionMapper
{
    public static AttemptPayload Fire(string attemptId, DateTime startedUtc, DateTime completedUtc,
        IList<FireActionEvent> events)
    {
        AttemptAction[] actions = MapFireActions(startedUtc, events);
        return AttemptPayloadFactory.Create(attemptId, WorkerSelector.Instance?.SelectedWorker,
            WorkerSelector.Instance?.Module("fire-response"), AttemptPayloadFactory.Utc(startedUtc),
            AttemptPayloadFactory.Utc(completedUtc), actions);
    }

    public static AttemptAction[] MapFireActions(DateTime startedUtc, IList<FireActionEvent> events)
    {
        DateTime identifyTime = EventTime(startedUtc, events, "exit_identified", "wrong_exit");
        DateTime extinguisherTime = EventTime(startedUtc, events, "spray_completed", "wrong_extinguisher", "wrong_aim");
        DateTime evacuationTime = EventTime(startedUtc, events, "assembly_reached", "wrong_evac_exit", "wrong_assembly");
        extinguisherTime = Later(extinguisherTime, identifyTime);
        evacuationTime = Later(evacuationTime, extinguisherTime);
        return Sequence(new[]
            {
                Action("identify_exit", HasAny(events, "wrong_exit") ? "incorrect-object" : "safe-exit", identifyTime),
                Action("extinguisher_use", HasAny(events, "wrong_extinguisher", "wrong_aim") ? "incorrect-sequence" : "correct-sequence", extinguisherTime),
                Action("evacuation_sequence", HasAny(events, "wrong_evac_exit", "wrong_assembly") ? "incorrect-route" : "assembly-point", evacuationTime)
            });
    }

    public static AttemptPayload Gas(string attemptId, DateTime startedUtc, DateTime completedUtc,
        string hazardValue, DateTime hazardTime, string ppeValue, DateTime ppeTime,
        string buddyValue, DateTime buddyTime)
    {
        AttemptAction[] actions = MapGasActions(hazardValue, hazardTime, ppeValue, ppeTime,
            buddyValue, buddyTime);
        return AttemptPayloadFactory.Create(attemptId, WorkerSelector.Instance?.SelectedWorker,
            WorkerSelector.Instance?.Module("gas-confined-space"), AttemptPayloadFactory.Utc(startedUtc),
            AttemptPayloadFactory.Utc(completedUtc), actions);
    }

    public static AttemptAction[] MapGasActions(string hazardValue, DateTime hazardTime,
        string ppeValue, DateTime ppeTime, string buddyValue, DateTime buddyTime)
    {
        ppeTime = Later(ppeTime, hazardTime); buddyTime = Later(buddyTime, ppeTime);
        return Sequence(new[]
            {
                Action("recognise_hazard_zone", hazardValue, hazardTime),
                Action("select_ppe", ppeValue, ppeTime),
                Action("buddy_system", buddyValue, buddyTime)
            });
    }

    private static AttemptAction[] Sequence(AttemptAction[] actions)
    {
        for (int i = 0; i < actions.Length; i++) actions[i].sequenceNumber = i;
        return actions;
    }

    private static AttemptAction Action(string step, string value, DateTime time) => new AttemptAction
        { stepId = step, selectedValue = value, occurredAt = AttemptPayloadFactory.Utc(time) };
    private static DateTime Later(DateTime value, DateTime previous) => value < previous ? previous : value;
    private static bool HasAny(IList<FireActionEvent> events, params string[] keys)
    {
        foreach (FireActionEvent entry in events)
            foreach (string key in keys) if (entry.key == key) return true;
        return false;
    }
    private static DateTime EventTime(DateTime started, IList<FireActionEvent> events, params string[] keys)
    {
        float elapsed = 0f;
        foreach (FireActionEvent entry in events)
            foreach (string key in keys) if (entry.key == key) elapsed = Mathf.Max(elapsed, entry.elapsedSeconds);
        return started.AddSeconds(elapsed);
    }
}
