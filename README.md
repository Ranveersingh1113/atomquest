# Atomberg — Goal Setting & Tracking Portal

A web portal for the full employee performance cycle: **goal creation →
manager approval → quarterly check-ins → reporting, analytics & governance.**

Built for the Atomberg Hackathon 1.0.

**Live demo:** https://atomberg-portal-zwoq.onrender.com

> Hosted on Render's free tier — the instance sleeps after 15 min idle, so the
> first request may take ~50 s to wake. The database auto-seeds on boot, so the
> portal always comes up populated with demo data.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · Vite · Tailwind v4 · Recharts (lazy-loaded) |
| Backend | Node.js · Express |
| Database | SQLite via the built-in `node:sqlite` module — no DB server |
| Auth | HMAC-signed bearer tokens — stateless, no session store |
| SSO | Microsoft Entra ID via MSAL Node (OAuth2 auth-code flow) |
| Email / Teams | nodemailer (SMTP) · incoming webhook (Adaptive Card / MessageCard) |

In production the whole portal runs as **one Node process** — Express serves the
built SPA and the API together. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Demo accounts

### Quick Demo Login — one click on the login screen

Password is `password` for every local account. These are seeded on boot and
always available.

| Role | Email | Use for |
|------|-------|---------|
| Admin / HR | `priya@atomberg.com` | Cycle config, all sheets, escalations, reports, audit |
| Manager (L1) | `rahul@atomberg.com` | Approve / return, check-ins, shared goals |
| Employee | `amit@atomberg.com` | **Empty draft — build & submit a goal sheet live** |

The login screen lists these for one-click sign-in.

### Microsoft Entra ID SSO — "Continue with Microsoft"

Three portal accounts demonstrate the SSO journey (group → role mapping,
Graph manager-hierarchy sync). They are provisioned in the seed so the demo has
data immediately:

| Role | Microsoft account |
|------|-------------------|
| Admin | `admin@rickysingh11103gmail.onmicrosoft.com` |
| Manager | `manager@rickysingh11103gmail.onmicrosoft.com` |
| Employee | `employee@rickysingh11103gmail.onmicrosoft.com` |

SSO account passwords are supplied with the hackathon submission, not committed
to this repo.

## Suggested demo journey

1. **Employee** (`amit@`) — add goals, watch the weightage meter, submit at 100 %.
2. **Manager** (`rahul@`) — review `amit@`'s sheet, adjust a target, Approve & Lock.
3. **Employee** (`amit@`) — open the now-locked sheet, log quarterly achievement.
4. **Manager** (`rahul@`) — record a quarterly check-in comment.
5. **Admin** (`priya@`) — Reports (CSV + completion dashboard), Analytics,
   run an Escalation check, inspect the Audit Trail, Integrations & Notifications.

## Feature coverage

- **Phase 1 — Goal creation & approval** — goal sheets (thrust area, title,
  description), 5 UoM types (Numeric↑, Numeric↓, %, Timeline, Zero-based),
  weightage rules (total = 100 %, ≥ 10 % each, ≤ 8 goals), manager inline edit /
  approve / return-for-rework, lock on approval, shared departmental KPIs.
- **Phase 2 — Quarterly tracking** — quarterly achievement capture, goal status
  (Not Started / On Track / Completed), manager check-ins, computed UoM progress
  scores, enforced check-in windows.
- **Reporting & Governance** — CSV achievement report, completion dashboard,
  full audit trail (post-lock edits flagged), audited admin sheet unlock.
- **Bonus** — analytics dashboards (QoQ trend, department progress, goal
  distribution, manager effectiveness), rule-based escalation module (3 rules,
  L1/L2/L3 levels), Microsoft Entra ID SSO, and email / Teams notifications for
  goal-lifecycle events.

## Run locally

Requires **Node.js 22.5 or newer** (uses the built-in `node:sqlite` module).

```bash
# Terminal 1 — API
cd server
npm install
npm run seed      # creates & seeds atomberg.db
npm start         # http://localhost:4000

# Terminal 2 — Web app
cd client
npm install
npm run dev       # http://localhost:5173
```

Open **http://localhost:5173**.

### Production mode (single process)

```bash
cd client && npm install && npm run build
cd ../server && npm install
AUTH_SECRET=<your-secret> npm start   # serves API + SPA on http://localhost:4000
```

The server **auto-seeds** when the database is empty, so a fresh start always
comes up populated.

## Tests

```bash
cd server
node seed.js && node dryrun.mjs      # 78-check baseline end-to-end suite
node seed-test.js && node fulltest.mjs   # expanded suite — formulas, RBAC matrix,
                                         # validation, state machine, integrations
```

See [`TEST_REPORT.md`](TEST_REPORT.md) for full coverage against the problem statement.

## Optional integrations

Copy `server/.env.example` to `server/.env` and fill in credentials to activate:

- **Microsoft Entra ID SSO** — `AZURE_*` vars. Adds "Continue with Microsoft" to
  the login screen; roles map from AAD groups, reporting lines from Graph.
- **Email (SMTP)** — `SMTP_*` vars. Sends goal submission / approval / rejection /
  check-in-reminder emails.
- **Microsoft Teams** — configured in-app (sign in as admin → **Integrations**):
  paste the channel webhook URL, pick the webhook type, send a test card.

With no `.env`, the portal runs on local auth and records every notification as
`skipped` in the **Notifications** admin page — nothing breaks.

## Deployment

The repo includes [`render.yaml`](render.yaml) — a Render Blueprint that builds
the SPA and runs the Express API as a single web service. Integration secrets
(`AZURE_*`, `SMTP_*`) are set as environment variables on the service, never
committed.
