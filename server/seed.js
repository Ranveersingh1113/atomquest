import db from './db.js';

// wipe
db.exec(`DELETE FROM escalations; DELETE FROM audit_log; DELETE FROM checkins;
  DELETE FROM achievements; DELETE FROM goals; DELETE FROM goal_sheets;
  DELETE FROM thrust_areas; DELETE FROM cycles; DELETE FROM users;
  DELETE FROM sqlite_sequence;`);

const PW = 'password';

const insUser = db.prepare(
  `INSERT INTO users (name,email,password,role,manager_id,department,title)
   VALUES (?,?,?,?,?,?,?)`);

// Admin / HR
const admin = insUser.run('Priya Sharma','priya@atomberg.com',PW,'admin',null,'Human Resources','HR Director').lastInsertRowid;
// Managers (L1)
const m1 = insUser.run('Rahul Verma','rahul@atomberg.com',PW,'manager',admin,'Sales','Sales Manager').lastInsertRowid;
const m2 = insUser.run('Anjali Mehta','anjali@atomberg.com',PW,'manager',admin,'Engineering','Engineering Manager').lastInsertRowid;
// Employees
const karan = insUser.run('Karan Singh','karan@atomberg.com',PW,'employee',m1,'Sales','Account Executive').lastInsertRowid;
const neha  = insUser.run('Neha Gupta','neha@atomberg.com',PW,'employee',m1,'Sales','Sales Associate').lastInsertRowid;
const amit  = insUser.run('Amit Patel','amit@atomberg.com',PW,'employee',m1,'Sales','Sales Associate').lastInsertRowid;
const sneha = insUser.run('Sneha Rao','sneha@atomberg.com',PW,'employee',m2,'Engineering','Software Engineer').lastInsertRowid;
const vikram= insUser.run('Vikram Nair','vikram@atomberg.com',PW,'employee',m2,'Engineering','Software Engineer').lastInsertRowid;

// Cycle — FY 2025-26. Windows backdated so all quarters are open for full demo.
const cycle = db.prepare(
  `INSERT INTO cycles (name,fy,status,goal_window_open,q1_open,q2_open,q3_open,q4_open)
   VALUES (?,?,?,?,?,?,?,?)`)
  .run('Annual Performance Cycle','FY 2025-26','active',
       '2025-05-01','2025-07-01','2025-10-01','2026-01-01','2026-03-01').lastInsertRowid;

// Thrust areas
const taNames = ['Revenue Growth','Customer Success','Operational Excellence',
  'People & Culture','Innovation','Compliance & Safety'];
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

// --- Karan: APPROVED + locked, with Q1 achievements + check-in (rich demo data) ---
const ks = insSheet.run(karan,cycle,'approved',1,'2025-05-04 10:00','2025-05-06 09:30').lastInsertRowid;
const kg1 = insGoal.run(ks,ta['Revenue Growth'],'Achieve annual sales quota',
  'Close new business across assigned territory','numeric_min',2000000,null,40,null).lastInsertRowid;
const kg2 = insGoal.run(ks,ta['Customer Success'],'Maintain customer retention',
  'Retain existing accounts through the year','percent',95,null,30,null).lastInsertRowid;
const kg3 = insGoal.run(ks,ta['Operational Excellence'],'Reduce deal cycle time',
  'Lower average days-to-close','numeric_max',45,null,20,null).lastInsertRowid;
const kg4 = insGoal.run(ks,ta['Compliance & Safety'],'Zero compliance violations',
  'No CRM data-policy breaches','zero',0,null,10,null).lastInsertRowid;
insAch.run(kg1,'Q1',520000,null,'On Track');
insAch.run(kg2,'Q1',93,null,'On Track');
insAch.run(kg3,'Q1',52,null,'On Track');
insAch.run(kg4,'Q1',0,null,'Completed');
insCheckin.run(ks,'Q1',m1,'Strong start on revenue. Watch the deal-cycle time — push for tighter qualification next quarter.');
insAudit.run('goal_sheet',ks,m1,'approved',null,null,'approved');

// --- Neha: SUBMITTED, pending Rahul's review (Phase 1 approval demo) ---
const ns = insSheet.run(neha,cycle,'submitted',0,'2026-05-14 16:20',null).lastInsertRowid;
insGoal.run(ns,ta['Revenue Growth'],'Generate qualified pipeline',
  'Build sales pipeline via outbound prospecting','numeric_min',1200000,null,50,null);
insGoal.run(ns,ta['Customer Success'],'Improve onboarding satisfaction',
  'Raise new-customer CSAT','percent',90,null,30,null);
insGoal.run(ns,ta['People & Culture'],'Complete sales certification',
  'Finish advanced selling certification','timeline',null,'2026-09-30',20,null);

// --- Amit: empty DRAFT — log in as Amit to create goals live (Phase 1 creation demo) ---
insSheet.run(amit,cycle,'draft',0,null,null);

// --- Sneha: APPROVED + locked (Engineering, more tracking data) ---
const ss = insSheet.run(sneha,cycle,'approved',1,'2025-05-03 11:00','2025-05-05 14:00').lastInsertRowid;
const sg1 = insGoal.run(ss,ta['Innovation'],'Ship platform features',
  'Deliver roadmap features for the core platform','numeric_min',12,null,45,null).lastInsertRowid;
const sg2 = insGoal.run(ss,ta['Operational Excellence'],'Reduce production incidents',
  'Lower count of P1/P2 incidents','numeric_max',6,null,35,null).lastInsertRowid;
const sg3 = insGoal.run(ss,ta['People & Culture'],'Mentor junior engineers',
  'Run structured mentoring sessions','numeric_min',20,null,20,null).lastInsertRowid;
insAch.run(sg1,'Q1',3,null,'On Track');
insAch.run(sg2,'Q1',8,null,'On Track');
insAch.run(sg3,'Q1',5,null,'On Track');

// --- Vikram: returned for rework (Phase 1 rework demo) ---
const vs = insSheet.run(vikram,cycle,'returned',0,'2026-05-12 09:00',null).lastInsertRowid;
db.prepare('UPDATE goal_sheets SET return_comment=? WHERE id=?')
  .run('Please re-balance weightages — innovation goal is under-weighted for your role.',vs);
insGoal.run(vs,ta['Innovation'],'Prototype new module',
  'Build proof-of-concept for analytics module','timeline',null,'2026-08-31',60,null);
insGoal.run(vs,ta['Operational Excellence'],'Improve test coverage',
  'Raise unit-test coverage on owned services','percent',85,null,40,null);

console.log('Seed complete.');
console.log('Logins (password = "password"):');
console.log('  Admin/HR   : priya@atomberg.com');
console.log('  Manager L1 : rahul@atomberg.com, anjali@atomberg.com');
console.log('  Employee   : karan@, neha@, amit@, sneha@, vikram@ atomberg.com');
db.close();
