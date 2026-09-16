// Dashboard UI strings.
//
// "en" is complete and is the fallback for any missing key in another
// language, so the UI never renders a blank label while translation is
// in progress.
//
// "hi" (Hindi) and "sat" (Santali) are intentionally left as TODO stubs.
// Person 4 owns Hindi/Santali review for the whole product (app + dashboard)
// — replace the TODO values below with the reviewed strings; keys must stay
// identical so nothing in the UI breaks. Santali should be entered in the
// script the team has agreed on (Ol Chiki or Devanagari transliteration).

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "sat", label: "Santali" }
];

export const strings = {
  en: {
    appName: "Site Command",
    appTagline: "AR Safety Training — Admin",
    nav_overview: "Dashboard",
    nav_workers: "Workers",
    nav_results: "Results",
    nav_certificates: "Certificates",
    nav_about: "About",
    login_tag: "DGMS-aligned competency training",
    login_headline: "Supervise every drill, offline or synced, from one board.",
    login_meta:
      "Sign in to review worker progress across Fire & Explosion Response and Gas Leak & Confined Space Protocol modules, and to issue verified completion certificates.",
    login_title: "Administrator sign-in",
    login_hint: "Use your issued admin credentials to continue.",
    login_email: "Email or admin ID",
    login_password: "Password",
    login_submit: "Sign in",
    login_signing_in: "Signing in…",
    login_error: "That email or password wasn't recognised. Check and try again.",
    login_demo_note: "Demo credentials: admin@site.local / admin123 (sample data mode).",
    signed_in_as: "Signed in",
    sign_out: "Sign out",
    overview_title: "Dashboard",
    overview_sub: "Live status across every training module",
    stat_workers: "Registered workers",
    stat_attempts: "Attempts logged",
    stat_pass_rate: "Pass rate",
    stat_certificates: "Certificates issued",
    chart_module_title: "Attempts by module",
    chart_module_sub: "Pass vs. fail, every module",
    chart_passrate_title: "Pass rate by module",
    chart_passrate_sub: "Cumulative pass rate per training module",
    chart_radar_sub: "Pass vs fail share, per module",
    chart_pass_title: "Pass / fail breakdown",
    recent_activity: "Recent attempts",
    workers_title: "Workers",
    workers_sub: "Everyone registered for AR safety training",
    workers_search_placeholder: "Search by name or worker ID",
    col_worker: "Worker",
    col_id: "Worker ID",
    col_site: "Site",
    col_module: "Module",
    col_score: "Score",
    col_status: "Status",
    col_completed: "Completed",
    col_sync: "Sync",
    col_certificate: "Certificate",
    col_issued: "Issued",
    col_attempts: "Attempts",
    col_last_activity: "Last activity",
    results_title: "Results",
    results_sub: "Every recorded assessment attempt",
    filter_all_modules: "All modules",
    filter_all_sites: "All sites",
    filter_all_status: "All statuses",
    status_pass: "Pass",
    status_fail: "Fail",
    status_pending: "Pending sync",
    sync_synced: "Synced",
    sync_pending: "Pending",
    certificates_title: "Certificates",
    certificates_sub: "Issued only for a validated passing attempt",
    certificates_verify_action: "Verify",
    admin_panel_title: "Signed-in administrator",
    admin_panel_role: "Role",
    admin_panel_email: "Email",
    admin_panel_session: "Session",
    admin_panel_data_source: "Data source",
    admin_panel_language: "Dashboard language",
    admin_panel_close: "Close",
    certificate_status_valid: "Valid",
    certificate_status_revoked: "Revoked",
    certificate_status_unknown: "Not found",
    worker_detail_back: "Back to workers",
    worker_detail_role: "Site worker",
    worker_detail_history: "Attempt history",
    empty_workers: "No workers match your search yet.",
    empty_results: "No attempts recorded yet for this filter.",
    empty_certificates: "No certificates issued yet.",
    error_generic_title: "Couldn't load this data",
    error_generic_body:
      "The dashboard couldn't reach the backend API. Showing sample data instead — connect VITE_API_BASE_URL to switch to live records.",
    loading: "Loading…",
    verify_title: "Certificate verification",
    verify_valid_title: "Certificate is valid",
    verify_revoked_title: "Certificate has been revoked",
    verify_unknown_title: "No certificate found",
    verify_unknown_body: "This QR code doesn't match any issued certificate.",
    verify_field_worker: "Worker",
    verify_field_module: "Module",
    verify_field_issued: "Issued",
    verify_field_id: "Certificate ID",
    verify_disclaimer:
      "This is a DGMS-aligned competency-based certificate from a prototype training platform. It is not an official DGMS certification and does not imply DGMS issuance, approval or accreditation.",
    offline_pending_banner:
      "Some results are queued on-device and pending sync — figures below may update once devices reconnect.",
    about_eyebrow: "AR Industrial Safety Training Platform",
    about_title: "Practical AR safety drills for mine and industrial workers in Jharkhand",
    about_body:
      "This platform puts fire, gas and confined-space emergency drills into a phone camera view, so a worker can rehearse the exact actions a real incident would demand — exit routes, extinguisher use, PPE selection, buddy-system procedure — before it matters. Every completed drill is scored, stored, and (once passed) issued as a DGMS-aligned competency certificate a supervisor can verify with a QR scan.",
    about_feature_offline_title: "Works offline",
    about_feature_offline_body: "Training, scoring and results are usable underground with no signal, and sync automatically once reconnected.",
    about_feature_language_title: "Hindi & Santali",
    about_feature_language_body: "The app and certificates are available in the languages workers actually use on site.",
    about_feature_devices_title: "Low- and mid-range phones",
    about_feature_devices_body: "Low-poly models keep the AR experience usable on the hardware crews already carry.",
    about_feature_cert_title: "Verifiable certificates",
    about_feature_cert_body: "Every certificate carries a QR code a supervisor can scan to confirm it's real, without needing dashboard access.",
    training_modules_heading: "Training modules",
    training_modules_sub: "What this admin dashboard is tracking completion and scores for",
    module_fire_desc:
      "Exit identification, extinguisher selection and use, and evacuation sequencing, rehearsed in AR over the worker's real surroundings.",
    module_gas_desc:
      "Hazard-zone recognition, PPE selection and buddy-system procedure for gas leak and confined-space entry scenarios.",
    module_bonus_desc:
      "Optional Jharkhand mine-worker-specific scenario content, attempted once the two required modules are stable for a worker.",
    module_stat_attempts: "Attempts",
    module_stat_pass_rate: "Pass rate"
  },
  hi: {
    // TODO(person-4): Hindi review pending — falls back to English until filled in.
  },
  sat: {
    // TODO(person-4): Santali review pending — falls back to English until filled in.
  }
};

export function t(lang, key) {
  return strings[lang]?.[key] ?? strings.en[key] ?? key;
}
