import React from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const NAV_ITEMS = [
  { to: "/", key: "nav_overview", icon: "◧", end: true },
  { to: "/workers", key: "nav_workers", icon: "◍" },
  { to: "/results", key: "nav_results", icon: "▤" },
  { to: "/certificates", key: "nav_certificates", icon: "◈" }
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">AR</div>
        <div className="brand-text">
          <strong>{t("appName")}</strong>
          <span>{t("appTagline")}</span>
        </div>
      </div>

      <nav className="nav-group">
        <div className="nav-label">MONITOR</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {t(item.key)}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        AR Industrial Safety Training
        <br />
        Prototype build
      </div>
    </aside>
  );
}
