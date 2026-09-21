import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import AdminDetailsPanel from "./AdminDetailsPanel.jsx";

export default function Topbar({ title, subtitle }) {
  const { admin } = useAuth();
  const { t } = useLanguage();
  const [showAdmin, setShowAdmin] = useState(false);

  const initials = (admin?.name || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <img src="/images/johAR.png" alt="JohAR logo" className="brand-logo" />
        </div>
        <div
          className="page-heading"
          style={{ marginLeft: 18, paddingLeft: 18, borderLeft: "1px solid var(--border)" }}
        >
          <h1>{title}</h1>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        {/* The admin chip is the entry point to the account panel — language
            switching and sign-out now live in there rather than cluttering
            the bar. */}
        <div className="admin-chip-wrap">
          <button
            className={`admin-chip${showAdmin ? " open" : ""}`}
            onClick={() => setShowAdmin((v) => !v)}
            aria-expanded={showAdmin}
            aria-haspopup="dialog"
          >
            <span className="dot">{initials}</span>
            <span>{admin?.name || t("signed_in_as")}</span>
            <ChevronDown size={15} strokeWidth={2.4} className="chev" />
          </button>
          {showAdmin && <AdminDetailsPanel onClose={() => setShowAdmin(false)} />}
        </div>
      </div>
    </header>
  );
}
