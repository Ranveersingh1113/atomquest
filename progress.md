# Atomberg — Build Progress

In-House **Goal Setting & Tracking Portal** for the Atomberg Hackathon 1.0.
A full performance-cycle portal: goal creation → manager approval → quarterly
check-ins → reporting, analytics, and governance.

---

## Tech stack & why

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React 18 + Vite + Tailwind v4 + Recharts | Fast dev, tiny bundle, no UI-kit bloat |
| Backend | Node.js + Express | Minimal, well-understood REST layer |
| Database | SQLite via Node 24 built-in `node:sqlite` | **Zero infra cost** — no DB server, no native build |
| Auth | HMAC-signed bearer tokens | Stateless, no session store needed |

Cost-optimised: the whole portal runs as **two Node processes and one file** —
deployable free on any small VM or container. No managed DB, no external services.

---

## Phase 0 — Scaffold & Data Model  ✅

**What:** Project skeleton, database schema, seed data.

- `server/` (Express API) and `client/` (Vite React) in one repo.
- Schema (`server/db.js`): `users`, `cycles`, `thrust_areas`, `goal_sheets`,
  `goals`, `achievements`, `checkins`, `audit_log`, `escalations`.
- Switched from `better-sqlite3` (native build failed on Windows) to Node 24's
  built-in `node:sqlite` — no compilation step at all.
- `server/seed.js` builds a realistic org: 1 Admin/HR, 2 Managers, 5 Employees,
  6 thrust areas, an active FY 2025-26 cycle, and goal sheets in every state
  (draft, submitted, returned, approved) so all flows are demoable immediately.

**Tested:** `node:sqlite` round-trip, seed runs clean.

---

## Phase 1 — Goal Creation & Approval  ✅

**What:** Employee goal sheet authoring, validation, manager approval, shared goals.

- **Goal sheet authoring** — employee adds up to 8 goals: thrust area, title,
  description, UoM (Numeric ↑/↓, %, Timeline, Zero-based), target, weightage.
- **System-enforced validation** (on submit): total weightage = 100 %,
  min 10 % per goal, max 8 goals. Live weightage meter in the UI.
- **Manager (L1) approval workflow** — review queue, inline edit of
  target/weightage, **Approve & Lock** or **Return for Rework** with a comment.
  On approval the sheet is locked; further edits need Admin intervention.
- **Shared Goals** — Admin/Manager pushes a departmental KPI to many employees.
  A primary-owner "origin" goal is created and linked read-only copies are
  pushed to recipients (recipients may change weightage only).

**Logic highlights**
- Role/state-aware permissions in `routes/goals.js` — owner vs. manager vs. admin,
  editable only when `draft`/`returned` and not locked.
- Every goal/sheet change is written to `audit_log`.

**Tested:** login (all roles), goal create, weightage validation rejects 50 %/
non-100 %, manager approve → locked, return-for-rework, locked-goal edit blocked,
shared-goal push.

---

## Phase 2 — Achievement Tracking & Quarterly Check-ins  ✅

**What:** Quarterly actuals capture, status, manager check-ins, computed scores.

- **Quarterly update** — on an approved sheet, employees log Actual Achievement
  per quarter (Q1–Q4) with status `Not Started / On Track / Completed`.
- **Check-in windows** — a quarter only accepts input once its window date has
  passed (`openQuarters` derived from the cycle config).
- **Manager Check-in module** — manager views Planned vs. Actual per goal and
  records a structured check-in comment per quarter.
- **Computed progress scores** (`server/lib/scoring.js`), per the BRD table:
  - Numeric-Min / % → `Achievement ÷ Target`
  - Numeric-Max → `Target ÷ Achievement`
  - Timeline → on-time vs. late vs. deadline
  - Zero-based → `0 → 100 %`, else `0 %`
  - Sheet score = weightage-weighted sum across goals (tracking only, not ratings).
- **Shared-goal sync** — when the primary owner updates achievement, the value
  propagates to every linked recipient goal automatically.

**Tested:** achievement logging updates quarter score (e.g. 1.1M/2M ×40 % = 22 %),
check-in comment persisted, closed-quarter input blocked.

---

## Phase 3 — Reporting & Governance  ✅

**What:** Exportable report, completion dashboard, audit trail.

- **Achievement Report** — CSV export (opens in Excel) of Planned Target vs.
  Actual Achievement and quarterly score % for every goal.
- **Completion Dashboard** — real-time grid showing, per quarter, whether the
  employee has updated achievement and whether the manager has checked in.
- **Audit Trail** — `audit_log` records every change to goals, sheets,
  achievements and check-ins (who / what / when). Post-lock edits are flagged
  distinctly in red.

**Tested:** CSV header + rows with scores, audit entries accumulate, admin
unlock changes sheet to editable and is itself audited.

---

## Phase 4 — Bonus Features  ✅

**What:** Analytics module + rule-based escalation module.

- **Analytics** (`/analytics`) — Recharts dashboards:
  Quarter-on-Quarter progress trend, progress by department, goal distribution
  by thrust area / UoM / status, and manager check-in effectiveness.
- **Escalation Module** (`/escalations`) — rule-based engine:
  1. Goals not submitted within 7 days of cycle opening
  2. Submitted sheet not approved within 7 days
  3. Quarterly check-in not completed in the active window
  Escalation level (Employee → Manager → HR) scales with how overdue the item
  is. Admin runs the check and resolves items; runs are audited.

