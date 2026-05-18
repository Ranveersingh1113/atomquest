import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Badge, Spinner, EmptyState, Button, Icon, StatusDot, ScoreBar,
  sheetStatusBadge,
} from '../ui.jsx';

const STATUS_COLOR = { approved: 'green', submitted: 'blue', returned: 'amber', draft: 'slate' };

export default function Team() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sheets, setSheets] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.get('/sheets').then(setSheets); }, []);
  if (!sheets) return <Spinner />;

  const counts = {
    all: sheets.length,
    submitted: sheets.filter((s) => s.status === 'submitted').length,
    approved: sheets.filter((s) => s.status === 'approved').length,
    draft: sheets.filter((s) => ['draft', 'returned'].includes(s.status)).length,
  };
  const shown = sheets.filter((s) =>
    filter === 'all' ? true
      : filter === 'draft' ? ['draft', 'returned'].includes(s.status)
        : s.status === filter);

  const tabs = [
    ['all', 'All', counts.all],
    ['submitted', 'Pending Review', counts.submitted],
    ['approved', 'Approved', counts.approved],
    ['draft', 'In Progress', counts.draft],
  ];

  // Pick the most-relevant open quarter for the score column
  const latestQ = sheets.find((s) => s.status === 'approved')?.quarterScores
    ? Object.keys(sheets[0].quarterScores).slice(-1)[0] : 'Q1';

  return (
    <div>
      <PageHeader
        title={user.role === 'admin' ? 'All Goal Sheets' : 'My Team'}
        subtitle={user.role === 'admin'
          ? 'Every employee goal sheet across the organisation'
          : 'Review, approve, and check in on your direct reports'}
      />

      <div className="flex gap-1 mb-4 flex-wrap items-center">
        {tabs.map(([k, label, count]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[12px] font-semibold transition-colors ${
              filter === k
                ? 'bg-ink-950 text-white'
                : 'bg-white border border-paper-200 text-slate-600 hover:bg-paper-50 hover:border-paper-300'
            }`}>
            {label}
            <span className={`text-[10.5px] font-bold num ${filter === k ? 'text-brand-300' : 'text-slate-400'}`}>{count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Nothing here" hint="No goal sheets match this filter." />
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_140px_160px_90px] gap-4 px-4 h-9 items-center border-b border-paper-200 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <div>Employee</div>
            <div>Status</div>
            <div>{latestQ} progress</div>
            <div className="text-right">Action</div>
          </div>
          {shown.map((s, i) => {
            const [color] = sheetStatusBadge[s.status];
            const score = s.quarterScores?.[latestQ];
            const isApproved = s.status === 'approved';
            return (
              <div key={s.id}
                onClick={() => nav(`/sheet/${s.id}`)}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_160px_90px] gap-3 sm:gap-4 px-4 py-3 items-center cursor-pointer hover:bg-paper-50 transition-colors ${i ? 'border-t border-paper-100' : ''}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 grid place-items-center font-bold text-[10.5px] shrink-0">
                    {s.employee_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">{s.employee_name}</div>
                    <div className="text-[11px] text-slate-400 truncate num">
                      {s.department} · {s.goals.length} goals · {s.totalWeightage}%
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <StatusDot color={color}>{sheetStatusBadge[s.status][1]}</StatusDot>
                </div>
                <div className="hidden sm:block">
                  {isApproved && typeof score === 'number'
                    ? <ScoreBar value={score} width={96} />
                    : <span className="text-[11.5px] text-slate-300 num">—</span>}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant={s.status === 'submitted' ? 'primary' : 'secondary'}
                    onClick={(e) => { e.stopPropagation(); nav(`/sheet/${s.id}`); }}>
                    {s.status === 'submitted' ? 'Review' : 'Open'}
                    <Icon name="arrow" className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
