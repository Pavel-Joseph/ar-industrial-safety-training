using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

[RequireComponent(typeof(Button))]
public class HoldToSprayButton : MonoBehaviour,
    IPointerDownHandler, IPointerUpHandler, IDragHandler
{
    [SerializeField] private TapToPlace training;

    private Button button;

    private void Awake()
    {
        button = GetComponent<Button>();
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        if (button.interactable && training != null)
            training.BeginSpray();
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        if (training != null)
            training.EndSpray();
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (training != null)
            training.UpdateExtinguisherDrag(eventData.position);
    }

    private void OnDisable()
    {
        if (training != null)
            training.CancelSpray();
    }
}
