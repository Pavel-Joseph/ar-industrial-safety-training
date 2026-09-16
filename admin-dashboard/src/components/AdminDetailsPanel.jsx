import React, { useEffect, useRef } from "react";
import { X, ShieldCheck, Mail, KeyRound, Database, Languages, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { LANGUAGES } from "../i18n/strings.js";
import { isLiveMode } from "../api/client.js";

// Opened by clicking the admin chip in the top bar. Shows who is signed in
// and what the session is actually connected to — deliberately limited to
// information the dashboard already holds (the admin record returned by
// login, plus the live/sample data source), so it needs no new endpoint.
// If Person 2 later adds GET /api/auth/me with richer profile fields, they
// drop straight into this panel without changing anything else.
export default function AdminDetailsPanel({ onClose }) {
  const { admin, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  const initials = (admin?.name || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const languageLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  return (
    <div className="admin-panel" ref={ref} role="dialog" aria-label={t("admin_panel_title")}>
      <div className="admin-panel-head">
        <div className="admin-panel-identity">
          <div className="admin-panel-avatar">{initials}</div>
          <div>
            <strong>{admin?.name || "Administrator"}</strong>
            <span>{t("admin_panel_title")}</span>
          </div>
        </div>
        <button className="modal-close" onClick={onClose} aria-label={t("admin_panel_close")}>
          <X size={17} />
        </button>
      </div>

      <div className="admin-panel-rows">
        <div className="admin-panel-row">
          <span className="k">
            <ShieldCheck />
            {t("admin_panel_role")}
          </span>
          <span className="v">{admin?.role || "admin"}</span>
        </div>
        <div className="admin-panel-row">
          <span className="k">
            <Mail />
            {t("admin_panel_email")}
          </span>
          <span className="v mono">{admin?.email || "—"}</span>
        </div>
        <div className="admin-panel-row">
          <span className="k">
            <KeyRound />
            {t("admin_panel_session")}
          </span>
          <span className="v">Active</span>
        </div>
        <div className="admin-panel-row">
          <span className="k">
            <Database />
            {t("admin_panel_data_source")}
          </span>
          <span className="v">
            <span className={`pulse-dot ${isLiveMode() ? "live" : "mock"}`} />
            {isLiveMode() ? "Live API" : "Sample data"}
          </span>
        </div>
        <div className="admin-panel-row">
          <span className="k">
            <Languages />
            {t("admin_panel_language")}
          </span>
          <select
            className="select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t("admin_panel_language")}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn btn-ghost admin-panel-signout" onClick={signOut}>
        <LogOut size={16} strokeWidth={2.2} />
        {t("sign_out")}
      </button>
    </div>
  );
}
