import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Badge, Banner, Spinner, EmptyState, Ring,
  Icon, SegmentedControl, sheetStatusBadge, accentFor,
} from '../ui.jsx';
import GoalFormModal from '../components/GoalFormModal.jsx';
import AchievementModal from '../components/AchievementModal.jsx';
import GoalCard from '../components/GoalCard.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function MyGoals() {
  const [sheet, setSheet] = useState(null);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editGoal, setEditGoal] = useState(null);
  const [trackGoal, setTrackGoal] = useState(null);
  const [quarter, setQuarter] = useState('Q1');
  const [msg, setMsg] = useState('');

  async function load() {
    const [s, ta, c] = await Promise.all([
      api.get('/sheets/mine'), api.get('/thrust-areas'), api.get('/cycle'),
    ]);
    setSheet(s); setThrustAreas(ta); setCycle(c);
    if (c.openQuarters?.length) setQuarter(c.openQuarters[c.openQuarters.length - 1]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;

  const editable = ['draft', 'returned'].includes(sheet.status) && !sheet.locked;
  const approved = sheet.status === 'approved';
  const [badgeColor, badgeText] = sheetStatusBadge[sheet.status];
  const total = sheet.totalWeightage;
  const goals = sheet.goals;

  const issues = [];
  if (goals.length === 0) issues.push('Add at least one goal.');
  if (goals.length > 8) issues.push('Maximum 8 goals allowed.');
  if (goals.length && Math.round(total * 100) / 100 !== 100)
    issues.push(`Total weightage must equal 100% (currently ${total}%).`);
  if (goals.some((g) => g.weightage < 10)) issues.push('Each goal needs at least 10% weightage.');
  const totalOK = total === 100;

  async function saveGoal(data) {
    if (editGoal?.id) await api.put(`/goals/${editGoal.id}`, data);
    else await api.post('/goals', data);
    await load();
  }
  async function removeGoal(g) {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    await api.del(`/goals/${g.id}`);
    await load();
  }
  async function submit() {
    setMsg('');
    try { await api.post(`/sheets/${sheet.id}/submit`); await load(); setMsg('Goal sheet submitted for approval.'); }
    catch (e) { setMsg(e.message); }
  }
  async function saveAchievement(data) {
    await api.put(`/goals/${trackGoal.id}/achievement`, data);
    await load();
  }

  const quarterOptions = QUARTERS.map((q) => ({
    value: q, label: q,
    disabled: !cycle.openQuarters?.includes(q),
  }));

  return (
    <div>
      <PageHeader
        title="My Goal Sheet"
        subtitle={`${sheet.cycle_name} · ${sheet.fy}`}
        actions={editable && (
          <Button variant="primary" onClick={() => setEditGoal({})} disabled={goals.length >= 8}>
            <Icon name="plus" className="w-3.5 h-3.5" />
            Add Goal
          </Button>
        )}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge color={badgeColor} dot>{badgeText}</Badge>
        {!!sheet.locked && <Badge color="rose" dot>Locked</Badge>}
        <span className="text-[12px] text-slate-500 num">{goals.length} / 8 goals · {total}% weighted</span>
      </div>

      {sheet.status === 'returned' && sheet.return_comment && (
        <div className="mb-3"><Banner tone="warn">
          <strong>Returned for rework:</strong> {sheet.return_comment}
        </Banner></div>
      )}
      {sheet.status === 'submitted' && (
        <div className="mb-3"><Banner tone="info">
          Submitted — awaiting manager approval. Goals are read-only until reviewed.
        </Banner></div>
      )}
      {approved && (
        <div className="mb-3"><Banner tone="success">
          Goals approved &amp; locked. Log your quarterly achievement below.
        </Banner></div>
      )}
      {msg && <div className="mb-3"><Banner tone={msg.includes('submitted') ? 'success' : 'error'}>{msg}</Banner></div>}

      {/* Weightage rail — editable view */}
      {editable && goals.length > 0 && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900">Weightage distribution</span>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${totalOK ? 'text-emerald-600' : 'text-rose-600'} num`}>
                {totalOK ? '· sums to 100%' : `· ${total}% / 100%`}
              </span>
            </div>
            {!totalOK && <span className="text-[11px] text-rose-600 font-medium">Adjust to 100% before submitting</span>}
          </div>
          {/* coloured segments */}
          <div className="h-2 rounded-full bg-paper-100 overflow-hidden flex">
            {goals.map((g) => (
              <div key={g.id} title={`${g.thrust_area} · ${g.weightage}%`}
                className={`${accentFor(g.thrust_area)} h-full`}
                style={{ width: `${(g.weightage / 100) * 100}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
            {goals.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className={`w-2 h-2 rounded-sm ${accentFor(g.thrust_area)}`} />
                <span className="font-medium">{g.thrust_area}</span>
                <span className="text-slate-400 num" style={{ fontFamily: 'var(--font-mono)' }}>{g.weightage}%</span>
              </span>
            ))}
          </div>
          {issues.length > 0 && (
            <ul className="mt-3 pt-3 border-t border-paper-200 text-[12px] text-rose-600 list-disc pl-4 space-y-0.5">
              {issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}
        </Card>
      )}

      {/* Quarter progress — approved view */}
      {approved && (
        <Card className="p-4 mb-4 flex items-center gap-4 flex-wrap">
          <Ring value={sheet.quarterScores[quarter]} size={60} stroke={6} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">{quarter} weighted progress</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">Weighted score across all goals on this sheet</div>
          </div>
          <SegmentedControl options={quarterOptions} value={quarter} onChange={setQuarter} />
        </Card>
      )}

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          hint={editable ? 'Add your first goal to start building your goal sheet.' : 'This sheet has no goals.'}
          action={editable && (
            <Button variant="primary" onClick={() => setEditGoal({})}>
              <Icon name="plus" className="w-3.5 h-3.5" />
              Add Goal
            </Button>
          )}
        />
      ) : (
        <div className="space-y-2.5">
          {goals.map((g) => {
            const ach = g.achievements?.[quarter];
            const footer = editable ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditGoal(g)}>Edit</Button>
                {!g.is_shared_copy && <Button size="sm" variant="ghost" onClick={() => removeGoal(g)}>Delete</Button>}
              </>
            ) : approved ? (
              g.is_shared_copy ? (
                <span className="text-[11px] text-slate-400 self-center">Synced from owner</span>
              ) : (
                <Button size="sm" variant="primary" disabled={!cycle.openQuarters?.includes(quarter)}
                  onClick={() => setTrackGoal(g)}>
                  {ach ? 'Update' : 'Log'} {quarter}
                </Button>
              )
            ) : null;
            return (
              <GoalCard key={g.id} goal={g} showTracking={approved} quarter={quarter} footer={footer} />
            );
          })}
        </div>
      )}

      {editable && goals.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Button variant="primary" disabled={issues.length > 0} onClick={submit}>
            Submit for Approval
            <Icon name="arrow" className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {editGoal && (
        <GoalFormModal
          open onClose={() => setEditGoal(null)} onSave={saveGoal}
          thrustAreas={thrustAreas}
          initial={editGoal.id ? editGoal : null}
          lockedFields={editGoal.is_shared_copy
            ? ['thrust_area_id', 'title', 'description', 'uom_type', 'target', 'target_date'] : []}
        />
      )}
      {trackGoal && (
        <AchievementModal
          open onClose={() => setTrackGoal(null)} onSave={saveAchievement}
          goal={trackGoal} quarter={quarter}
        />
      )}
    </div>
  );
}
