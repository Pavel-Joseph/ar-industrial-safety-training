import React from "react";

const VARIANT_CLASS = {
  go: "badge-go",
  caution: "badge-caution",
  stop: "badge-stop",
  neutral: "badge-neutral"
};

export default function Badge({ variant = "neutral", children }) {
  return (
    <span className={`badge ${VARIANT_CLASS[variant] || VARIANT_CLASS.neutral}`}>
      <span className="bulb" />
      {children}
    </span>
  );
}

export function statusToBadge(status, t) {
  if (status === "pass") return { variant: "go", label: t("status_pass") };
  if (status === "fail") return { variant: "stop", label: t("status_fail") };
  return { variant: "caution", label: t("status_pending") };
}

export function syncToBadge(syncState, t) {
  if (syncState === "synced") return { variant: "go", label: t("sync_synced") };
  return { variant: "caution", label: t("sync_pending") };
}

export function certStatusToBadge(status, t) {
  if (status === "valid") return { variant: "go", label: t("certificate_status_valid") };
  if (status === "revoked") return { variant: "stop", label: t("certificate_status_revoked") };
  if (status === "expired") return { variant: "caution", label: t("certificate_status_expired") };
  return { variant: "neutral", label: t("certificate_status_unknown") };
}
