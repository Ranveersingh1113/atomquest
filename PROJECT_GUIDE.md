# Atomberg — Goal Setting & Tracking Portal
## Complete Project Guide

---

## 1. What Is This Project?

The Atomberg Goal Setting & Tracking Portal is a full-stack internal web application built for **Atomberg Hackathon 1.0**. It digitises the complete employee performance cycle:

**Goal Creation → Manager Approval → Quarterly Check-ins → Reporting → Governance**

It eliminates spreadsheets, emails, and offline review cycles. Managers get real-time visibility, employees get clarity, and HR gets audit-ready data — all in one portal.

**Live at:** `http://localhost:5173` (dev) · `http://localhost:4000` (production, single-process)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite + Tailwind v4 + Recharts | Code-split; Analytics lazy-loaded |
| Backend | Node.js 24 + Express | Minimal REST layer |
| Database | SQLite via `node:sqlite` (built-in) | Zero infra — no DB server, no native build |
| Auth | HMAC-signed bearer tokens | Stateless, no session store |
| SSO | Microsoft Entra ID via MSAL Node | OAuth2 auth-code flow |
| Email | nodemailer (any SMTP) | Tested with Gmail |
| Teams | Incoming webhook — Adaptive Card / MessageCard | In-app self-configuration |

**Bundle size:** initial JS ≈ 230 KB (Recharts in its own 414 KB chunk, loaded only on Analytics page).

**Infra cost:** 2 Node processes in dev, **1 process in production** (Express serves the built SPA).

---

## 3. Problem Statement Mapping

### Phase 1 — Goal Creation & Approval ✅

| BRD Requirement | Where Implemented |
|----------------|-------------------|
| Employee creates goal sheet (thrust area, title, description) | `My Goal Sheet` → Add Goal modal |
| UoM types: Numeric↑, Numeric↓, %, Timeline, Zero-based | 5 types: `numeric_min`, `numeric_max`, `percent`, `timeline`, `zero` |
| Total weightage = 100% exactly | Server-side + live weightage meter in UI |
| Minimum 10% weightage per goal | Validated on add and at submit |
| Maximum 8 goals per sheet | COUNT-checked server-side; 9th goal blocked |
| Manager edits targets/weightages inline during review | Manager edit mode on submitted sheets |
| Approve & Lock | `goal_sheets.locked = 1`; no edits without admin unlock |
| Return for Rework with comment | Sheet back to `returned`; comment displayed to employee |
| Shared Goals — push KPI to multiple employees | `Shared Goals` page; copies linked via `shared_origin_id` |
| Shared copy recipients adjust weightage only | Server restricts editable fields to `['weightage']` |
| Primary owner achievement syncs to all copies | `tracking.js` upserts on origin + all copies sharing same origin |

### Phase 2 — Quarterly Achievement & Check-ins ✅

| BRD Requirement | Where Implemented |
|----------------|-------------------|
| Quarterly achievement per goal (Q1–Q4) | `AchievementModal.jsx`, `PUT /goals/:id/achievement` |
| Goal status: Not Started / On Track / Completed | Dropdown per goal per quarter |
| Manager check-in with structured comment | `POST /checkins`; manager sees Planned vs Actual |
| UoM progress score computation | `server/lib/scoring.js` — exact BRD formulas (see below) |
| Check-in windows enforced | `openQuarters(cycle)` validates against `q1_open`–`q4_open` dates |

**UoM Scoring Formulas:**

| UoM Type | Formula | Cap |
|----------|---------|-----|
| Numeric↑ (higher is better) | `Achievement ÷ Target` | 1.5× |
| Numeric↓ (lower is better) | `Target ÷ Achievement` | 1.5× |
| Percentage | `Achievement ÷ Target` | 1.5× |
| Timeline | On/before date = 100%, after = 50% | — |
| Zero-based | Actual = 0 → 100%, else 0% | — |

**Check-in Schedule (seeded dates — all open for demo):**

| Period | Window Opens |
|--------|-------------|
| Goal Setting | 1 May 2025 |
| Q1 | 1 Jul 2025 |
| Q2 | 1 Oct 2025 |
| Q3 | 1 Jan 2026 |
| Q4 / Annual | 1 Mar 2026 |

### Reporting & Governance ✅

