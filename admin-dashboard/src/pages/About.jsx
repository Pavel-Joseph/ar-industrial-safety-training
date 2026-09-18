import React, { useEffect, useState } from "react";
import { WifiOff, Languages, Smartphone, ShieldCheck, Flame, Wind, Mountain } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, ErrorState } from "../components/DataState.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

// Static "About Us" content plus a live Training Modules showcase. The
// module cards pull real numbers (attempts, pass rate) from the same
// getAttempts()/getModules() calls the rest of the dashboard uses — no new
// backend endpoint needed, and it reads sample data until the live API is
// connected just like every other page.

const MODULE_PRESENTATION = {
  mod_fire: { Icon: Flame, color: "#a75a1d", descKey: "module_fire_desc" },
  mod_gas: { Icon: Wind, color: "#db9f75", fg: "#1a1208", descKey: "module_gas_desc" },
  mod_bonus: { Icon: Mountain, color: "#6e7261", descKey: "module_bonus_desc" },
  "fire-response": { Icon: Flame, color: "#a75a1d", descKey: "module_fire_desc" },
  "gas-confined-space": { Icon: Wind, color: "#db9f75", fg: "#1a1208", descKey: "module_gas_desc" },
  "jharkhand-mine-safety": { Icon: Mountain, color: "#6e7261", descKey: "module_bonus_desc" }
};

export default function About() {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", modules: [], attempts: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getModules(), api.getAttempts()])
      .then(([modulesRes, attemptsRes]) => {
        if (!cancelled) setState({ status: "ready", modules: modulesRes.data, attempts: attemptsRes.data });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout title={t("nav_about")} subtitle={t("about_eyebrow")}>
      <div className="about-hero">
        <div className="eyebrow">{t("about_eyebrow")}</div>
        <h1>{t("about_title")}</h1>
        <p>{t("about_body")}</p>
      </div>

      <div className="about-feature-grid">
        <div className="about-feature">
          <WifiOff strokeWidth={2} />
          <h4>{t("about_feature_offline_title")}</h4>
          <p>{t("about_feature_offline_body")}</p>
        </div>
        <div className="about-feature">
          <Languages strokeWidth={2} />
          <h4>{t("about_feature_language_title")}</h4>
          <p>{t("about_feature_language_body")}</p>
        </div>
        <div className="about-feature">
          <Smartphone strokeWidth={2} />
          <h4>{t("about_feature_devices_title")}</h4>
          <p>{t("about_feature_devices_body")}</p>
        </div>
        <div className="about-feature">
          <ShieldCheck strokeWidth={2} />
          <h4>{t("about_feature_cert_title")}</h4>
          <p>{t("about_feature_cert_body")}</p>
        </div>
      </div>

      <div className="section-heading">
        <h2>{t("training_modules_heading")}</h2>
        <p>{t("training_modules_sub")}</p>
      </div>

      {state.status === "loading" && <Loading rows={3} />}
      {state.status === "error" && <ErrorState />}

      {state.status === "ready" && (
        <div className="module-box-grid">
          {state.modules.map((m) => {
            const presentation = MODULE_PRESENTATION[m.id] || { Icon: ShieldCheck, color: "var(--brand)", descKey: "" };
            const moduleAttempts = state.attempts.filter((a) => a.moduleId === m.id);
            const passCount = moduleAttempts.filter((a) => a.status === "pass").length;
            const passRate = moduleAttempts.length ? Math.round((passCount / moduleAttempts.length) * 100) : 0;
            return (
              <div className="module-box" key={m.id}>
                {m.code === "BONUS" && <span className="badge badge-caution">Bonus module</span>}
                <div className="module-box-icon" style={{ background: presentation.color, color: presentation.fg || "#fff" }}>
                  <presentation.Icon strokeWidth={2.2} />
                </div>
                <h3>{m.name}</h3>
                <p>{t(presentation.descKey)}</p>
                <div className="module-box-stats">
                  <div>
                    <span className="n">{moduleAttempts.length}</span>
                    <span className="l">{t("module_stat_attempts")}</span>
                  </div>
                  <div>
                    <span className="n">{passRate}%</span>
                    <span className="l">{t("module_stat_pass_rate")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
