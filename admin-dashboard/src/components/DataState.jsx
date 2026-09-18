import React from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// One shared component for the three states every list/detail view can be
// in. Keeping this centralised means "loading, empty and error states" (a
// Day 2 requirement) are consistent across Workers, Results and
// Certificates instead of each page inventing its own.

export function Loading({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i} style={{ width: `${92 - i * 6}%` }} />
      ))}
    </div>
  );
}

export function Empty({ title, body, glyph = "NO RECORDS" }) {
  return (
    <div className="data-state">
      <div className="glyph">{glyph}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function ErrorState({ title, body }) {
  const { t } = useLanguage();
  return (
    <div className="data-state error">
      <div className="glyph">CONNECTION</div>
      <h3>{title || t("error_generic_title")}</h3>
      <p>{body || t("error_generic_body")}</p>
    </div>
  );
}

export function SampleDataBanner() {
  const { t } = useLanguage();
  return (
    <div
      className="badge badge-caution"
      style={{ marginBottom: 14, display: "inline-flex" }}
      title="VITE_API_BASE_URL is not set, so this view is showing sample data."
    >
      <span className="bulb" />
      Sample data — set VITE_API_BASE_URL to connect live records.
    </div>
  );
}
