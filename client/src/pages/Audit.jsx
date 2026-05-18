import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Badge, Spinner, EmptyState, Input, Icon,
} from '../ui.jsx';

const ENTITY_COLOR = {
  goal: 'indigo', goal_sheet: 'blue', achievement: 'green',
  checkin: 'amber', cycle: 'slate', escalation: 'rose',
};

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { api.get('/audit').then(setRows); }, []);
  if (!rows) return <Spinner />;

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.entity} ${r.action} ${r.field || ''} ${r.user_name || ''} ${r.new_value || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Audit Trail"
        subtitle="Every change to goals, sheets, achievements and check-ins — who changed what, and when" />

      <div className="mb-4 max-w-sm relative">
        <Icon name="search" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search the audit log…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-paper-300 bg-white pl-9 pr-3 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit entries" hint="Activity will appear here as the cycle progresses." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-paper-50 text-slate-400 text-[10px] font-bold uppercase tracking-[0.14em]">
                  <th className="text-left px-4 py-2.5 font-bold">When</th>
                  <th className="text-left px-4 py-2.5 font-bold">Entity</th>
                  <th className="text-left px-4 py-2.5 font-bold">Action</th>
                  <th className="text-left px-4 py-2.5 font-bold">Field</th>
                  <th className="text-left px-4 py-2.5 font-bold">Change</th>
                  <th className="text-left px-4 py-2.5 font-bold">By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-paper-100 hover:bg-paper-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap num"
                      style={{ fontFamily: 'var(--font-mono)' }}>{r.created_at}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={ENTITY_COLOR[r.entity] || 'slate'} dot>{r.entity.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {/post-lock|locked/i.test(r.action)
                        ? <span className="text-rose-600 font-semibold">{r.action}</span>
                        : <span className="font-medium">{r.action}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                      {r.field || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.old_value != null || r.new_value != null
                        ? <span className="num">
                            <span className="text-slate-400">{r.old_value ?? '—'}</span>
                            <span className="text-slate-300 mx-1.5">→</span>
                            <span className="text-slate-900 font-semibold">{r.new_value ?? '—'}</span>
                          </span>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.user_name || <span className="text-slate-400">System</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-paper-200 text-[11px] text-slate-400 num">
            Showing {filtered.length} of {rows.length} entries
          </div>
        </Card>
      )}
    </div>
  );
}
