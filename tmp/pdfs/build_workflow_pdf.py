from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "Repository_Based_Seven_Day_Workflow.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = letter
NAVY = colors.HexColor("#112075")
BLUE = colors.HexColor("#2659A6")
TEAL = colors.HexColor("#0E7C7B")
ORANGE = colors.HexColor("#E17B31")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5E687A")
PALE_BLUE = colors.HexColor("#EEF4FC")
PALE_TEAL = colors.HexColor("#EAF7F5")
PALE_ORANGE = colors.HexColor("#FFF3E8")
LIGHT = colors.HexColor("#F5F7FA")
BORDER = colors.HexColor("#D9DEE8")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=10, leading=13, textColor=TEAL, spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=31, leading=35, textColor=NAVY, alignment=TA_LEFT, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSubtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=15, leading=21, textColor=MUTED, spaceAfter=24,
))
styles.add(ParagraphStyle(
    name="SectionTitle", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=21, leading=25, textColor=NAVY, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="SectionIntro", parent=styles["Normal"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=MUTED, spaceAfter=13,
))
styles.add(ParagraphStyle(
    name="HeadingSmall", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=11.5, leading=14, textColor=NAVY, spaceBefore=8, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="BodyCustom", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.2, leading=13.4, textColor=INK, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BodySmall", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.1, leading=11.1, textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=8.4, leading=10.2, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="TableBody", parent=styles["Normal"], fontName="Helvetica",
    fontSize=7.8, leading=10.3, textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableBodyBold", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=8.0, leading=10.3, textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="DayLabel", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=9.1, leading=11, textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="DayBody", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8.45, leading=11.5, textColor=INK,
))
styles.add(ParagraphStyle(
    name="CardNumber", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=19, leading=22, textColor=NAVY, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="CardLabel", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=7.5, leading=9, textColor=MUTED, alignment=TA_CENTER,
))


def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def page_chrome(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    if page > 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 0.17 * inch, PAGE_W, 0.17 * inch, fill=1, stroke=0)
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(0.68 * inch, PAGE_H - 0.43 * inch, "AR INDUSTRIAL SAFETY TRAINING PLATFORM")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(0.68 * inch, 0.47 * inch, PAGE_W - 0.68 * inch, 0.47 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.68 * inch, 0.28 * inch, "Seven-day four-person prototype workflow")
    canvas.drawRightString(PAGE_W - 0.68 * inch, 0.28 * inch, f"Page {page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUTPUT), pagesize=letter,
    leftMargin=0.68 * inch, rightMargin=0.68 * inch,
    topMargin=0.62 * inch, bottomMargin=0.62 * inch,
    title="Repository-Based Seven-Day AR Industrial Safety Workflow",
    author="Project Team",
    subject="Repository-based seven-day implementation workflow for a four-person prototype team",
)
frame = Frame(
    doc.leftMargin, doc.bottomMargin,
    PAGE_W - doc.leftMargin - doc.rightMargin,
    PAGE_H - doc.topMargin - doc.bottomMargin,
    id="normal",
)
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=page_chrome)])

story = []

# Cover and overview
story.extend([
    Spacer(1, 0.56 * inch),
    p("PROJECT DELIVERY PLAN", "CoverKicker"),
    p("AR Industrial Safety<br/>Training Platform", "CoverTitle"),
    p("Repository-based seven-day workflow for a four-person prototype team", "CoverSubtitle"),
])

