using System.Collections.Generic;

// Stable Fire lesson keys. Additional reviewed translations can be added here
// without changing the training or assessment logic.
public static class FireText
{
    private static readonly Dictionary<string, string> English = new Dictionary<string, string>
    {
        ["place"] = "Tap the floor to place instantly. Tracking improves the anchors automatically.",
        ["scan_floor"] = "Tap the floor. Estimated placement works while tracking warms up.",
        ["scan_walls"] = "Wall equipment is ready and will snap to detected walls automatically.",
        ["find_exit"] = "Training area placed. Find and tap the exit door.",
        ["exit_found"] = "Exit identified! Score: {0}/100\nNow tap the fire extinguisher.",
        ["exit_first"] = "First, locate and tap the exit door.",
        ["find_extinguisher"] = "Locate and tap the fire extinguisher.",
        ["find_aim"] = "Identification complete. Tap the yellow target near the fire.",
        ["missing_effect"] = "Identification complete. Aim target or spray effect is missing.",
        ["aim_retry"] = "Tap the yellow aim target to continue.",
        ["aim_done"] = "Aim selected. Hold Spray and drag the extinguisher around every flame.",
        ["spray_hold"] = "Keep holding Spray while dragging the extinguisher around the flames.",
        ["spray_move"] = "{0}% remains. Hold Spray and drag across the remaining flames.",
        ["spray_progress"] = "Spraying... fire remaining: {0}%",
        ["spray_done"] = "Fire extinguished. Tap Practice Evacuation.",
        ["evac_start"] = "Evacuation: tap the exit door, then the blue assembly point.",
        ["evac_assembly"] = "Exit selected. Now tap the blue assembly point.",
        ["evac_exit_retry"] = "Select the exit door first.",
        ["evac_assembly_retry"] = "Now select the blue assembly point.",
        ["evac_done"] = "Sequence complete. Restart Training for a new attempt."
    };

    public static string Get(string key)
    {
        return English.TryGetValue(key, out string value) ? value : key;
    }
}
