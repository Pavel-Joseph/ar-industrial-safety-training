import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, ArrowRight, Users, MapPin, ClipboardList } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge, { statusToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import AddWorkerModal from "../components/AddWorkerModal.jsx";
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
  const [showAddModal, setShowAddModal] = useState(false);

  const [state, setState] = useState({ status: "loading", data: [], source: "mock" });
  const [modules, setModules] = useState([]);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    api.getModules().then((res) => setModules(res.data));
    api.getAttempts().then((res) => setAttempts(res.data));
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
  const siteOptions = useMemo(() => Array.from(new Set(state.data.map((w) => w.site))).sort(), [state.data]);

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

  return (
    <Layout title={t("workers_title")} subtitle={`${state.status === "ready" ? state.data.length : "—"} registered workers`}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

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
            <select className="select" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">{t("filter_all_sites")}</option>
              {siteOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={13} strokeWidth={2.2} />
                      {w.site}
                    </span>
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
          {attempts.length === 0 ? (
            <Loading rows={4} />
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

      {showAddModal && (
        <AddWorkerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            // Re-run the current search so the new worker appears immediately.
            setSearch((s) => s);
            api.getWorkers(search).then((res) => setState({ status: "ready", data: res.data, source: res.source }));
          }}
        />
      )}
    </Layout>
  );
}
