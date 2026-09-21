import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Login() {
  const { admin, signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (admin) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(t("login_error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-side">
        <div>
          <div className="login-tag" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={16} strokeWidth={2.2} />
            {t("login_tag")}
          </div>
          <h1 className="login-headline">{t("login_headline")}</h1>
          <p className="login-meta">{t("login_meta")}</p>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
          Fire &amp; Explosion Response · Gas Leak &amp; Confined Space Protocol
        </div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-brand-form">
            <img src="/images/johAR.png" alt="JohAR logo" className="login-brand-logo" />
          </div>
          <h2>{t("login_title")}</h2>
          <p className="hint">{t("login_hint")}</p>

          {error && <div className="login-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">{t("login_email")}</label>
            <input
              id="email"
              className="text-input"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("login_password")}</label>
            <input
              id="password"
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
            <LogIn size={16} strokeWidth={2.2} />
            {submitting ? t("login_signing_in") : t("login_submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
