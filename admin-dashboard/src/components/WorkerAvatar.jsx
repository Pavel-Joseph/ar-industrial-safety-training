import React from "react";
import { HardHat } from "lucide-react";

// Stands in for a worker photograph: a circular badge with a hard-hat
// glyph and a status-coloured ring, rather than a fabricated photo of a
// specific named person. Colour is driven by pass/fail so the card reads
// correctly at a glance even before you reach the PASS/FAIL tag.
export default function WorkerAvatar({ status, size = 52 }) {
  const ringColor = status === "pass" ? "var(--signal-go-strong)" : status === "fail" ? "var(--signal-stop-strong)" : "var(--border-strong)";
  return (
    <div
      className="worker-avatar-photo"
      style={{
        width: size,
        height: size,
        borderColor: ringColor
      }}
    >
      <HardHat size={Math.round(size * 0.46)} strokeWidth={2} />
    </div>
  );
}
