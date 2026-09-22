using UnityEngine;

public class FaceCamera : MonoBehaviour
{
    private Camera arCamera;

    private void LateUpdate()
    {
        if (arCamera == null)
            arCamera = Camera.main;

        if (arCamera == null)
            return;

        transform.rotation = arCamera.transform.rotation;
    }
}