# Graph Report - D:/OneDrive/Desktop/atomquest  (2026-05-17)

## Corpus Check
- Corpus is ~27,214 words - fits in a single context window. You may not need a graph.

## Summary
- 277 nodes · 368 edges · 27 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth, RBAC & BRD Concepts|Auth, RBAC & BRD Concepts]]
- [[_COMMUNITY_Frontend Auth & API Layer|Frontend Auth & API Layer]]
- [[_COMMUNITY_Goal Card & UI Design System|Goal Card & UI Design System]]
- [[_COMMUNITY_App Shell & Page Routing|App Shell & Page Routing]]
- [[_COMMUNITY_Goal Scoring & Sheet Logic|Goal Scoring & Sheet Logic]]
- [[_COMMUNITY_Notification Delivery|Notification Delivery]]
- [[_COMMUNITY_Goal Creation & Achievement UI|Goal Creation & Achievement UI]]
- [[_COMMUNITY_Teams & Notification Dispatch|Teams & Notification Dispatch]]
- [[_COMMUNITY_External Integration Config|External Integration Config]]
- [[_COMMUNITY_End-to-End Test Suite|End-to-End Test Suite]]
- [[_COMMUNITY_Problem Statement & BRD|Problem Statement & BRD]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Progress Visualization|Progress Visualization]]
- [[_COMMUNITY_Icon Primitive|Icon Primitive]]
- [[_COMMUNITY_Button Primitive|Button Primitive]]
- [[_COMMUNITY_Badge Primitive|Badge Primitive]]
- [[_COMMUNITY_Spinner Primitive|Spinner Primitive]]
- [[_COMMUNITY_Field Primitive|Field Primitive]]
- [[_COMMUNITY_Input Primitive|Input Primitive]]
- [[_COMMUNITY_Textarea Primitive|Textarea Primitive]]
- [[_COMMUNITY_Select Primitive|Select Primitive]]
- [[_COMMUNITY_Banner Primitive|Banner Primitive]]
- [[_COMMUNITY_Stat Primitive|Stat Primitive]]
- [[_COMMUNITY_Empty State Primitive|Empty State Primitive]]
- [[_COMMUNITY_Page Header Primitive|Page Header Primitive]]
- [[_COMMUNITY_Teams Env Config|Teams Env Config]]
- [[_COMMUNITY_Analytics BRD Bonus|Analytics BRD Bonus]]

## God Nodes (most connected - your core abstractions)
1. `Governance Routes` - 20 edges
2. `API Client Module` - 18 edges
3. `Goals Routes` - 14 edges
4. `Tracking Routes` - 10 edges
5. `Dashboard Page` - 9 edges
6. `Users Table` - 9 edges
7. `getSheetDetail()` - 9 edges
8. `useAuth Hook` - 8 edges
9. `My Goals Page` - 8 edges
10. `Goal Domain Object` - 8 edges

## Surprising Connections (you probably didn't know these)
- `goalScore()` --implements--> `Unit of Measurement Scoring Formulas`  [INFERRED]
  server/lib/scoring.js → PROJECT_GUIDE.md
- `Goals Routes` --implements--> `Goal Lifecycle (Draftâ†’Submitâ†’Approveâ†’Lock)`  [INFERRED]
  server/routes/goals.js → progress.md
- `Settings Table` --shares_data_with--> `Microsoft Teams Webhook Integration`  [INFERRED]
  server/db.js → progress.md
- `audit() Function` --implements--> `Post-Lock Edit Audit Flag`  [INFERRED]
  server/lib/audit.js → PROJECT_GUIDE.md
- `dispatch() Internal Fan-out` --implements--> `Fire-and-Forget Notification Fan-out`  [INFERRED]
  server/lib/notify.js → PROJECT_GUIDE.md

