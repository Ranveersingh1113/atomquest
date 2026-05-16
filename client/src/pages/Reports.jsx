import { useEffect, useState } from 'react';
import { api, getToken } from '../api.js';
import { Card, PageHeader, Button, Badge, Spinner, Banner } from '../ui.jsx';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function Dot({ done, label }) {
  return (
    <span title={label}
      className={`inline-block w-3 h-3 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
  );
}

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

  return (
    <div>
      <PageHeader title="Reports & Governance"
        subtitle="Achievement export and real-time quarterly completion tracking"
        actions={<Button onClick={downloadCsv} disabled={busy}>
          {busy ? 'Preparing…' : 'Export Achievement Report (CSV)'}
        </Button>}
      />

      <div className="mb-4">
        <Banner tone="info">
          Achievement Report exports Planned Target vs. Actual Achievement and quarterly
          score for every goal — opens in Excel.
        </Banner>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-900">Completion Dashboard</span>
          <span className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Dot done /> Completed</span>
            <span className="flex items-center gap-1"><Dot /> Pending</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-2 font-medium">Employee</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="px-3 py-2 font-medium text-center" colSpan={2}>{q}</th>
                ))}
              </tr>
              <tr className="bg-slate-50 text-slate-400 text-[10px]">
                <th /><th />
                {QUARTERS.map((q) => (
                  <th key={q} colSpan={2} className="pb-1.5">
                    <span className="inline-flex gap-3">
                      <span>Emp</span><span>Mgr</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.sheetId} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{r.employee}</div>
                    <div className="text-xs text-slate-400">{r.department}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={r.status === 'approved' ? 'green' : r.status === 'submitted' ? 'blue' : 'slate'}>
                      {r.status}
                    </Badge>
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
      <p className="text-xs text-slate-400 mt-2">
        Open quarters: {data.openQuarters.join(', ') || 'none'}.
        Employee dot = all goals updated; Manager dot = quarterly check-in recorded.
      </p>
    </div>
  );
}
