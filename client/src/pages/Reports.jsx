import { useEffect, useState } from 'react';
import { api, getToken } from '../api.js';
import {
  Card, PageHeader, Button, Badge, Spinner, Banner, Icon, StatusDot,
} from '../ui.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function Dot({ done, label }) {
  return (
    <span title={label}
      className={`inline-block w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]' : 'bg-paper-200'}`} />
  );
}

const STATUS_COLOR = { approved: 'green', submitted: 'blue', returned: 'amber', draft: 'slate' };

export default function Reports() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/reports/completion').then(setData); }, []);
  if (!data) return <Spinner />;

  async function downloadCsv() {
    setBusy(true);
    try {
      const res = await fetch('/api/reports/achievement.csv', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'achievement-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }

  /* Quick rollup numbers across all rows */
  const totals = data.rows.reduce((acc, r) => {
    QUARTERS.forEach((q) => {
      if (r.quarters[q].employeeComplete) acc.emp[q]++;
      if (r.quarters[q].managerCheckedIn) acc.mgr[q]++;
    });
    return acc;
  }, { emp: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, mgr: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } });
  const n = data.rows.length;

  return (
    <div>
      <PageHeader title="Reports & Governance"
        subtitle="Achievement export and real-time quarterly completion tracking"
        actions={
          <Button variant="primary" onClick={downloadCsv} disabled={busy}>
            <Icon name="doc" className="w-3.5 h-3.5" />
            {busy ? 'Preparing…' : 'Export CSV'}
          </Button>
        }
      />

      <div className="mb-4">
        <Banner tone="info">
          Achievement Report exports Planned Target vs. Actual Achievement and quarterly
          score for every goal — opens in Excel.
        </Banner>
      </div>

      {/* Rollup tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        {QUARTERS.map((q) => (
          <Card key={q} className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{q} completion</span>
              {data.openQuarters.includes(q) && <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200 rounded px-1.5 py-0.5 uppercase tracking-wider">Open</span>}
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-[24px] font-bold text-slate-900 leading-none tracking-[-0.025em] num">{totals.emp[q]}</span>
              <span className="text-[11.5px] text-slate-400 num">/ {n} emp</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 num">
              <span className="font-semibold text-slate-700">{totals.mgr[q]}</span> manager check-in{totals.mgr[q] === 1 ? '' : 's'}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 h-10 border-b border-paper-200 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-slate-900">Completion Dashboard</span>
          <span className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><Dot done /> Completed</span>
            <span className="flex items-center gap-1.5"><Dot /> Pending</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-paper-50 text-slate-400 text-[10px] font-bold uppercase tracking-[0.14em]">
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Status</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="px-3 py-2.5 text-center" colSpan={2}>{q}</th>
                ))}
              </tr>
              <tr className="bg-paper-50 text-slate-400 text-[9.5px] font-bold uppercase tracking-[0.1em]">
                <th /><th />
                {QUARTERS.map((q) => (
                  <th key={q} colSpan={2} className="pb-2">
                    <span className="inline-flex gap-3 text-slate-400">
                      <span className="font-semibold">Emp</span>
                      <span className="font-semibold">Mgr</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.sheetId} className="border-t border-paper-100 hover:bg-paper-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-900">{r.employee}</div>
                    <div className="text-[10.5px] text-slate-400">{r.department}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusDot color={STATUS_COLOR[r.status] || 'slate'}>{r.status}</StatusDot>
                  </td>
                  {QUARTERS.map((q) => (
                    <td key={q} className="px-3 py-2.5 text-center" colSpan={2}>
                      <span className="inline-flex gap-3 items-center">
                        <Dot done={r.quarters[q].employeeComplete}
                          label={`${q} employee achievement`} />
                        <Dot done={r.quarters[q].managerCheckedIn}
                          label={`${q} manager check-in`} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-slate-400 mt-2 num">
        Open quarters: <span className="font-semibold text-slate-700">{data.openQuarters.join(', ') || 'none'}</span>.
        Employee dot = all goals updated; Manager dot = quarterly check-in recorded.
      </p>
    </div>
  );
}
