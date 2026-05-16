// Progress scoring per problem statement section 2.2.
// Returns a 0..1 ratio (capped at 1.5) or null when not measurable yet.
export function goalScore(goal, ach) {
  if (!ach) return null;
  const { uom_type, target } = goal;
  const actual = ach.actual_value;

  if (uom_type === 'zero') {
    if (actual == null) return null;
    return actual === 0 ? 1 : 0;
  }
  if (uom_type === 'timeline') {
    if (!ach.completion_date) return ach.status === 'Completed' ? 1 : null;
    if (!goal.target_date) return 1;
    const done = new Date(ach.completion_date), due = new Date(goal.target_date);
    return done <= due ? 1 : 0.5; // on-time vs late
  }
  // numeric_min / percent: higher is better
  if (uom_type === 'numeric_min' || uom_type === 'percent') {
    if (actual == null || !target) return actual == null ? null : 0;
    return clamp(actual / target);
  }
  // numeric_max: lower is better
  if (uom_type === 'numeric_max') {
    if (actual == null || !actual) return actual == null ? null : 1;
    return clamp(target / actual);
  }
  return null;
}

function clamp(v) { return Math.max(0, Math.min(1.5, v)); }

// Weighted sheet progress for one quarter. Goals with no achievement count as 0.
export function sheetScore(goals, achByGoalQuarter, quarter) {
  if (!goals.length) return 0;
  let total = 0;
  for (const g of goals) {
    const ach = achByGoalQuarter[`${g.id}|${quarter}`];
    const s = goalScore(g, ach);
    total += (s == null ? 0 : s) * (g.weightage / 100);
  }
  return Math.round(total * 1000) / 10; // percentage, 1 decimal
}
