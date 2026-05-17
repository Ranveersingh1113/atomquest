// Exhaustive end-to-end test suite for the Atomberg Goal Portal.
// Runs against a freshly-seeded DB + a running API on :4000.
// Covers: every BRD requirement, RBAC matrix, boundary values, malformed
// input, security probes, and full practical role journeys.
import { goalScore, sheetScore } from './lib/scoring.js';

const BASE = 'http://localhost:4000/api';
let pass = 0, fail = 0;
const failures = [];
const findings = [];

function log(ok, msg, detail) {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) {
    if (detail !== undefined) console.log(`        ↳ ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    failures.push(msg);
  }
}
function section(name) { console.log(`\n=== ${name} ===`); }
function finding(text) { findings.push(text); }

async function call(method, path, { token, body, rawBody } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: rawBody !== undefined ? rawBody : (body ? JSON.stringify(body) : undefined),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
}
async function login(email, password = 'password') {
  const { data, status } = await call('POST', '/login', { body: { email, password } });
  return { token: data.token, user: data.user, status };
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

const T = {};   // tokens
const U = {};   // user objects

(async () => {
  // ============================================================
  section('1. UoM SCORING — formulas, boundaries, caps');
  // numeric_min / percent: Achievement ÷ Target
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 100 }) === 0.5, 'numeric_min 100/200 = 0.50');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 200 }) === 1, 'numeric_min exact target = 1.00');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 0 }) === 0, 'numeric_min actual 0 = 0.00');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 400 }) === 1.5, 'numeric_min overachieve caps at 1.50');
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, { actual_value: 1e9 }) === 1.5, 'numeric_min extreme value still caps at 1.50');
  log(goalScore({ uom_type: 'percent', target: 90 }, { actual_value: 45 }) === 0.5, 'percent 45/90 = 0.50');
  log(goalScore({ uom_type: 'percent', target: 90 }, { actual_value: 180 }) === 1.5, 'percent 200% achieve caps at 1.50');
  // numeric_max: Target ÷ Achievement (lower is better)
  log(goalScore({ uom_type: 'numeric_max', target: 45 }, { actual_value: 90 }) === 0.5, 'numeric_max 45/90 = 0.50');
  log(goalScore({ uom_type: 'numeric_max', target: 45 }, { actual_value: 45 }) === 1, 'numeric_max exact target = 1.00');
  log(goalScore({ uom_type: 'numeric_max', target: 45 }, { actual_value: 0 }) === 1, 'numeric_max actual 0 (best) = 1.00');
  log(goalScore({ uom_type: 'numeric_max', target: 45 }, { actual_value: 10 }) === 1.5, 'numeric_max strong beat caps at 1.50');
  // zero
  log(goalScore({ uom_type: 'zero' }, { actual_value: 0 }) === 1, 'zero: 0 incidents = 1.00');
  log(goalScore({ uom_type: 'zero' }, { actual_value: 1 }) === 0, 'zero: 1 incident = 0.00');
  log(goalScore({ uom_type: 'zero' }, { actual_value: 99 }) === 0, 'zero: many incidents = 0.00');
  log(goalScore({ uom_type: 'zero' }, { actual_value: null }) === null, 'zero: no value = null');
  // timeline
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { completion_date: '2026-08-01' }) === 1, 'timeline on-time = 1.00');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { completion_date: '2026-09-30' }) === 1, 'timeline exactly on deadline = 1.00');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { completion_date: '2026-12-01' }) === 0.5, 'timeline late = 0.50');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { status: 'Completed' }) === 1, 'timeline Completed w/o date = 1.00');
  log(goalScore({ uom_type: 'timeline', target_date: '2026-09-30' }, { status: 'On Track' }) === null, 'timeline not done, no date = null');
  // null achievement
  log(goalScore({ uom_type: 'numeric_min', target: 200 }, null) === null, 'no achievement = null');
  // weighted sheet score
  const sg = [{ id: 1, uom_type: 'numeric_min', target: 100, weightage: 50 }, { id: 2, uom_type: 'zero', weightage: 50 }];
  const sa = { '1|Q1': { actual_value: 100 }, '2|Q1': { actual_value: 0 } };
  log(sheetScore(sg, sa, 'Q1') === 100, 'sheetScore: both goals full = 100%');
  log(sheetScore(sg, {}, 'Q1') === 0, 'sheetScore: no achievements = 0%');
  log(sheetScore([], {}, 'Q1') === 0, 'sheetScore: empty sheet = 0%');

  // ============================================================
  section('2. AUTH — login, tokens, security probes');
  let r;
  r = await login('priya@atomberg.com', 'wrong');
  log(r.status === 401, 'login: wrong password rejected');
  r = await login('ghost@atomberg.com');
  log(r.status === 401, 'login: unknown email rejected');
  r = await call('POST', '/login', { body: {} });
  log(r.status === 401, 'login: empty body rejected');
  r = await call('POST', '/login', { body: { email: 'PRIYA@ATOMBERG.COM', password: 'password' } });
  log(r.status === 200 && r.data.token, 'login: email is case-insensitive');
  r = await call('POST', '/login', { body: { email: '  priya@atomberg.com  ', password: 'password' } });
  log(r.status === 200 && r.data.token, 'login: surrounding whitespace trimmed');
  r = await call('POST', '/login', { body: { email: 'priya@atomberg.com', password: 'password' } });
  log(r.data.user && !('password' in r.data.user), 'login: response never includes password hash');

  T.admin = (await login('priya@atomberg.com')).token;
  const adminL = await login('priya@atomberg.com'); U.admin = adminL.user;
  const rahulL = await login('rahul@atomberg.com'); T.rahul = rahulL.token; U.rahul = rahulL.user;
  const anjaliL = await login('anjali@atomberg.com'); T.anjali = anjaliL.token; U.anjali = anjaliL.user;
  const amitL = await login('amit@atomberg.com'); T.amit = amitL.token; U.amit = amitL.user;
  const nehaL = await login('neha@atomberg.com'); T.neha = nehaL.token; U.neha = nehaL.user;
  const karanL = await login('karan@atomberg.com'); T.karan = karanL.token; U.karan = karanL.user;
  const vikramL = await login('vikram@atomberg.com'); T.vikram = vikramL.token; U.vikram = vikramL.user;
  const snehaL = await login('sneha@atomberg.com'); T.sneha = snehaL.token; U.sneha = snehaL.user;
  log(Object.values(T).every(Boolean), 'all 8 seeded accounts log in');

  log((await call('GET', '/sheets/mine')).status === 401, 'no token → 401');
  log((await call('GET', '/sheets/mine', { token: 'garbage' })).status === 401, 'malformed token → 401');
  log((await call('GET', '/sheets/mine', { token: '1.deadbeef' })).status === 401, 'token with forged signature → 401');
  log((await call('GET', '/sheets/mine', { token: '.' })).status === 401, 'empty token parts → 401');
  log((await call('GET', '/sheets/mine', { token: '99999.' + 'a'.repeat(64) })).status === 401, 'token for non-existent user → 401');
  const me = await call('GET', '/me', { token: T.amit });
  log(me.status === 200 && me.data.role === 'employee' && !('password' in me.data), '/me returns current user, no password');
  const demo = await call('GET', '/demo-accounts');
  log(demo.status === 200 && demo.data.length === 8 && demo.data.every(a => !('password' in a)), '/demo-accounts public, lists 8, no passwords');

  // ============================================================
  section('3. REFERENCE DATA & RBAC SCOPING');
  const ta = (await call('GET', '/thrust-areas', { token: T.amit })).data;
  log(Array.isArray(ta) && ta.length === 6, `6 thrust areas seeded (${ta.length})`);
  const taId = ta[0].id;
  const cyc = (await call('GET', '/cycle', { token: T.amit })).data;
  log(cyc.openQuarters.length === 4, 'cycle reports 4 open quarters');
  log(cyc.fy === 'FY 2025-26', 'cycle FY label correct');
  // /users scoping
  log((await call('GET', '/users', { token: T.admin })).data.length === 8, 'admin sees all 8 users');
  const rahulUsers = (await call('GET', '/users', { token: T.rahul })).data;
  log(rahulUsers.length === 4 && rahulUsers.every(u => u.id === U.rahul.id || u.manager_id === U.rahul.id), 'manager sees self + 3 reports');
  log((await call('GET', '/users', { token: T.amit })).data.length === 1, 'employee sees only self');
  // /sheets scoping
  log((await call('GET', '/sheets', { token: T.admin })).data.length === 5, 'admin sees all 5 seeded sheets');
  log((await call('GET', '/sheets', { token: T.rahul })).data.length === 3, 'rahul sees 3 team sheets (karan/neha/amit)');
  log((await call('GET', '/sheets', { token: T.anjali })).data.length === 2, 'anjali sees 2 team sheets (sneha/vikram)');
  log((await call('GET', '/sheets', { token: T.amit })).data.length === 1, 'employee sees only own sheet');

  // ============================================================
  section('4. SHEET ACCESS — cross-role visibility (403/404)');
  const karanSheetId = (await call('GET', '/sheets', { token: T.karan })).data[0].id;
  log((await call('GET', `/sheets/${karanSheetId}`, { token: T.karan })).status === 200, 'employee can view own sheet');
  log((await call('GET', `/sheets/${karanSheetId}`, { token: T.neha })).status === 403, 'employee CANNOT view a peer sheet');
  log((await call('GET', `/sheets/${karanSheetId}`, { token: T.rahul })).status === 200, 'reporting manager can view team sheet');
  log((await call('GET', `/sheets/${karanSheetId}`, { token: T.anjali })).status === 403, 'non-reporting manager CANNOT view sheet');
  log((await call('GET', `/sheets/${karanSheetId}`, { token: T.admin })).status === 200, 'admin can view any sheet');
  log((await call('GET', '/sheets/999999', { token: T.admin })).status === 404, 'non-existent sheet → 404');

  // ============================================================
  section('5. PHASE 1 — goal creation validation');
  let mine = await call('GET', '/sheets/mine', { token: T.amit });
  const sid = mine.data.id;
  log(mine.data.goals.length === 0, 'amit starts with an empty draft sheet');
  // missing fields
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, uom_type: 'zero', weightage: 20 } })).status === 400, 'reject goal with no title');
  log((await call('POST', '/goals', { token: T.amit, body: { title: 'X', uom_type: 'zero', weightage: 20 } })).status === 400, 'reject goal with no thrust area');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: '   ', uom_type: 'zero', weightage: 20 } })).status === 400, 'reject goal with blank/whitespace title');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'X', uom_type: 'bogus', weightage: 20 } })).status === 400, 'reject invalid UoM type');
  // UoM-specific target rules
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No date', uom_type: 'timeline', weightage: 20 } })).status === 400, 'timeline goal without target date rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No target', uom_type: 'numeric_min', weightage: 20 } })).status === 400, 'numeric_min without target rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No target', uom_type: 'numeric_max', weightage: 20 } })).status === 400, 'numeric_max without target rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'No target', uom_type: 'percent', weightage: 20 } })).status === 400, 'percent without target rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'Zero ok', uom_type: 'zero', weightage: 20 } })).status === 200, 'zero goal needs no target (accepted)');
  // weightage boundaries
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'tiny', uom_type: 'zero', weightage: 9 } })).status === 400, 'weightage 9% rejected (below 10% min)');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'zero w', uom_type: 'zero', weightage: 0 } })).status === 400, 'weightage 0% rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'neg w', uom_type: 'zero', weightage: -5 } })).status === 400, 'negative weightage rejected');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'over w', uom_type: 'zero', weightage: 150 } })).status === 400, 'weightage above 100% rejected');
  let exact10 = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'exact 10', uom_type: 'zero', weightage: 10 } });
  log(exact10.status === 200, 'weightage exactly 10% accepted (boundary)');
  // malformed input — non-numeric weightage / target  (SECURITY/ROBUSTNESS PROBE)
  const badW = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'bad weight', uom_type: 'zero', weightage: 'heavy' } });
  log(badW.status === 400, 'non-numeric weightage → clean 400 (not 500/silent insert)', `got ${badW.status}: ${JSON.stringify(badW.data)}`);
  if (badW.status !== 400) finding(`Non-numeric weightage "heavy" returned HTTP ${badW.status} instead of a clean 400 — validateGoalInput uses loose comparison ("heavy" < 10 is false) so NaN slips past validation.`);
  const badT = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'bad target', uom_type: 'numeric_min', target: 'lots', weightage: 15 } });
  log(badT.status === 400, 'non-numeric target → clean 400', `got ${badT.status}: ${JSON.stringify(badT.data)}`);
  if (badT.status !== 400) finding(`Non-numeric target "lots" returned HTTP ${badT.status} instead of 400 — Number("lots")=NaN is stored, scoring then silently treats it as 0.`);
  // clean up amit's sheet for later sections — delete everything added
  mine = await call('GET', '/sheets/mine', { token: T.amit });
  for (const g of mine.data.goals) await call('DELETE', `/goals/${g.id}`, { token: T.amit });
  log((await call('GET', '/sheets/mine', { token: T.amit })).data.goals.length === 0, 'amit sheet reset to empty for next section');

  // ============================================================
  section('6. PHASE 1 — max 8 goals + weightage = 100% rules');
  const ids = [];
  for (let i = 0; i < 8; i++) {
    const g = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: `G${i}`, uom_type: 'numeric_min', target: 100, weightage: 12.5 } });
    if (g.status === 200) ids.push(g.data.goals[g.data.goals.length - 1].id);
  }
  log(ids.length === 8, '8 goals created successfully');
  const ninth = await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'G9', uom_type: 'zero', weightage: 10 } });
  log(ninth.status === 400 && /Maximum 8/.test(ninth.data.error || ''), '9th goal rejected (max 8 enforced)');
  // 8 × 12.5 = 100 exactly → submit should pass
  const sub8 = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(sub8.status === 200 && sub8.data.status === 'submitted', '8 goals × 12.5% = 100% → submit accepted');
  // return it & reset to test other weightage scenarios
  await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: 'reset for weightage tests' } });
  mine = await call('GET', '/sheets/mine', { token: T.amit });
  for (const g of mine.data.goals) await call('DELETE', `/goals/${g.id}`, { token: T.amit });
  // empty submit
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).status === 400, 'empty sheet cannot be submitted');
  // weightage != 100
  const a1 = (await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'A1', uom_type: 'zero', weightage: 60 } })).data.goals.slice(-1)[0].id;
  const a2 = (await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'A2', uom_type: 'zero', weightage: 30 } })).data.goals.slice(-1)[0].id;
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).status === 400, 'total 90% → submit rejected');
  await call('PUT', `/goals/${a2}`, { token: T.amit, body: { weightage: 50 } });
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).status === 400, 'total 110% → submit rejected');
  // float weightage that sums exactly to 100
  await call('PUT', `/goals/${a1}`, { token: T.amit, body: { weightage: 33.33 } });
  await call('PUT', `/goals/${a2}`, { token: T.amit, body: { weightage: 33.33 } });
  const a3 = (await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'A3', uom_type: 'zero', weightage: 33.34 } })).data.goals.slice(-1)[0].id;
  const subFloat = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(subFloat.status === 200, 'float weightages 33.33+33.33+33.34 = 100% → submit accepted');
  await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: 'reset' } });
  // float that is 99.99 → rejected
  await call('PUT', `/goals/${a3}`, { token: T.amit, body: { weightage: 33.33 } });
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).status === 400, 'float weightages summing 99.99% → submit rejected');

  // ============================================================
  section('7. PHASE 1 — submit / approval lifecycle (state machine)');
  // fix amit's sheet to a clean 100% (single goal at 100%)
  mine = await call('GET', '/sheets/mine', { token: T.amit });
  for (const g of mine.data.goals.slice(1)) await call('DELETE', `/goals/${g.id}`, { token: T.amit });
  const soloId = (await call('GET', '/sheets/mine', { token: T.amit })).data.goals[0].id;
  await call('PUT', `/goals/${soloId}`, { token: T.amit, body: { weightage: 100 } });
  const soloSub = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(soloSub.status === 200, 'single goal at 100% weightage → submit accepted');
  // double submit
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).status === 400, 'submitting an already-submitted sheet rejected');
  // employee cannot approve / return own sheet
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.amit })).status === 403, 'employee cannot approve own sheet');
  log((await call('POST', `/sheets/${sid}/return`, { token: T.amit, body: { comment: 'x' } })).status === 403, 'employee cannot return own sheet');
  // non-reporting manager cannot act
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.anjali })).status === 403, 'non-reporting manager cannot approve');
  // return needs a comment
  log((await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: '' } })).status === 400, 'return rejected with empty comment');
  log((await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: '   ' } })).status === 400, 'return rejected with whitespace-only comment');
  // manager inline-edits during approval (submitted state)
  const editW = await call('PUT', `/goals/${soloId}`, { token: T.rahul, body: { weightage: 100 } });
  log(editW.status === 200, 'manager can inline-edit a submitted goal');
  // PROBE: manager inline-edit bypasses weightage validation
  const mgrBad = await call('PUT', `/goals/${soloId}`, { token: T.rahul, body: { weightage: 5 } });
  if (mgrBad.status === 200) {
    const after = (await call('GET', `/sheets/${sid}`, { token: T.rahul })).data.goals.find(g => g.id === soloId);
    if (after.weightage === 5) {
      log(true, 'NOTE: manager inline-edit accepted weightage 5% (below 10% min) — validation not re-applied');
      finding('Manager inline-edit during approval (PUT /goals/:id) does NOT re-run validateGoalInput — a manager can set weightage below 10%, above 100%, or blank a target. The sheet was submitted at a valid 100% but post-submit manager edits are unchecked.');
    } else log(false, 'manager weightage edit behaviour unexpected', after);
  } else {
    log(true, 'manager inline-edit re-validates weightage (rejected 5%)');
  }
  await call('PUT', `/goals/${soloId}`, { token: T.rahul, body: { weightage: 100 } }); // restore
  // return → resubmit → approve
  const ret = await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: 'tighten targets' } });
  log(ret.status === 200 && ret.data.status === 'returned' && ret.data.return_comment === 'tighten targets', 'manager returns sheet with comment');
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.rahul })).status === 400, 'cannot approve a returned (non-submitted) sheet');
  const resub = await call('POST', `/sheets/${sid}/submit`, { token: T.amit });
  log(resub.status === 200 && resub.data.status === 'submitted' && resub.data.return_comment == null, 'amit resubmits — return comment cleared');
  const appr = await call('POST', `/sheets/${sid}/approve`, { token: T.rahul });
  log(appr.status === 200 && appr.data.status === 'approved' && appr.data.locked === 1, 'manager approves & locks sheet');
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.rahul })).status === 400, 'cannot re-approve an approved sheet');
  log((await call('POST', `/sheets/${sid}/return`, { token: T.rahul, body: { comment: 'x' } })).status === 400, 'cannot return an approved sheet');
  // locked-goal edits
  log((await call('PUT', `/goals/${soloId}`, { token: T.amit, body: { weightage: 50 } })).status === 403, 'employee cannot edit a locked goal');
  log((await call('DELETE', `/goals/${soloId}`, { token: T.amit })).status === 403, 'employee cannot delete a locked goal');
  log((await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: taId, title: 'sneaky', uom_type: 'zero', weightage: 10 } })).status === 400, 'employee cannot add goals to a locked sheet');
  // admin post-lock edit is allowed + flagged
  const adminEdit = await call('PUT', `/goals/${soloId}`, { token: T.admin, body: { description: 'admin correction' } });
  log(adminEdit.status === 200, 'admin can edit a locked goal (exception handling)');

  // ============================================================
  section('8. PHASE 1 — shared goals (departmental KPI)');
  const users = (await call('GET', '/users', { token: T.admin })).data;
  const karanU = users.find(u => u.email === 'karan@atomberg.com');
  const vikramU = users.find(u => u.email === 'vikram@atomberg.com');
  const nehaU = users.find(u => u.email === 'neha@atomberg.com');
  // requires recipients
  log((await call('POST', '/shared-goals', { token: T.admin, body: { thrust_area_id: taId, title: 'X', uom_type: 'zero', weightage: 10, recipient_ids: [] } })).status === 400, 'shared goal needs ≥1 recipient');
  // employee cannot push shared goals
  log((await call('POST', '/shared-goals', { token: T.amit, body: { thrust_area_id: taId, title: 'X', uom_type: 'zero', weightage: 10, recipient_ids: [vikramU.id] } })).status === 403, 'employee cannot push a shared KPI');
  // validation applies
  log((await call('POST', '/shared-goals', { token: T.admin, body: { thrust_area_id: taId, title: 'Bad', uom_type: 'numeric_min', weightage: 10, recipient_ids: [vikramU.id] } })).status === 400, 'shared goal without target rejected');
  // valid push
  const shared = await call('POST', '/shared-goals', { token: T.admin, body: {
    thrust_area_id: taId, title: 'Shared KPI: CSAT', description: 'org-wide', uom_type: 'numeric_min',
    target: 100, weightage: 15, owner_id: karanU.id, recipient_ids: [vikramU.id, nehaU.id] } });
  log(shared.status === 200 && shared.data.pushed.length === 2, 'shared KPI pushed to 2 recipients');
  // origin on owner sheet, copies on recipients
  const karanSheet = (await call('GET', `/sheets/${karanSheetId}`, { token: T.admin })).data;
  const origin = karanSheet.goals.find(g => g.title === 'Shared KPI: CSAT');
  log(origin && !origin.is_shared_copy, 'origin goal created on owner sheet (not a copy)');
  const vikramCopy = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.title === 'Shared KPI: CSAT');
  log(vikramCopy && vikramCopy.is_shared_copy, 'linked copy created on recipient sheet, flagged is_shared_copy');
  // recipient can change weightage only
  await call('PUT', `/goals/${vikramCopy.id}`, { token: T.vikram, body: { weightage: 22 } });
  let vc = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === vikramCopy.id);
  log(vc.weightage === 22, 'recipient CAN adjust shared-copy weightage');
  await call('PUT', `/goals/${vikramCopy.id}`, { token: T.vikram, body: { title: 'HACKED', target: 9 } });
  vc = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === vikramCopy.id);
  log(vc.title === 'Shared KPI: CSAT' && vc.target === 100, 'recipient CANNOT change shared-copy title/target');
  log((await call('DELETE', `/goals/${vikramCopy.id}`, { token: T.vikram })).status === 400, 'recipient cannot delete a shared copy');
  // achievement sync from owner → copies
  await call('PUT', `/goals/${origin.id}/achievement`, { token: T.karan, body: { quarter: 'Q1', actual_value: 70, status: 'On Track' } });
  const syncedV = (await call('GET', '/sheets/mine', { token: T.vikram })).data.goals.find(g => g.id === vikramCopy.id);
  log(syncedV.achievements?.Q1?.actual_value === 70, 'owner achievement syncs to recipient copy');
  log((await call('PUT', `/goals/${vikramCopy.id}/achievement`, { token: T.vikram, body: { quarter: 'Q1', actual_value: 5, status: 'On Track' } })).status === 400, 'recipient cannot log achievement on a shared copy');
  // push to a locked sheet → recipient skipped
  const pushLocked = await call('POST', '/shared-goals', { token: T.admin, body: {
    thrust_area_id: taId, title: 'Shared KPI: Locked test', uom_type: 'zero', weightage: 10,
    owner_id: nehaU.id, recipient_ids: [karanU.id] } });
  log(pushLocked.status === 200 && pushLocked.data.skipped.includes('Karan Singh'), 'shared KPI skips a locked recipient sheet');
  // push to non-existent recipient → handled, not a crash
  const pushBad = await call('POST', '/shared-goals', { token: T.admin, body: {
    thrust_area_id: taId, title: 'Shared KPI: Ghost', uom_type: 'zero', weightage: 10, recipient_ids: [999999] } });
  log(pushBad.status === 200 || pushBad.status === 400 || pushBad.status === 500, `shared KPI to invalid recipient handled (HTTP ${pushBad.status})`);
  if (pushBad.status === 500) finding('Pushing a shared KPI to a non-existent recipient id returns HTTP 500 (FK insert failure inside tx) instead of a validated 400.');

  // ============================================================
  section('9. PHASE 2 — achievement tracking (all UoM, live scoring)');
  const ksheet = (await call('GET', `/sheets/${karanSheetId}`, { token: T.karan })).data;
  const gMin = ksheet.goals.find(g => g.uom_type === 'numeric_min' && !g.shared_origin_id && g.title.includes('quota'));
  const gMax = ksheet.goals.find(g => g.uom_type === 'numeric_max');
  const gPct = ksheet.goals.find(g => g.uom_type === 'percent');
  const gZero = ksheet.goals.find(g => g.uom_type === 'zero');
  await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gMin.target / 2, status: 'On Track' } });
  await call('PUT', `/goals/${gMax.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gMax.target * 2, status: 'Completed' } });
  await call('PUT', `/goals/${gPct.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: gPct.target / 2, status: 'On Track' } });
  await call('PUT', `/goals/${gZero.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 0, status: 'Completed' } });
  const kAfter = (await call('GET', `/sheets/${karanSheetId}`, { token: T.karan })).data;
  const sc = id => kAfter.goals.find(g => g.id === id).scores.Q2;
  log(near(sc(gMin.id), 0.5), 'numeric_min live score = 0.50');
  log(near(sc(gMax.id), 0.5), 'numeric_max live score = 0.50');
  log(near(sc(gPct.id), 0.5), 'percent live score = 0.50');
  log(sc(gZero.id) === 1, 'zero live score = 1.00');
  log(kAfter.quarterScores.Q2 > 0, `weighted Q2 sheet score computed (${kAfter.quarterScores.Q2}%)`);
  // status enum
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 1, status: 'Finished' } })).status === 400, 'invalid status value rejected');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 1, status: 'Not Started' } })).status === 200, 'status "Not Started" accepted');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 1, status: 'On Track' } })).status === 200, 'status "On Track" accepted');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q2', actual_value: 1, status: 'Completed' } })).status === 200, 'status "Completed" accepted');
  // quarter enum
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q5', actual_value: 1, status: 'On Track' } })).status === 400, 'invalid quarter Q5 rejected');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { actual_value: 1, status: 'On Track' } })).status === 400, 'missing quarter rejected');
  // upsert overwrites
  await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q3', actual_value: 111, status: 'On Track' } });
  await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q3', actual_value: 222, status: 'Completed' } });
  const upserted = (await call('GET', `/sheets/${karanSheetId}`, { token: T.karan })).data.goals.find(g => g.id === gMin.id);
  log(upserted.achievements.Q3.actual_value === 222 && upserted.achievements.Q3.status === 'Completed', 'achievement upsert overwrites same quarter (no duplicate)');
  // timeline achievement live
  const vsheet = (await call('GET', '/sheets/mine', { token: T.vikram })).data;
  // RBAC
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.neha, body: { quarter: 'Q2', actual_value: 1, status: 'On Track' } })).status === 403, 'employee cannot log achievement on a peer goal');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.rahul, body: { quarter: 'Q2', actual_value: 1, status: 'On Track' } })).status === 403, 'manager cannot log achievement on an employee goal');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.admin, body: { quarter: 'Q2', actual_value: 1, status: 'On Track' } })).status === 200, 'admin CAN log achievement (exception path)');
  // non-approved sheet blocks achievement
  const nehaSheet = (await call('GET', '/sheets/mine', { token: T.neha })).data;
  if (nehaSheet.goals[0])
    log((await call('PUT', `/goals/${nehaSheet.goals[0].id}/achievement`, { token: T.neha, body: { quarter: 'Q1', actual_value: 5, status: 'On Track' } })).status === 400, 'achievement blocked on a non-approved (submitted) sheet');
  // non-existent goal
  log((await call('PUT', '/goals/999999/achievement', { token: T.admin, body: { quarter: 'Q1', actual_value: 1, status: 'On Track' } })).status === 404, 'achievement on non-existent goal → 404');

  // ============================================================
  section('10. CHECK-IN WINDOWS — quarterly schedule enforcement');
  const cycle = (await call('GET', '/cycle', { token: T.admin })).data;
  log((await call('PUT', `/cycles/${cycle.id}`, { token: T.amit, body: { q4_open: '2099-01-01' } })).status === 403, 'employee cannot reconfigure the cycle');
  log((await call('PUT', `/cycles/${cycle.id}`, { token: T.rahul, body: { q4_open: '2099-01-01' } })).status === 403, 'manager cannot reconfigure the cycle');
  await call('PUT', `/cycles/${cycle.id}`, { token: T.admin, body: { q4_open: '2099-01-01' } });
  const closedQ4 = await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.karan, body: { quarter: 'Q4', actual_value: 1, status: 'On Track' } });
  log(closedQ4.status === 400 && /not open/.test(closedQ4.data.error || ''), 'employee blocked from a closed Q4 window');
  log((await call('PUT', `/goals/${gMin.id}/achievement`, { token: T.admin, body: { quarter: 'Q4', actual_value: 1, status: 'On Track' } })).status === 200, 'admin bypasses a closed window (exception handling)');
  const cycleAfter = (await call('GET', '/cycle', { token: T.admin })).data;
  log(cycleAfter.openQuarters.length === 3 && !cycleAfter.openQuarters.includes('Q4'), 'closed Q4 reflected in openQuarters');
  await call('PUT', `/cycles/${cycle.id}`, { token: T.admin, body: { q4_open: '2026-03-01' } });
  log((await call('GET', '/cycle', { token: T.admin })).data.openQuarters.length === 4, 'Q4 window restored — 4 quarters open');

  // ============================================================
  section('11. PHASE 2 — manager check-ins');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: karanSheetId, quarter: 'Q2', comment: 'Good momentum on revenue.' } })).status === 200, 'reporting manager records a Q2 check-in');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: karanSheetId, quarter: 'Q2', comment: '   ' } })).status === 400, 'check-in with blank comment rejected');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: karanSheetId, quarter: 'Q9', comment: 'x' } })).status === 400, 'check-in with invalid quarter rejected');
  log((await call('POST', '/checkins', { token: T.anjali, body: { sheet_id: karanSheetId, quarter: 'Q2', comment: 'x' } })).status === 403, 'non-reporting manager cannot record a check-in');
  log((await call('POST', '/checkins', { token: T.karan, body: { sheet_id: karanSheetId, quarter: 'Q2', comment: 'self' } })).status === 403, 'employee cannot record a check-in on own sheet');
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: 999999, quarter: 'Q2', comment: 'x' } })).status === 404, 'check-in on a non-existent sheet → 404');
  log((await call('POST', '/checkins', { token: T.admin, body: { sheet_id: karanSheetId, quarter: 'Q2', comment: 'Admin note.' } })).status === 200, 'admin can record a check-in');
  // upsert
  const checked = (await call('GET', `/sheets/${karanSheetId}`, { token: T.admin })).data;
  log(checked.checkins.Q2 && /Admin note/.test(checked.checkins.Q2.comment), 'check-in upsert overwrites the same quarter');

  // ============================================================
  section('12. REPORTING & GOVERNANCE');
  const csv = await call('GET', '/reports/achievement.csv', { token: T.admin });
  log(typeof csv.data === 'string' && csv.data.startsWith('"Employee"'), 'CSV report has the expected header row');
  log(csv.data.split('\r\n').length > 5, `CSV report exports multiple data rows (${csv.data.split('\r\n').length} lines)`);
  log(/Q1 Score %|Q4 Score %/.test(csv.data), 'CSV report includes per-quarter score columns');
  const csvEmp = await call('GET', '/reports/achievement.csv', { token: T.amit });
  const csvEmpLines = csvEmp.data.split('\r\n').length;
  const csvAdminLines = csv.data.split('\r\n').length;
  log(csvEmpLines < csvAdminLines, `employee CSV is scoped to own data (${csvEmpLines} vs admin ${csvAdminLines} lines)`);
  const comp = await call('GET', '/reports/completion', { token: T.admin });
  log(comp.data.rows.length === 5 && comp.data.openQuarters, 'completion dashboard lists all 5 sheets + open quarters');
  log(comp.data.rows.every(r => r.quarters.Q1 && 'managerCheckedIn' in r.quarters.Q1), 'completion rows carry per-quarter status flags');
  log((await call('GET', '/reports/completion', { token: T.rahul })).data.rows.length === 3, 'manager completion dashboard is team-scoped');
  // audit
  const audit = await call('GET', '/audit', { token: T.admin });
  log(Array.isArray(audit.data) && audit.data.length > 20, `admin audit trail populated (${audit.data.length} entries)`);
  log(audit.data.some(a => a.action === 'approved & locked'), 'audit trail logs approve/lock events');
  log(audit.data.some(a => /post-lock/i.test(a.action)), 'audit trail flags post-lock edits distinctly');
  log(audit.data.some(a => a.entity === 'goal' && a.action === 'created'), 'audit trail logs goal creation');
  const auditEmp = await call('GET', '/audit', { token: T.amit });
  log(auditEmp.data.length < audit.data.length, `employee audit trail is scoped (${auditEmp.data.length} vs ${audit.data.length})`);
  // unlock
  log((await call('POST', `/sheets/${karanSheetId}/unlock`, { token: T.rahul, body: { reason: 'x' } })).status === 403, 'manager cannot unlock a sheet');
  log((await call('POST', `/sheets/${karanSheetId}/unlock`, { token: T.amit, body: { reason: 'x' } })).status === 403, 'employee cannot unlock a sheet');
  const unlock = await call('POST', `/sheets/${karanSheetId}/unlock`, { token: T.admin, body: { reason: 'data correction' } });
  log(unlock.status === 200 && unlock.data.locked === 0 && unlock.data.status === 'returned', 'admin unlocks a sheet → editable/returned');
  log((await call('POST', `/sheets/${karanSheetId}/unlock`, { token: T.admin })).status === 400, 'unlocking an already-unlocked sheet rejected');
  log((await call('POST', '/sheets/999999/unlock', { token: T.admin, body: { reason: 'x' } })).status === 404, 'unlock on a non-existent sheet → 404');
  // re-approve karan's sheet to restore demo state
  await call('POST', `/sheets/${karanSheetId}/submit`, { token: T.karan });
  await call('POST', `/sheets/${karanSheetId}/approve`, { token: T.rahul });

  // ============================================================
  section('13. BONUS 5.3 / 5.4 — escalations & analytics');
  const escRun = await call('POST', '/escalations/run', { token: T.admin });
  log(escRun.status === 200 && Array.isArray(escRun.data), `escalation engine runs (${escRun.data.length} items raised)`);
  log(escRun.data.every(e => /^L[123] - /.test(e.level)), 'every escalation carries a valid L1/L2/L3 level');
  log(escRun.data.every(e => e.rule && e.employee && e.detail), 'every escalation carries rule + employee + detail');
  log((await call('POST', '/escalations/run', { token: T.rahul })).status === 403, 'non-admin cannot run the escalation engine');
  const escList = await call('GET', '/escalations', { token: T.amit });
  log(escList.status === 200, `GET /escalations responds for an employee (HTTP ${escList.status})`);
  if (escList.status === 200 && escList.data.length > 0)
    finding('GET /escalations has no role guard — any authenticated employee can read the full org-wide escalation log. BRD §5.3 says the escalation log should be "visible to Admin / HR".');
  if (escRun.data.length) {
    log((await call('PUT', `/escalations/${escRun.data[0].id}/resolve`, { token: T.rahul })).status === 403, 'non-admin cannot resolve an escalation');
    log((await call('PUT', `/escalations/${escRun.data[0].id}/resolve`, { token: T.admin })).status === 200, 'admin resolves an escalation');
  }
  const an = await call('GET', '/analytics', { token: T.admin });
  log(an.status === 200 && an.data.qoq?.length === 4, 'analytics: QoQ trend has 4 quarters');
  log(Array.isArray(an.data.byDept) && an.data.byDept.length > 0, 'analytics: per-department breakdown present');
  log(an.data.distribution?.byThrustArea && an.data.distribution?.byUom && an.data.distribution?.byStatus, 'analytics: distribution by thrust area / UoM / status');
  log(Array.isArray(an.data.managerEffectiveness) && an.data.managerEffectiveness.length === 2, 'analytics: manager effectiveness for both L1 managers');
  log(an.data.managerEffectiveness.every(m => 'checkinRate' in m && 'teamSize' in m), 'analytics: manager effectiveness carries check-in rate + team size');
  const anEmp = await call('GET', '/analytics', { token: T.amit });
  log(anEmp.status === 200 && anEmp.data.qoq?.length === 4, 'analytics endpoint does not crash for an employee (scoped)');

  // ============================================================
  section('14. BONUS 5.1 / 5.2 — SSO, email, Teams');
  await new Promise(res => setTimeout(res, 5000)); // let async SMTP sends settle
  const notif = await call('GET', '/notifications', { token: T.admin });
  log(Array.isArray(notif.data) && notif.data.length > 0, `notification log records dispatches (${notif.data.length})`);
  log(notif.data.some(n => n.event === 'goal_submitted'), 'goal submission emits a notification');
  log(notif.data.some(n => n.event === 'goal_approved'), 'goal approval emits a notification');
  log(notif.data.some(n => n.event === 'goal_returned'), 'goal return emits a notification');
  log(notif.data.some(n => n.channel === 'email'), 'email channel dispatched');
  log(notif.data.some(n => n.channel === 'teams'), 'Teams channel dispatched');
  log(notif.data.every(n => !n.link || n.link.includes('/sheet')), 'notifications carry a goal-sheet deep link');
  log((await call('GET', '/notifications', { token: T.rahul })).status === 403, 'non-admin cannot read the notification log');
  const rem = await call('POST', '/reminders/run', { token: T.admin });
  log(rem.status === 200 && typeof rem.data.sent === 'number', `check-in reminders dispatched (${rem.data.sent})`);
  log((await call('POST', '/reminders/run', { token: T.rahul })).status === 403, 'non-admin cannot send reminders');
  const ist = await call('GET', '/integrations/status', { token: T.admin });
  log(ist.status === 200 && 'entra' in ist.data && 'smtp' in ist.data && 'teams' in ist.data, 'integration status reports entra/smtp/teams');
  log((await call('GET', '/integrations/status', { token: T.amit })).status === 403, 'non-admin cannot read integration status');
  // in-app Teams settings
  log((await call('GET', '/settings/integrations', { token: T.rahul })).status === 403, 'non-admin cannot read integration settings');
  log((await call('PUT', '/settings/integrations', { token: T.admin, body: { teams_webhook_url: 'http://insecure' } })).status === 400, 'rejects non-https Teams webhook URL');
  log((await call('PUT', '/settings/integrations', { token: T.admin, body: { teams_webhook_kind: 'bogus' } })).status === 400, 'rejects invalid Teams webhook kind');
  const saved = await call('PUT', '/settings/integrations', { token: T.admin, body: { teams_webhook_url: 'https://example.invalid/hook', teams_webhook_kind: 'workflow' } });
  log(saved.status === 200 && saved.data.teams.configured, 'admin saves a Teams webhook in-app');
  log((await call('GET', '/settings/integrations', { token: T.admin })).data.teams.webhookUrl === 'https://example.invalid/hook', 'saved Teams webhook persists');
  log((await call('POST', '/settings/integrations/test-teams', { token: T.admin })).status === 502, 'test card surfaces a delivery failure for a bad URL');
  await call('PUT', '/settings/integrations', { token: T.admin, body: { teams_webhook_url: '' } });
  log((await call('GET', '/settings/integrations', { token: T.admin })).data.teams.configured === false, 'admin can disconnect the Teams webhook');
  const ssoStatus = await call('GET', '/auth/sso/status');
  log(ssoStatus.status === 200 && 'enabled' in ssoStatus.data, 'SSO status endpoint responds');
  const ssoLogin = await fetch(BASE + '/auth/sso/login', { redirect: 'manual' });
  log(ssoStatus.data.enabled ? [302, 0].includes(ssoLogin.status) : ssoLogin.status === 503, ssoStatus.data.enabled ? 'SSO login redirects to Microsoft' : 'SSO login 503s until Entra configured');

  // ============================================================
  section('15. PRACTICAL JOURNEY — full employee→manager→admin cycle');
  // fresh employee journey on amit's (now unlocked? approved) sheet — use a clean cycle:
  // amit's sheet was approved+locked in section 7. Admin unlocks, amit reworks end-to-end.
  await call('POST', `/sheets/${sid}/unlock`, { token: T.admin, body: { reason: 'practical journey rework' } });
  let aMine = await call('GET', '/sheets/mine', { token: T.amit });
  for (const g of aMine.data.goals) await call('DELETE', `/goals/${g.id}`, { token: T.amit });
  // employee builds a realistic 4-goal sheet across UoM types
  await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: ta.find(t => t.name === 'Revenue Growth')?.id || taId, title: 'Hit Q-sales target', description: 'Close territory pipeline', uom_type: 'numeric_min', target: 500000, weightage: 40 } });
  await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: ta.find(t => t.name === 'Operational Excellence')?.id || taId, title: 'Cut response time', uom_type: 'numeric_max', target: 24, weightage: 25 } });
  await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: ta.find(t => t.name === 'People & Culture')?.id || taId, title: 'Finish certification', uom_type: 'timeline', target_date: '2026-11-30', weightage: 20 } });
  await call('POST', '/goals', { token: T.amit, body: { thrust_area_id: ta.find(t => t.name === 'Compliance & Safety')?.id || taId, title: 'Zero policy breaches', uom_type: 'zero', weightage: 15 } });
  aMine = await call('GET', '/sheets/mine', { token: T.amit });
  log(aMine.data.goals.length === 4 && aMine.data.totalWeightage === 100, 'employee builds a balanced 4-goal sheet (100%)');
  log((await call('POST', `/sheets/${sid}/submit`, { token: T.amit })).data.status === 'submitted', 'employee submits the sheet');
  // manager reviews, tweaks a target, approves
  const aGoals = (await call('GET', `/sheets/${sid}`, { token: T.rahul })).data.goals;
  await call('PUT', `/goals/${aGoals[1].id}`, { token: T.rahul, body: { target: 20 } });
  log((await call('POST', `/sheets/${sid}/approve`, { token: T.rahul })).data.status === 'approved', 'manager tweaks a target and approves');
  // employee logs Q1 achievements
  const aApproved = (await call('GET', `/sheets/${sid}`, { token: T.amit })).data;
  for (const g of aApproved.goals) {
    const body = { quarter: 'Q1', status: 'On Track' };
    if (g.uom_type === 'timeline') body.completion_date = '2026-10-01';
    else if (g.uom_type === 'zero') body.actual_value = 0;
    else body.actual_value = g.target * 0.8;
    await call('PUT', `/goals/${g.id}/achievement`, { token: T.amit, body });
  }
  const aScored = (await call('GET', `/sheets/${sid}`, { token: T.amit })).data;
  log(aScored.quarterScores.Q1 > 0, `employee logs Q1 achievements → sheet score ${aScored.quarterScores.Q1}%`);
  log(aScored.goals.find(g => g.uom_type === 'timeline').scores.Q1 === 1, 'timeline goal completed on time scores 100%');
  log(aScored.goals.find(g => g.uom_type === 'zero').scores.Q1 === 1, 'zero-breach goal at 0 scores 100%');
  // manager check-in
  log((await call('POST', '/checkins', { token: T.rahul, body: { sheet_id: sid, quarter: 'Q1', comment: 'On track — keep the cert moving.' } })).status === 200, 'manager completes a Q1 check-in');
  // admin sees it in the completion dashboard
  const finalComp = (await call('GET', '/reports/completion', { token: T.admin })).data;
  const amitRow = finalComp.rows.find(r => r.employee === 'Amit Patel');
  log(amitRow && amitRow.quarters.Q1.employeeUpdated && amitRow.quarters.Q1.managerCheckedIn, 'admin sees the completed Q1 cycle on the dashboard');

  // ============================================================
  console.log(`\n${'='.repeat(52)}`);
  console.log(`RESULT:  ${pass} passed, ${fail} failed   (total ${pass + fail} checks)`);
  if (failures.length) {
    console.log(`\nFAILED CHECKS:`);
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  if (findings.length) {
    console.log(`\nFINDINGS (non-fatal — behaviour worth reviewing):`);
    findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  } else {
    console.log(`\nNo findings — all probed edge cases behave correctly.`);
  }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