| BRD Requirement | Where Implemented |
|----------------|-------------------|
| CSV Achievement Report | `GET /reports/achievement.csv` — Employee, Dept, Goal, UoM, Target, Q1–Q4 Actuals, Q1–Q4 Score %, Status |
| Completion Dashboard | `GET /reports/completion` — per sheet, per quarter: employee updated? manager checked in? |
| Full Audit Trail | `audit_log` table — every mutation logged (who / what / when); post-lock edits flagged separately |

### Bonus 5.3 — Escalation Module ✅

**3 rules, 3 escalation levels:**

| Rule | Triggers When |
|------|--------------|
| Goal Setting Overdue | Sheet not submitted within 7 days of cycle opening |
| Approval Overdue | Submitted sheet not approved within 7 days |
| Check-in Overdue | Quarterly check-in not completed in active window |

**Escalation chain (by days overdue):**

| Level | Days | Notified |
|-------|------|---------|
| L1 | ≤ 14 days | Employee |
| L2 | ≤ 28 days | Manager |
| L3 | > 28 days | HR / Admin |

### Bonus 5.4 — Analytics Module ✅

- **QoQ Trend** — Quarter-on-quarter average progress line chart
- **Progress by Department** — Grouped bar chart, Q1–Q4 per department
- **Goal Distribution** — Pie/bar charts by thrust area, UoM type, status
- **Manager Effectiveness** — Check-in completion rate per manager

### Bonus 5.1 — Microsoft Entra ID SSO ✅

- "Sign in with Microsoft" button on login screen (shown only when configured)
- Full OAuth2 authorization-code flow via MSAL Node `ConfidentialClientApplication`
- Reads Graph profile: display name, email, job title, department
- Role mapped from AAD security group membership (admin / manager / employee)
- Reporting line synced from Graph `/me/manager` relationship
- Auto-provisions new users; updates existing on re-login
- `prompt: 'select_account'` forces Microsoft account chooser (prevents silent auto-login)

### Bonus 5.2 — Email + Microsoft Teams ✅

**Email events:**
- Goal sheet submitted → manager notified
- Goal approved → employee notified
- Goal returned → employee notified with comment
- Check-in reminders → employee + manager per open quarter

**Teams events:** same as above, sent as Adaptive Card (Power Automate Workflows) or MessageCard (Classic Incoming Webhook)

**Self-service setup:** Admin → Integrations → paste webhook URL → Save (stored in DB, no server restart)

All dispatches logged to `notifications` table with status `sent` / `failed` / `skipped`.

---

## 4. User Roles

### Employee
- Create and edit goals (draft / returned state only)
- Set UoM type, target value, weightage, description
- Submit goal sheet for manager approval
- View locked goals post-approval
- Log quarterly achievement (actual value, completion date, status) when window open
- View personal audit log

**Pages:** Dashboard · My Goal Sheet · Audit Log

---

### Manager (L1)
Everything above, plus:
- Review team members' submitted sheets
- Edit target and weightage inline during approval review
- Approve & Lock or Return for Rework (with comment)
- View Planned vs Actual for all team members per quarter
- Record structured quarterly check-in comments
- Push shared departmental KPIs to multiple employees
- View team reports and analytics

**Additional pages:** My Team · Shared Goals · Reports · Analytics · Audit Trail

---

### Admin / HR
Everything above, plus:
- View all sheets across all employees and departments
- Unlock a locked sheet (exception handling with reason)
- Configure performance cycle dates (goal window, Q1–Q4 open dates)
- Run escalation checks; mark escalations resolved
- View notification dispatch log; send check-in reminders
- Configure Microsoft Teams webhook from the UI
- Full system-wide audit trail

**Additional pages:** Goal Sheets (all) · Escalations · Notifications · Cycle Admin · Integrations

---

## 5. How to Use Each Feature

### 5.1 Creating Goals (Employee)

1. Log in (e.g. `amit@atomberg.com` — starts with an empty draft sheet)
2. Navigate to **My Goal Sheet**
3. Click **Add Goal** and fill in:
   - **Thrust Area** — choose from the dropdown (6 seeded categories)
   - **Goal Title** + **Description**
   - **UoM Type** — Numeric↑ / Numeric↓ / % / Timeline / Zero-based
   - **Target** — numeric value, or a date for Timeline goals
   - **Weightage %**
4. Watch the **weightage meter** at the bottom of the page — it must reach exactly 100%
5. Repeat for up to 8 goals (the 9th is blocked)
6. Click **Submit for Approval** when total weightage = 100%