metric_data = [
    [p("7", "CardNumber"), p("4", "CardNumber"), p("2 + 1", "CardNumber")],
    [p("DAYS", "CardLabel"), p("TEAM MEMBERS", "CardLabel"), p("CORE + BONUS AR MODULES", "CardLabel")],
]
metrics = Table(metric_data, colWidths=[2.28 * inch] * 3, rowHeights=[0.42 * inch, 0.28 * inch])
metrics.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
    ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
    ("INNERGRID", (0, 0), (-1, -1), 0.7, colors.white),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 9),
    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
]))
story.extend([metrics, Spacer(1, 0.28 * inch), p("Project overview", "HeadingSmall")])
story.append(p(
    "The repository currently contains an empty Unity project skeleton, an initial Node package, a Vite/React "
    "starter nested under the backend, and placeholder folders for assets, documentation and localisation. "
    "The team will correct the repository layout on Day 1, prove one complete training journey early, reuse "
    "that foundation for the second module, and reserve the final two days for testing and demonstration readiness."
))
story.append(p("Required project features", "HeadingSmall"))
features = [
    "Android AR app with Fire and Explosion Response: exit identification, extinguisher use and evacuation sequencing overlaid on real surroundings via the phone camera.",
    "Gas Leak and Confined Space Protocol: hazard-zone recognition, PPE selection and buddy-system procedures simulated in AR.",
    "Optional Jharkhand mine-worker-specific bonus module, attempted only after the required scope is stable.",
    "Assessment engine; QR-based certificate generation and verification; Hindi and Santali localisation; offline functionality; low-poly models for low- and mid-range devices; and an admin web dashboard.",
]
for item in features:
    story.append(p(f"<font color='#0E7C7B'><b>-</b></font> {item}", "BodyCustom"))

dgms = Table([[p(
    "<b>Certificate wording:</b> Use <b>DGMS-aligned competency-based certificate</b>. Do not describe the "
    "prototype credential as official DGMS certification or imply DGMS issuance, approval or accreditation.",
    "BodyCustom")]], colWidths=[6.84 * inch])
dgms.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), PALE_ORANGE),
    ("BOX", (0, 0), (-1, -1), 0.8, ORANGE),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.extend([Spacer(1, 5), dgms, PageBreak()])

# Roles and feature ownership
story.extend([
    p("Repository setup and feature ownership", "SectionTitle"),
    p("Day 1 begins with repository correction. Each feature then has one accountable lead and named integration support.", "SectionIntro"),
])
role_rows = [
    ["Person 1", "Unity AR and training modules", "Android AR app, training interactions, local assessment events and final APK"],
    ["Person 2", "Backend and data", "Node.js, Express, PostgreSQL, scoring, sync APIs and QR certificates"],
    ["Person 3", "Admin dashboard", "React dashboard, worker results, analytics and public QR verification"],
    ["Person 4", "Offline, language and assets", "Offline queue, Hindi and Santali, low-poly assets and test coordination"],
]
role_table = Table(
    [[p("PERSON", "TableHead"), p("ROLE", "TableHead"), p("ACCOUNTABILITY", "TableHead")]] +
    [[p(a, "TableBodyBold"), p(b, "TableBody"), p(c, "TableBody")] for a, b, c in role_rows],
    colWidths=[0.78 * inch, 1.62 * inch, 4.44 * inch], repeatRows=1,
)
role_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
    ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story.extend([role_table, Spacer(1, 0.2 * inch), p("Feature-to-owner mapping", "HeadingSmall")])
owner_rows = [
    ["Android AR app and two required modules", "Person 1", "Person 4 assets; Person 2 results"],
    ["Jharkhand mine-worker bonus module", "Person 1", "Person 4 content and assets"],
    ["Assessment engine", "Person 2", "Person 1 event capture"],
    ["QR generation and verification", "Person 2", "Person 3 verification page"],
    ["Hindi and Santali localisation", "Person 4", "Persons 1 and 3 integration"],
    ["Offline functionality", "Person 4", "Person 2 sync API; Person 1 app"],
    ["Low-poly device support", "Person 4", "Person 1 scene profiling"],
    ["Admin web dashboard", "Person 3", "Person 2 APIs"],
]
owner_table = Table(
    [[p("FEATURE", "TableHead"), p("LEAD", "TableHead"), p("SUPPORT", "TableHead")]] +
    [[p(a, "TableBody"), p(b, "TableBodyBold"), p(c, "TableBody")] for a, b, c in owner_rows],
    colWidths=[3.15 * inch, 0.9 * inch, 2.79 * inch], repeatRows=1,
)
owner_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), BLUE),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5.5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5.5),
]))
story.extend([owner_table, Spacer(1, 8), p(
    "<b>Repository actions before feature work:</b> Move <b>backend/admin-dashboard</b> to root-level "
    "<b>admin-dashboard</b>; keep the backend and dashboard as separate applications; create the real Unity "
    "project through Unity Hub; add a project .gitignore; exclude tmp render files; decide whether output PDFs "
    "belong in Git; and commit the clean baseline. Person 2 owns the shared data contract for worker, module, "
    "attempt and certificate identifiers, assessment events, pass criteria, API responses and sync states.",
    "BodySmall"), PageBreak()])


