import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";
import * as api from "../api/client.js";

const LANGUAGE_OPTIONS = [
  { code: "hi", label: "Hindi" },
  { code: "sat", label: "Santali" },
  { code: "en", label: "English" }
];

// "+ Add Worker" — works against the live POST /api/workers endpoint once
// Person 2 has it; until then it appends to the in-session sample data
// (see createWorker in api/client.js) so the flow is fully demoable today.
export default function AddWorkerModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [site, setSite] = useState("");
  const [language, setLanguage] = useState("hi");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.createWorker({ name, workerCode, site, language });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError("Couldn't add this worker. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>
            <UserPlus size={18} strokeWidth={2.3} style={{ verticalAlign: "-3px", marginRight: 8 }} />
            Add worker
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="w-name">Full name</label>
            <input
              id="w-name"
              className="text-input"
              style={{ width: "100%" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="w-code">Worker ID</label>
            <input
              id="w-code"
              className="text-input"
              style={{ width: "100%" }}
              placeholder="e.g. JH-1052"
              value={workerCode}
              onChange={(e) => setWorkerCode(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="w-site">Site</label>
            <input
              id="w-site"
              className="text-input"
              style={{ width: "100%" }}
              placeholder="e.g. Jharia Mine Site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="w-lang">Preferred language</label>
            <select
              id="w-lang"
              className="select"
              style={{ width: "100%" }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>
              {submitting ? "Adding…" : "Add worker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
