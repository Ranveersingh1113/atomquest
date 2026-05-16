import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Field, Input, Banner, Icon } from '../ui.jsx';

const ROLE_META = {
  admin: 'Admin / HR',
  manager: 'Manager',
  employee: 'Employee',
};
const TAGS = ['Goal Management', 'Manager Approval', 'Quarterly Check-ins', 'Analytics'];
const FOOTER = [
  ['3 Roles', 'Employee / Manager / Admin'],
  ['Full Audit', 'Complete activity log'],
  ['Live Analytics', 'Real-time insights'],
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/demo-accounts').then(setAccounts).catch(() => {}); }, []);

  async function submit(e, em = email, pw = password) {
    e?.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(em.trim().toLowerCase(), pw);
      nav('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full w-full overflow-y-auto bg-ink-950">
      {/* ---- Left brand panel ---- */}
      <div className="relative hidden lg:flex flex-col justify-between w-[52%] overflow-hidden p-12 text-white">
        {/* depth + glow */}
        <div className="absolute -left-24 top-1/4 w-[420px] h-[420px] rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute right-10 -bottom-24 w-72 h-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-[-80px] top-24 w-[360px] h-[360px] rounded-[3rem] border border-white/[0.05] bg-white/[0.015] rotate-[28deg]" />
        <div className="absolute right-12 top-44 w-[280px] h-[280px] rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] rotate-[18deg]" />
        <div className="absolute left-10 bottom-40 w-1 h-28 rounded-full bg-gradient-to-b from-brand-500 to-transparent" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-500 grid place-items-center shadow-lg shadow-brand-500/30">
            <Icon name="bolt" className="w-6 h-6 text-ink-950" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">Atomberg</div>
            <div className="text-xs text-slate-500">AtomQuest Portal</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 ring-1 ring-inset ring-brand-500/30 px-3 py-1 text-xs font-semibold text-brand-300">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            FY 2025-26 Performance Cycle Active
          </span>
          <h1 className="text-[2.6rem] leading-[1.1] font-extrabold tracking-tight mt-5">
            Goal Setting &amp;<br />
            <span className="text-brand-400">Tracking Portal</span>
          </h1>
          <p className="text-slate-400 mt-4 leading-relaxed">
            Create, align, and track employee goals across the full performance
            cycle — from goal creation and manager approval to quarterly
            check-ins and audit-ready reporting.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {TAGS.map((t) => (
              <span key={t} className="rounded-lg bg-white/[0.04] ring-1 ring-inset ring-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
          {FOOTER.map(([h, s]) => (
            <div key={h}>
              <div className="text-sm font-bold text-white">{h}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Right sign-in panel ---- */}
      <div className="flex-1 flex items-center justify-center bg-[#f4f4f6] p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.25)] p-8 aq-pop">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center">
              <Icon name="bolt" className="w-5 h-5 text-ink-950" />
            </div>
            <span className="font-bold text-slate-900">Atomberg</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to your account to continue.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email address">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@atomberg.com" required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <Banner tone="error">{error}</Banner>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
              Quick demo login
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {accounts.map((a) => (
                <button key={a.email} onClick={(e) => submit(e, a.email, 'password')}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 hover:border-brand-400 hover:bg-brand-50/40 transition-colors text-left">
                  <span className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                    <span className="block text-xs text-slate-400 truncate">{a.email}</span>
                  </span>
                  <span className="shrink-0 ml-2 text-[11px] font-bold text-brand-700 bg-brand-50 ring-1 ring-inset ring-brand-200 rounded-md px-2 py-0.5">
                    {ROLE_META[a.role]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
