using System;
using System.Collections;
using UnityEngine;

public sealed class AuthManager : MonoBehaviour
{
    public static AuthManager Instance { get; private set; }
    public string AccessToken { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public LoginUser User { get; private set; }
    public bool IsAuthenticated => !string.IsNullOrEmpty(AccessToken) && DateTime.UtcNow < ExpiresAtUtc;
    public event Action SessionChanged;

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
    }

    public IEnumerator Login(string email, string password, Action<string> completed)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
        { completed?.Invoke("Enter email and password."); yield break; }
        LoginRequest payload = new LoginRequest { email = email.Trim(), password = password };
        ApiResult result = null;
        yield return ApiClient.Send("POST", "/api/auth/login", JsonUtility.ToJson(payload), null,
            value => result = value);
        password = null;
        if (result == null || !result.Success)
        { completed?.Invoke(ApiErrors.Message(result)); yield break; }
        LoginResponse response = null;
        try { response = JsonUtility.FromJson<LoginResponse>(result.body); } catch (ArgumentException) { }
        if (response?.data == null || string.IsNullOrEmpty(response.data.accessToken))
        { completed?.Invoke("The login response did not contain an access token."); yield break; }
        AccessToken = response.data.accessToken;
        ExpiresAtUtc = DateTime.UtcNow.AddSeconds(Mathf.Max(1, response.data.expiresIn));
        User = response.data.user;
        SessionChanged?.Invoke();
        completed?.Invoke(null);
    }

    public void Logout()
    {
        AccessToken = null;
        User = null;
        ExpiresAtUtc = DateTime.MinValue;
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
            if (error?.error != null) return error.error.code + ": " + error.error.message;
        }
        catch (ArgumentException) { }
        return "Backend request failed (HTTP " + result.statusCode + ").";
    }
}