workflows = [
    (
        "Person 1", "Unity AR and training modules", TEAL,
        "Own the Android training experience and deliver the final integrated APK.",
        [
            ("Day 1 - Foundation", "Create the Unity project with AR Foundation and ARCore. Configure Android builds, camera permission and plane detection. Define both scenario sequences and assessment events with Person 2.", "Installable AR starter build and interaction checklist."),
            ("Day 2 - Fire prototype", "Build Fire and Explosion Response with exit identification, extinguisher selection/use and evacuation sequencing in the phone-camera view. Use stable language keys.", "Playable Fire scenario covering all three actions."),
            ("Day 3 - Fire assessment", "Record correct and incorrect actions, action order and completion time. Display a score, save it locally and submit a sample result to the backend.", "Assessed Fire attempt stored locally and accepted by the API."),
            ("Day 4 - Gas prototype", "Build Gas Leak and Confined Space Protocol with hazard-zone recognition, PPE selection and buddy-system procedures. Reuse the established interaction framework.", "Playable Gas scenario covering all required procedures."),
            ("Day 5 - Required modules complete", "Finish Gas assessment, connect both modules to the result flow, integrate Hindi and Santali, and check retries, scene resets and consistent attempt identifiers.", "Two complete modules with assessment and language selection."),
            ("Day 6 - Integration", "Run both modules offline, restart the app, reconnect and confirm syncing. Fix tracking, scoring and scene issues. Attempt bonus work only after the shared acceptance gate passes.", "Release-candidate APK with both required modules."),
            ("Day 7 - Delivery", "Fix release blockers, build the final APK and rehearse training, assessment and certificate status. Record a backup walkthrough and document the Unity build process.", "Final APK, recording and Unity handover notes."),
        ],
    ),
    (
        "Person 2", "Backend, database and certificate system", BLUE,
        "Own persistent records, result validation, synchronisation and certificate issuance.",
        [
            ("Day 1 - Data contract", "Create Node.js, Express and PostgreSQL foundations. Define workers, modules, attempts and certificates, roles, attempt IDs, scoring version, sync responses and prototype pass criteria.", "Schema, endpoint contract and sample API data."),
            ("Day 2 - Core API", "Implement authentication plus worker, module and attempt endpoints. Seed demonstration workers and the two required modules. Restrict management routes to administrators.", "Usable core API and demonstration credentials."),
            ("Day 3 - Assessment engine", "Implement versioned scoring, pass/fail rules and result validation. Preserve completed attempts and use attempt IDs to make retries duplicate-safe.", "Assessment storage proven with pass, fail and duplicate cases."),
            ("Day 4 - QR certificates", "Issue a certificate only for a validated passing result. Store a unique certificate ID and expose a QR verification URL with only necessary public fields.", "Working certificate generation and verification APIs."),
            ("Day 5 - Sync and analytics", "Finish queued-result syncing and dashboard summary endpoints. Return an acknowledgement per attempt and leave unacknowledged results pending on the client.", "Stable sync API, metrics and eligibility checks."),
            ("Day 6 - Failure testing", "Test expired login, malformed results, network interruptions, duplicate requests and invalid certificate IDs. Reconcile app attempts, database rows and dashboard totals.", "Integration defects resolved and records consistent."),
            ("Day 7 - Backend release", "Freeze the API, prepare demonstration data, verify backend reachability and QR URLs, and save schema, configuration instructions and a restorable backup.", "Running backend, database backup and API handover."),
        ],
    ),
    (
        "Person 3", "React admin dashboard", ORANGE,
        "Own the administrator experience and browser-based certificate verification journey.",
        [
            ("Day 1 - Dashboard correction", "Move the existing Vite/React starter from backend/admin-dashboard to root-level admin-dashboard. Remove the starter screen, then add routing, navigation and page shells for overview, workers, results and certificates.", "Separated dashboard application and endpoint checklist."),
            ("Day 2 - Workers", "Build login, summary cards, worker listing and worker details using contract-shaped sample data until live endpoints are ready. Include loading, empty and error states.", "Login and worker list with clear data states."),
            ("Day 3 - Results", "Display module, score, pass/fail, completion time and worker history. Add worker and module filters and align all fields with the assessment response.", "Results and worker-detail pages ready for real attempts."),
            ("Day 4 - Certificates", "Build certificate management and a public verification page opened by the QR URL. Show valid, unknown and invalid/revoked states with DGMS-aligned wording.", "Sample QR opens the matching verification record."),
            ("Day 5 - Live APIs", "Replace sample data with live workers, results, certificates and summary APIs. Add essential charts and filters and integrate agreed translated labels.", "Live dashboard showing results from both modules."),
            ("Day 6 - Journey testing", "Verify offline-synced results appear once. Test administrator access, invalid QR links, empty lists, server failures and translated text wrapping.", "Admin and public verification flows pass integration checks."),
            ("Day 7 - Dashboard delivery", "Prepare clean demonstration data and rehearse worker lookup, result review and QR verification. Freeze the UI and document setup, sign-in and page use.", "Demo-ready dashboard and administrator guide."),
        ],
    ),
    (
        "Person 4", "Offline, localisation, assets and testing", TEAL,
        "Own the cross-cutting mobile support work and coordinate device-level quality checks.",
        [
            ("Day 1 - Baseline", "Add the shared .gitignore and help verify the clean repository baseline. Choose low-poly assets and scene budgets, define language keys, confirm the Santali script/reviewer, design sync states and list target phones.", "Clean baseline, asset list, translation sheet and device list."),
            ("Day 2 - Fire support", "Optimise exit, fire and extinguisher assets. Prepare Hindi and Santali strings for shared UI and Fire instructions. Test fonts and glyph rendering in Unity.", "Import-ready Fire assets and tracked language strings."),
            ("Day 3 - Offline queue", "Implement SQLite or local storage for completed attempts and queued uploads. Persist attempt IDs and scoring version and restore pending items after restart.", "A Fire attempt survives loss of connectivity and restart."),
            ("Day 4 - Gas and sync", "Deliver hazard-zone and PPE assets plus Gas and buddy-system strings. Connect the queue to the sync API and remove entries only after acknowledgement.", "Gas assets integrated; results sync without duplicates."),
            ("Day 5 - Language and performance", "Complete Hindi and Santali review, bundle required offline content, profile both scenes and reduce model, texture, lighting and memory costs.", "Localised offline build with recorded device observations."),
            ("Day 6 - System testing", "Lead airplane-mode, restart, reconnect, language-switching and device tests. Verify each queued attempt reaches the dashboard exactly once and coordinate retesting.", "Signed-off checklist or explicit release-blocker list."),
            ("Day 7 - Final quality check", "Install the final APK on demonstration phones, preload content, run the full journey and prepare asset licences, test evidence and known limitations.", "Verified demo devices and final test report."),
        ],
    ),
]


