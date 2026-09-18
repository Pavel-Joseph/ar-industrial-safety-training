import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Calendar, Users, CheckCircle2, AlertTriangle, ArrowRight, Users2 } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import RadialRing from "../components/RadialRing.jsx";
import WorkerAvatar from "../components/WorkerAvatar.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

// Card-based "Training Results" view, replacing the earlier plain table —
// each card is one attempt (a worker + module + score), same underlying
// data as before. The full attempt list (unfiltered) is kept separately
// from the filtered/displayed list so the KPI strip and each worker's
// "modules passed" progress reflect the whole picture even while a filter
// is active.
export default function Results() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState({
    status: "loading",
    source: "mock",
    modules: [],
    summary: null,
    allAttempts: []
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getModules(), api.getSummary(), api.getAttempts({})])
      .then(([modulesRes, summaryRes, attemptsRes]) => {
        if (cancelled) return;
        setState({
          status: "ready",
          source: attemptsRes.source,
          modules: modulesRes.data,
          summary: summaryRes.data,
          allAttempts: attemptsRes.data
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every module a worker has ever passed, independent of the active
  // filter — this is what each card's "Modules" progress bar reads from,
  // so it stays a true overall figure rather than resetting when you
  // filter down to one module.
  const passedModulesByWorker = useMemo(() => {
    const map = {};
    state.allAttempts
      .filter((a) => a.status === "pass")
      .forEach((a) => {
        if (!map[a.workerId]) map[a.workerId] = new Set();
        map[a.workerId].add(a.moduleId);
      });
    return map;
  }, [state.allAttempts]);

  const filteredResults = useMemo(() => {
    return state.allAttempts
      .filter((a) => (moduleId ? a.moduleId === moduleId : true))
      .filter((a) => (status ? a.status === status : true))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  }, [state.allAttempts, moduleId, status]);

  const totalModules = state.modules.length || 1;

  const dateRangeLabel = useMemo(() => {
    if (state.allAttempts.length === 0) return null;
    const dates = state.allAttempts.map((a) => new Date(a.completedAt));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(min)} — ${fmt(max)}`;
  }, [state.allAttempts]);

  const avgScore = state.allAttempts.length
    ? Math.round(state.allAttempts.reduce((sum, a) => sum + a.score, 0) / state.allAttempts.length)
    : 0;
  const passedCount = state.allAttempts.filter((a) => a.status === "pass" && a.syncState === "synced").length;
  const needReviewCount = state.allAttempts.length - passedCount;

  return (
    <Layout title={t("nav_results")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

      <div className="results-header">
        <div className="results-header-title">
          <div className="results-header-icon">
            <Flag />
          </div>
          <div>
            <h1>{t("results_title")}</h1>
            <p>{t("results_sub")}</p>
          </div>
        </div>
        {dateRangeLabel && (
          <span className="daterange-pill">
            <Calendar />
            {dateRangeLabel}
          </span>
        )}
      </div>

      {state.status === "error" && <ErrorState />}

      {state.status !== "error" && (
        <>
          <div className="results-kpi-grid">
            <div className="results-kpi-card">
              <div className="results-kpi-icon" style={{ background: "var(--brand)", color: "var(--accent-contrast)" }}>
                <Users />
              </div>
              <div>
                <div className="n">{state.status === "loading" ? "—" : state.summary.workerCount}</div>
                <div className="l">{t("results_kpi_workers")}</div>
                <div className="s">{t("results_kpi_workers_sub")}</div>
              </div>
            </div>

            <div className="results-kpi-card">
              <RadialRing
                value={avgScore}
                size={56}
                strokeWidth={5}
                color="var(--signal-go-strong)"
                label={state.status === "loading" ? "—" : `${avgScore}%`}
              />
              <div>
                <div className="l">{t("results_kpi_readiness")}</div>
                <div className="s">{t("results_kpi_readiness_sub")}</div>
              </div>
            </div>

            <div className="results-kpi-card">
              <div className="results-kpi-icon" style={{ background: "var(--signal-go-strong)", color: "#fff" }}>
                <CheckCircle2 />
              </div>
              <div>
                <div className="n">{state.status === "loading" ? "—" : passedCount}</div>
                <div className="l">{t("results_kpi_passed")}</div>
                <div className="s">{t("results_kpi_passed_sub")}</div>
              </div>
            </div>

            <div className="results-kpi-card">
              <div className="results-kpi-icon" style={{ background: "var(--signal-stop-strong)", color: "#fff" }}>
                <AlertTriangle />
              </div>
              <div>
                <div className="n">{state.status === "loading" ? "—" : needReviewCount}</div>
                <div className="l">{t("results_kpi_review")}</div>
                <div className="s">{t("results_kpi_review_sub")}</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-body">
              <div className="readiness-panel-head">
                <span className="readiness-panel-title">
                  <Users2 />
                  {t("results_readiness_heading")}
                </span>
                <div className="filters">
                  <select className="select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                    <option value="">{t("filter_all_modules")}</option>
                    {state.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">{t("filter_all_status")}</option>
                    <option value="pass">{t("status_pass")}</option>
                    <option value="fail">{t("status_fail")}</option>
                  </select>
                  <button className="link-btn" onClick={() => navigate("/workers")}>
                    {t("results_view_all")} <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {state.status === "loading" && <Loading rows={5} />}
              {state.status === "ready" && filteredResults.length === 0 && (
                <Empty title={t("empty_results")} body="" />
              )}

              {state.status === "ready" && filteredResults.length > 0 && (
                <div className="result-card-grid">
                  {filteredResults.map((a) => {
                    const isPass = a.status === "pass";
                    const ringColor = isPass ? "var(--signal-go-strong)" : "var(--signal-stop-strong)";
                    const passedSet = passedModulesByWorker[a.workerId] || new Set();
                    const modulesPct = Math.round((passedSet.size / totalModules) * 100);

                    return (
                      <div
                        key={a.id}
                        className={`result-card ${isPass ? "is-pass" : "is-fail"}`}
                        onClick={() => navigate(`/workers/${a.workerId}`)}
                      >
                        <div className="result-card-top">
                          <div className="result-card-identity">
                            <WorkerAvatar status={a.status} />
                            <div>
                              <strong>{a.workerName}</strong>
                              <span>{a.workerCode}</span>
                            </div>
                          </div>
                          <Badge variant={isPass ? "go" : "stop"}>
                            {isPass ? t("status_pass") : t("status_fail")}
                          </Badge>
                        </div>

                        <div className="result-card-module">
                          <ModuleTag moduleId={a.moduleId} moduleName={a.moduleName} />
                          {a.moduleName}
                        </div>

                        <div className="result-card-body">
                          <div style={{ textAlign: "center" }}>
                            <RadialRing value={a.score} size={64} strokeWidth={6} color={ringColor} />
                            <div className="result-card-progress-head" style={{ justifyContent: "center", marginTop: 6 }}>
                              <span>{t("results_score_label")}</span>
                            </div>
                          </div>
                          <div className="result-card-progress">
                            <div className="result-card-progress-head">
                              <span>{t("results_modules_label")}</span>
                              <span className="n">
                                {passedSet.size}/{totalModules}
                              </span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${modulesPct}%`, background: ringColor }} />
                            </div>
                          </div>
                        </div>

                        <div className="result-card-meta">
                          <Calendar />
                          {new Date(a.completedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                          {", "}
                          {new Date(a.completedAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </div>

                        <button
                          className="result-card-cta"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workers/${a.workerId}`);
                          }}
                        >
                          {t("results_view_details")} <ArrowRight size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
