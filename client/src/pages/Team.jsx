import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Badge, Spinner, EmptyState, Button, sheetStatusBadge,
} from '../ui.jsx';

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
    ['all', `All (${counts.all})`],
    ['submitted', `Pending Review (${counts.submitted})`],
    ['approved', `Approved (${counts.approved})`],
    ['draft', `In Progress (${counts.draft})`],
  ];

  return (
    <div>
      <PageHeader
        title={user.role === 'admin' ? 'All Goal Sheets' : 'My Team'}
        subtitle={user.role === 'admin'
          ? 'Every employee goal sheet across the organisation'
          : 'Review, approve, and check in on your direct reports'}
      />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === k ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Nothing here" hint="No goal sheets match this filter." />
      ) : (
        <div className="space-y-2.5">
          {shown.map((s) => {
            const [color, text] = sheetStatusBadge[s.status];
            return (
              <Card key={s.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {s.employee_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="min-w-[140px] flex-1">
                  <div className="font-semibold text-slate-900 truncate">{s.employee_name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {s.department} · {s.goals.length} goals · {s.totalWeightage}% weighted
                  </div>
                </div>
                <Badge color={color}>{text}</Badge>
                <Button variant="secondary" className="shrink-0"
                  onClick={() => nav(`/sheet/${s.id}`)}>
                  {s.status === 'submitted' ? 'Review' : 'Open'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
