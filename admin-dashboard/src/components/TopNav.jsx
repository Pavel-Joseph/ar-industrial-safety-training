import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BadgeCheck, Info } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const NAV_ITEMS = [
  { to: "/", key: "nav_overview", Icon: LayoutDashboard, end: true },
  { to: "/workers", key: "nav_workers_results", Icon: Users },
  { to: "/certificates", key: "nav_certificates", Icon: BadgeCheck },
  { to: "/about", key: "nav_about", Icon: Info }
];

export default function TopNav() {
  const { t } = useLanguage();

  return (
    <nav className="topnav" aria-label="Primary">
      {NAV_ITEMS.map(({ to, key, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">
            <Icon size={18} strokeWidth={2.2} />
          </span>
          {t(key)}
        </NavLink>
      ))}
    </nav>
  );
}
