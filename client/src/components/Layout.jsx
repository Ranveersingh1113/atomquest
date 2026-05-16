import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const ICONS = {
  dashboard: 'M3 12l9-9 9 9M5 10v10h14V10',
  goals: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  team: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z',
  shared: 'M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zm12 7a3 3 0 100-6 3 3 0 000 6z',
  reports: 'M9 17v-6M13 17v-3M17 17v-9M4 4h16v16H4z',
  analytics: 'M3 3v18h18M7 14l4-4 4 4 5-6',
  audit: 'M9 12h6M9 16h6M9 8h2M5 3h14v18H5z',
  escalation: 'M12 9v4M12 17h.01M10.3 3.86l-8.5 14.7A1 1 0 002.7 20h18.6a1 1 0 00.87-1.5l-8.5-14.7a1 1 0 00-1.74 0z',
  cycle: 'M21 12a9 9 0 11-3-6.7M21 3v6h-6',
};

function Icon({ name }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const NAV = {
  employee: [
    ['/dashboard', 'Dashboard', 'dashboard'],
    ['/my-goals', 'My Goal Sheet', 'goals'],
    ['/audit', 'Activity Log', 'audit'],
  ],
  manager: [
    ['/dashboard', 'Dashboard', 'dashboard'],
    ['/my-goals', 'My Goal Sheet', 'goals'],
    ['/team', 'My Team', 'team'],
    ['/shared-goals', 'Shared Goals', 'shared'],
    ['/reports', 'Reports', 'reports'],
    ['/analytics', 'Analytics', 'analytics'],
    ['/audit', 'Audit Trail', 'audit'],
  ],
  admin: [
    ['/dashboard', 'Dashboard', 'dashboard'],
    ['/team', 'Goal Sheets', 'team'],
    ['/shared-goals', 'Shared Goals', 'shared'],
    ['/reports', 'Reports', 'reports'],
    ['/analytics', 'Analytics', 'analytics'],
    ['/escalations', 'Escalations', 'escalation'],
    ['/cycle', 'Cycle Admin', 'cycle'],
    ['/audit', 'Audit Trail', 'audit'],
  ],
};

const ROLE_LABEL = { employee: 'Employee', manager: 'Manager (L1)', admin: 'Admin / HR' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user.role] || [];

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">A</div>
            <div>
              <div className="text-white font-bold leading-tight">AtomQuest</div>
              <div className="text-[11px] text-slate-400">Goal Tracking Portal</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}>
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="px-2 py-2">
            <div className="text-sm font-semibold text-white">{user.name}</div>
            <div className="text-[11px] text-slate-400">{ROLE_LABEL[user.role]} · {user.department}</div>
          </div>
          <button onClick={() => { logout(); nav('/login'); }}
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white text-left">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 sm:px-7 py-8">{children}</div>
      </main>
    </div>
  );
}