**Rules enforced at submit:**
- Each goal ≥ 10% weightage
- Total = 100% exactly
- Max 8 goals
- Timeline goals require a target date
- Numeric goals require a numeric target

---

### 5.2 Approving / Returning a Sheet (Manager)

1. Log in (e.g. `rahul@atomberg.com`)
2. Navigate to **My Team** → click a team member whose sheet shows status **Submitted**
3. Review each goal — description, target, UoM, weightage
4. Optionally edit target value or weightage inline
5. Choose an action:
   - **Approve & Lock** — sheet becomes locked; employee can now log achievements
   - **Return for Rework** — enter a comment explaining what to fix; sheet goes back to employee as **Returned**

---

### 5.3 Logging Quarterly Achievement (Employee)

1. Log in with an employee who has an approved/locked sheet (e.g. `karan@atomberg.com`)
2. Navigate to **My Goal Sheet**
3. Select the quarter (Q1–Q4) — only open windows are selectable
4. For each goal, click the achievement area and enter:
   - **Actual value** (or completion date for Timeline goals)
   - **Status**: Not Started / On Track / Completed
5. The progress ring updates automatically with the computed score

---

### 5.4 Recording a Manager Check-in (Manager)

1. Navigate to **My Team** → select a team member with an approved sheet
2. Select a quarter
3. Review **Planned vs Actual** for each goal
4. Click **Record Check-in** → enter a structured comment
5. Check-in is logged and appears in the employee's audit trail

---

### 5.5 Shared / Departmental Goals (Manager or Admin)

1. Navigate to **Shared Goals** → **Push Shared KPI**
2. Fill in goal details (same fields as a regular goal)
3. Select recipient employees from the list
4. Click **Push** — a linked copy appears on each recipient's goal sheet
5. Recipients can adjust weightage only; all other fields are read-only
6. When the primary owner logs achievement → all copies update automatically

---

### 5.6 Reports

**CSV Achievement Report:**
1. Go to **Reports** → **Download Achievement Report**
2. Opens as a CSV (works in Excel/Sheets)
3. Columns: Employee, Department, Cycle, Thrust Area, Goal, UoM, Weightage, Planned Target, Q1–Q4 Actuals, Q1–Q4 Score %, Sheet Status

**Completion Dashboard:**
1. Go to **Reports** → **Completion Dashboard**
2. Grid view: per employee, per quarter
3. Colour-coded: green = done, amber = partial, grey = not started

**Audit Trail:**
1. Navigate to **Audit Trail**
2. Full chronological log: who, what changed, when
3. Post-lock edits are highlighted

---

### 5.7 Running Escalations (Admin)

1. Navigate to **Escalations**
2. Click **Run Escalation Check**
3. System evaluates 3 rules against the current date
4. Open escalation items listed with level (L1 / L2 / L3) and detail
5. Click **Mark Resolved** on individual items once actioned

---

### 5.8 Analytics (Admin / Manager)

Navigate to **Analytics** — four dashboards load:

| Dashboard | Chart Type | Shows |
|-----------|-----------|-------|
| QoQ Trend | Line chart | Quarter-over-quarter average progress across all employees |
| Progress by Department | Grouped bar | Q1–Q4 average score per department |
| Goal Distribution | Pie + bar | Breakdown by thrust area, UoM type, current status |
| Manager Effectiveness | Bar chart | Check-in completion rate by manager |

---

### 5.9 Cycle Administration (Admin)

1. Navigate to **Cycle Admin**
2. Edit the active cycle's window dates:
   - Goal Window Open
   - Q1 / Q2 / Q3 / Q4 open dates
3. Click **Save** — window checks update immediately for all users

---

### 5.10 Unlocking a Locked Sheet (Admin)

1. Go to **Goal Sheets** (all-sheets view)
2. Find a locked sheet — click **Unlock**
3. Enter a reason for the unlock
4. Sheet reverts to editable state (status: `returned`); the unlock reason is logged in the audit trail with a distinct flag

---

### 5.11 Notifications & Check-in Reminders (Admin)

1. Navigate to **Notifications**
2. Integration status pills show: **Entra SSO** / **Email (SMTP)** / **Teams** — configured or not
3. Click **Send Check-in Reminders** → emails dispatched to all employees and managers with uncompleted check-ins for the latest open quarter
4. Dispatch log: every email and Teams card listed with channel, event, recipient, status (`sent` / `failed` / `skipped`), timestamp

