import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Button, Badge, Banner, Spinner, Ring, Icon, SegmentedControl,
  Modal, Field, Textarea, sheetStatusBadge,
} from '../ui.jsx';
import GoalFormModal from '../components/GoalFormModal.jsx';
import GoalCard from '../components/GoalCard.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function SheetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [quarter, setQuarter] = useState('Q1');
  const [editGoal, setEditGoal] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinText, setCheckinText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const s = await api.get(`/sheets/${id}`);
    setSheet(s);
    return s;
  }
  useEffect(() => {
    Promise.all([load(), api.get('/thrust-areas')]).then(([, ta]) => setThrustAreas(ta));
  }, [id]);

  if (!sheet) return <Spinner />;

  const isManager = user.role === 'manager' && sheet.manager_id === user.id;
  const isAdmin = user.role === 'admin';
  const canReview = (isManager || isAdmin) && sheet.status === 'submitted';
  const canCheckin = (isManager || isAdmin) && sheet.status === 'approved';
  const [badgeColor, badgeText] = sheetStatusBadge[sheet.status];

  async function act(fn, okMsg) {
    setBusy(true); setMsg('');
    try { await fn(); await load(); if (okMsg) setMsg(okMsg); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }
  const approve = () => act(() => api.post(`/sheets/${id}/approve`),
    'Goal sheet approved and locked.');
  const doReturn = () => {
    if (!returnComment.trim()) return;
    act(async () => {
      await api.post(`/sheets/${id}/return`, { comment: returnComment });
      setReturnOpen(false); setReturnComment('');
    }, 'Sheet returned for rework.');
  };
  const unlock = () => {
    if (!confirm('Unlock this approved sheet for correction? This is an audited admin action.')) return;
    act(() => api.post(`/sheets/${id}/unlock`, { reason: 'Admin correction' }), 'Sheet unlocked.');
  };
  const saveCheckin = () => {
    if (!checkinText.trim()) return;
    act(async () => {
      await api.post('/checkins', { sheet_id: sheet.id, quarter, comment: checkinText });
      setCheckinOpen(false); setCheckinText('');
    }, `${quarter} check-in recorded.`);
  };
  async function saveGoalEdit(data) {
    await api.put(`/goals/${editGoal.id}`, data);
    await load();
  }

  // Rule checks for the reviewing manager
  const totalOK = Math.round(sheet.totalWeightage) === 100;
  const eachWeightOK = sheet.goals.every((g) => g.weightage >= 10);
  const countOK = sheet.goals.length >= 1 && sheet.goals.length <= 8;
  const rules = [
    [`Weightage = 100%`, totalOK, `${sheet.totalWeightage}% / 100%`],
    [`Each goal ≥ 10% weightage`, eachWeightOK, eachWeightOK ? 'pass' : 'some below 10%'],
    [`≤ 8 goals total`, countOK, `${sheet.goals.length} of 8`],
  ];

  return (
    <div>
      <PageHeader
        title={sheet.employee_name}
        subtitle={`${sheet.department} · ${sheet.employee_title} · ${sheet.cycle_name} ${sheet.fy}`}
        actions={<Button variant="ghost" onClick={() => nav(-1)}>← Back</Button>}
      />

      {/* Sticky action bar */}
      <div className="sticky top-12 z-10 -mx-5 sm:-mx-6 px-5 sm:px-6 mb-4 bg-paper-50/95 backdrop-blur border-y border-paper-200">
        <div className="flex items-center gap-3 py-2.5 flex-wrap">
          <Badge color={badgeColor} dot>{badgeText}</Badge>
          {!!sheet.locked && <Badge color="rose" dot>Locked</Badge>}
          <span className="text-[11.5px] text-slate-500 num">
            {sheet.goals.length} goals · {sheet.totalWeightage}% weighted
          </span>
          <span className="flex-1" />
          {isAdmin && !!sheet.locked && (
            <Button size="sm" variant="secondary" onClick={unlock} disabled={busy}>Unlock Sheet</Button>
          )}
          {canReview && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setReturnOpen(true)} disabled={busy}>
                Return for Rework
              </Button>
              <Button size="sm" variant="primary" onClick={approve}
                disabled={busy || !totalOK}>
                <Icon name="check" className="w-3.5 h-3.5" />
                Approve &amp; Lock
              </Button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="mb-3"><Banner tone={/error|fail|must|required/i.test(msg) ? 'error' : 'success'}>{msg}</Banner></div>}
      {sheet.status === 'returned' && sheet.return_comment && (
        <div className="mb-3"><Banner tone="warn"><strong>Return note:</strong> {sheet.return_comment}</Banner></div>
      )}
      {canReview && (
        <div className="mb-3"><Banner tone="info">
          Review the goals below. You may edit targets &amp; weightages inline, then approve or return for rework.
        </Banner></div>
      )}

      <div className={canReview ? 'grid lg:grid-cols-[1fr_260px] gap-4' : ''}>
        <div className="min-w-0 space-y-3">
          {sheet.status === 'approved' && (
            <Card className="p-4 flex items-center gap-4 flex-wrap">
              <Ring value={sheet.quarterScores[quarter]} size={60} stroke={6} />
              <div className="flex-1 min-w-[160px]">
                <div className="text-[13px] font-semibold text-slate-900">{quarter} weighted progress</div>
                <div className="text-[11.5px] text-slate-400 mt-0.5">Planned vs. actual across the goal sheet</div>
              </div>
              <SegmentedControl options={QUARTERS} value={quarter} onChange={setQuarter} />
              {canCheckin && (
                <Button size="sm" variant="primary" onClick={() => {
                  setCheckinText(sheet.checkins[quarter]?.comment || ''); setCheckinOpen(true);
                }}>
                  {sheet.checkins[quarter] ? 'Edit' : 'Add'} {quarter} Check-in
                </Button>
              )}
            </Card>
          )}

          {sheet.status === 'approved' && sheet.checkins[quarter] && (
            <Banner tone="info">
              <strong>{quarter} Check-in:</strong> {sheet.checkins[quarter].comment}
            </Banner>
          )}

          <div className="space-y-2.5">
            {sheet.goals.map((g) => (
              <GoalCard key={g.id} goal={g}
                showTracking={sheet.status === 'approved'} quarter={quarter}
                footer={canReview && (
                  <Button size="sm" variant="secondary" onClick={() => setEditGoal(g)}>
                    Adjust target / weight
                  </Button>
                )} />
            ))}
          </div>
        </div>

        {/* Rule checks rail */}
        {canReview && (
          <aside className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="check" className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Rule checks</span>
              </div>
              <div className="space-y-2.5">
                {rules.map(([label, ok, hint]) => (
                  <div key={label} className="flex items-start gap-2 text-[12.5px]">
                    <span className={`mt-0.5 w-4 h-4 rounded-full grid place-items-center shrink-0 ${
                      ok ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                         : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'}`}>
                      <Icon name={ok ? 'check' : 'alert'} className="w-2.5 h-2.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-slate-800 font-medium">{label}</div>
                      <div className="text-[11px] text-slate-400 num">{hint}</div>
                    </div>
                  </div>
                ))}
              </div>
              {!totalOK && (
                <div className="mt-3 pt-3 border-t border-paper-200 text-[11.5px] text-amber-700">
                  Adjust a goal's weightage to reach exactly 100% before approving.
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="doc" className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Reviewer notes</span>
              </div>
              <div className="text-[12px] text-slate-500 leading-relaxed">
                Use <strong className="text-slate-700">Return for Rework</strong> with a clear comment if anything needs the
                employee&#39;s attention; otherwise <strong className="text-slate-700">Approve &amp; Lock</strong> when the rules
                above all pass.
              </div>
            </Card>
          </aside>
        )}
      </div>

      {editGoal && (
        <GoalFormModal
          open onClose={() => setEditGoal(null)} onSave={saveGoalEdit}
          thrustAreas={thrustAreas} initial={editGoal}
          lockedFields={['thrust_area_id', 'title', 'description', 'uom_type']}
        />
      )}

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Return for Rework">
        <Field label="Reason / feedback for the employee">
          <Textarea rows={3} value={returnComment} onChange={(e) => setReturnComment(e.target.value)}
            placeholder="Explain what needs to change…" />
        </Field>
        <div className="flex justify-end gap-2 mt-3">
          <Button size="sm" variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={doReturn} disabled={busy || !returnComment.trim()}>
            Return Sheet
          </Button>
        </div>
      </Modal>

      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title={`${quarter} Check-in`}>
        <p className="text-[12.5px] text-slate-500 mb-2">
          Document the planned-vs-actual discussion with {sheet.employee_name}.
        </p>
        <Field label="Check-in comment">
          <Textarea rows={4} value={checkinText} onChange={(e) => setCheckinText(e.target.value)}
            placeholder="Summary of the quarterly review conversation…" />
        </Field>
        <div className="flex justify-end gap-2 mt-3">
          <Button size="sm" variant="secondary" onClick={() => setCheckinOpen(false)}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={saveCheckin} disabled={busy || !checkinText.trim()}>Save Check-in</Button>
        </div>
      </Modal>
    </div>
  );
}