## Hyperedges (group relationships)
- **Goal Lifecycle: Create â†’ Submit â†’ Approve â†’ Track Achievement** — page_mygoals, page_sheetdetail, comp_goalformmodal, comp_achievementmodal, domain_goalsheet [EXTRACTED 0.95]
- **Authentication Session: Token Storage â†’ Auth Context â†’ Route Guard** — api_token_store, auth_provider, auth_context, app_route_guard, auth_useauth [EXTRACTED 0.95]
- **Role-based Access Control: user.role â†’ Nav Config â†’ Dashboard Views** — domain_user_role, comp_layout_nav, page_dashboard_employee, page_dashboard_manager, page_dashboard_admin [EXTRACTED 0.92]
- **Goal Lifecycle Event Flow** — routes_goals, notify_onGoalSubmitted, notify_onGoalApproved, notify_onGoalReturned [EXTRACTED 0.95]
- **Notification Dispatch Chain** — notify_dispatch, integrations_sendEmail, integrations_sendTeams, db_notifications_table [EXTRACTED 0.95]
- **RBAC Enforcement Middleware Chain** — auth_requireAuth, auth_requireRole, routes_goals [EXTRACTED 0.90]

## Communities

### Community 0 - "Auth, RBAC & BRD Concepts"
Cohesion: 0.09
Nodes (47): requireAuth Middleware, requireRole Middleware, signToken, verifyToken, BRD Bonus 5.1 Entra ID Requirements, BRD Bonus 5.3 Escalation Module Requirements, Quarterly Check-in Windows, Microsoft Entra ID SSO Integration (+39 more)

### Community 1 - "Frontend Auth & API Layer"
Cohesion: 0.1
Nodes (36): API Client Module, HTTP Request Function, JWT Token Store (localStorage), App Root Component, Auth-based Route Guard, AuthContext (AuthCtx), AuthProvider Component, loginWithToken (Entra ID SSO) (+28 more)

### Community 2 - "Goal Card & UI Design System"
Cohesion: 0.1
Nodes (7): actualValue(), GoalCard(), plannedValue(), accentFor(), ProgressBar(), progressColor(), Ring()

### Community 3 - "App Shell & Page Routing"
Cohesion: 0.09
Nodes (7): Layout(), Dashboard(), Login(), SheetDetail(), Team(), App(), useAuth()

### Community 4 - "Goal Scoring & Sheet Logic"
Cohesion: 0.13
Nodes (9): clamp(), goalScore(), sheetScore(), getActiveCycle(), getSheetDetail(), openQuarters(), getOrCreateMySheet(), escLevel() (+1 more)

### Community 5 - "Notification Delivery"
Cohesion: 0.22
Nodes (14): buildTeamsPayload(), getTransporter(), sendEmail(), sendTeams(), teamsConfigured(), teamsTarget(), deepLink(), dispatch() (+6 more)

### Community 6 - "Goal Creation & Achievement UI"
Cohesion: 0.28
Nodes (13): AchievementModal Component, GoalCard Component, GoalFormModal Component, Achievement Domain Object, Goal Domain Object, Thrust Area Domain Object, My Goals Page, Shared Goals Page (+5 more)

### Community 7 - "Teams & Notification Dispatch"
Cohesion: 0.2
Nodes (11): BRD Bonus 5.2 Email & Teams Requirements, Fire-and-Forget Notification Fan-out, Microsoft Teams Webhook Integration, Notifications Table, sendEmail(), sendTeams(), smtpConfigured(), dispatch() Internal Fan-out (+3 more)

### Community 8 - "External Integration Config"
Cohesion: 0.29
Nodes (3): entraConfigured(), smtpConfigured(), getMsal()

### Community 9 - "End-to-End Test Suite"
Cohesion: 0.4
Nodes (2): call(), login()

### Community 10 - "Problem Statement & BRD"
Cohesion: 0.33
Nodes (6): BRD Phase 1 Goal Creation & Approval Requirements, BRD Phase 2 Achievement Tracking Requirements, AtomQuest Hackathon 1.0 Problem Statement, BRD UoM Scoring Formula Table, Goal Lifecycle (Draftâ†’Submitâ†’Approveâ†’Lock), Unit of Measurement Scoring Formulas

