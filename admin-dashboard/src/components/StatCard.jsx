import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ label, value, foot, icon, color = "blue", trend, compact = false }) {
  return (
    <div className={`stat-card accent-${color}${compact ? " compact" : ""}`}>
      <div className="stat-top">
        <div>
          <div className="stat-label">{label}</div>
        </div>
        <div className={`stat-icon-chip ${color}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        {trend && (
          <span className={`stat-trend ${trend.direction}`}>
            {trend.direction === "up" ? <TrendingUp /> : <TrendingDown />}
            {trend.label}
          </span>
        )}
        {foot && <span className="stat-foot">{foot}</span>}
      </div>
    </div>
  );
}
