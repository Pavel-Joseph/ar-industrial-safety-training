import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, ArrowRight, Users, MapPin, ClipboardList, Flag, Calendar, Users2, CheckCircle2, AlertTriangle } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge, { statusToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import AddWorkerModal from "../components/AddWorkerModal.jsx";
import RadialRing from "../components/RadialRing.jsx";
import WorkerAvatar from "../components/WorkerAvatar.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

const PROGRESS_DONE = "#6da356";
const PROGRESS_MID = "#db9f75";
const PROGRESS_LOW = "#6e7261";

function progressColor(pct) {
  if (pct >= 100) return PROGRESS_DONE;
  if (pct >= 50) return PROGRESS_MID;
  return PROGRESS_LOW;
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export default function Workers() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [site, setSite] = useState("");
  const [status, setStatus] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [resultModuleId, setResultModuleId] = useState("");
  const [resultStatus, setResultStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [state, setState] = useState({ status: "loading", data: [], source: "mock" });
  const [resultsState, setResultsState] = useState({ status: "loading", source: "mock", modules: [], summary: null, allAttempts: [] });
  const [modules, setModules] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getModules(), api.getAttempts(), api.getSummary()])
      .then(([modulesRes, attemptsRes, summaryRes]) => {
        if (!cancelled) {
          setModules(modulesRes.data);
          setAttempts(attemptsRes.data);
          setResultsState({
            status: "ready",
            source: attemptsRes.source,
            modules: modulesRes.data,
            summary: summaryRes.data,
            allAttempts: attemptsRes.data
          });
          setRelatedLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedError(true);
          setRelatedLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    const handle = setTimeout(async () => {
      try {
        const res = await api.getWorkers(search);
        if (!cancelled) setState({ status: "ready", data: res.data, source: res.source });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  // Site/Status/Module options and per-worker training progress / last-active
  // are all derived from whatever the API has already returned — no extra
  // endpoints needed. Once live data is larger, Person 2 can expose a
  // dedicated GET /api/sites, and this derivation can read from that
  // instead; nothing else on this page changes shape.
  const siteOptions = useMemo(() => Array.from(new Set(state.data.map((w) => w.site).filter(Boolean))).sort(), [state.data]);

  const enriched = useMemo(() => {
    return state.data.map((w) => {
      const workerAttempts = attempts.filter((a) => a.workerId === w.id);
      const modulesPassed = new Set(workerAttempts.filter((a) => a.status === "pass").map((a) => a.moduleId));
      const progress = modules.length ? Math.round((modulesPassed.size / modules.length) * 100) : 0;
      const lastAttempt = workerAttempts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
      const lastActive = lastAttempt ? lastAttempt.completedAt : w.registeredAt;
      const attemptedModuleIds = new Set(workerAttempts.map((a) => a.moduleId));
      return { ...w, progress, lastActive, attemptedModuleIds };
    });
  }, [state.data, attempts, modules]);

  const visible = enriched.filter((w) => {
    if (site && w.site !== site) return false;
    if (status && w.status !== status) return false;
    if (moduleId && !w.attemptedModuleIds.has(moduleId)) return false;
    return true;
  });

  // Feeds the "Recent Attempts" panel that used to live on the Dashboard —
  // same `attempts` fetch this page already makes for the training-progress
  // bars above, just sorted and capped rather than a second network call.
  const recentAttempts = useMemo(
    () => [...attempts].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 8),
    [attempts]
  );

  const passedModulesByWorker = useMemo(() => {
    const map = {};
    resultsState.allAttempts
      .filter((a) => a.status === "pass")
      .forEach((a) => {
        if (!map[a.workerId]) map[a.workerId] = new Set();
        map[a.workerId].add(a.moduleId);
      });
    return map;
  }, [resultsState.allAttempts]);

  const filteredResults = useMemo(() => {
    return resultsState.allAttempts
      .filter((a) => (resultModuleId ? a.moduleId === resultModuleId : true))
      .filter((a) => (resultStatus ? a.status === resultStatus : true))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  }, [resultsState.allAttempts, resultModuleId, resultStatus]);

  const totalModules = resultsState.modules.length || 1;
  const avgScore = resultsState.allAttempts.length
    ? Math.round(resultsState.allAttempts.reduce((sum, a) => sum + a.score, 0) / resultsState.allAttempts.length)
    : 0;
  const passedCount = resultsState.allAttempts.filter((a) => a.status === "pass" && a.syncState === "synced").length;
  const needReviewCount = resultsState.allAttempts.length - passedCount;

  const dateRangeLabel = useMemo(() => {
    if (resultsState.allAttempts.length === 0) return null;
    const dates = resultsState.allAttempts.map((a) => new Date(a.completedAt));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(min)} — ${fmt(max)}`;
  }, [resultsState.allAttempts]);

  return (
    <Layout title={t("workers_results_title")} subtitle={t("workers_results_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}
      {relatedError && <ErrorState />}

      <div className="two-col">
      <div className="panel">
        <div className="panel-head">
          <div className="panel-head-title">
            <div className="panel-head-icon" style={{ background: "#a75a1d" }}>
              <Users />
            </div>
            <div>
              <h2>{t("workers_title")}</h2>
              <p>{state.status === "ready" ? `${state.data.length} registered workers` : t("loading")}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} strokeWidth={2.3} />
            Add worker
          </button>
        </div>

        <div className="panel-head">
          <div className="filters">
            {siteOptions.length > 0 && <select className="select" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">{t("filter_all_sites")}</option>
              {siteOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>}
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("filter_all_status")}</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              <option value="">{t("filter_all_modules")}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: "relative" }}>
            <Search
              size={15}
              strokeWidth={2.2}
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              className="text-input"
              style={{ paddingLeft: 32 }}
              placeholder={t("workers_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="panel-body no-pad">
          {state.status === "loading" && <Loading />}
          {state.status === "error" && <ErrorState />}
          {state.status === "ready" && visible.length === 0 && (
            <Empty title={t("empty_workers")} body="" glyph="NO MATCHES" />
          )}
          {state.status === "ready" && visible.length > 0 && (
            <div className="worker-row-list">
              {visible.map((w) => (
                <div className="worker-row-card" key={w.id} onClick={() => navigate(`/workers/${w.id}`)}>
                  <div className="worker-row-top">
                    <div className="row-identity">
                      <div className="row-avatar">{initials(w.name)}</div>
                      <div className="row-identity-text">
                        <strong>{w.name}</strong>
                        <span>{w.workerCode}</span>
                      </div>
                    </div>
                    <Badge variant={w.status === "active" ? "go" : "neutral"}>
                      {w.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="worker-row-mid">
                    {w.site && <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={13} strokeWidth={2.2} />
                      {w.site}
                    </span>}
                    <span>Last active {new Date(w.lastActive).toLocaleDateString()}</span>
                  </div>

                  <div className="worker-row-bottom">
                    <span className="label">Training progress</span>
                    <div className="inline-progress">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${w.progress}%`, background: progressColor(w.progress) }}
                        />
                      </div>
                      <span className="pct" style={{ color: progressColor(w.progress) }}>
                        {w.progress}%
                      </span>
                    </div>
                    <span className="link-btn view-link">
                      View <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-head-title">
            <div className="panel-head-icon" style={{ background: "#545748" }}>
              <ClipboardList />
            </div>
            <div>
              <h2>{t("recent_activity")}</h2>
              <p>{t("workers_recent_attempts_sub")}</p>
            </div>
          </div>
        </div>
        <div className="panel-body no-pad">
          {relatedLoading ? (
            <Loading rows={4} />
          ) : relatedError ? (
            <ErrorState />
          ) : attempts.length === 0 ? (
            <Empty title={t("empty_results")} body="" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("col_worker")}</th>
                    <th>{t("col_module")}</th>
                    <th>{t("col_score")}</th>
                    <th>{t("col_status")}</th>
                    <th>{t("col_completed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map((a) => {
                    const badge = statusToBadge(a.status, t);
                    return (
                      <tr key={a.id} onClick={() => navigate(`/workers/${a.workerId}`)}>
                        <td>{a.workerName}</td>
                        <td>
                          <ModuleTag moduleId={a.moduleId} moduleName={a.moduleName} />
                        </td>
                        <td className="mono">{a.score}</td>
                        <td>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="text-muted">{new Date(a.completedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="results-header" style={{ marginTop: 18 }}>
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

      {resultsState.status === "error" && <ErrorState />}

      {resultsState.status !== "error" && (
        <>
          <div className="results-kpi-grid">
            <div className="results-kpi-card">
              <div className="results-kpi-icon" style={{ background: "var(--brand)", color: "var(--accent-contrast)" }}>
                <Users />
              </div>
              <div>
                <div className="n">{resultsState.status === "loading" ? "—" : resultsState.summary.workerCount}</div>
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
                label={resultsState.status === "loading" ? "—" : `${avgScore}%`}
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
                <div className="n">{resultsState.status === "loading" ? "—" : passedCount}</div>
                <div className="l">{t("results_kpi_passed")}</div>
                <div className="s">{t("results_kpi_passed_sub")}</div>
              </div>
            </div>

            <div className="results-kpi-card">
              <div className="results-kpi-icon" style={{ background: "var(--signal-stop-strong)", color: "#fff" }}>
                <AlertTriangle />
              </div>
              <div>
                <div className="n">{resultsState.status === "loading" ? "—" : needReviewCount}</div>
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
                  <select className="select" value={resultModuleId} onChange={(e) => setResultModuleId(e.target.value)}>
                    <option value="">{t("filter_all_modules")}</option>
                    {resultsState.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={resultStatus} onChange={(e) => setResultStatus(e.target.value)}>
                    <option value="">{t("filter_all_status")}</option>
                    <option value="pass">{t("status_pass")}</option>
                    <option value="fail">{t("status_fail")}</option>
                  </select>
                </div>
              </div>

              {resultsState.status === "loading" && <Loading rows={5} />}
              {resultsState.status === "ready" && filteredResults.length === 0 && (
                <Empty title={t("empty_results")} body="" />
              )}

              {resultsState.status === "ready" && filteredResults.length > 0 && (
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

      {showAddModal && (
        <AddWorkerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            // Re-run the current search so the new worker appears immediately.
            setSearch((s) => s);
            api.getWorkers(search)
              .then((res) => setState({ status: "ready", data: res.data, source: res.source }))
              .catch(() => setState((s) => ({ ...s, status: "error" })));
          }}
        />
      )}
    </Layout>
  );
}
