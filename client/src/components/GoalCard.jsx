import { Card, Badge, Ring, Icon, accentFor, goalStatusBadge, UOM_LABELS } from '../ui.jsx';

const plannedValue = (g) =>
  g.uom_type === 'timeline' ? (g.target_date || '—') : g.uom_type === 'zero' ? '0' : g.target;

const actualValue = (g, q) => {
  const a = g.achievements?.[q];
  if (!a) return '—';
  return g.uom_type === 'timeline' ? (a.completion_date || '—') : (a.actual_value ?? '—');
};

/**
 * One goal, rendered as a card.
 * - showTracking: render quarter Actual + score ring
 * - quarter: which quarter to show when tracking
 * - footer: node of action buttons
 */
export default function GoalCard({ goal: g, showTracking = false, quarter = 'Q1', footer }) {
  const ach = g.achievements?.[quarter];
  const score = showTracking ? g.scores?.[quarter] : null;
  const scorePct = score == null ? null : Math.round(score * 100);

  return (
    <Card className="p-0 overflow-hidden" hover accent={accentFor(g.thrust_area)}>
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge color="indigo">{g.thrust_area}</Badge>
              {g.is_shared_copy && <Badge color="blue" dot>Shared KPI</Badge>}
            </div>
            <h3 className="font-bold text-slate-900 mt-2 leading-snug">{g.title}</h3>
            {g.description && <p className="text-sm text-slate-500 mt-0.5">{g.description}</p>}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
              <Icon name="bolt" className="w-3.5 h-3.5" />
              {UOM_LABELS[g.uom_type]}
            </div>
          </div>

          {showTracking && scorePct != null ? (
            <Ring value={scorePct} size={66} stroke={7} sublabel="score" />
          ) : (
            <div className="text-right shrink-0">
              <div className="text-2xl font-extrabold text-slate-900">{g.weightage}%</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Weightage</div>
            </div>
          )}
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {showTracking && scorePct != null && (
            <Metric label="Weightage" value={`${g.weightage}%`} />
          )}
          <Metric label="Target" value={plannedValue(g)} />
          {showTracking && (
            <>
              <Metric label={`${quarter} Actual`} value={actualValue(g, quarter)} />
              {ach && <Badge color={goalStatusBadge[ach.status]} dot>{ach.status}</Badge>}
            </>
          )}
          {footer && <div className="ml-auto flex gap-2">{footer}</div>}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-bold text-slate-800">{value}</div>
    </div>
  );
}
