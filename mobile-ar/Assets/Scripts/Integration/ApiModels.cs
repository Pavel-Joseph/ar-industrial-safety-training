using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable] public class LoginRequest { public string email; public string password; }
[Serializable] public class LoginUser { public string id; public string email; public string role; }
[Serializable] public class LoginData { public string accessToken; public string tokenType; public int expiresIn; public LoginUser user; }
[Serializable] public class LoginResponse { public LoginData data; }

[Serializable]
public class WorkerRecord
{
    public string id;
    public string employeeCode;
    public string fullName;
    public string preferredLanguage;
    public bool active;
}
[Serializable] public class PageMeta { public int total; public int limit; public int offset; }
[Serializable] public class WorkerListResponse { public WorkerRecord[] data; public PageMeta meta; }

[Serializable]
public class ModuleRecord
{
    public string id;
    public string name;
    public int currentVersion;
    public int scoringVersion;
    public float passMark;
    public bool required;
    public bool active;
}
[Serializable] public class ModuleListResponse { public ModuleRecord[] data; }

[Serializable] public class DeviceMetadata { public string platform; public string deviceModel; public string appVersion; }
[Serializable]
public class AttemptAction
{
    public string stepId;
    public string selectedValue;
    public string occurredAt;
    public int sequenceNumber;
}
[Serializable]
public class AttemptPayload
{
    public string attemptId;
    public string workerId;
    public string moduleId;
    public int moduleVersion;
    public int scoringVersion;
    public string languageCode;
    public string startedAt;
    public string completedAt;
    public DeviceMetadata deviceMetadata;
    public AttemptAction[] actions;
}

[Serializable] public class ServerScore { public float total; public float maximum; public float percentage; public bool passed; }
[Serializable]
public class AttemptAcknowledgement
{
    public string attemptId;
    public string syncStatus;
    public string resultStatus;
    public string certificateStatus;
    public ServerScore score;
}
[Serializable] public class AttemptSyncResponse { public AttemptAcknowledgement data; }
[Serializable] public class ApiErrorBody { public string code; public string message; public ApiErrorDetail[] details; }
[Serializable] public class ApiErrorDetail { public string field; public string message; }
[Serializable] public class ApiErrorResponse { public ApiErrorBody error; }

[Serializable]
public class QueuedAttempt
{
    public string attemptId;
    public string payloadJson;
    public string state;
    public string lastError;
    public int localProvisionalScore;
    public int retryCount;
    public string updatedAt;
    public AttemptAcknowledgement serverResult;
}
[Serializable] public class AttemptQueueFile { public List<QueuedAttempt> attempts = new(); }

public static class AttemptPayloadFactory
{
    public static AttemptPayload Create(string id, WorkerRecord worker, ModuleRecord module,
        string startedAt, string completedAt, AttemptAction[] actions)
    {
        if (worker == null || module == null) return null;
        for (int i = 0; i < actions.Length; i++) actions[i].sequenceNumber = i;
        string language = worker.preferredLanguage;
        if (language != "en" && language != "hi" && language != "sat") language = "en";
        return new AttemptPayload
        {
            attemptId = id,
            workerId = worker.id,
            moduleId = module.id,
            moduleVersion = module.currentVersion,
            scoringVersion = module.scoringVersion,
            languageCode = language,
            startedAt = startedAt,
            completedAt = completedAt,
            deviceMetadata = new DeviceMetadata
            {
                platform = Application.platform.ToString(),
                deviceModel = SystemInfo.deviceModel,
                appVersion = Application.version
            },
            actions = actions
        };
    }

    public static string Utc(DateTime value) => value.ToUniversalTime().ToString("O");
}