for person, role, accent, intro, days in workflows:
    story.extend([
        p(person.upper(), "CoverKicker"),
        p(role, "SectionTitle"),
        p(intro, "SectionIntro"),
    ])
    rows = [[p("DAY AND FOCUS", "TableHead"), p("WORK AND DELIVERABLE", "TableHead")]]
    for day, task, deliverable in days:
        rows.append([
            p(day, "DayLabel"),
            p(f"{task}<br/><font color='#5E687A'><b>Deliverable:</b> {deliverable}</font>", "DayBody"),
        ])
    t = Table(rows, colWidths=[1.35 * inch, 5.49 * inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), accent),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6.5),
    ]))
    story.extend([t, PageBreak()])


# Checkpoints
story.extend([
    p("Team checkpoints and acceptance", "SectionTitle"),
    p("Hold a 15-minute morning dependency check and an end-of-day demonstration from the shared build. Give every issue one owner and merge working increments daily.", "SectionIntro"),
])
checkpoints = [
    ("Day 1", "Scope and interfaces", "AR runs on a phone; scenario flows, API contract, scoring rules, language keys and ownership are agreed."),
    ("Day 2", "First interactions", "Fire is playable; core endpoints and dashboard skeleton exist; initial assets and translations are delivered."),
    ("Day 3", "First complete data flow", "A Fire attempt produces a score, survives local storage and is accepted by the backend."),
    ("Day 4", "Second module and QR", "Gas is playable; a sample certificate QR resolves; sync client and backend exchange acknowledgements."),
    ("Day 5", "Required-feature freeze", "Both modules, assessment, QR, languages, offline queue, low-poly assets and dashboard are integrated."),
    ("Day 6", "Acceptance and bonus gate", "Core journeys and failure cases pass on available phones, with no unresolved demonstration blocker."),
    ("Day 7", "Release rehearsal", "APK, backend and dashboard reproduce the end-to-end journey; handover and backup recording are ready."),
]
checkpoint_table = Table(
    [[p("CHECKPOINT", "TableHead"), p("FOCUS", "TableHead"), p("EVIDENCE REQUIRED", "TableHead")]] +
    [[p(a, "TableBodyBold"), p(b, "TableBodyBold"), p(c, "TableBody")] for a, b, c in checkpoints],
    colWidths=[0.72 * inch, 1.55 * inch, 4.57 * inch], repeatRows=1,
)
checkpoint_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
    ("GRID", (0, 0), (-1, -1), 0.55, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story.extend([checkpoint_table, Spacer(1, 0.2 * inch), p("Final demonstration sequence", "HeadingSmall")])
story.append(p(
    "Select Hindi or Santali, complete both required AR modules and view each assessment. Complete one attempt "
    "offline, close and reopen the app, reconnect, and confirm the result appears exactly once in the dashboard. "
    "For a server-validated pass, generate a certificate and scan its QR to open the matching verification record."
))
story.append(p("Offline boundary", "HeadingSmall"))
story.append(p(
    "Preloaded training content, instructions, assessment and saved results work without connectivity. New certificate "
    "issuance and live QR verification require the backend. Show a pending state until results sync and are validated; "
    "do not present cached status as live verification."
))
story.append(PageBreak())


# Priorities and done
story.extend([
    p("Priority order and completion criteria", "SectionTitle"),
    p("Localisation, offline storage and device constraints begin on Day 1 because they shape the core design.", "SectionIntro"),
])
priorities = [
    ("1", "Correct and prove the foundation", "Separate the dashboard from the backend, commit a clean baseline, confirm AR support and establish working mobile, backend and dashboard projects."),
    ("2", "Finish the Fire journey", "Complete Fire from interaction through assessment, local persistence and backend storage."),
    ("3", "Complete Gas and offline sync", "Reuse the working interaction framework and prove restart-safe, duplicate-safe synchronisation."),
    ("4", "Complete the required experience", "Finish QR certificates, Hindi and Santali, low-poly optimisation and live admin views."),
    ("5", "Stabilise and rehearse", "Use Day 6 for integration and Day 7 for release, documentation and demonstration practice."),
    ("6", "Consider the bonus", "Attempt a small Jharkhand module only after every required feature passes the Day 6 gate."),
]
for number, heading, body in priorities:
    block = Table([
        [p(number, "CardNumber"), p(f"<b>{heading}</b><br/>{body}", "BodyCustom")]
    ], colWidths=[0.62 * inch, 6.22 * inch])
    block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), PALE_TEAL),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.55, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.extend([block, Spacer(1, 6)])

story.extend([
    p("Definition of done", "HeadingSmall"),
    p(
        "Both required modules cover every requested procedure and produce repeatable assessment results. Hindi and "
        "Santali text is reviewed and readable. Preloaded training and results persist offline, reconnection creates no "
        "duplicate attempts, and the dashboard matches backend records. Only a validated passing attempt receives a QR "
        "certificate, using DGMS-aligned wording and a working verification page."
    ),
    p("Device support and handover", "HeadingSmall"),
    p(
        "Record the Android models tested and their observed limitations. Hand over the APK, source projects, database "
        "schema, API and setup instructions, language files, asset licences, test evidence and backup demonstration recording."
    ),
])

doc.build(story)
print(OUTPUT)
