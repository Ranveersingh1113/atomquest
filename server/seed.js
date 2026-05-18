import { fileURLToPath } from 'url';
import database from './db.js';

// Seeds demo data into an open database handle. Safe to call on server
// boot when the users table is empty (fresh deploy / ephemeral disk).
export function seed(db) {
  // wipe
  db.exec(`DELETE FROM escalations; DELETE FROM audit_log; DELETE FROM checkins;
    DELETE FROM achievements; DELETE FROM goals; DELETE FROM goal_sheets;
    DELETE FROM thrust_areas; DELETE FROM cycles; DELETE FROM users;
    DELETE FROM notifications;
    DELETE FROM sqlite_sequence;`);

  const PW = 'password';

  const insUser = db.prepare(
    `INSERT INTO users (name,email,password,role,manager_id,department,title,auth_provider,entra_oid)
     VALUES (?,?,?,?,?,?,?,?,?)`);
  const local = (name, email, role, mgr, dept, title) =>
    insUser.run(name, email, PW, role, mgr, dept, title, 'local', null).lastInsertRowid;
  // Portal (Microsoft Entra ID) accounts — provisioned here so the SSO journey
  // has demo data immediately. First Microsoft sign-in matches these rows by
  // email / entra_oid and refreshes them; it never creates a duplicate.
  const portal = (name, email, role, mgr, dept, title, oid) =>
    insUser.run(name, email, '(sso)', role, mgr, dept, title, 'entra', oid).lastInsertRowid;

  // --- Seeded local accounts (Quick Demo Login) — one per role ---
  const priya = local('Priya Sharma', 'priya@atomberg.com', 'admin', null, 'Human Resources', 'HR Director');
  const rahul = local('Rahul Verma', 'rahul@atomberg.com', 'manager', priya, 'Sales', 'Sales Manager');
  const amit  = local('Amit Patel', 'amit@atomberg.com', 'employee', rahul, 'Sales', 'Sales Associate');

  // --- Portal accounts (Microsoft sign-in) — one per role ---
  const pAdmin = portal('Admin Demo', 'admin@rickysingh11103gmail.onmicrosoft.com',
    'admin', null, 'Human Resources', 'HR Lead', 'ca48d6cc-e2b2-44bc-99b1-5469dff5681a');
  const pManager = portal('Manager Demo', 'manager@rickysingh11103gmail.onmicrosoft.com',
    'manager', pAdmin, 'Operations', 'Operations Manager', '8270e0f3-cd17-40d9-b949-c1e1c23307d5');
  const pEmployee = portal('Employee Demo', 'employee@rickysingh11103gmail.onmicrosoft.com',
    'employee', pManager, 'Operations', 'Operations Analyst', '92bd015c-f8ba-453b-9ce8-526531577b35');

  // Cycle — FY 2025-26. Windows backdated so all quarters are open for full demo.
  const cycle = db.prepare(
    `INSERT INTO cycles (name,fy,status,goal_window_open,q1_open,q2_open,q3_open,q4_open)
     VALUES (?,?,?,?,?,?,?,?)`)
    .run('Annual Performance Cycle', 'FY 2025-26', 'active',
         '2025-05-01', '2025-07-01', '2025-10-01', '2026-01-01', '2026-03-01').lastInsertRowid;

  // Thrust areas
  const taNames = ['Revenue Growth', 'Customer Success', 'Operational Excellence',
    'People & Culture', 'Innovation', 'Compliance & Safety'];
  const insTA = db.prepare('INSERT INTO thrust_areas (name) VALUES (?)');
  const ta = {};
  for (const n of taNames) ta[n] = insTA.run(n).lastInsertRowid;

  const insSheet = db.prepare(
    `INSERT INTO goal_sheets (employee_id,cycle_id,status,locked,submitted_at,approved_at)
     VALUES (?,?,?,?,?,?)`);
  const insGoal = db.prepare(
    `INSERT INTO goals (sheet_id,thrust_area_id,title,description,uom_type,target,target_date,weightage,shared_origin_id)
     VALUES (?,?,?,?,?,?,?,?,?)`);
  const insAch = db.prepare(
    `INSERT INTO achievements (goal_id,quarter,actual_value,completion_date,status)
     VALUES (?,?,?,?,?)`);
  const insCheckin = db.prepare(
    `INSERT INTO checkins (sheet_id,quarter,manager_id,comment) VALUES (?,?,?,?)`);
  const insAudit = db.prepare(
    `INSERT INTO audit_log (entity,entity_id,user_id,action,field,old_value,new_value)
     VALUES (?,?,?,?,?,?,?)`);

  // --- Amit (seeded employee): empty DRAFT — log in to build a goal sheet live ---
  insSheet.run(amit, cycle, 'draft', 0, null, null);

  // --- Employee Demo (portal): APPROVED + locked, all five UoM types, four
  //     quarters of achievement, and a manager check-in — a complete journey. ---
  const es = insSheet.run(pEmployee, cycle, 'approved', 1,
    '2025-05-04 10:00', '2025-05-06 09:30').lastInsertRowid;

  const eg1 = insGoal.run(es, ta['Revenue Growth'], 'Achieve annual revenue target',
    'Grow booked revenue across the assigned portfolio', 'numeric_min', 5000000, null, 30, null).lastInsertRowid;
  const eg2 = insGoal.run(es, ta['Operational Excellence'], 'Reduce average response time',
    'Lower mean ticket response time, in hours', 'numeric_max', 24, null, 25, null).lastInsertRowid;
  const eg3 = insGoal.run(es, ta['Customer Success'], 'Lift customer satisfaction',
    'Raise the quarterly CSAT score', 'percent', 92, null, 20, null).lastInsertRowid;
  const eg4 = insGoal.run(es, ta['Innovation'], 'Launch the self-serve portal',
    'Ship the customer self-serve portal by the deadline', 'timeline', null, '2026-02-28', 15, null).lastInsertRowid;
  const eg5 = insGoal.run(es, ta['Compliance & Safety'], 'Zero security incidents',
    'No reportable security incidents for the year', 'zero', 0, null, 10, null).lastInsertRowid;

  // Four quarters of progressing achievement.
  const revenue = { Q1: 1100000, Q2: 2450000, Q3: 3800000, Q4: 5200000 };
  const response = { Q1: 30, Q2: 27, Q3: 25, Q4: 22 };
  const csat = { Q1: 88, Q2: 90, Q3: 91, Q4: 93 };
  for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
    const last = q === 'Q4';
    insAch.run(eg1, q, revenue[q], null, last ? 'Completed' : 'On Track');
    insAch.run(eg2, q, response[q], null, last ? 'Completed' : 'On Track');
    insAch.run(eg3, q, csat[q], null, last ? 'Completed' : 'On Track');
    insAch.run(eg4, q, null, '2026-02-20', last ? 'Completed' : 'On Track');
    insAch.run(eg5, q, 0, null, 'Completed');
  }
  insCheckin.run(es, 'Q1', pManager,
    'Excellent revenue ramp and a clean compliance record. Keep pushing response time toward the 24h target.');
  insCheckin.run(es, 'Q4', pManager,
    'Targets met across the board and the self-serve portal shipped ahead of deadline. Strong year.');
  insAudit.run('goal_sheet', es, pManager, 'approved & locked', null, null, 'approved');

  console.log('Seed complete.');
  console.log('Quick Demo Login (local accounts, password = "password"):');
  console.log('  Admin/HR   : priya@atomberg.com');
  console.log('  Manager L1 : rahul@atomberg.com');
  console.log('  Employee   : amit@atomberg.com   (empty draft — build a goal sheet live)');
  console.log('Microsoft sign-in (Entra ID portal accounts):');
  console.log('  Admin Demo / Manager Demo / Employee Demo');
  console.log('  Employee Demo → reports to Manager Demo (approved sheet with full demo data)');
}

// Direct invocation: `node seed.js` — seed then close.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed(database);
  database.close();
}
