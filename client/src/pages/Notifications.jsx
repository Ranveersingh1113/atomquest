import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Badge, Spinner, EmptyState, Banner, Icon, StatusDot,
} from '../ui.jsx';

const STATUS_COLOR = { sent: 'green', failed: 'rose', skipped: 'slate' };
const CHANNEL_COLOR = { email: 'blue', teams: 'indigo' };

function IntegrationPill({ label, on, note }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-paper-200 bg-white px-3 py-2.5">
      <span className={`w-2 h-2 rounded-full ${on ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'bg-paper-300'}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-slate-800">{label}</div>
        <div className={`text-[10.5px] ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
          {on ? 'Connected' : (note || 'Not configured')}
        </div>
      </div>
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
        actions={
          <Button variant="primary" onClick={sendReminders} disabled={busy}>
            <Icon name="bell" className="w-3.5 h-3.5" />
            {busy ? 'Sending…' : 'Send check-in reminders'}
          </Button>
        }
      />

      {msg && <div className="mb-4"><Banner tone="info">{msg}</Banner></div>}

      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold text-slate-900">Integration status</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Live connection state for outgoing channels.
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2.5">
          <IntegrationPill label="Microsoft Entra ID SSO" on={status?.entra} />
          <IntegrationPill label="Email (SMTP)" on={status?.smtp} note="Set SMTP_* in server/.env" />
          <IntegrationPill label="Microsoft Teams" on={status?.teams} note="Configure in Integrations" />
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Integrations activate from environment variables — see <code>.env.example</code>.
          Until then, dispatches are recorded below with status <em>skipped</em>.
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No notifications yet"
          hint="Submit, approve or return a goal sheet — or send check-in reminders — to generate events." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 h-10 flex items-center justify-between border-b border-paper-200">
            <span className="text-[12.5px] font-semibold text-slate-900">Dispatch log</span>
            <span className="text-[11px] text-slate-400 num" style={{ fontFamily: 'var(--font-mono)' }}>{rows.length} events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-paper-50 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
                  <tr key={n.id} className="border-t border-paper-100 hover:bg-paper-50/60 transition-colors">
                    <td className="px-4 py-2.5"><Badge color={CHANNEL_COLOR[n.channel] || 'slate'} dot>{n.channel}</Badge></td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{n.event}</td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[180px]"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{n.recipient}</td>
                    <td className="px-4 py-2.5 text-slate-800">{n.subject}</td>
                    <td className="px-4 py-2.5">
                      <StatusDot color={STATUS_COLOR[n.status] || 'slate'}>{n.status}</StatusDot>
                      {n.error && <span className="block text-[10.5px] text-rose-500 mt-0.5 truncate max-w-[180px]">{n.error}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-400 whitespace-nowrap num"
                      style={{ fontFamily: 'var(--font-mono)' }}>{n.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
