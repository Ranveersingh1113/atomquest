import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Button, Badge, Banner, Spinner, ProgressBar,
  Modal, Field, Textarea, Select, sheetStatusBadge, goalStatusBadge, UOM_LABELS,
} from '../ui.jsx';
import GoalFormModal from '../components/GoalFormModal.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const scorePct = (s) => (s == null ? '—' : `${Math.round(s * 100)}%`);

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

  return (
    <div>
      <PageHeader
        title={sheet.employee_name}
        subtitle={`${sheet.department} · ${sheet.employee_title} · ${sheet.cycle_name} ${sheet.fy}`}
        actions={<Button variant="ghost" onClick={() => nav(-1)}>← Back</Button>}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge color={badgeColor}>{badgeText}</Badge>
        {!!sheet.locked && <Badge color="rose">Locked</Badge>}
        <span className="text-sm text-slate-500">
          {sheet.goals.length} goals · {sheet.totalWeightage}% total weightage
        </span>
        {isAdmin && !!sheet.locked &&
          <Button variant="secondary" onClick={unlock} disabled={busy}>Unlock Sheet</Button>}
      </div>

      {msg && <div className="mb-4"><Banner tone={/error|fail|must|required/i.test(msg) ? 'error' : 'success'}>{msg}</Banner></div>}
      {sheet.status === 'returned' && sheet.return_comment && (
        <div className="mb-4"><Banner tone="warn"><strong>Return note:</strong> {sheet.return_comment}</Banner></div>
      )}
      {canReview && (
        <div className="mb-4"><Banner tone="info">
          Review the goals below. You may edit targets &amp; weightages inline, then approve or return for rework.
        </Banner></div>
      )}

      {sheet.status === 'approved' && (
        <Card className="p-3 mb-4 flex items-center gap-3 flex-wrap">
          <Select value={quarter} onChange={(e) => setQuarter(e.target.value)} >
            {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </Select>
          <span className="text-sm text-slate-600">
            {quarter} weighted progress:{' '}
            <span className="font-bold text-brand-700">{sheet.quarterScores[quarter]}%</span>
          </span>
          {canCheckin && (
            <Button className="ml-auto" onClick={() => {
              setCheckinText(sheet.checkins[quarter]?.comment || ''); setCheckinOpen(true);
            }}>
              {sheet.checkins[quarter] ? 'Edit' : 'Add'} {quarter} Check-in
            </Button>
          )}
        </Card>
      )}

      {sheet.status === 'approved' && sheet.checkins[quarter] && (
        <div className="mb-4"><Banner tone="info">
          <strong>{quarter} Check-in:</strong> {sheet.checkins[quarter].comment}
        </Banner></div>
      )}

      <div className="space-y-3">
        {sheet.goals.map((g) => {
          const ach = g.achievements?.[quarter];
          return (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="indigo">{g.thrust_area}</Badge>
                    {g.is_shared_copy && <Badge color="blue">Shared KPI</Badge>}
                    <span className="text-xs text-slate-400">{UOM_LABELS[g.uom_type]}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-1.5">{g.title}</h3>
                  {g.description && <p className="text-sm text-slate-500 mt-0.5">{g.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-slate-900">{g.weightage}%</div>
                  <div className="text-[11px] text-slate-400 uppercase">weightage</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="text-slate-500">Target:{' '}
                  <span className="font-medium text-slate-800">
                    {g.uom_type === 'timeline' ? (g.target_date || '—') : g.uom_type === 'zero' ? '0' : g.target}
                  </span>
                </span>
                {sheet.status === 'approved' && (
                  <>
                    <span className="text-slate-500">{quarter} Actual:{' '}
                      <span className="font-medium text-slate-800">
                        {ach ? (g.uom_type === 'timeline' ? (ach.completion_date || '—') : (ach.actual_value ?? '—')) : '—'}
                      </span>
                    </span>
                    <span className="text-slate-500">Score:{' '}
                      <span className="font-medium text-brand-700">{scorePct(g.scores[quarter])}</span>
                    </span>
                    {ach && <Badge color={goalStatusBadge[ach.status]}>{ach.status}</Badge>}
                  </>
                )}
                {canReview && (
                  <Button variant="secondary" className="ml-auto" onClick={() => setEditGoal(g)}>
                    Adjust target / weightage
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {canReview && (
        <Card className="p-4 mt-5">
          {Math.round(sheet.totalWeightage) !== 100 && (
            <div className="mb-3"><Banner tone="warn">
              Total weightage is {sheet.totalWeightage}% — adjust to 100% before approving.
            </Banner></div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnOpen(true)} disabled={busy}>
              Return for Rework
            </Button>
            <Button variant="success" onClick={approve}
              disabled={busy || Math.round(sheet.totalWeightage) !== 100}>
              Approve &amp; Lock
            </Button>
          </div>
        </Card>
      )}

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
          <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={doReturn} disabled={busy || !returnComment.trim()}>
            Return Sheet
          </Button>
        </div>
      </Modal>

      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title={`${quarter} Check-in`}>
        <p className="text-sm text-slate-500 mb-2">
          Document the planned-vs-actual discussion with {sheet.employee_name}.
        </p>
        <Field label="Check-in comment">
          <Textarea rows={4} value={checkinText} onChange={(e) => setCheckinText(e.target.value)}
            placeholder="Summary of the quarterly review conversation…" />
        </Field>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" onClick={() => setCheckinOpen(false)}>Cancel</Button>
          <Button onClick={saveCheckin} disabled={busy || !checkinText.trim()}>Save Check-in</Button>
        </div>
      </Modal>
    </div>
  );
}
