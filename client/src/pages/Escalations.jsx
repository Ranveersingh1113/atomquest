import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Badge, Spinner, EmptyState, Banner, Icon, StatusDot,
} from '../ui.jsx';

const LEVEL_COLOR = { 'L1 - Employee': 'amber', 'L2 - Manager': 'blue', 'L3 - HR': 'rose' };

const RULES = [
  ['Goal submission overdue',   'Employee has not submitted goals within 7 days of the cycle opening.'],
  ['Manager approval pending',  'Manager has not approved a submitted sheet within 7 days.'],
  ['Check-in not completed',    'Quarterly check-in not completed within the active window.'],
];

export default function Escalations() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/escalations').then(setRows); }, []);
  if (!rows) return <Spinner />;

  async function run() {
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/escalations/run');
      setRows(r);
      setMsg(`Escalation rules evaluated — ${r.filter((x) => x.status === 'open').length} open item(s).`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }
  async function resolve(id) {
    await api.put(`/escalations/${id}/resolve`);
    setRows(await api.get('/escalations'));
  }

  const open = rows.filter((r) => r.status === 'open');
  const resolved = rows.filter((r) => r.status === 'resolved');

  return (
    <div>
      <PageHeader title="Escalation Module"
        subtitle="Rule-based escalations: unsubmitted goals, pending approvals, and overdue check-ins"
        actions={
          <Button variant="primary" onClick={run} disabled={busy}>
            <Icon name="alert" className="w-3.5 h-3.5" />
            {busy ? 'Running…' : 'Run Escalation Check'}
          </Button>
        }
      />

      {msg && <div className="mb-4"><Banner tone="info">{msg}</Banner></div>}

      <Card className="p-0 mb-4 overflow-hidden">
        <div className="px-4 h-10 flex items-center justify-between border-b border-paper-200">
          <div className="flex items-center gap-2">
            <Icon name="sliders" className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[12.5px] font-semibold text-slate-900">Active rules</span>
          </div>
          <span className="text-[10.5px] text-slate-400">Employee → Manager → HR</span>
        </div>
        <ul>
          {RULES.map(([name, detail], i) => (
            <li key={name} className={`px-4 py-2.5 flex items-start gap-3 ${i ? 'border-t border-paper-100' : ''}`}>
              <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 grid place-items-center font-bold text-[10px] shrink-0 num"
                style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-800">{name}</div>
                <div className="text-[11.5px] text-slate-500 mt-0.5">{detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {open.length === 0 ? (
        <EmptyState title="No open escalations" hint="Run an escalation check to evaluate the current cycle." />
      ) : (
        <Card className="p-0 overflow-hidden mb-4">
          <div className="px-4 h-10 flex items-center justify-between border-b border-paper-200">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[12.5px] font-semibold text-slate-900">Open escalations</span>
              <span className="text-[11px] text-slate-400 num" style={{ fontFamily: 'var(--font-mono)' }}>{open.length}</span>
            </div>
          </div>
          {open.map((e, i) => (
            <div key={e.id} className={`px-4 py-3 flex items-center gap-3 flex-wrap ${i ? 'border-t border-paper-100' : ''}`}>
              <Badge color={LEVEL_COLOR[e.level] || 'slate'} dot>{e.level}</Badge>
              <div className="min-w-[200px] flex-1">
                <div className="text-[12.5px] font-semibold text-slate-800">{e.rule}</div>
                <div className="text-[11.5px] text-slate-500">{e.detail}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => resolve(e.id)}>
                <Icon name="check" className="w-3.5 h-3.5" />
                Mark resolved
              </Button>
            </div>
          ))}
        </Card>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Resolved</span>
            <span className="text-[11px] text-slate-400 num" style={{ fontFamily: 'var(--font-mono)' }}>{resolved.length}</span>
          </div>
          <Card className="p-0 overflow-hidden opacity-90">
            {resolved.map((e, i) => (
              <div key={e.id} className={`px-4 py-2.5 flex items-center gap-3 ${i ? 'border-t border-paper-100' : ''}`}>
                <StatusDot color="green">Resolved</StatusDot>
                <div className="text-[12.5px] text-slate-600 min-w-0">
                  <span className="font-medium text-slate-700">{e.rule}</span>
                  <span className="text-slate-400"> — {e.detail}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
