using System;
using System.Collections;
using UnityEngine;

public sealed class AuthManager : MonoBehaviour
{
    public static AuthManager Instance { get; private set; }
    public string AccessToken { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public bool IsAuthenticated => !string.IsNullOrEmpty(AccessToken) && DateTime.UtcNow < ExpiresAtUtc;
    public event Action SessionChanged;

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
    }

    public IEnumerator WorkerLogin(string employeeCode, string pin, Action<string> completed)
    {
        if (string.IsNullOrWhiteSpace(employeeCode) || string.IsNullOrWhiteSpace(pin))
        { completed?.Invoke("Enter employee code and PIN."); yield break; }
        WorkerLoginRequest payload = new WorkerLoginRequest
            { employeeCode = employeeCode.Trim().ToUpperInvariant(), pin = pin.Trim() };
        ApiResult result = null;
        yield return ApiClient.Send("POST", "/api/auth/worker-login", JsonUtility.ToJson(payload),
            null, value => result = value);
        payload.pin = null; pin = null;
        if (result == null || !result.Success)
        { completed?.Invoke(ApiErrors.Message(result)); yield break; }
        WorkerLoginResponse response = null;
        try { response = JsonUtility.FromJson<WorkerLoginResponse>(result.body); }
        catch (ArgumentException) { }
        if (response?.data?.worker == null || string.IsNullOrEmpty(response.data.accessToken))
        { completed?.Invoke("The worker login response was incomplete."); yield break; }
        AccessToken = response.data.accessToken;
        ExpiresAtUtc = DateTime.UtcNow.AddSeconds(Mathf.Max(1, response.data.expiresIn));
        WorkerSelector.Instance?.SetAuthenticatedWorker(response.data.worker);
        SessionChanged?.Invoke();
        completed?.Invoke(null);
    }

    public void Logout()
    {
        AccessToken = null;
        ExpiresAtUtc = DateTime.MinValue;
        WorkerSelector.Instance?.ClearSession();
        SessionChanged?.Invoke();
    }
}

public static class ApiErrors
{
    public static string Message(ApiResult result)
    {
        if (result == null) return "No response from the backend.";
        if (!string.IsNullOrEmpty(result.transportError)) return result.transportError;
        try
        {
            ApiErrorResponse error = JsonUtility.FromJson<ApiErrorResponse>(result.body);
            if (error?.error != null)
            {
                string message = error.error.code + ": " + error.error.message;
                if (error.error.details != null && error.error.details.Length > 0)
                    message += " (" + error.error.details[0].field + ": " +
                        error.error.details[0].message + ")";
                return message;
            }
        }
        catch (ArgumentException) { }
        return "Backend request failed (HTTP " + result.statusCode + ").";
    }
}