> Microsoft Entra ID SSO and Teams integration (Section 5.1 / 5.2) were not
> implemented — they need a live Azure tenant. The role/hierarchy model is
> structured so an Entra sync could populate `users.manager_id` directly.

**Tested:** analytics endpoint returns QoQ/distribution/effectiveness, escalation
run raises and lists items, RBAC blocks non-admins.

---

## Phase 5 — Polish, Testing & Docs  ✅

- Fixed `0`-render bug (`sheet.locked && …`), corrected a `/sheet` vs `/sheets`
  API path mismatch, made the team list responsive at narrow widths.
- Browser-tested end to end via the preview tool: login, dashboard (3 roles),
  goal creation + validation, manager review + approve, analytics charts,
  reports dashboard. No console errors.
- Backend regression-tested: 8-point script covering tracking, RBAC, return,
  CSV, audit, unlock, cycle config.
- `ARCHITECTURE.md` (diagram + hosting notes) and `README.md` (run steps +
  demo credentials) added.

---

## Phase 6 — Full Dry Run & Production Hardening  ✅

**What:** End-to-end test of every flow, plus production-readiness changes.

- **Automated dry run** (`server/dryrun.mjs`) — 34-check end-to-end script hitting
  the live API: auth (all roles + rejection), goal creation, all validation rules
  (=100 %, ≥10 %, ≤8), submit/return/approve/lock, RBAC (self-approve, wrong
  manager, locked-edit, cross-employee, non-admin guards), achievement scoring
  (verified `1M/2M = 0.5`), manager check-ins, shared goals, CSV export,
  completion dashboard, audit trail, admin unlock, analytics, escalations,
  cycle config. **Result: 34 / 34 passed.**
- **Browser smoke test** — all 3 roles log in; role-scoped navigation renders
  correctly (Employee / Manager / Admin); no console errors on any page.
- **Single-process production hosting** — Express now serves the built SPA
  (`client/dist`) with a history-API fallback. The whole portal runs as **one
  Node process** in production (`npm run build` + `npm start`) — lower cost,
  simpler hosting.
- **Bundle code-split** — Analytics (Recharts) is lazy-loaded. Initial JS bundle
  dropped **644 kB → 230 kB** (gzip 183 kB → 71 kB); Recharts loads on demand.
- **Hardening** — `AUTH_SECRET` / `PORT` read from env, JSON body capped at
  256 kB, unknown `/api/*` routes return a clean JSON 404.

**Dry run result:** 61 / 61 checks passed (later expanded — see Phase 7).

---

## Phase 7 — Bonus Integrations: Entra ID SSO + Email & Teams  ✅

**What:** The two remaining Section 5 bonus features, built as real integrations.

- **5.1 Microsoft Entra ID SSO** (`server/routes/sso.js`) — OAuth2
  authorization-code flow via MSAL. "Sign in with Microsoft" on the login screen.
  On callback the portal reads the Graph profile, derives the portal **role from
  AAD security-group membership**, **syncs the reporting line** from the Graph
  `manager` relationship, provisions/updates the local user, and issues a portal
  session token. New `users.auth_provider` / `users.entra_oid` columns.
- **5.2 Email & Teams** (`server/lib/integrations.js`, `notify.js`) — event-driven
  notifications on **goal submission, approval, rejection, and check-in
  reminders**. Email via SMTP (nodemailer); Teams via a webhook card with a
  **deep link** straight to the goal sheet. Every dispatch is recorded in a new
  `notifications` table.
- **In-app Teams setup** (`/settings` — Integrations) — an organisation connects
  its own Teams channel from the admin UI: paste the webhook URL, pick the
  webhook type (**Power Automate Workflows** → Adaptive Card, or classic
  **Incoming Webhook** → MessageCard), and send a test card. Stored in a
  `settings` table — no redeploy, no env edit.
- **Admin Notifications page** (`/notifications`) — integration-status panel,
  one-click "Send Check-in Reminders", and the full dispatch log.
- **Config** — Teams is configured in-app; email & Entra (which hold secrets) are
  env-driven (`server/.env.example`, auto-loaded from `server/.env`). With
  nothing set, the portal runs on local auth and records dispatches as
  `skipped` — no crashes, no external calls.

> Real integrations only — supply Azure / SMTP / Teams credentials in
> `server/.env` to light them up. Code paths are genuine MSAL / nodemailer /
> webhook calls, not stubs.

**Tested:** dry run expanded to **78 / 78 checks** — adds full UoM scoring,
max-8 enforcement, shared-goal sync, closed-window blocking, notification
fan-out (email + Teams, deep links), reminder dispatch, in-app Teams settings
(save / persist / validate / test / disconnect), RBAC on every new route, and
SSO endpoint behaviour (live redirect to Microsoft once Entra is configured).

---

## How to run

```bash
# 1. API
cd server && npm install && npm run seed && npm start   # http://localhost:4000

# 2. Web app (separate terminal)
cd client && npm install && npm run dev                 # http://localhost:5173
```

**Demo logins** (password `password` for all):
`priya@atomberg.com` (Admin/HR) · `rahul@atomberg.com` (Manager) ·
`amit@atomberg.com` (Employee — empty sheet, create goals live).
