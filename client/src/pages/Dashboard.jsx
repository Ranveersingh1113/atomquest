import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { maybeAutoStartTour } from '../tour.js';
import {
  Card, Stat, Badge, Banner, Spinner, Button, Ring, Icon, ProgressBar,
  sheetStatusBadge,
} from '../ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sheets, setSheets] = useState(null);
  const [cycle, setCycle] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/sheets'), api.get('/cycle')]).then(([s, c]) => { setSheets(s); setCycle(c); });
  }, []);
  useEffect(() => {
    if (sheets && cycle) maybeAutoStartTour(user, nav);
  }, [sheets, cycle]);
  if (!sheets || !cycle) return <Spinner />;

  const latestQ = cycle.openQuarters?.[cycle.openQuarters.length - 1] || 'Q1';

  return (
    <div className="space-y-5">
      {user.role === 'employee' && <EmployeeView sheet={sheets[0]} latestQ={latestQ} cycle={cycle} user={user} nav={nav} />}
      {user.role === 'manager' && <ManagerView sheets={sheets} latestQ={latestQ} cycle={cycle} user={user} nav={nav} />}
      {user.role === 'admin' && <AdminView sheets={sheets} cycle={cycle} latestQ={latestQ} user={user} nav={nav} />}
    </div>
  );
}

function Hero({ user, cycle, children }) {
  return (
    <div data-tour="hero" className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-6 text-white aq-fade">
      <div className="absolute -right-16 -top-28 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl aq-glow" />
      <div className="absolute right-28 -bottom-20 w-48 h-48 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-400">
            {cycle.name} · {cycle.fy}
          </div>
          <h1 className="text-2xl font-extrabold mt-1.5">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-slate-400 mt-1">Here&#39;s an overview of your performance this cycle.</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function HeroRing({ value, caption }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-3">
      <div className="relative grid place-items-center w-[84px] h-[84px]">
        <svg width="84" height="84" className="-rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="42" cy="42" r={r} fill="none" stroke="#f5a623" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
        </svg>
        <span className="absolute text-xl font-extrabold">{Math.round(pct)}%</span>
      </div>
      <div className="text-sm font-medium text-slate-300 max-w-[110px]">{caption}</div>
    </div>
  );
}

/* ---------- Employee ---------- */
function EmployeeView({ sheet, latestQ, cycle, user, nav }) {
  if (!sheet) return <Banner tone="info">No goal sheet found for the active cycle.</Banner>;
  const [color, text] = sheetStatusBadge[sheet.status];
  const score = sheet.quarterScores[latestQ] || 0;
  return (
    <>
      <Hero user={user} cycle={cycle}>
        <HeroRing value={score} caption={`${latestQ} weighted progress`} />
      </Hero>

      <div data-tour="stats" className="grid sm:grid-cols-3 gap-3">
        <Stat label="Goal Sheet" value={text} icon="doc"
          tone={sheet.status === 'approved' ? 'emerald' : sheet.status === 'returned' ? 'amber' : 'brand'} />
        <Stat label="Goals Defined" value={`${sheet.goals.length} / 8`}
          sub={`${sheet.totalWeightage}% weighted`} icon="target" tone="sky" />
        <Stat label={`${latestQ} Progress`} value={`${score}%`} icon="trend" tone="emerald" />
      </div>

      {sheet.status === 'returned' && (
        <Banner tone="warn"><strong>Action needed:</strong> {sheet.return_comment}</Banner>
      )}
      {sheet.status === 'draft' && (
        <Banner tone="info">Your goal sheet is in draft — define your goals and submit for approval.</Banner>
      )}
      {sheet.status === 'submitted' && <Banner tone="info">Submitted — awaiting manager approval.</Banner>}
      {sheet.status === 'approved' && (
        <Banner tone="success">Goals approved &amp; locked. Keep your quarterly achievement up to date.</Banner>
      )}

      <div data-tour="primary-action">
        <ActionCard icon="target" title="Manage your goal sheet"
          text="Create goals, track quarterly achievement, and view your scores."
          cta="Open My Goal Sheet" onClick={() => nav('/my-goals')} />
      </div>
    </>
  );
}

