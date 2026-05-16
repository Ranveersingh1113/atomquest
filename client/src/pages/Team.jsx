import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Card, PageHeader, Badge, Spinner, EmptyState, Button, Icon, sheetStatusBadge,
} from '../ui.jsx';

const STATUS_ACCENT = {
  approved: 'bg-emerald-500', submitted: 'bg-blue-500',
  returned: 'bg-amber-500', draft: 'bg-slate-300',
};

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
              <Card key={s.id} hover accent={STATUS_ACCENT[s.status]}
                className="p-4 pl-5 flex flex-wrap items-center gap-3 cursor-pointer"
                >
                <div onClick={() => nav(`/sheet/${s.id}`)}
                  className="flex flex-wrap items-center gap-3 flex-1 min-w-[140px]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {s.employee_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <div className="font-bold text-slate-900 truncate">{s.employee_name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {s.department} · {s.goals.length} goals · {s.totalWeightage}% weighted
                    </div>
                  </div>
                </div>
                <Badge color={color} dot>{text}</Badge>
                <Button variant={s.status === 'submitted' ? 'primary' : 'secondary'}
                  className="shrink-0" onClick={() => nav(`/sheet/${s.id}`)}>
                  {s.status === 'submitted' ? 'Review' : 'Open'}
                  <Icon name="arrow" className="w-4 h-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
