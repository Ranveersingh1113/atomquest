import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Button, Badge, Spinner, EmptyState, Banner } from '../ui.jsx';

const LEVEL_COLOR = { 'L1 - Employee': 'amber', 'L2 - Manager': 'blue', 'L3 - HR': 'rose' };

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
        actions={<Button onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run Escalation Check'}</Button>}
      />

      {msg && <div className="mb-4"><Banner tone="info">{msg}</Banner></div>}

      <Card className="p-4 mb-4">
        <div className="text-sm font-semibold text-slate-900 mb-2">Active rules</div>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>Employee has not submitted goals within 7 days of the cycle opening.</li>
          <li>Manager has not approved a submitted sheet within 7 days.</li>
          <li>Quarterly check-in not completed within the active window.</li>
        </ul>
        <p className="text-xs text-slate-400 mt-2">
          Escalation chain: Employee → Manager → HR, based on how overdue the item is.
        </p>
      </Card>

      {open.length === 0 ? (
        <EmptyState title="No open escalations" hint="Run an escalation check to evaluate the current cycle." />
      ) : (
        <div className="space-y-2.5">
          {open.map((e) => (
            <Card key={e.id} className="p-4 flex items-center gap-3">
              <Badge color={LEVEL_COLOR[e.level] || 'slate'}>{e.level}</Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">{e.rule}</div>
                <div className="text-xs text-slate-500">{e.detail}</div>
              </div>
              <Button variant="secondary" onClick={() => resolve(e.id)}>Mark Resolved</Button>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-500 mb-2">Resolved ({resolved.length})</div>
          <div className="space-y-2">
            {resolved.map((e) => (
              <Card key={e.id} className="p-3 flex items-center gap-3 opacity-70">
                <Badge color="green">Resolved</Badge>
                <div className="text-sm text-slate-600">{e.rule} — {e.detail}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
