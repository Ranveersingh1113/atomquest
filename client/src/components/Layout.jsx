import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { Icon } from '../ui.jsx';
import { startTour, isPortalAccount } from '../tour.js';

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
    ['/notifications', 'Notifications', 'bell'],
    ['/cycle', 'Cycle Admin', 'calendar'],
    ['/settings', 'Integrations', 'sliders'],
    ['/audit', 'Audit Trail', 'lock'],
  ],
};
const ROLE_LABEL = { employee: 'Employee', manager: 'Manager · L1', admin: 'Admin · HR' };
const ROUTE_TITLE = {
  '/dashboard': 'Dashboard', '/my-goals': 'My Goal Sheet', '/team': 'Goal Sheets',
  '/shared-goals': 'Shared Goals', '/reports': 'Reports & Governance', '/analytics': 'Analytics',
  '/audit': 'Audit Trail', '/escalations': 'Escalations', '/cycle': 'Cycle Administration',
  '/notifications': 'Notifications', '/settings': 'Integrations', '/sheet': 'Goal Sheet',
};

function Logo() {
  return (
    <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0">
      <img src="/logo.png" alt="Atomberg" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [cycle, setCycle] = useState(null);
  const items = NAV[user.role] || [];

  useEffect(() => { api.get('/cycle').then(setCycle).catch(() => {}); }, []);

  const routeKey = '/' + (loc.pathname.split('/')[1] || 'dashboard');
  const pageTitle = ROUTE_TITLE[routeKey] || 'Atomberg';
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-ink-950 border-r border-white/[0.06] flex flex-col">
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="min-w-0">
              <div className="text-white font-bold leading-tight tracking-tight text-[13.5px]">Atomberg</div>
              <div className="text-[10px] text-slate-500 font-medium tracking-[0.04em]">Goal Tracking</div>
            </div>
          </div>
        </div>

        {/* Search stub (visual ⌘K hint) */}
        <div className="px-3 pt-3">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.10] transition-colors text-[12px]"
            onClick={() => { /* TODO: open command palette */ }}>
            <Icon name="search" className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search…</span>
            <span className="kbd" style={{ background: 'transparent', color: '#6e6e76', borderColor: '#2a2a30' }}>⌘K</span>
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Workspace
        </div>
        <nav data-tour="sidebar" className="flex-1 px-2 space-y-[1px] overflow-y-auto">
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-2.5 rounded-md px-2.5 h-8 text-[12.5px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-500/[0.08] text-white ring-1 ring-inset ring-brand-500/[0.18]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-[-1px] top-2 bottom-2 w-[2px] rounded-r-full bg-brand-500" />}
                  <Icon name={icon} className={`w-[15px] h-[15px] ${isActive ? 'text-brand-500' : 'text-slate-600'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Cycle context block */}
        {cycle && (
          <div className="mx-3 mb-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_0_3px_rgba(245,166,35,0.16)]" />
            <div className="leading-tight min-w-0">
              <div className="text-[11.5px] font-semibold text-white truncate">{cycle.fy}</div>
              <div className="text-[10px] text-slate-500">
                {cycle.openQuarters?.length
                  ? `${cycle.openQuarters[cycle.openQuarters.length - 1]} window open`
                  : 'No open quarter'}
              </div>
            </div>
          </div>
        )}

        <div className="p-2.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="w-7 h-7 rounded-full bg-brand-500 grid place-items-center text-ink-950 font-bold text-[10.5px] shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-white truncate">{user.name}</div>
              <div className="text-[10.5px] text-slate-500 truncate">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>
          <button onClick={() => { logout(); nav('/login'); }}
            className="mt-1.5 w-full flex items-center justify-center gap-1.5 rounded-md h-8 text-[11.5px] font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-colors">
            <Icon name="arrow" className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-paper-200 px-5 sm:px-6 h-12 flex items-center justify-between">
          <div className="font-semibold text-slate-900 text-[13.5px] tracking-[-0.005em] truncate">{pageTitle}</div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => startTour(user.role, { extensive: isPortalAccount(user), navigate: nav })}
              className="inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-[11.5px] font-semibold text-slate-600 hover:bg-paper-100 hover:text-slate-900 transition-colors">
              <Icon name="spark" className="w-3.5 h-3.5" />
              Tour
            </button>
            {user.role === 'admin' && (
              <button onClick={() => nav('/notifications')}
                title="Notifications"
                className="w-7 h-7 grid place-items-center rounded-md text-slate-500 hover:bg-paper-100 hover:text-slate-900 transition-colors">
                <Icon name="bell" className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="w-px h-4 bg-paper-200 mx-1" />
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline" style={{ fontFamily: 'var(--font-mono)' }}>{today}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div data-tour="page" className="max-w-6xl mx-auto px-5 sm:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
