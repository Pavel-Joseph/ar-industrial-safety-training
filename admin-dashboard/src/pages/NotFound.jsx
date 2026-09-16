import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="verify-screen">
      <div className="verify-card" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Page not found</h2>
        <p className="text-muted">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary" style={{ display: "inline-flex", marginTop: 10 }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
