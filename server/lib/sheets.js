import db from '../db.js';
import { goalScore, sheetScore } from './scoring.js';

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// Full sheet payload: sheet meta + employee + goals (with thrust area, achievements, scores).
export function getSheetDetail(sheetId) {
  const sheet = db.prepare(`
    SELECT gs.*, u.name AS employee_name, u.email AS employee_email,
           u.department, u.title AS employee_title, u.manager_id,
           c.name AS cycle_name, c.fy
    FROM goal_sheets gs
    JOIN users u ON u.id = gs.employee_id
    JOIN cycles c ON c.id = gs.cycle_id
    WHERE gs.id = ?`).get(sheetId);
  if (!sheet) return null;

  const goals = db.prepare(`
    SELECT g.*, t.name AS thrust_area
    FROM goals g JOIN thrust_areas t ON t.id = g.thrust_area_id
    WHERE g.sheet_id = ? ORDER BY g.id`).all(sheetId);

  const achByGoalQuarter = {};
  for (const g of goals) {
    const achs = db.prepare('SELECT * FROM achievements WHERE goal_id=?').all(g.id);
    g.achievements = {};
    for (const a of achs) {
      g.achievements[a.quarter] = a;
      achByGoalQuarter[`${g.id}|${a.quarter}`] = a;
    }
    g.scores = {};
    for (const q of QUARTERS) g.scores[q] = goalScore(g, g.achievements[q]);
    g.is_shared_copy = g.shared_origin_id != null;
  }

  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0);
  const quarterScores = {};
  for (const q of QUARTERS) quarterScores[q] = sheetScore(goals, achByGoalQuarter, q);

  const checkins = {};
  for (const c of db.prepare('SELECT * FROM checkins WHERE sheet_id=?').all(sheetId))
    checkins[c.quarter] = c;

  return { ...sheet, goals, totalWeightage, quarterScores, checkins };
}

export function getActiveCycle() {
  return db.prepare("SELECT * FROM cycles WHERE status='active' ORDER BY id DESC LIMIT 1").get();
}

// Which quarters are open for achievement capture, given today's date.
export function openQuarters(cycle, today = new Date()) {
  const open = [];
  const map = { Q1: cycle.q1_open, Q2: cycle.q2_open, Q3: cycle.q3_open, Q4: cycle.q4_open };
  for (const q of QUARTERS) if (map[q] && new Date(map[q]) <= today) open.push(q);
  return open;
}
