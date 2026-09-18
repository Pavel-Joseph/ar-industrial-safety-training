# Site Command — Admin Dashboard

Admin web dashboard for the **AR Industrial Safety Training Platform** prototype (Person 3's part of the 7‑day, 4‑person build). It gives a safety administrator a live view of registered workers, AR training attempts, pass/fail results, and QR‑verifiable completion certificates across the Fire and Explosion Response and Gas Leak and Confined Space Protocol modules, plus the optional Jharkhand mine-worker bonus module.

It is built to be **usable from day one** — before Person 2's backend exists — and to switch to live data with a single environment variable, with no code changes.

---

## 1. Where this lives in the repository

Per the Day 1 repository correction in the team's workflow plan, this app is a **standalone project at the repository root**, separate from the backend:

```
repo-root/
├─ admin-dashboard/     ← this project (Person 3)
├─ backend/              ← Person 2 (Node/Express/PostgreSQL)
├─ unity-app/            ← Person 1 (Unity AR project, created via Unity Hub)
├─ assets/
├─ docs/
└─ localisation/
```

If it currently sits under `backend/admin-dashboard`, move the whole folder to the repo root as `admin-dashboard/` and update any CI/scripts that reference the old path. It has its own `package.json`, its own dependencies, and its own dev server — it does **not** need to live inside or be built by the backend.

Based on the branch list your team lead already created (`feature-admindash`, `feature-backend`, `feature-unityar`, `feature-offlinelang`, `develop`), do your work on **`feature-admindash`** and open PRs into `develop`, same as the rest of the team.

---

## 2. Getting it running

```bash
cd admin-dashboard
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

**Sign in with the built-in demo account** — no backend required:

- Email: `admin@site.local`
- Password: `admin123`

Everything you see (workers, attempts, certificates, charts) is sample data shaped exactly like the real API response, defined in `src/api/mockData.js`. This is what Day 2's brief means by *"contract‑shaped sample data until live endpoints are ready."*

### Switching to Person 2's live backend

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to wherever the backend runs, e.g. `http://localhost:4000`.
3. Restart `npm run dev`.

That's it — every page automatically tries the live API first and only falls back to sample data if a request fails (backend not running yet, CORS not configured, endpoint not built yet). You'll see a small **"Sample data"** badge on any page still running on fallback data, so it's always obvious which mode you're in during standups and demos.

---

## 2b. If the page loads blank — read this first

A blank page with the correct background colour means the CSS loaded but React crashed during render. **This build now ships an error boundary**, so instead of a blank screen you'll get the actual error message, stack trace and component stack printed on the page. Copy that text when reporting a problem.

### Clean-install checklist

If you extracted a newer zip *on top of* an older copy of this folder, you can end up with leftover files that don't belong. From the screenshot of a broken run, these were present and should be **deleted**:

| Leftover | Why it's there | Action |
|---|---|---|
| `src/{api,context,i18n,components,pages,styles}` (a literal folder with braces in its name) | created by a shell that didn't expand brace syntax | delete the whole folder |
| `src/pages/AboutUs.jsx` | superseded by `About.jsx` | delete |
| `src/pages/Dashboard.jsx` | superseded by `Overview.jsx` | delete |

None of those are imported by `App.jsx`, so Vite won't bundle them — but they cause confusion and can shadow the real files in editor search.

**The safest fix is a clean extract:**

```bash
# from the parent directory, with the old folder backed up or removed
rm -rf admin-dashboard
unzip admin-dashboard.zip
cd admin-dashboard
npm install
npm run dev
```

### Other things to check

1. **Clear stale browser state.** An admin token saved in `localStorage` by an earlier build can restore a session that newer code doesn't expect. In DevTools → Application → Local Storage, delete `dashboard_admin_token` and `dashboard_lang`, then reload.
2. **Check the browser console**, not just the Vite terminal. Vite's terminal only reports *build* errors; a *runtime* crash appears only in the browser console (F12).
3. **Confirm `npm install` actually completed** — `lucide-react` and `recharts` are both required. Run `npm ls recharts lucide-react`; if either is missing, re-run `npm install`.

## 2c. Recent Attempts moved: Dashboard → Workers page

The "Recent activity" table that used to sit at the bottom of the Dashboard has been removed from there and rebuilt on the **Workers page**, sitting alongside the worker list as two side-by-side panels (`.two-col`, the same layout pattern the Dashboard already uses for its two chart panels) — the worker list on the left, Recent Attempts on the right. On narrow screens the two stack vertically rather than breaking, same as everywhere else that layout is used.

It reads from the same `attempts` fetch the Workers page already made for each worker's training-progress bar — no second network call — just sorted newest-first and capped at 8. No other page, and no colour or token file, was touched for this change.

## 2d. Results page — card layout, not a table

The Results page was rebuilt from a database-style table into a card dashboard (KPI strip + a grid of per-result cards), matching a reference design the team supplied. Nothing about the underlying data changed — it's still one card per attempt, same fields as the old table — only the presentation.

- **No new colours were introduced.** Every colour on this page — the KPI icon circles, the readiness ring, the pass/fail card accent — comes from the same six-swatch Forest & Ember palette already in `tokens.css` (`--brand`, `--signal-go-strong`, `--signal-stop-strong`, etc.). Nothing in `tokens.css` or the page background was touched.
- **Worker photo.** The reference design shows a worker photograph; this build uses a stylised circular hard-hat glyph with a pass/fail-coloured ring (`src/components/WorkerAvatar.jsx`) instead of a fabricated photo of a specific person. If you have real headshots once workers are registered through Person 2's backend, swap the icon in that one file for an `<img>` and every card picks it up automatically.
- **KPI definitions**, computed from the same attempt data every other page uses:
  - *Total Workers* — from `getSummary().workerCount`.
  - *Overall Readiness* — the average score across every attempt (not a pass/fail rate — deliberately matches the reference's "Avg. Score" label).
  - *Passed* — attempts that are both `status: "pass"` **and** `syncState: "synced"` (a passing result still waiting to sync isn't "completed successfully" yet).
  - *Need Review* — everything else (failed, or passed-but-still-pending). Passed + Need Review always equals the total attempt count.
- **Per-card "Modules" progress** is that worker's overall modules-passed count across *all* their attempts — not just the one this card represents — so it reads correctly even while a module/status filter is narrowing what's on screen.
- A new reusable `RadialRing` component (`src/components/RadialRing.jsx`) draws every ring on this page — no new charting dependency added.

## 3. Project structure

```
src/
├─ api/
│  ├─ client.js       ← the ONLY file that calls fetch(). All pages import from here.
│  └─ mockData.js      ← contract-shaped sample data (workers, modules, attempts, certificates)
├─ context/
│  └─ AuthContext.jsx  ← admin session state (token in localStorage)
├─ i18n/
│  ├─ strings.js       ← all UI text; en / hi / sat keyed tables
│  └─ LanguageContext.jsx
├─ components/         ← Layout, Topbar, TopNav, Badge, StatCard, ModuleTag,
│                         AddWorkerModal, AdminDetailsPanel, DataState,
│                         ErrorBoundary, ProtectedRoute, RadialRing,
│                         WorkerAvatar
├─ pages/
│  ├─ Login.jsx
│  ├─ Overview.jsx           → "/"              (nav label: "Dashboard")
│  ├─ Workers.jsx             → "/workers"
│  ├─ WorkerDetail.jsx        → "/workers/:id"
│  ├─ Results.jsx             → "/results"
│  ├─ Certificates.jsx        → "/certificates"
│  ├─ About.jsx                → "/about"        (About Us + Training Modules)
│  ├─ VerifyCertificate.jsx   → "/verify/:code"  (public, no login — QR target)
│  └─ NotFound.jsx
└─ styles/
   ├─ tokens.css       ← design system: colour, type, radius variables
   └─ global.css

public/
└─ images/login-hero.png   ← login page background photo
```

**Why one API file:** every page calls functions like `api.getWorkers()` or `api.getAttempts()` — never `fetch` directly. When the real backend's paths or field names differ even slightly from the draft below, you fix it in exactly one place (`src/api/client.js`) and every page updates automatically.

---

## 4. API contract — confirm this with Person 2 on Day 1

This is the shape the dashboard already expects. Share this section with Person 2 directly; it mirrors the shared data contract they own (worker/module/attempt/certificate IDs, scoring version, sync states, pass criteria) from the workflow plan.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token, admin }` |
| GET | `/api/summary` | admin | Dashboard totals (see below) |
| GET | `/api/workers?search=` | admin | List workers |
| POST | `/api/workers` | admin | **New** — `{ name, workerCode, site, language }` → `Worker`. Backs the "+ Add Worker" form. |
| GET | `/api/workers/:id` | admin | One worker + their attempts + certificates |
| GET | `/api/modules` | admin | All modules the platform offers (Fire and Gas required, plus the optional bonus module) |
| GET | `/api/attempts?workerId=&moduleId=&status=` | admin | Assessment attempts, filterable |
| GET | `/api/certificates?status=` | admin | Issued certificates |
| GET | `/api/certificates/verify/:certificateCode` | **public** | Used by the QR code printed/shown on a certificate — must work with no login |

### Field names (must match Person 1 and Person 2's event payloads exactly)

```
Worker      { id, name, workerCode, site, language, status, registeredAt }
              status: "active" | "inactive"   <- new field, used for the
              Workers-page status filter and badge. If the backend doesn't
              return it yet, the dashboard defaults any missing value to
              "active" so nothing breaks — add it when convenient, not
              urgently.
Module      { id, name, code }        code: "FIRE" | "GAS" | "BONUS"
Attempt     { id, workerId, moduleId, score, status, durationSeconds,
              syncState, completedAt, attemptNumber, scoringVersion }
              status: "pass" | "fail"     syncState: "synced" | "pending"
Certificate { id, certificateCode, workerId, moduleId, attemptId,
              status, issuedAt }
              status: "valid" | "revoked"
```

`GET /api/summary` should return:

```json
{
  "workerCount": 0,
  "attemptCount": 0,
  "passRate": 0,
  "certificateCount": 0,
  "pendingSyncCount": 0
}
```

If Person 2 needs to change a field name or add pagination, that's fine — it only needs to be reflected in `src/api/client.js` and, if needed, `mockData.js` so the two stay in sync.

**Auth:** every authenticated request sends `Authorization: Bearer <token>` (token returned from login, stored in `localStorage`). `verifyCertificate` deliberately never sends this header — it's the public route a QR code opens.

**On "no issues when the backend connects":** every read (`getWorkers`, `getAttempts`, etc.) tries the live API first and only falls back to sample data on failure — so wiring up `VITE_API_BASE_URL` never breaks the page, it just changes the data source. `createWorker` is the one write in this contract; it does **not** silently fall back to sample data if the live call fails, because a create that silently "succeeds" against fake data would be misleading — the form shows a real error instead and lets the admin retry.

---

## 5. How this connects to the rest of the team

- **Person 1 (Unity AR app):** doesn't call this dashboard directly. The link is data: attempt records Person 1's app submits to Person 2's `/api/attempts` (or equivalent) endpoint show up here automatically once saved — same `attemptId`, `scoringVersion` and `syncState` values the app used. No dashboard changes needed on your side when the Unity app changes, as long as the field names above stay the contract.
- **Person 2 (backend):** is the only service this dashboard talks to over HTTP. Give them section 4 above on Day 1 so the schema (`docs/` in the workflow plan) and this contract are decided together, before either side writes much code.
- **Person 4 (offline, localisation, assets):**
  - **Localisation:** all UI copy lives in `src/i18n/strings.js`. The `en` table is complete; `hi` and `sat` are stub objects with `TODO` comments — Person 4 fills in the reviewed translations there. Keys must stay identical; any key left untranslated automatically falls back to English so nothing ever renders blank mid‑review.
  - **Offline queue / sync:** the dashboard doesn't manage offline state itself (that's the Unity app + Person 4's queue), but it **displays** it — every attempt shows a *Synced* / *Pending* badge from `syncState`, and Overview surfaces a pending‑sync count, so admins can see when device‑queued results haven't landed yet.
- **QR certificates:** whatever URL Person 2 encodes into the certificate QR should point to `/verify/:certificateCode` on wherever this dashboard is deployed. That route is public, requires no admin session, and only ever displays the fields listed in section 4 — never anything else about the worker.

---

## 6. Design notes (v6 — Forest & Ember palette)

The visual system has been through six passes; this one is a **dark "Forest & Ember"** theme built from the six supplied swatches, all of which are in use:

| Swatch | Role |
|---|---|
| `#122324` deepest forest-black | page background |
| `#2F3A32` dark moss | panel / card surface |
| `#545748` olive grey | raised surfaces, borders, one KPI accent |
| `#DB9F75` warm peach | **primary** accent — active nav, buttons, headline figures |
| `#804012` burnt orange | secondary accent — Fire module, caution states |
| `#3E2411` dark cocoa | recessed rows, tag fills, avatar gradients |

Colour is distributed by role rather than "one accent everywhere": peach drives interactive elements and key numbers, ember marks the Fire module and caution states, olive carries neutral structure, cocoa sits underneath as the recessed layer. The four KPI cards each take a different accent so no two read the same. Status green/red are derived warm-toned variants so pass/fail stays instantly legible on the dark ground without clashing.

Contrast was handled explicitly: elements sitting on the light peach (primary buttons, active nav, the peach icon chips) take **dark** glyphs/text (`#1A1208`), while chips on olive/ember/cocoa keep white. Avatar and brand gradients run ember→cocoa so white text stays legible across the whole gradient.

**Typography** is unchanged — three fonts with distinct jobs: **Sora** (headings), **Manrope** (body/UI), **IBM Plex Mono** (data: IDs, scores, codes).

### Dashboard charts

**Pass rate by module — stacked area chart.** Shows each training module's **cumulative pass rate (%)** over time, one coloured area per module (Fire / Gas / Bonus).

- Each point is that module's pass rate across every attempt logged *up to and including* that day. A running rate is used deliberately rather than a raw per-day ratio: with only a handful of attempts a day, a daily ratio swings between 0% and 100% and carries no signal, whereas the cumulative line reads as a genuine quality trend.
- Y-axis is locked to 0–100% with `%` tick labels, so the scale can't mislead.
- Days *before* a module has any attempt are `null`, not `0` — with `connectNulls={false}` each area simply begins when that module goes live, instead of drawing a false 0% run-in.
- Gaps between active days are still filled, so the lines stay continuous.
- Module colours come from a single `MODULE_SERIES` constant at the top of `Overview.jsx`. **If Person 2's `/api/modules` ever returns a fourth module, add one entry there and it renders automatically** — nothing else changes.

**Pass / fail breakdown — radar (spider) chart.** One axis per module, two overlaid series: **Pass %** (green) and **Fail %** (red).

- On every axis Pass + Fail totals exactly 100%, so the shape reads directly as "how much of this module's activity is passing."
- Radius axis is fixed 0–100% with percentage ticks.
- Underneath, a legend still shows the **overall** pass/fail percentages and raw attempt counts across all modules, so the panel answers both "per module" and "headline number."

Both charts handle the empty case explicitly (a "no activity" state rather than an empty axis), which matters on first connect when the backend has no attempts yet.

### Admin account panel

Clicking the **Site Admin chip** in the top bar now opens a details panel showing name, role, email, session status, current data source (live vs. sample, with a pulsing indicator) and a language switcher, plus sign-out. It closes on Escape or an outside click. It uses only data the dashboard already holds from login — no new endpoint required. If Person 2 later adds `GET /api/auth/me` with richer profile fields, they drop straight into this panel with no other changes.

## 7. Certificate wording

The verification page and any certificate‑related copy uses the DGMS‑aligned wording only: *"DGMS‑aligned competency‑based certificate."* It does not state or imply official DGMS issuance, approval or accreditation — see `verify_disclaimer` in `src/i18n/strings.js` if this copy needs to change; keep it consistent with whatever Person 2/1 print on the physical/in‑app certificate.

## 8. Day-by-day status (where you actually are)

**Day 1** deliverable was: *"Separated dashboard application and endpoint checklist."*

| Day 1 task | Status |
|---|---|
| Move `backend/admin-dashboard` → root-level `admin-dashboard/` | **Do this in the actual repo** — this project is already structured to sit at root (own `package.json`, own dev server); you still need to place/commit it there yourself, since I can't push to your repo. |
| Remove the old Vite/React starter screen | Done. |
| Add routing | Done — `react-router-dom`, 8 routes in `App.jsx`. |
| Add navigation | Done — horizontal, centred nav bar with icons. |
| Page shells for overview, workers, results, certificates | **Exceeded** — fully working pages against contract-shaped sample data. |
| Endpoint checklist to share with Person 2 | Done — section 4 of this README *is* that checklist. |

**Day 3** (*"Results and worker-detail pages ready for real attempts"*) and **Day 4** (*"Sample QR opens the matching verification record"*) are also built: Results has module/status filters with pass/fail and sync badges; Certificates lists issued certificates with status filtering and now routes to the public `/verify/:code` page, which renders valid / revoked / not-found states. **So you are at Day 4, not Day 3.** Day 5 (swapping sample data for Person 2's live API) is the next one, and it's blocked on the backend existing.

### Day 5 readiness — what's already done on this side

Day 5 itself ("replace sample data with live APIs") can't be *finished* without Person 2's backend running, but everything on the dashboard's side that Day 5 depends on is already in place, verified this pass:

- Every read (`getWorkers`, `getAttempts`, `getCertificates`, `getSummary`, `getModules`) tries the live API first via `isLiveModeConfigured()` and only falls back to sample data on failure — confirmed by re-reading `client.js` line by line.
- The one write (`createWorker`) does **not** silently fall back — a failed live create surfaces a real error in the Add Worker modal instead of pretending to succeed.
- Both dashboard charts and every KPI are computed from whatever `state.attempts` / `state.workers` / `state.modules` hold — they don't know or care whether that came from sample data or a live fetch, so nothing chart-specific needs to change when you connect the backend.
- "Essential filters" (Day 5's own wording) are in place: Results filters by module and status, Workers filters by site/status/module plus search, Certificates filters by status.
- Hindi/Santali label integration point is ready — `src/i18n/strings.js` has the `hi`/`sat` stub tables waiting on Person 4's reviewed text; keys already match `en` one-for-one.

**In short: there is nothing left to build on the dashboard for Day 5 — only to point it at a real backend and confirm the contract in §4 matches.**

**Day 2** deliverable was: *"Login and worker list with clear data states,"* built from *"login, summary cards, worker listing and worker details using contract-shaped sample data … loading, empty and error states."*

| Day 2 task | Status |
|---|---|
| Login | Done — demo credentials work today (`admin@site.local` / `admin123`, no longer shown on screen), swaps to live auth the moment `VITE_API_BASE_URL` is set. |
| Summary cards | Done — the Dashboard's four KPI cards, each with a derived percentage, not just a bare number. |
| Worker listing | Done — searchable, filterable (Site/Status/Module) row-card list with a working "+ Add Worker" flow. |
| Worker details | Done — score, module-by-module progress, certificate count, recent attempts. |
| Loading / empty / error states | Done — `<Loading>`, `<Empty>`, `<ErrorState>` from `components/DataState.jsx`, used consistently on every data-bearing page. |

### Fixed in this pass — Dashboard crashed to a blank page

The Dashboard page (`src/pages/Overview.jsx` — this is the file the "Overview" nav item became "Dashboard" for) was throwing `ReferenceError: strongestModule is not defined` on every load, which is why the page rendered as the error-boundary screen. A previous edit that removed the old gauge chart accidentally deleted the calculation for `strongestModule` (the module currently leading in pass rate, used in the pass-rate chart's subtitle) while leaving the line that *displays* it. It's restored now — re-verified against the sample data: it correctly resolves to whichever module has the highest pass rate. No other file needed a change for this; the bug was isolated to that one component. The browser tab title (`index.html`) was also still reading the old pre-rename text ("...AR Safety Training Admin") and has been updated to match the in-app "Dashboard" naming.

### Fixed in this pass — Certificates page

The Certificates table looked interactive (rows had a pointer cursor) but **had no click handler**, so clicking a certificate did nothing and there was no route from that page to the verification view. Each row now opens `/verify/:certificateCode` — the same public page a QR scan lands on — and carries an explicit **Verify** action plus a QR glyph beside the code. This is what "the certificate section is not working" was.

**Days 1 through 4 are functionally complete.** The one thing left that's procedural rather than code: **commit this folder into your team's repo at the root level, on the `feature-admindash` branch**, so Person 2 and your team lead can see it.

What's genuinely incomplete and blocked on other people, not you:
- **Live data** (Day 5) — needs Person 2's backend to exist and answer requests. The dashboard is ready for it the moment `VITE_API_BASE_URL` is set; nothing else to build here until then.
- **Hindi/Santali strings** — stub keys are in `src/i18n/strings.js` waiting on Person 4's reviewed translations.
- **QR codes actually resolving** — needs Person 2 to generate certificates pointing at `/verify/:certificateCode` on wherever this app ends up deployed.

### What to do next
1. Commit this folder to the repo root on `feature-admindash`, push, open the PR into `develop`.
2. Send Person 2 section 4 of this README today so the backend schema (including the new `Worker.status` field and the three-module list) is built to match.
3. Run `npm install && npm run dev` yourself and click through every page once — Login → Dashboard → Workers → a worker detail → Results → Certificates → About — to confirm nothing looks off on your machine before the team demo.
4. The moment Person 2 has even one real endpoint running, set `VITE_API_BASE_URL` locally and confirm that one page renders identically to its sample-data version — catch contract mismatches early rather than all at once on Day 5.

## 9. What's left to build against your 7‑day plan

This scaffold covers the full Day 1–3 shape (routing, login, workers, results with contract‑shaped sample data, loading/empty/error states) plus the Day 4–5 pieces (certificates, public verification page, language switching) already wired in, so you can move straight to:

- Day 5: swap `VITE_API_BASE_URL` to the real backend and confirm live data renders identically to sample data.
- Day 6: test the offline‑synced‑result‑appears‑once flow end‑to‑end with Person 2 and Person 4, run through invalid QR / empty‑list / server‑failure cases (`ErrorState` and `Empty` components already handle these — verify the copy reads correctly with real failures).
- Day 7: freeze the UI, swap the demo login for real admin accounts if Person 2 provides them, and use this README as your handover / administrator guide (add screenshots if time allows).
