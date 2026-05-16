import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { Icon } from '../ui.jsx';

const NAV = {
  employee: [
    ['/dashboard', 'Dashboard', 'trend'],
    ['/my-goals', 'My Goal Sheet', 'target'],
    ['/audit', 'Activity Log', 'doc'],
  ],
  manager: [
    ['/dashboard', 'Dashboard', 'trend'],
    ['/my-goals', 'My Goal Sheet', 'target'],
    ['/team', 'My Team', 'users'],
    ['/shared-goals', 'Shared Goals', 'layers'],
    ['/reports', 'Reports', 'doc'],
    ['/analytics', 'Analytics', 'spark'],
    ['/audit', 'Audit Trail', 'lock'],
  ],
  admin: [
    ['/dashboard', 'Dashboard', 'trend'],
    ['/team', 'Goal Sheets', 'target'],
    ['/shared-goals', 'Shared Goals', 'layers'],
    ['/reports', 'Reports', 'doc'],
    ['/analytics', 'Analytics', 'spark'],
    ['/escalations', 'Escalations', 'alert'],
    ['/cycle', 'Cycle Admin', 'calendar'],
    ['/audit', 'Audit Trail', 'lock'],
  ],
};
const ROLE_LABEL = { employee: 'Employee', manager: 'Manager · L1', admin: 'Admin · HR' };
const ROUTE_TITLE = {
  '/dashboard': 'Dashboard', '/my-goals': 'My Goal Sheet', '/team': 'Goal Sheets',
  '/shared-goals': 'Shared Goals', '/reports': 'Reports & Governance', '/analytics': 'Analytics',
  '/audit': 'Audit Trail', '/escalations': 'Escalations', '/cycle': 'Cycle Administration',
  '/sheet': 'Goal Sheet',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [cycle, setCycle] = useState(null);
  const items = NAV[user.role] || [];

  useEffect(() => { api.get('/cycle').then(setCycle).catch(() => {}); }, []);

  const routeKey = '/' + (loc.pathname.split('/')[1] || 'dashboard');
  const pageTitle = ROUTE_TITLE[routeKey] || 'AtomQuest';
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-950 text-slate-300 flex flex-col">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center font-extrabold text-white shadow-lg shadow-brand-900/40">A</div>
            <div>
              <div className="text-white font-bold leading-tight tracking-tight">AtomQuest</div>
              <div className="text-[10.5px] text-slate-500 font-medium">Goal Tracking Portal</div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Menu</div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand-300" />}
                  <Icon name={icon} className="w-[18px] h-[18px]" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <div className="rounded-xl bg-white/5 border border-white/5 p-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center text-white font-bold text-xs shrink-0">{initials}</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
            <button onClick={() => { logout(); nav('/login'); }}
              className="w-full mt-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/80 px-5 sm:px-7 h-14 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-[15px] tracking-tight truncate">{pageTitle}</div>
          <div className="flex items-center gap-2.5 shrink-0">
            {cycle && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 px-2.5 py-1 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {cycle.fy}
              </span>
            )}
            <span className="text-xs font-medium text-slate-400">{today}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-5 sm:px-7 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
