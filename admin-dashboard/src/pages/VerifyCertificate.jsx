import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import * as api from "../api/client.js";

// Public route — no auth, no top nav. This is the page a QR code on a
// printed/on-screen certificate opens directly, so it must load fast, work
// for someone who has never seen the dashboard, and never require sign-in.
// Only the fields listed in the contract's verify response are shown.

const RING_STYLE = {
  valid: { bg: "var(--signal-go-dim)", color: "var(--signal-go)", Icon: CheckCircle2 },
  revoked: { bg: "var(--signal-stop-dim)", color: "var(--signal-stop)", Icon: XCircle },
  unknown: { bg: "var(--surface-sunken)", color: "var(--text-muted)", Icon: HelpCircle }
};

export default function VerifyCertificate() {
  const { code } = useParams();
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", cert: null });

  useEffect(() => {
    let cancelled = false;
    api
      .verifyCertificate(code)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", cert: res.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", cert: null });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const resultStatus = state.cert ? state.cert.status : "unknown";
  const ring = RING_STYLE[resultStatus] || RING_STYLE.unknown;

  const titleKey =
    resultStatus === "valid"
      ? "verify_valid_title"
      : resultStatus === "revoked"
      ? "verify_revoked_title"
      : "verify_unknown_title";

  return (
    <div className="verify-screen">
      <div className="verify-card">
        <div className="login-tag" style={{ marginBottom: 8 }}>
          {t("verify_title")}
        </div>

        {state.status === "loading" && <div className="data-state">{t("loading")}</div>}

        {state.status === "error" && (
          <div className="data-state error">
            <h3>{t("error_generic_title")}</h3>
            <p>{t("error_generic_body")}</p>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <div className="verify-status">
              <div className="ring" style={{ background: ring.bg, color: ring.color }}>
                <ring.Icon size={22} strokeWidth={2.2} />
              </div>
              <div>
                <p className="verify-title">{t(titleKey)}</p>
                <p className="verify-sub">{code}</p>
              </div>
            </div>

            {state.cert ? (
              <div className="kv-list">
                <div className="kv-row">
                  <span>{t("verify_field_worker")}</span>
                  <span>{state.cert.workerName}</span>
                </div>
                <div className="kv-row">
                  <span>{t("verify_field_module")}</span>
                  <span>{state.cert.moduleName}</span>
                </div>
                <div className="kv-row">
                  <span>{t("verify_field_issued")}</span>
                  <span>{new Date(state.cert.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="kv-row">
                  <span>{t("verify_field_id")}</span>
                  <span className="mono">{state.cert.certificateCode}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 13 }}>
                {t("verify_unknown_body")}
              </p>
            )}

            <div className="verify-disclaimer">{t("verify_disclaimer")}</div>
          </>
        )}
      </div>
    </div>
  );
}
