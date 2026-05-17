# Atomberg — Goal Setting & Tracking Portal

A web portal for the full employee performance cycle: **goal creation →
manager approval → quarterly check-ins → reporting, analytics & governance**.

Built for the Atomberg Hackathon 1.0.

## Stack

React 18 + Vite + Tailwind v4 + Recharts · Express · SQLite (`node:sqlite`).
Zero infra cost — see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Run locally

Requires **Node.js 24+** (uses the built-in `node:sqlite` module).

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

Build the SPA once and let the API serve it — the whole portal then runs as
**one Node process**:

```bash
cd client && npm install && npm run build
cd ../server && npm install && npm run seed
AUTH_SECRET=<your-secret> npm start    # serves API + app on http://localhost:4000
```

### Verify the build

```bash
cd server && node dryrun.mjs   # 78-check end-to-end test against the running API
```

### Optional integrations (bonus features 5.1 / 5.2)

Copy `server/.env.example` to `server/.env` and fill in credentials to activate:

- **Microsoft Entra ID SSO** — `AZURE_*` vars. Adds "Sign in with Microsoft"
  to the login screen; roles map from AAD groups, reporting lines from Graph.
- **Email (SMTP)** — `SMTP_*` vars. Sends goal submission / approval / rejection
  / check-in-reminder emails.
- **Microsoft Teams** — configured in-app (sign in as admin → **Integrations**):
  paste the channel webhook URL, pick the webhook type, send a test card.

With no `.env`, the portal runs on local auth and records every notification as
`skipped` in the **Notifications** admin page — nothing breaks.

## Demo accounts

Password is `password` for every account.

| Role | Email | Use for |
|------|-------|---------|
| Admin / HR | `priya@atomberg.com` | Cycle config, all sheets, escalations, unlock |
| Manager (L1) | `rahul@atomberg.com` | Approve / return, check-ins, shared goals |
| Manager (L1) | `anjali@atomberg.com` | Engineering team |
| Employee | `amit@atomberg.com` | **Empty sheet — create & submit goals live** |
| Employee | `neha@atomberg.com` | Submitted sheet — awaiting approval |
| Employee | `karan@atomberg.com` | Approved sheet — log quarterly achievement |
| Employee | `vikram@atomberg.com` | Returned sheet — rework flow |

The login screen also lists every account for one-click demo sign-in.

## Suggested demo journey

1. **Employee** (`amit@`) — add goals, watch the weightage meter, submit at 100 %.
2. **Manager** (`rahul@`) — review `amit@`'s sheet, adjust a target, Approve & Lock.
3. **Employee** (`karan@`) — open the approved sheet, log Q1/Q2 achievement.
4. **Manager** — record a quarterly check-in comment.
5. **Admin** (`priya@`) — Reports (CSV + completion dashboard), Analytics,
   run an Escalation check, inspect the Audit Trail.

## Feature coverage

- **Phase 1** — goal creation, UoM types, weightage rules (=100 %, ≥10 %, ≤8),
  manager approval/return/lock, shared departmental KPIs.
- **Phase 2** — quarterly achievement capture, status, check-in windows,
  manager check-ins, computed UoM progress scores.
- **Reporting & Governance** — CSV achievement report, completion dashboard,
  full audit trail, admin sheet unlock.
- **Bonus** — analytics dashboards (QoQ, distribution, manager effectiveness),
  rule-based escalation module, Microsoft Entra ID SSO, and email / Teams
  notifications for key goal-lifecycle events.

See [`progress.md`](progress.md) for the phase-by-phase build log.