/* ---------- Manager ---------- */
function ManagerView({ sheets, latestQ, cycle, user, nav }) {
  const pending = sheets.filter((s) => s.status === 'submitted');
  const approved = sheets.filter((s) => s.status === 'approved');
  const avg = approved.length
    ? Math.round(approved.reduce((a, s) => a + s.quarterScores[latestQ], 0) / approved.length * 10) / 10
    : 0;
  return (
    <>
      <Hero user={user} cycle={cycle}>
        <HeroRing value={avg} caption={`Team avg ${latestQ} progress`} />
      </Hero>

      <div data-tour="stats" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Team Members" value={sheets.length} icon="users" tone="sky" />
        <Stat label="Pending Review" value={pending.length} icon="clock"
          tone={pending.length ? 'amber' : 'slate'} />
        <Stat label="Approved" value={approved.length} icon="check" tone="emerald" />
        <Stat label={`Avg ${latestQ} Progress`} value={`${avg}%`} icon="trend" tone="brand" />
      </div>

      {pending.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="clock" className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-slate-900">Awaiting your approval</span>
          </div>
          <div className="space-y-2">
            {pending.map((s) => (
              <button key={s.id} onClick={() => nav(`/sheet/${s.id}`)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50 hover:border-slate-300 transition-colors text-left">
                <Avatar name={s.employee_name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">{s.employee_name}</div>
                  <div className="text-xs text-slate-400">{s.goals.length} goals · {s.totalWeightage}% weighted</div>
                </div>
                <Icon name="arrow" className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <div data-tour="primary-action">
        <ActionCard icon="users" title="Your team"
          text="Approvals, quarterly check-ins, and progress for your direct reports."
          cta="Open My Team" onClick={() => nav('/team')} />
      </div>
    </>
  );
}

/* ---------- Admin ---------- */
function AdminView({ sheets, cycle, latestQ, user, nav }) {
  const byStatus = (st) => sheets.filter((s) => s.status === st).length;
  const approved = sheets.filter((s) => s.status === 'approved');
  const completion = sheets.length ? Math.round(approved.length / sheets.length * 100) : 0;
  return (
    <>
      <Hero user={user} cycle={cycle}>
        <HeroRing value={completion} caption="Goal-setting completion" />
      </Hero>

      <div data-tour="stats" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Goal Sheets" value={sheets.length} icon="layers" tone="sky" />
        <Stat label="Pending Approval" value={byStatus('submitted')} icon="clock"
          tone={byStatus('submitted') ? 'amber' : 'slate'} />
        <Stat label="Approved & Locked" value={approved.length} icon="lock" tone="emerald" />
        <Stat label="Draft / Returned" value={byStatus('draft') + byStatus('returned')} icon="doc" tone="brand" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-900">Goal-setting completion</span>
          <span className="text-sm font-extrabold text-brand-700">{completion}%</span>
        </div>
        <ProgressBar value={completion} />
        <div className="text-xs text-slate-400 mt-2">
          {approved.length} of {sheets.length} sheets approved · Open quarters: {cycle.openQuarters?.join(', ') || 'none'}
        </div>
      </Card>

      <div data-tour="primary-action" className="grid sm:grid-cols-3 gap-3">
        <ActionCard compact icon="calendar" title="Cycle" text="Configure windows."
          cta="Manage Cycle" onClick={() => nav('/cycle')} />
        <ActionCard compact icon="doc" title="Reports" text="Export & completion."
          cta="Open Reports" onClick={() => nav('/reports')} />
        <ActionCard compact icon="alert" title="Escalations" text="Run rule checks."
          cta="Open Escalations" onClick={() => nav('/escalations')} />
      </div>
    </>
  );
}

/* ---------- shared bits ---------- */
function Avatar({ name }) {
  return (
    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold text-xs shrink-0">
      {name.split(' ').map((n) => n[0]).join('')}
    </div>
  );
}

function ActionCard({ icon, title, text, cta, onClick, compact }) {
  return (
    <Card className="p-5" hover>
      <div className={compact ? '' : 'flex items-center justify-between gap-4 flex-wrap'}>
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 text-brand-600 shrink-0">
            <Icon name={icon} className="w-5 h-5" />
          </span>
          <div>
            <div className="font-bold text-slate-900">{title}</div>
            <div className="text-sm text-slate-500">{text}</div>
          </div>
        </div>
        <Button variant={compact ? 'secondary' : 'primary'} className={compact ? 'mt-3 w-full' : ''}
          onClick={onClick}>{cta}</Button>
      </div>
    </Card>
  );
}
