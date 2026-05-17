// End-to-end dry run against the running API + scoring unit tests. Not part of the app.
import { goalScore } from './lib/scoring.js';

const BASE = 'http://localhost:4000/api';
let pass = 0, fail = 0;
const log = (ok, msg) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
}
async function login(email) {
  const { data } = await call('POST', '/login', { body: { email, password: 'password' } });
  return data.token;
}
const near = (a, b) => Math.abs(a - b) < 0.001;

const T = {};
(async () => {
  console.log('--- UoM scoring formulas (unit) ---');
  log(near(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 100 }), 0.5), 'numeric_min: 100/200 = 0.5');
  log(near(goalScore({ uom_type: 'percent', target: 90 }, { actual_value: 45 }), 0.5), 'percent: 45/90 = 0.5');
  log(near(goalScore({ uom_type: 'numeric_max', target: 45 }, { actual_value: 90 }), 0.5), 'numeric_max: 45/90 = 0.5');
  log(goalScore({ uom_type: 'zero' }, { actual_value: 0 }) === 1, 'zero: 0 actual = 100%');
  log(goalScore({ uom_type: 'zero' }, { actual_value: 3 }) === 0, 'zero: non-zero actual = 0%');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { completion_date: '2026-08-01' }) === 1, 'timeline: on-time = 100%');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { completion_date: '2026-12-01' }) === 0.5, 'timeline: late = 50%');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 400 }) === 1.5, 'score caps at 1.5 (overachievement)');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, null) === null, 'no achievement = null score');

  console.log('--- Auth & RBAC ---');
  const bad = await call('POST', '/login', { body: { email: 'priya@atomberg.com', password: 'wrong' } });
  log(bad.status === 401, 'login rejects wrong password');
  T.admin = await login('priya@atomberg.com');
  T.rahul = await login('rahul@atomberg.com');
  T.anjali = await login('anjali@atomberg.com');
  T.amit = await login('amit@atomberg.com');
  T.neha = await login('neha@atomberg.com');
  T.karan = await login('karan@atomberg.com');
  T.vikram = await login('vikram@atomberg.com');
  log(T.admin && T.rahul && T.amit, 'all roles log in');
  log((await call('GET', '/sheets/mine')).status === 401, 'unauthenticated request blocked');

  console.log('--- Reference data ---');
  const ta = await call('GET', '/thrust-areas', { token: T.amit });
  log(ta.data.length === 6, `thrust areas seeded (${ta.data.length})`);
  const taId = ta.data[0].id;
  const cyc = await call('GET', '/cycle', { token: T.amit });
  log(cyc.data.openQuarters.length === 4, 'cycle has 4 open quarters');

  console.log('--- Phase 1: goal creation + validation ---');
  let mine = await call('GET', '/sheets/mine', { token: T.amit });
  log(mine.data.goals.length === 0, 'amit starts with empty sheet');
  const sid = mine.data.id;
  // timeline + description persistence
  const gT = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'Timeline Goal', description: 'has a deadline', uom_type: 'timeline', target_date: '2026-09-30', weightage: 20 } });
  log(gT.status === 200 && gT.data.goals.some(g => g.description === 'has a deadline' && g.target_date === '2026-09-30'), 'timeline goal + description persist');
  const gTbad = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No date', uom_type: 'timeline', weightage: 10 } });
  log(gTbad.status === 400, 'timeline goal without target date rejected');
  const gZ = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'Zero Goal', uom_type: 'zero', weightage: 20 } });
  log(gZ.status === 200, 'zero-based goal added (no target needed)');
  const gNbad = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No target', uom_type: 'numeric_min', weightage: 10 } });
  log(gNbad.status === 400, 'numeric goal without target rejected');
  const low = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'Tiny', uom_type: 'zero', weightage: 5 } });
  log(low.status === 400, 'rejects weightage below 10%');

  // max 8 goals
  let cnt = (await call('GET', '/sheets/mine', { token: T.amit })).data.goals.length; // 2 so far
  const filler = [];
  for (let i = cnt; i < 8; i++) {
    const r = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: `Filler ${i}`, uom_type: 'numeric_min', target: 10, weightage: 10 } });
    if (r.status === 200) filler.push(r.data.goals[r.data.goals.length - 1].id);
  }
  const ninth = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'Ninth', uom_type: 'zero', weightage: 10 } });
  log(ninth.status === 400 && /Maximum 8/.test(ninth.data.error), 'rejects 9th goal (max 8 enforced)');
  // trim back to 2 goals (timeline + zero) for a clean 100% submit
  for (const id of filler) await call('DELETE', `/goals/${id}`, { token: T.amit });
  mine = await call('GET', '/sheets/mine', { token: T.amit });
  // set timeline=60, zero=40 -> 100
  await call('PUT', `/goals/${mine.data.goals[0].id}`, { token: T.amit, body: { weightage: 60 } });
  await call('PUT', `/goals/${mine.data.goals[1].id}`, { token: T.amit, body: { weightage: 40 } });

  console.log('--- Phase 1: submit / weightage rules ---');
  await call('PUT', `/goals/${mine.data.goals[0].id}`, { token: T.amit, body: { weightage: 50 } });
  const badSub = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(badSub.status === 400, 'rejects submit when total weightage != 100%');
  await call('PUT', `/goals/${mine.data.goals[0].id}`, { token: T.amit, body: { weightage: 60 } });
  const sub = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(sub.status === 200 && sub.data.status === 'submitted', 'submits sheet at exactly 100%');

  console.log('--- Phase 1: approval workflow ---');
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.amit })).status === 403, 'employee cannot approve own sheet');
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.anjali })).status === 403, 'non-reporting manager cannot approve');
  log((await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: '' } })).status === 400, 'return rejected without a comment');
  const editTarget = await call('PUT', `/goals/${sub.data.goals[1].id}`, { token: T.rahul, body: { weightage: 35 } });
  log(editTarget.status === 200, 'manager inline-edits weightage during approval');
  await call('PUT', `/goals/${sub.data.goals[1].id}`, { token: T.rahul, body: { weightage: 40 } });
  const ret = await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: 'rebalance please' } });
  log(ret.status === 200 && ret.data.status === 'returned' && ret.data.return_comment === 'rebalance please', 'manager returns sheet for rework with comment');
  const resub = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(resub.status === 200 && resub.data.status === 'submitted', 'amit resubmits returned sheet');
  const appr = await call('POST', `/sheets/${sid}/approve`, { token: T.rahul });
  log(appr.status === 200 && appr.data.status === 'approved' && appr.data.locked === 1, 'manager approves & locks sheet');
  log((await call('PUT', `/goals/${appr.data.goals[0].id}`, { token: T.amit, body: { weightage: 70 } })).status === 403, 'employee cannot edit locked goal');

  console.log('--- Phase 2: achievement tracking ---');
  const kSheet = (await call('GET', '/sheets', { token: T.karan })).data[0];
  const kGoals = kSheet.goals;
  const gMin = kGoals.find(g => g.uom_type === 'numeric_min');
  const gMax = kGoals.find(g => g.uom_type === 'numeric_max');
  const gPct = kGoals.find(g => g.uom_type === 'percent');
  const gZero = kGoals.find(g => g.uom_type === 'zero');
  await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gMin.target / 2, status: 'On Track' } });
  await call('PUT', `/goals/${gMax.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gMax.target * 2, status: 'Completed' } });
  await call('PUT', `/goals/${gPct.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gPct.target / 2, status: 'On Track' } });
  await call('PUT', `/goals/${gZero.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 0, status: 'Not Started' } });
  const kAfter = (await call('GET', `/sheets/${kSheet.id}`, { token: T.karan })).data;
  const s = id => kAfter.goals.find(g => g.id === id).scores.Q2;
  log(near(s(gMin.id), 0.5), `numeric_min Q2 score = 0.5 (live)`);
  log(near(s(gMax.id), 0.5), `numeric_max Q2 score = 0.5 (live)`);
  log(near(s(gPct.id), 0.5), `percent Q2 score = 0.5 (live)`);
  log(s(gZero.id) === 1, `zero Q2 score = 100% (live)`);
  log(kAfter.quarterScores.Q2 > 0, `weighted sheet score computed (${kAfter.quarterScores.Q2}%)`);
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 1, status: 'Bogus' } })).status === 400, 'invalid status rejected');
  const nMine = await call('GET', '/sheets/mine', { token: T.neha });
  log((await call('PUT', `/goals/${nMine.data.goals[0].id}/achievement`, { token: T.neha, body: { quarter: 'Q1', actual_value: 5, status: 'On Track' } })).status === 400, 'achievement blocked on non-approved sheet');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.neha, body: { quarter: 'Q3', actual_value: 1, status: 'On Track' } })).status === 403, 'employee cannot log achievement on another employee goal');

  console.log('--- Check-in schedule (windows) ---');
  const cy = (await call('GET', '/cycle', { token: T.admin })).data;
  await call('PUT', `/cycles/${cy.id}`, { token: T.admin, body: { q4_open: '2099-01-01' } });
  const closed = await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q4', actual_value: 1, status: 'On Track' } });
  log(closed.status === 400 && /not open/.test(closed.data.error), 'employee blocked from closed Q4 window');
  const adminBypass = await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.admin, body: { quarter: 'Q4', actual_value: 1, status: 'On Track' } });
  log(adminBypass.status === 200, 'admin can bypass closed window (exception handling)');
  await call('PUT', `/cycles/${cy.id}`, { token: T.admin, body: { q4_open: '2026-03-01' } });
  log((await call('GET', '/cycle', { token: T.admin })).data.openQuarters.length === 4, 'window restored — 4 quarters open');

  console.log('--- Manager check-ins ---');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: kSheet.id, quarter: 'Q2', comment: 'Good progress.' } })).status === 200, 'manager records Q2 check-in');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: kSheet.id, quarter: 'Q3', comment: '  ' } })).status === 400, 'empty check-in comment rejected');
  log((await call('POST', '/checkins', { token: T.anjali, body: { sheet_id: kSheet.id, quarter: 'Q2', comment: 'x' } })).status === 403, 'non-reporting manager cannot check in');

  console.log('--- Shared goals ---');
  const users = await call('GET', '/users', { token: T.admin });
  const vU = users.data.find(u => u.email === 'vikram@atomberg.com');
  const shared = await call('POST', '/shared-goals', { token: T.admin, body: {
    thrust_area_id: taId, title: 'Shared KPI: NPS', uom_type: 'numeric_min', target: 100, weightage: 15,
    owner_id: kSheet.employee_id, recipient_ids: [vU.id] } });
  log(shared.status === 200 && shared.data.pushed.length === 1, 'shared KPI pushed to recipient');
  const kS2 = (await call('GET', `/sheets/${kSheet.id}`, { token: T.karan })).data;
  const origin = kS2.goals.find(g => g.title === 'Shared KPI: NPS');
  const vMine = await call('GET', '/sheets/mine', { token: T.vikram });
  const copy = vMine.data.goals.find(g => g.title === 'Shared KPI: NPS');
  log(!!origin && !!copy && copy.is_shared_copy, 'origin + linked recipient copy created');
  // recipient weightage-only
  await call('PUT', `/goals/${copy.id}`, { token: T.vikram, body: { weightage: 25 } });
  const wChanged = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === copy.id);
  log(wChanged.weightage === 25, 'recipient can adjust shared-copy weightage');
  await call('PUT', `/goals/${copy.id}`, { token: T.vikram, body: { title: 'HACKED', target: 999 } });
  const wLocked = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === copy.id);
  log(wLocked.title === 'Shared KPI: NPS' && wLocked.target === 100, 'recipient cannot change shared-copy title/target');
  log((await call('DELETE', `/goals/${copy.id}`, { token: T.vikram })).status === 400, 'recipient cannot delete a shared copy');
  // achievement sync
  await call('PUT', `/goals/${origin.id}/achievement`, { token: T.karan, body: { quarter: 'Q1', actual_value: 80, status: 'On Track' } });
  const synced = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === copy.id);
  log(synced.achievements?.Q1?.actual_value === 80, 'achievement syncs from owner to linked copy');
  log((await call('PUT', `/goals/${copy.id}/achievement`, { token: T.vikram, body: { quarter: 'Q1', actual_value: 1, status: 'On Track' } })).status === 400, 'recipient cannot log achievement on a shared copy');

  console.log('--- Reporting & governance ---');
  const csv = await call('GET', '/reports/achievement.csv', { token: T.admin });
  log(typeof csv.data === 'string' && csv.data.includes('Employee') && csv.data.split('\r\n').length > 3, 'CSV achievement report exports rows');
  const comp = await call('GET', '/reports/completion', { token: T.admin });
  log(comp.data.rows.length >= 5, `completion dashboard lists ${comp.data.rows?.length} sheets`);
  const audit = await call('GET', '/audit', { token: T.admin });
  log(audit.data.length > 5, `audit trail has ${audit.data.length} entries`);
  const unlock = await call('POST', `/sheets/${kSheet.id}/unlock`, { token: T.admin, body: { reason: 'correction' } });
  log(unlock.status === 200 && unlock.data.locked === 0, 'admin unlocks locked sheet');
  log((await call('POST', `/sheets/${sid}/unlock`, { token: T.rahul })).status === 403, 'non-admin cannot unlock');

  console.log('--- Bonus: analytics + escalations ---');
  const an = await call('GET', '/analytics', { token: T.admin });
  log(an.data.qoq?.length === 4 && an.data.distribution && an.data.managerEffectiveness, 'analytics returns qoq/distribution/effectiveness');
  const escRun = await call('POST', '/escalations/run', { token: T.admin });
  log(escRun.status === 200 && Array.isArray(escRun.data), `escalation run raised ${escRun.data.length} items`);
  log((await call('POST', '/escalations/run', { token: T.rahul })).status === 403, 'non-admin cannot run escalations');
  if (escRun.data.length)
    log((await call('PUT', `/escalations/${escRun.data[0].id}/resolve`, { token: T.admin })).status === 200, 'admin resolves an escalation');

  console.log('--- Bonus 5.2: notifications (email + Teams) ---');
  // Email dispatch is async (real SMTP round-trip) — let in-flight sends settle.
  await new Promise(r => setTimeout(r, 5000));
  const notif = await call('GET', '/notifications', { token: T.admin });
  log(Array.isArray(notif.data) && notif.data.length > 0, `notification log records dispatches (${notif.data.length})`);
  log(notif.data.some(n => n.event === 'goal_submitted') &&
      notif.data.some(n => n.event === 'goal_approved') &&
      notif.data.some(n => n.event === 'goal_returned'), 'submit/approve/return all emit notifications');
  log(notif.data.some(n => n.channel === 'email') && notif.data.some(n => n.channel === 'teams'),
      'both email and Teams channels dispatched');
  log(notif.data.every(n => !n.link || n.link.includes('/sheet/')), 'Teams/email carry a goal-sheet deep link');
  log((await call('GET', '/notifications', { token: T.rahul })).status === 403, 'non-admin cannot read notification log');
  const rem = await call('POST', '/reminders/run', { token: T.admin });
  log(rem.status === 200 && typeof rem.data.sent === 'number', `check-in reminders dispatched (${rem.data.sent})`);
  log((await call('POST', '/reminders/run', { token: T.rahul })).status === 403, 'non-admin cannot send reminders');
  const ist = await call('GET', '/integrations/status', { token: T.admin });
  log(ist.status === 200 && 'entra' in ist.data && 'smtp' in ist.data && 'teams' in ist.data,
      'integration status endpoint reports entra/smtp/teams');

  console.log('--- In-app Teams integration settings ---');
  const setGet = await call('GET', '/settings/integrations', { token: T.admin });
  log(setGet.status === 200 && setGet.data.teams && setGet.data.smtp && setGet.data.entra,
      'integration settings readable by admin');
  log((await call('GET', '/settings/integrations', { token: T.rahul })).status === 403,
      'non-admin cannot read integration settings');
  log((await call('PUT', '/settings/integrations', { token: T.admin,
      body: { teams_webhook_url: 'ftp://bad' } })).status === 400, 'rejects non-https webhook URL');
  const saved = await call('PUT', '/settings/integrations', { token: T.admin,
    body: { teams_webhook_url: 'https://example.invalid/webhook', teams_webhook_kind: 'workflow' } });
  log(saved.status === 200 && saved.data.teams.configured, 'admin saves Teams webhook in-app');
  log((await call('GET', '/settings/integrations', { token: T.admin })).data.teams.webhookUrl
      === 'https://example.invalid/webhook', 'saved webhook persists');
  const testTeams = await call('POST', '/settings/integrations/test-teams', { token: T.admin });
  log(testTeams.status === 502, 'test card surfaces delivery failure for a bad URL');
  await call('PUT', '/settings/integrations', { token: T.admin, body: { teams_webhook_url: '' } });
  log((await call('GET', '/settings/integrations', { token: T.admin })).data.teams.configured === false,
      'admin can disconnect the Teams webhook');

  console.log('--- Bonus 5.1: Entra ID SSO ---');
  const ssoStatus = await call('GET', '/auth/sso/status');
  log(ssoStatus.status === 200 && 'enabled' in ssoStatus.data, 'SSO status endpoint responds');
  const ssoLogin = await fetch(BASE + '/auth/sso/login', { redirect: 'manual' });
  log(ssoStatus.data.enabled ? (ssoLogin.status === 302 || ssoLogin.status === 0) : ssoLogin.status === 503,
      ssoStatus.data.enabled ? 'SSO login redirects to Microsoft' : 'SSO login 503s until Entra is configured');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
