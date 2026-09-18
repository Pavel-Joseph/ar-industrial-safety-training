import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, QrCode } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge, { certStatusToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

export default function Certificates() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ status: "loading", data: [], source: "mock" });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    api
      .getCertificates({ status: status || undefined })
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data, source: res.source });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <Layout title={t("certificates_title")} subtitle={t("certificates_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("filter_all_status")}</option>
              <option value="valid">{t("certificate_status_valid")}</option>
              <option value="revoked">{t("certificate_status_revoked")}</option>
              <option value="expired">{t("certificate_status_expired")}</option>
            </select>
          </div>
        </div>
        <div className="panel-body no-pad">
          {state.status === "loading" && <Loading />}
          {state.status === "error" && <ErrorState />}
          {state.status === "ready" && state.data.length === 0 && <Empty title={t("empty_certificates")} body="" />}
          {state.status === "ready" && state.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("col_certificate")}</th>
                    <th>{t("col_worker")}</th>
                    <th>{t("col_module")}</th>
                    <th>{t("col_status")}</th>
                    <th>{t("col_issued")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((c) => {
                    const badge = certStatusToBadge(c.status, t);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/verify/${c.certificateCode}`)}
                        title="Open the public verification page for this certificate"
                      >
                        <td className="mono">
                          <QrCode size={14} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 7, color: "var(--accent)" }} />
                          {c.certificateCode}
                        </td>
                        <td>{c.workerName}</td>
                        <td>
                          <ModuleTag moduleId={c.moduleId} moduleName={c.moduleName} /> {c.moduleName}
                        </td>
                        <td>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="text-muted">{new Date(c.issuedAt).toLocaleDateString()}</td>
                        <td>
                          <span className="link-btn view-link">
                            {t("certificates_verify_action")} <ExternalLink size={13} />
                          </span>
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
