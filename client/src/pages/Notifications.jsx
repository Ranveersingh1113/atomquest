import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Button, Badge, Spinner, EmptyState, Banner } from '../ui.jsx';

const STATUS_COLOR = { sent: 'green', failed: 'rose', skipped: 'slate' };
const CHANNEL_COLOR = { email: 'blue', teams: 'amber' };

function IntegrationPill({ label, on }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
      <span className={`w-2 h-2 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className={`text-xs font-medium ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
        {on ? 'Connected' : 'Not configured'}
      </span>
    </div>
  );
}

export default function Notifications() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    api.get('/notifications').then(setRows);
    api.get('/integrations/status').then(setStatus).catch(() => {});
  }
  useEffect(load, []);
  if (!rows) return <Spinner />;

  async function sendReminders() {
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/reminders/run');
      setMsg(r.quarter
        ? `${r.quarter} check-in reminders dispatched to ${r.sent} sheet(s).`
        : 'No open check-in window — nothing to remind.');
      load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Notifications"
        subtitle="Email & Microsoft Teams alerts for goal submission, approval, rejection and check-in reminders"
        actions={<Button onClick={sendReminders} disabled={busy}>
          {busy ? 'Sending…' : 'Send Check-in Reminders'}</Button>}
      />

      {msg && <div className="mb-4"><Banner tone="info">{msg}</Banner></div>}

      <Card className="p-4 mb-4">
        <div className="text-sm font-semibold text-slate-900 mb-3">Integration status</div>
        <div className="grid sm:grid-cols-3 gap-2.5">
          <IntegrationPill label="Microsoft Entra ID SSO" on={status?.entra} />
          <IntegrationPill label="Email (SMTP)" on={status?.smtp} />
          <IntegrationPill label="Microsoft Teams" on={status?.teams} />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Integrations activate from environment variables — see <code>.env.example</code>.
          Until then, dispatches are recorded below with status <em>skipped</em>.
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No notifications yet"
          hint="Submit, approve or return a goal sheet — or send check-in reminders — to generate events." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Channel</th>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5"><Badge color={CHANNEL_COLOR[n.channel] || 'slate'}>{n.channel}</Badge></td>
                  <td className="px-4 py-2.5 text-slate-600">{n.event}</td>
                  <td className="px-4 py-2.5 text-slate-600 truncate max-w-[180px]">{n.recipient}</td>
                  <td className="px-4 py-2.5 text-slate-800">{n.subject}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={STATUS_COLOR[n.status] || 'slate'}>{n.status}</Badge>
                    {n.error && <span className="block text-[11px] text-rose-500 mt-0.5">{n.error}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{n.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