---

### 5.12 Teams Webhook Setup (Admin)

1. Navigate to **Integrations** (admin-only)
2. Under **Microsoft Teams**:
   - Select webhook type:
     - **Power Automate Workflows** (recommended — Adaptive Card, richer layout)
     - **Classic Incoming Webhook** (legacy connector — MessageCard format)
   - Paste your webhook URL from the Teams channel
   - Click **Save** → stored in the database, effective immediately, no server restart needed
3. Click **Send test card** to verify a real card posts to your Teams channel
4. Click **Disconnect** to remove the URL

> **To get a webhook URL:** In Teams, open the channel → Manage channel → Connectors (classic) or Workflows (Power Automate) → create an incoming webhook → copy the URL.

---

### 5.13 SSO Login — Microsoft Entra ID

1. On the login page, click **Sign in with Microsoft** (only visible when Entra is configured)
2. Microsoft account chooser opens (always shown, even if you have an existing browser session)
3. Sign in with your organisation's Microsoft account
4. Portal auto-provisions your user account:
   - Name, email, job title, department from your Graph profile
   - Role from AAD group membership (admin / manager / employee)
   - Manager relationship synced from Graph
5. On subsequent logins, profile and role are refreshed automatically

---

## 6. Demo Accounts

### Local Accounts (password: `password` for all — one-click on login page)

| Role | Email | Sheet State | Best For |
|------|-------|------------|---------|
| Admin / HR | priya@atomberg.com | — | Cycle config, all sheets, escalations, reports |
| Manager L1 | rahul@atomberg.com | — | Approve/return, check-ins, Sales team |
| Manager L1 | anjali@atomberg.com | — | Engineering team |
| Employee | **amit@atomberg.com** | Empty draft | **Create goals live — start here** |
| Employee | neha@atomberg.com | Submitted | Awaiting approval flow |
| Employee | **karan@atomberg.com** | Approved + locked | **Log quarterly achievement** |
| Employee | vikram@atomberg.com | Returned | Rework flow |
| Employee | sneha@atomberg.com | Approved + locked | Engineering tracking |

### SSO Demo Accounts (Microsoft Entra — button on login page, password: `Atomberg@2026`)

| Role | Microsoft Account |
|------|-----------------|
| Admin | admin@rickysingh11103gmail.onmicrosoft.com |
| Manager | manager@rickysingh11103gmail.onmicrosoft.com |
| Employee | employee@rickysingh11103gmail.onmicrosoft.com |

**Sign-in order for first time:** Admin → Manager → Employee (so Graph manager hierarchy syncs correctly on first provision).

---

## 7. Suggested Demo Journey

1. **Employee** (`amit@atomberg.com`) — add 5 goals (mix of UoM types), watch weightage meter, submit at 100%
2. **Manager** (`rahul@atomberg.com`) — review amit's sheet, adjust a target, Approve & Lock
3. **Employee** (`karan@atomberg.com`) — open approved sheet, log Q1 and Q2 achievement, see progress score
4. **Manager** (`rahul@atomberg.com`) — record a Q1 check-in comment on karan's sheet
5. **Admin** (`priya@atomberg.com`) — download Achievement CSV, view Completion Dashboard, run Escalation check, inspect Audit Trail
6. **Admin** → **Integrations** — paste Teams webhook URL, send test card, watch it arrive in Teams
7. **Admin** → **Notifications** → Send Check-in Reminders — watch dispatch log fill up

---

## 8. How to Run

### Development (2 terminals)

```bash
# Terminal 1 — API server
cd server
npm install
npm run seed        # creates & seeds atomberg.db with demo data
npm start           # http://localhost:4000

# Terminal 2 — Web app
cd client
npm install
npm run dev         # http://localhost:5173
```

### Production (single process)

```bash
cd client && npm install && npm run build
cd ../server && npm install && npm run seed
npm start           # serves API + SPA at http://localhost:4000
```

### End-to-End Test Suite

```bash
cd server && node dryrun.mjs
# Runs 78 checks covering all Phase 1, Phase 2, governance, and bonus features
```

---

## 9. Integration Configuration (`server/.env`)

Copy `server/.env.example` → `server/.env` and fill in:

