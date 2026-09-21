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
  const [selectedQr, setSelectedQr] = useState(null);
  const [verificationId, setVerificationId] = useState("");
  const [lookup, setLookup] = useState({ status: "idle", cert: null });

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

  async function findCertificate(event) {
    event.preventDefault();
    const code = verificationId.trim();
    if (!code) {
      setLookup({ status: "not-found", cert: null });
      return;
    }

    setLookup({ status: "loading", cert: null });
    try {
      const result = await api.verifyCertificate(code);
      setLookup({ status: result.data ? "found" : "not-found", cert: result.data });
    } catch {
      setLookup({ status: "error", cert: null });
    }
  }

  return (
    <Layout title={t("certificates_title")} subtitle={t("certificates_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

      {selectedQr && (
        <div className="modal-overlay" onClick={() => setSelectedQr(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>{t("certificates_title")}</h3>
              <button type="button" className="link-btn" onClick={() => setSelectedQr(null)} aria-label="Close QR preview">
                Close
              </button>
            </div>
            <div className="qr-preview-wrap">
              <img src={selectedQr.qrCodeUrl} alt={`Verification QR for ${selectedQr.certificateCode}`} className="qr-preview-image" />
            </div>
            <p className="mono qr-preview-code">{selectedQr.certificateCode}</p>
            <a href={selectedQr.verificationUrl} target="_blank" rel="noreferrer" className="btn btn-ghost qr-preview-link">
              Open verification page
            </a>
          </div>
        </div>
      )}

      <div className="certificate-lookup panel">
        <div className="panel-head certificate-lookup-head">
          <div>
            <h3>{t("certificates_lookup_title")}</h3>
            <p>{t("certificates_lookup_sub")}</p>
          </div>
          <form className="certificate-lookup-form" onSubmit={findCertificate}>
            <input
              className="input"
              value={verificationId}
              onChange={(event) => setVerificationId(event.target.value)}
              placeholder={t("certificates_lookup_placeholder")}
              aria-label={t("certificates_lookup_placeholder")}
            />
            <button type="submit" className="btn btn-primary" disabled={lookup.status === "loading"}>
              {lookup.status === "loading" ? t("loading") : t("certificates_lookup_action")}
            </button>
          </form>
        </div>
        {lookup.status === "found" && lookup.cert && (
          <div className="certificate-lookup-result">
            <div>
              <span className="lookup-label">{t("certificates_lookup_status")}</span>
              <Badge variant={certStatusToBadge(lookup.cert.status, t).variant}>
                {certStatusToBadge(lookup.cert.status, t).label}
              </Badge>
            </div>
            <div>
              <span className="lookup-label">{t("verify_field_issued")}</span>
              <strong>{new Date(lookup.cert.issuedAt).toLocaleDateString()}</strong>
            </div>
            <div>
              <span className="lookup-label">{t("verify_field_expires")}</span>
              <strong>{lookup.cert.expiresAt ? new Date(lookup.cert.expiresAt).toLocaleDateString() : "—"}</strong>
            </div>
          </div>
        )}
        {lookup.status === "not-found" && <p className="certificate-lookup-message">{t("certificates_lookup_not_found")}</p>}
        {lookup.status === "error" && <p className="certificate-lookup-message error">{t("error_generic_body")}</p>}
      </div>

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
                          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="link-btn view-link"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedQr(c);
                              }}
                            >
                              <QrCode size={14} />
                              {t("certificates_verify_action")}
                            </button>
                            <span className="link-btn view-link" onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/verify/${c.certificateCode}`);
                            }}>
                              <ExternalLink size={13} />
                            </span>
                          </div>
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
