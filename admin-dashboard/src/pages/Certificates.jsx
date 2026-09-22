import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Ban, ExternalLink, QrCode } from "lucide-react";
import Layout from "../components/Layout.jsx";
import { Loading, Empty, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import Badge, { certStatusToBadge } from "../components/Badge.jsx";
import ModuleTag from "../components/ModuleTag.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

function defaultExpiryDate() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export default function Certificates() {
  const { t } = useLanguage();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", certificates: [], attempts: [], source: "mock" });
  const [selectedQr, setSelectedQr] = useState(null);
  const [issueAttempt, setIssueAttempt] = useState(null);
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [action, setAction] = useState({ status: "idle", message: "" });
  const [verificationId, setVerificationId] = useState("");
  const [lookup, setLookup] = useState({ status: "idle", cert: null });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, status: "loading" }));
    Promise.all([api.getCertificates(), api.getAttempts({ status: "pass" })])
      .then(([certificateResult, attemptResult]) => {
        if (!cancelled) setState({
          status: "ready", certificates: certificateResult.data,
          attempts: attemptResult.data, source: certificateResult.source
        });
      })
      .catch(() => { if (!cancelled) setState((current) => ({ ...current, status: "error" })); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const visibleCertificates = useMemo(
    () => status ? state.certificates.filter((certificate) => certificate.status === status) : state.certificates,
    [state.certificates, status]
  );
  const eligibleAttempts = useMemo(() => {
    const certified = new Set(state.certificates.map((certificate) => certificate.attemptId));
    return state.attempts.filter((attempt) => attempt.status === "pass" && !certified.has(attempt.id));
  }, [state.attempts, state.certificates]);

  async function findCertificate(event) {
    event.preventDefault();
    const code = verificationId.trim();
    if (!code) return setLookup({ status: "not-found", cert: null });
    setLookup({ status: "loading", cert: null });
    try {
      const result = await api.verifyCertificate(code);
      setLookup({ status: result.data ? "found" : "not-found", cert: result.data });
    } catch { setLookup({ status: "error", cert: null }); }
  }

  async function grantCertificate(event) {
    event.preventDefault();
    setAction({ status: "loading", message: "" });
    try {
      await api.issueCertificate(issueAttempt.id, new Date(`${expiryDate}T23:59:59.999Z`).toISOString());
      setIssueAttempt(null);
      setAction({ status: "success", message: t("certificates_grant_success") });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setAction({ status: "error", message: error.message || t("certificates_action_error") });
    }
  }

  async function revokeCertificate(event) {
    event.preventDefault();
    setAction({ status: "loading", message: "" });
    try {
      await api.revokeCertificate(revokeTarget.id, revokeReason.trim());
      setRevokeTarget(null);
      setRevokeReason("");
      setAction({ status: "success", message: t("certificates_revoke_success") });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setAction({ status: "error", message: error.message || t("certificates_action_error") });
    }
  }

  return (
    <Layout title={t("certificates_title")} subtitle={t("certificates_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}
      {action.status === "success" && <div className="certificate-action-message success">{action.message}</div>}
      {action.status === "error" && <div className="certificate-action-message error">{action.message}</div>}

      {selectedQr && (
        <div className="modal-overlay" onClick={() => setSelectedQr(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head"><h3>{t("certificates_title")}</h3><button type="button" className="link-btn" onClick={() => setSelectedQr(null)}>Close</button></div>
            <div className="qr-preview-wrap"><img src={selectedQr.qrCodeUrl} alt={`Verification QR for ${selectedQr.certificateCode}`} className="qr-preview-image" /></div>
            <p className="mono qr-preview-code">{selectedQr.certificateCode}</p>
            <a href={selectedQr.verificationUrl} target="_blank" rel="noreferrer" className="btn btn-ghost qr-preview-link">Open verification page</a>
          </div>
        </div>
      )}

      {issueAttempt && (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setIssueAttempt(null)}>
          <form className="modal-card" onSubmit={grantCertificate}>
            <div className="modal-head"><h3>{t("certificates_grant_title")}</h3></div>
            <p className="modal-hint">{issueAttempt.workerName} · {issueAttempt.moduleName} · {issueAttempt.score}%</p>
            <div className="field"><label htmlFor="certificate-expiry">{t("certificates_expiry_label")}</label><input id="certificate-expiry" className="text-input" type="date" min={new Date().toISOString().slice(0, 10)} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} required /></div>
            <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setIssueAttempt(null)}>{t("certificates_action_cancel")}</button><button type="submit" className="btn btn-primary" disabled={action.status === "loading"}>{t("certificates_grant_action")}</button></div>
          </form>
        </div>
      )}

      {revokeTarget && (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setRevokeTarget(null)}>
          <form className="modal-card" onSubmit={revokeCertificate}>
            <div className="modal-head"><h3>{t("certificates_revoke_title")}</h3></div>
            <p className="modal-hint">{revokeTarget.workerName} · {revokeTarget.moduleName}</p>
            <div className="field"><label htmlFor="revoke-reason">{t("certificates_revoke_reason")}</label><textarea id="revoke-reason" className="text-input" rows="4" minLength="5" maxLength="500" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} placeholder={t("certificates_revoke_placeholder")} required /></div>
            <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setRevokeTarget(null)}>{t("certificates_action_cancel")}</button><button type="submit" className="btn btn-danger" disabled={action.status === "loading"}>{t("certificates_revoke_action")}</button></div>
          </form>
        </div>
      )}

      <div className="panel certificate-eligible-panel">
        <div className="panel-head"><div><h3>{t("certificates_eligible_title")}</h3><p>{t("certificates_eligible_sub")}</p></div></div>
        <div className="panel-body no-pad">
          {state.status === "loading" && <Loading rows={3} />}
          {state.status === "error" && <ErrorState />}
          {state.status === "ready" && eligibleAttempts.length === 0 && <Empty title={t("certificates_none_eligible")} body="" />}
          {state.status === "ready" && eligibleAttempts.length > 0 && (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>{t("col_worker")}</th><th>{t("col_module")}</th><th>{t("col_score")}</th><th>{t("col_completed")}</th><th></th></tr></thead>
              <tbody>{eligibleAttempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.workerName}<div className="text-muted mono">{attempt.workerCode}</div></td>
                  <td><ModuleTag moduleId={attempt.moduleId} moduleName={attempt.moduleName} /> {attempt.moduleName}</td>
                  <td className="mono">{attempt.score}%</td><td className="text-muted">{new Date(attempt.completedAt).toLocaleDateString()}</td>
                  <td><button type="button" className="btn btn-primary" onClick={() => { setAction({ status: "idle", message: "" }); setExpiryDate(defaultExpiryDate()); setIssueAttempt(attempt); }}><Award size={15} />{t("certificates_grant_action")}</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="certificate-lookup panel">
        <div className="panel-head certificate-lookup-head"><div><h3>{t("certificates_lookup_title")}</h3><p>{t("certificates_lookup_sub")}</p></div><form className="certificate-lookup-form" onSubmit={findCertificate}><input className="input" value={verificationId} onChange={(event) => setVerificationId(event.target.value)} placeholder={t("certificates_lookup_placeholder")} /><button type="submit" className="btn btn-primary" disabled={lookup.status === "loading"}>{lookup.status === "loading" ? t("loading") : t("certificates_lookup_action")}</button></form></div>
        {lookup.status === "found" && lookup.cert && <div className="certificate-lookup-result"><div><span className="lookup-label">{t("certificates_lookup_status")}</span><Badge variant={certStatusToBadge(lookup.cert.status, t).variant}>{certStatusToBadge(lookup.cert.status, t).label}</Badge></div><div><span className="lookup-label">{t("verify_field_issued")}</span><strong>{new Date(lookup.cert.issuedAt).toLocaleDateString()}</strong></div><div><span className="lookup-label">{t("verify_field_expires")}</span><strong>{lookup.cert.expiresAt ? new Date(lookup.cert.expiresAt).toLocaleDateString() : "—"}</strong></div></div>}
        {lookup.status === "not-found" && <p className="certificate-lookup-message">{t("certificates_lookup_not_found")}</p>}{lookup.status === "error" && <p className="certificate-lookup-message error">{t("error_generic_body")}</p>}
      </div>

      <div className="panel"><div className="panel-head"><div className="filters"><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("filter_all_status")}</option><option value="valid">{t("certificate_status_valid")}</option><option value="revoked">{t("certificate_status_revoked")}</option><option value="expired">{t("certificate_status_expired")}</option></select></div></div>
        <div className="panel-body no-pad">{state.status === "loading" && <Loading />}{state.status === "error" && <ErrorState />}{state.status === "ready" && visibleCertificates.length === 0 && <Empty title={t("empty_certificates")} body="" />}{state.status === "ready" && visibleCertificates.length > 0 && (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>{t("col_certificate")}</th><th>{t("col_worker")}</th><th>{t("col_module")}</th><th>{t("col_status")}</th><th>{t("col_issued")}</th><th></th></tr></thead><tbody>{visibleCertificates.map((certificate) => {
            const badge = certStatusToBadge(certificate.status, t);
            return <tr key={certificate.id} onClick={() => navigate(`/verify/${certificate.certificateCode}`)}><td className="mono"><QrCode size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />{certificate.certificateCode}</td><td>{certificate.workerName}</td><td><ModuleTag moduleId={certificate.moduleId} moduleName={certificate.moduleName} /> {certificate.moduleName}</td><td><Badge variant={badge.variant}>{badge.label}</Badge></td><td className="text-muted">{new Date(certificate.issuedAt).toLocaleDateString()}</td><td><div className="certificate-row-actions"><button type="button" className="link-btn view-link" onClick={(event) => { event.stopPropagation(); setSelectedQr(certificate); }}><QrCode size={14} />{t("certificates_verify_action")}</button>{certificate.status === "valid" && admin?.role === "admin" && <button type="button" className="link-btn danger-link" onClick={(event) => { event.stopPropagation(); setAction({ status: "idle", message: "" }); setRevokeTarget(certificate); }}><Ban size={14} />{t("certificates_revoke_action")}</button>}<span className="link-btn view-link" onClick={(event) => { event.stopPropagation(); navigate(`/verify/${certificate.certificateCode}`); }}><ExternalLink size={13} /></span></div></td></tr>;
          })}</tbody></table></div>
        )}</div>
      </div>
    </Layout>
  );
}