```bash
# Core
PORT=4000
AUTH_SECRET=<long-random-string>
APP_BASE_URL=http://localhost:5173

# --- 5.1 Microsoft Entra ID SSO ---
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<app-registration-client-id>
AZURE_CLIENT_SECRET=<client-secret-value>
AZURE_REDIRECT_URI=http://localhost:4000/api/auth/sso/callback
AZURE_SCOPES=User.Read GroupMember.Read.All
AZURE_ADMIN_GROUP_ID=<admins-group-object-id>
AZURE_MANAGER_GROUP_ID=<managers-group-object-id>

# --- 5.2 Email (SMTP) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=<16-char-gmail-app-password>    # Google → Security → App Passwords
SMTP_FROM=Atomberg Portal <your@gmail.com>

# --- 5.2 Teams (optional — configure in-app instead) ---
TEAMS_WEBHOOK_URL=   # Admin → Integrations is the preferred way
```

**With no `.env`:** portal runs fully on local auth. Notifications record as `skipped` in the log — nothing breaks.

---

## 10. Architecture Overview

```
Browser
  └─ React SPA (Vite, Tailwind v4, Recharts — lazy-loaded)
       │  HTTPS /api/* — JSON + HMAC Bearer token
       ▼
Express API
  ├─ RBAC middleware (role checks per route)
  ├─ routes/auth.js        — login / /me
  ├─ routes/sso.js         — Entra ID OAuth2 flow
  ├─ routes/goals.js       — goal sheet CRUD + submit/approve/return/lock
  ├─ routes/tracking.js    — achievement + check-in
  ├─ routes/governance.js  — reports, audit, escalations, notifications, settings
  └─ lib/
       ├─ scoring.js       — UoM score formulas
       ├─ notify.js        — event dispatcher (calls email + Teams)
       ├─ integrations.js  — nodemailer + Teams webhook sender
       ├─ settings.js      — DB-backed key/value config
       ├─ auth.js          — HMAC token sign/verify
       └─ config.js        — env-driven config object

SQLite (atomberg.db — single file)
  Tables: users · cycles · thrust_areas · goal_sheets · goals
          achievements · checkins · audit_log · escalations
          notifications · settings

External (env-driven, all optional):
  Microsoft Entra ID  →  MSAL OAuth2  →  /api/auth/sso/*
  Gmail SMTP          →  nodemailer   →  email notifications
  Teams webhook       →  Adaptive Card / MessageCard  →  channel alerts
```

---

## 11. Key Architectural Decisions

| Decision | Why |
|----------|-----|
| `node:sqlite` built-in | Zero infra, zero native build — runs on any Node 24 machine including Windows |
| HMAC bearer tokens | No Redis or session table needed; tokens are self-validating |
| Single-process production | `npm start` serves API + SPA from one Express process — lowest possible cost |
| Analytics lazy-loaded | Recharts is 414 KB; code-split keeps initial load at 230 KB |
| Teams webhook in `settings` table | Org self-configures via UI without server restart or redeploy |
| `prompt: 'select_account'` on SSO | Prevents silent MSAL reuse of existing browser session with wrong account |
| Fire-and-forget notifications | Email/Teams dispatch runs after response is sent — API latency unaffected |
| Notifications table | Every dispatch logged — gives admin visibility and governance traceability |
| `tx(fn)` wrapper | `node:sqlite` lacks `.transaction()` — custom synchronous try/commit/rollback wrapper |
| Post-lock audit flag | Edits after `locked=1` are flagged distinctly in `audit_log` for HR review |

---

## 12. Database Schema (Summary)

| Table | Purpose |
|-------|---------|
| `users` | Employees, managers, admins — name, email, role, manager_id, entra_oid |
| `cycles` | Performance cycle with window dates (goal, Q1–Q4) |
| `thrust_areas` | 6 predefined categories for goal classification |
| `goal_sheets` | One sheet per user per cycle — status, locked flag |
| `goals` | Individual goals: UoM, target, weightage, shared_origin_id |
| `achievements` | Quarterly actual values + status per goal |
| `checkins` | Manager check-in comments per sheet per quarter |
| `audit_log` | Immutable change log — every mutation recorded |
| `escalations` | Rule evaluation results with level and resolution |
| `notifications` | Dispatch log for every email and Teams card |
| `settings` | Key/value store for in-app config (Teams webhook URL/kind) |
