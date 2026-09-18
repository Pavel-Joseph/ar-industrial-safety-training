import React from "react";

// A plain SVG progress ring — no charting library needed for a single
// value. Used at two sizes: large for the KPI strip's "Overall Readiness",
// small for each result card's score. Colour is passed in (not chosen
// here) so it always comes from the existing palette tokens rather than
// introducing new ones.
export default function RadialRing({
  value = 0,
  size = 72,
  strokeWidth = 7,
  color = "var(--signal-go-strong)",
  trackColor = "var(--surface-sunken)",
  label,
  sublabel
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="radial-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="radial-ring-arc"
        />
      </svg>
      <div className="radial-ring-center">
        <span className="radial-ring-value">{label ?? `${clamped}%`}</span>
        {sublabel && <span className="radial-ring-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
}
