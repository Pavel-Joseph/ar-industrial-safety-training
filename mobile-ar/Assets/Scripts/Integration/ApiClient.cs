using System;
using System.Collections;
using System.Text;
using UnityEngine.Networking;

public sealed class ApiResult
{
    public long statusCode;
    public string body;
    public string transportError;
    public bool Success => statusCode >= 200 && statusCode < 300 && string.IsNullOrEmpty(transportError);
}

public static class ApiClient
{
    public static IEnumerator Send(string method, string path, string body, string bearerToken,
        Action<ApiResult> complete)
    {
        string url = ApiConfig.Origin.TrimEnd('/') + "/" + path.TrimStart('/');
        using UnityWebRequest request = new UnityWebRequest(url, method);
        request.downloadHandler = new DownloadHandlerBuffer();
        if (!string.IsNullOrEmpty(body))
        {
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            request.SetRequestHeader("Content-Type", "application/json");
        }
        if (!string.IsNullOrEmpty(bearerToken))
            request.SetRequestHeader("Authorization", "Bearer " + bearerToken);
        request.timeout = ApiConfig.TimeoutSeconds;
        yield return request.SendWebRequest();
        complete?.Invoke(new ApiResult
        {
            statusCode = request.responseCode,
            body = request.downloadHandler?.text ?? "",
            transportError = request.result == UnityWebRequest.Result.ConnectionError ||
                             request.result == UnityWebRequest.Result.DataProcessingError
                ? request.error : null
        });
    }
}
