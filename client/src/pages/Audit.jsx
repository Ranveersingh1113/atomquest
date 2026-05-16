import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, PageHeader, Badge, Spinner, EmptyState, Input } from '../ui.jsx';

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

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search the audit log…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit entries" hint="Activity will appear here as the cycle progresses." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="text-left px-4 py-2 font-medium">When</th>
                  <th className="text-left px-4 py-2 font-medium">Entity</th>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-left px-4 py-2 font-medium">Field</th>
                  <th className="text-left px-4 py-2 font-medium">Change</th>
                  <th className="text-left px-4 py-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.created_at}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={ENTITY_COLOR[r.entity] || 'slate'}>{r.entity}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {/post-lock|locked/i.test(r.action)
                        ? <span className="text-rose-600 font-medium">{r.action}</span>
                        : r.action}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.field || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.old_value != null || r.new_value != null
                        ? <span><span className="text-slate-400">{r.old_value ?? '—'}</span>
                            {' → '}<span className="text-slate-800">{r.new_value ?? '—'}</span></span>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.user_name || 'System'}</td>
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
