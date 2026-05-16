import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Stat, Badge, Banner, Spinner, Button, ProgressBar,
  sheetStatusBadge,
} from '../ui.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sheets, setSheets] = useState(null);
  const [cycle, setCycle] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/sheets'), api.get('/cycle')]).then(([s, c]) => { setSheets(s); setCycle(c); });
  }, []);
  if (!sheets || !cycle) return <Spinner />;

  const latestQ = cycle.openQuarters?.[cycle.openQuarters.length - 1];
  const greeting = `Welcome back, ${user.name.split(' ')[0]}`;

  return (
    <div>
      <PageHeader title={greeting}
        subtitle={`${cycle.name} · ${cycle.fy} · ${cycle.status === 'active' ? 'Active cycle' : 'Closed'}`} />

      {user.role === 'employee' && <EmployeeView sheet={sheets[0]} latestQ={latestQ} nav={nav} />}
      {user.role === 'manager' && <ManagerView sheets={sheets} latestQ={latestQ} nav={nav} userId={user.id} />}
      {user.role === 'admin' && <AdminView sheets={sheets} cycle={cycle} latestQ={latestQ} nav={nav} />}
    </div>
  );
}

function EmployeeView({ sheet, latestQ, nav }) {
  if (!sheet) return <Banner tone="info">No goal sheet found for the active cycle.</Banner>;
  const [color, text] = sheetStatusBadge[sheet.status];
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Goal Sheet" value={text} />
        <Stat label="Goals Defined" value={`${sheet.goals.length} / 8`} sub={`${sheet.totalWeightage}% weighted`} />
        <Stat label={`${latestQ || 'Q1'} Progress`}
          value={`${sheet.quarterScores[latestQ || 'Q1']}%`}
          color="text-brand-700" />
      </div>
      {sheet.status === 'returned' && (
        <Banner tone="warn"><strong>Action needed:</strong> {sheet.return_comment}</Banner>
      )}
      {sheet.status === 'draft' && (
        <Banner tone="info">Your goal sheet is still in draft — define your goals and submit for approval.</Banner>
      )}
      {sheet.status === 'submitted' && (
        <Banner tone="info">Submitted — awaiting manager approval.</Banner>
      )}
      {sheet.status === 'approved' && (
        <Banner tone="success">Goals approved. Keep your quarterly achievement up to date.</Banner>
      )}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">Manage your goal sheet</div>
            <div className="text-sm text-slate-500">Create goals, track achievement, and view scores.</div>
          </div>
          <Button onClick={() => nav('/my-goals')}>Open My Goal Sheet</Button>
        </div>
      </Card>
    </div>
  );
}

function ManagerView({ sheets, latestQ, nav }) {
  const pending = sheets.filter((s) => s.status === 'submitted');
  const approved = sheets.filter((s) => s.status === 'approved');
  const avg = approved.length && latestQ
    ? Math.round(approved.reduce((a, s) => a + s.quarterScores[latestQ], 0) / approved.length * 10) / 10
    : 0;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Team Members" value={sheets.length} />
        <Stat label="Pending Review" value={pending.length}
          color={pending.length ? 'text-amber-600' : 'text-slate-900'} />
        <Stat label="Approved" value={approved.length} color="text-emerald-600" />
        <Stat label={`Avg ${latestQ || 'Q1'} Progress`} value={`${avg}%`} color="text-brand-700" />
      </div>
      {pending.length > 0 && (
        <Card className="p-4">
          <div className="font-semibold text-slate-900 mb-3">Awaiting your approval</div>
          <div className="space-y-2">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.employee_name}</div>
                  <div className="text-xs text-slate-400">{s.goals.length} goals · {s.totalWeightage}% weighted</div>
                </div>
                <Button variant="secondary" onClick={() => nav(`/sheet/${s.id}`)}>Review</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900">Your team</div>
          <div className="text-sm text-slate-500">Approvals, check-ins, and progress.</div>
        </div>
        <Button onClick={() => nav('/team')}>Open My Team</Button>
      </Card>
    </div>
  );
}

function AdminView({ sheets, cycle, latestQ, nav }) {
  const byStatus = (st) => sheets.filter((s) => s.status === st).length;
  const approved = sheets.filter((s) => s.status === 'approved');
  const completion = sheets.length
    ? Math.round(approved.length / sheets.length * 100) : 0;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Goal Sheets" value={sheets.length} />
        <Stat label="Pending Approval" value={byStatus('submitted')}
          color={byStatus('submitted') ? 'text-amber-600' : 'text-slate-900'} />
        <Stat label="Approved & Locked" value={approved.length} color="text-emerald-600" />
        <Stat label="In Draft / Returned" value={byStatus('draft') + byStatus('returned')} />
      </div>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-slate-700">Goal-setting completion</span>
          <span className="text-sm font-bold text-brand-700">{completion}%</span>
        </div>
        <ProgressBar value={completion} />
      </Card>
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="font-semibold text-slate-900">Cycle windows</div>
          <div className="text-xs text-slate-500 mt-1">
            Open quarters: {cycle.openQuarters?.join(', ') || 'none'}
          </div>
          <Button variant="secondary" className="mt-3" onClick={() => nav('/cycle')}>Manage Cycle</Button>
        </Card>
        <Card className="p-4">
          <div className="font-semibold text-slate-900">Reports</div>
          <div className="text-xs text-slate-500 mt-1">Completion dashboard &amp; CSV export.</div>
          <Button variant="secondary" className="mt-3" onClick={() => nav('/reports')}>Open Reports</Button>
        </Card>
        <Card className="p-4">
          <div className="font-semibold text-slate-900">Escalations</div>
          <div className="text-xs text-slate-500 mt-1">Run rule-based escalation checks.</div>
          <Button variant="secondary" className="mt-3" onClick={() => nav('/escalations')}>Open Escalations</Button>
        </Card>
      </div>
    </div>
  );
}
