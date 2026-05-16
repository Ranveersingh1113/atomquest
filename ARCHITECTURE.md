# AtomQuest — Architecture

## System diagram

```mermaid
flowchart TD
  subgraph Browser["Browser (any device)"]
    UI["React 18 SPA<br/>Vite · Tailwind v4 · Recharts<br/>role-aware routing"]
  end

  subgraph Host["Single small VM / container — free-tier capable"]
    API["Express REST API<br/>HMAC bearer auth · RBAC middleware"]
    LIB["Domain logic<br/>scoring · validation · audit · escalation"]
    DB[("SQLite file<br/>node:sqlite — no DB server")]
  end

  UI -- "HTTPS /api/* (JSON)" --> API
  API --> LIB
  LIB --> DB
  API -- "CSV export" --> UI
```

## Request flow

```
Login ──► POST /api/login ──► HMAC-signed token ──► stored client-side
Every call ──► Authorization: Bearer <token> ──► requireAuth ──► requireRole
            ──► route handler ──► domain logic ──► SQLite ──► JSON response
```

## Layers

| Layer | Responsibility |
|-------|----------------|
| **React SPA** | Role-aware UI (Employee / Manager / Admin), forms, validation feedback, charts |
| **Express API** | REST endpoints, authentication, role-based access control, CSV streaming |
| **Domain logic** (`server/lib`) | UoM scoring, weightage validation, audit logging, escalation rules |
| **SQLite** | Single-file relational store — `users`, `goal_sheets`, `goals`, `achievements`, `checkins`, `audit_log`, `escalations`, `cycles`, `thrust_areas` |

## Technology & hosting choices

- **SQLite via Node 24 `node:sqlite`** — no separate database server, no native
  compilation, no managed-DB bill. The entire dataset is one file; backup = copy.
- **Express** — minimal REST surface, no framework overhead.
- **React + Vite** — static build (`npm run build`) served by any CDN/static host;
  the API is a single Node process. Both fit comfortably in a free tier.
- **Stateless HMAC tokens** — no session store / Redis needed.
- **Cost posture** — 2 lightweight Node processes + 1 file. Scales vertically for
  an in-house portal; if multi-writer scale is ever needed, the data layer
  (`server/lib`) is isolated so SQLite → Postgres is a contained swap.

## Security & governance

- Role-based access control on every mutating route (`requireRole`).
- Goal sheets lock on approval; edits afterwards require an audited Admin unlock.
- `audit_log` captures who/what/when for every goal, sheet, achievement and
  check-in change — post-lock edits are recorded distinctly.
