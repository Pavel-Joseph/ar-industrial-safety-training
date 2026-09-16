import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge, { statusToBadge, syncToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

export default function Results() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState("");
  const [status, setStatus] = useState("");
  const [modules, setModules] = useState([]);
  const [state, setState] = useState({ status: "loading", data: [], source: "mock" });

  useEffect(() => {
    api.getModules().then((res) => setModules(res.data));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    api
      .getAttempts({ moduleId: moduleId || undefined, status: status || undefined })
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data, source: res.source });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId, status]);

  return (
    <Layout title={t("results_title")} subtitle={t("results_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <select className="select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              <option value="">{t("filter_all_modules")}</option>
              {modules.map((m) => (
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
          </div>
        </div>
        <div className="panel-body no-pad">
          {state.status === "loading" && <Loading />}
          {state.status === "error" && <ErrorState />}
          {state.status === "ready" && state.data.length === 0 && <Empty title={t("empty_results")} body="" />}
          {state.status === "ready" && state.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("col_worker")}</th>
                    <th>{t("col_module")}</th>
                    <th>{t("col_score")}</th>
                    <th>{t("col_status")}</th>
                    <th>{t("col_sync")}</th>
                    <th>{t("col_completed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((a) => {
                    const badge = statusToBadge(a.status, t);
                    const sync = syncToBadge(a.syncState, t);
                    return (
                      <tr key={a.id} onClick={() => navigate(`/workers/${a.workerId}`)}>
                        <td>
                          {a.workerName} <span className="mono text-muted">{a.workerCode}</span>
                        </td>
                        <td>
                          <ModuleTag moduleId={a.moduleId} moduleName={a.moduleName} /> {a.moduleName}
                        </td>
                        <td className="mono">{a.score}</td>
                        <td>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td>
                          <Badge variant={sync.variant}>{sync.label}</Badge>
                        </td>
                        <td className="text-muted">{new Date(a.completedAt).toLocaleString()}</td>
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