### Community 11 - "Auth Middleware"
Cohesion: 0.5
Nodes (2): requireAuth(), verifyToken()

### Community 27 - "Progress Visualization"
Cohesion: 1.0
Nodes (2): ProgressBar Component, Ring (Circular Progress) Component

### Community 35 - "Icon Primitive"
Cohesion: 1.0
Nodes (1): Icon Component

### Community 36 - "Button Primitive"
Cohesion: 1.0
Nodes (1): Button Component

### Community 37 - "Badge Primitive"
Cohesion: 1.0
Nodes (1): Badge Component

### Community 38 - "Spinner Primitive"
Cohesion: 1.0
Nodes (1): Spinner Component

### Community 39 - "Field Primitive"
Cohesion: 1.0
Nodes (1): Field Form Component

### Community 40 - "Input Primitive"
Cohesion: 1.0
Nodes (1): Input Component

### Community 41 - "Textarea Primitive"
Cohesion: 1.0
Nodes (1): Textarea Component

### Community 42 - "Select Primitive"
Cohesion: 1.0
Nodes (1): Select Component

### Community 43 - "Banner Primitive"
Cohesion: 1.0
Nodes (1): Banner Component

### Community 44 - "Stat Primitive"
Cohesion: 1.0
Nodes (1): Stat Card Component

### Community 45 - "Empty State Primitive"
Cohesion: 1.0
Nodes (1): EmptyState Component

### Community 46 - "Page Header Primitive"
Cohesion: 1.0
Nodes (1): PageHeader Component

### Community 47 - "Teams Env Config"
Cohesion: 1.0
Nodes (1): teamsConfigured() (env-based)

### Community 48 - "Analytics BRD Bonus"
Cohesion: 1.0
Nodes (1): BRD Bonus 5.4 Analytics Module Requirements

## Knowledge Gaps
- **33 isolated node(s):** `Vite Build Config`, `HTTP Request Function`, `Icon Component`, `Card Component`, `Button Component` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `End-to-End Test Suite`** (6 nodes): `call()`, `log()`, `login()`, `dryrun.mjs`, `near()`, `s()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Middleware`** (5 nodes): `requireAuth()`, `requireRole()`, `signToken()`, `verifyToken()`, `auth.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress Visualization`** (2 nodes): `ProgressBar Component`, `Ring (Circular Progress) Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Icon Primitive`** (1 nodes): `Icon Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button Primitive`** (1 nodes): `Button Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badge Primitive`** (1 nodes): `Badge Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner Primitive`** (1 nodes): `Spinner Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Field Primitive`** (1 nodes): `Field Form Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Primitive`** (1 nodes): `Input Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Textarea Primitive`** (1 nodes): `Textarea Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Select Primitive`** (1 nodes): `Select Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Banner Primitive`** (1 nodes): `Banner Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stat Primitive`** (1 nodes): `Stat Card Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Empty State Primitive`** (1 nodes): `EmptyState Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Header Primitive`** (1 nodes): `PageHeader Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Teams Env Config`** (1 nodes): `teamsConfigured() (env-based)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics BRD Bonus`** (1 nodes): `BRD Bonus 5.4 Analytics Module Requirements`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Governance Routes` connect `Auth, RBAC & BRD Concepts` to `Teams & Notification Dispatch`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `API Client Module` connect `Frontend Auth & API Layer` to `Goal Creation & Achievement UI`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Goals Routes` connect `Auth, RBAC & BRD Concepts` to `Problem Statement & BRD`, `Teams & Notification Dispatch`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Goals Routes` (e.g. with `Goal Lifecycle (Draftâ†’Submitâ†’Approveâ†’Lock)` and `Shared Goals / Departmental KPI Push`) actually correct?**
  _`Goals Routes` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Vite Build Config`, `HTTP Request Function`, `Icon Component` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth, RBAC & BRD Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Frontend Auth & API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._