import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Check, CheckCircle2, Circle } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState } from "../components/DataState.jsx";
import Badge, { statusToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export default function WorkerDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", worker: null, modules: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getWorker(id), api.getModules()])
      .then(([workerRes, modulesRes]) => {
        if (!cancelled) setState({ status: "ready", worker: workerRes.data, modules: modulesRes.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", worker: null, modules: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (state.status === "loading") {
    return (
      <Layout title={t("workers_title")} subtitle={t("worker_detail_history")}>
        <Loading rows={6} />
      </Layout>
    );
  }

  if (state.status === "error") {
    return (
      <Layout title={t("workers_title")} subtitle={t("worker_detail_history")}>
        <ErrorState />
      </Layout>
    );
  }

  if (!state.worker) {
    return (
      <Layout title={t("workers_title")} subtitle={t("worker_detail_history")}>
        <Empty title="Worker not found" body="" />
      </Layout>
    );
  }

  const { worker, modules } = state;
  // Defensive: if Person 2's backend doesn't embed attempts/certificates on
  // the worker yet, fall back to empty arrays instead of throwing — the
  // page still renders (with zeros) rather than crashing on connect.
  const attempts = [...(worker.attempts || [])].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const certificateCount = (worker.certificates || []).length;
  const passedModuleIds = new Set(attempts.filter((a) => a.status === "pass").map((a) => a.moduleId));
  const overallScore = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;
  const trainingLabel =
    worker.status === "inactive"
      ? { variant: "neutral", label: "Inactive" }
      : passedModuleIds.size === modules.length && modules.length > 0
      ? { variant: "go", label: "Training complete" }
      : { variant: "caution", label: "Training in progress" };

  return (
    <Layout title={worker.name} subtitle={`${worker.workerCode} · ${worker.site}`}>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <Link to="/workers" className="link-btn">
          ← {t("worker_detail_back")}
        </Link>
        <button className="link-btn" onClick={() => copyCode(worker.workerCode)}>
          {copied ? <Check size={16} strokeWidth={2.4} /> : <Copy size={16} strokeWidth={2.2} />}
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>

      <div className="panel" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div className="avatar-circle">{initials(worker.name)}</div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, margin: 0, color: "var(--ink)" }}>
              {worker.name}
            </h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
              {worker.workerCode} · {worker.site}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge variant={trainingLabel.variant}>{trainingLabel.label}</Badge>
          </div>
        </div>

        <div className="detail-stat-row" style={{ marginTop: 20 }}>
          <div className="detail-stat-box">
            <div className="label">Overall score</div>
            <div className="value">{overallScore}%</div>
          </div>
          <div className="detail-stat-box">
            <div className="label">Modules</div>
            <div className="value">
              {passedModuleIds.size} / {modules.length}
            </div>
          </div>
          <div className="detail-stat-box">
            <div className="label">Certificates</div>
            <div className="value">{certificateCount}</div>
          </div>
        </div>

        <div className="section-heading" style={{ marginTop: 8, marginBottom: 8 }}>
          <h2 style={{ fontSize: 15 }}>Training progress</h2>
        </div>
        <div className="checklist">
          {modules.map((m) => {
            const passedAttempt = attempts.find((a) => a.moduleId === m.id && a.status === "pass");
            const done = Boolean(passedAttempt);
            return (
              <div className="checklist-row" key={m.id}>
                <span className={`checklist-icon ${done ? "done" : "pending"}`}>
                  {done ? <CheckCircle2 strokeWidth={2.4} /> : <Circle strokeWidth={2.2} />}
                </span>
                <span className="checklist-name">{m.name}</span>
                {done ? (
                  <span className="checklist-value" style={{ color: "var(--signal-go)" }}>
                    {passedAttempt.score}%
                  </span>
                ) : (
                  <span className="checklist-value muted">Not completed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent attempts</h2>
        </div>
        <div className="panel-body no-pad">
          {attempts.length === 0 ? (
            <Empty title={t("empty_results")} body="" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("col_module")}</th>
                    <th>{t("col_score")}</th>
                    <th>{t("col_status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const badge = statusToBadge(a.status, t);
                    const module = modules.find((m) => m.id === a.moduleId);
                    return (
                      <tr key={a.id}>
                        <td>
                          <ModuleTag moduleId={a.moduleId} moduleName={module?.name} /> {module?.name ?? a.moduleId}
                        </td>
                        <td className="mono">{a.score}</td>
                        <td>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
