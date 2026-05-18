import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Field, Input, Banner } from '../ui.jsx';

const ROLE_META = {
  admin: 'Admin / HR',
  manager: 'Manager',
  employee: 'Employee',
};
// Microsoft Entra ID portal accounts — shown on hover over the SSO button so
// judges know which account maps to which role.
const SSO_ACCOUNTS = [
  { role: 'admin', name: 'Admin Demo', email: 'admin@rickysingh11103gmail.onmicrosoft.com' },
  { role: 'manager', name: 'Manager Demo', email: 'manager@rickysingh11103gmail.onmicrosoft.com' },
  { role: 'employee', name: 'Employee Demo', email: 'employee@rickysingh11103gmail.onmicrosoft.com' },
];
// Local quick-login accounts. The API refreshes this list on load; the fallback
// guarantees the buttons appear even before/without it.
const FALLBACK_ACCOUNTS = [
  { name: 'Priya Sharma', email: 'priya@atomberg.com', role: 'admin' },
  { name: 'Rahul Verma', email: 'rahul@atomberg.com', role: 'manager' },
  { name: 'Amit Patel', email: 'amit@atomberg.com', role: 'employee' },
];

const TAGS = ['Weightage rules', 'Manager check-ins', 'Shared KPIs', 'Escalations', 'Audit trail'];
const FOOTER = [
  ['3 Roles', 'Employee · Manager · Admin'],
  ['Full Audit', 'Every action recorded'],
  ['Live Analytics', 'QoQ & distribution'],
];

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [accounts, setAccounts] = useState(FALLBACK_ACCOUNTS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    api.get('/demo-accounts')
      .then((list) => { if (Array.isArray(list) && list.length) setAccounts(list); })
      .catch(() => {});
    api.get('/auth/sso/status')
      .then((s) => setSsoEnabled(!!s?.enabled))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    const ssoError = params.get('sso_error');
    if (ssoError) {
      setError(`Microsoft sign-in failed: ${ssoError}`);
      window.history.replaceState({}, '', '/login');
    } else if (ssoToken) {
      setBusy(true);
      loginWithToken(ssoToken)
        .then(() => nav('/dashboard'))
        .catch((e) => { setError(e.message); setBusy(false); });
      window.history.replaceState({}, '', '/login');
    }
  }, []);

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
      <div className="relative hidden lg:flex flex-col justify-between w-[54%] overflow-hidden p-10 xl:p-12 text-white">
        {/* depth + glow */}
        <div className="absolute -left-24 top-1/4 w-[420px] h-[420px] rounded-full bg-brand-500/[0.14] blur-3xl" />
        <div className="absolute right-8 -bottom-24 w-72 h-72 rounded-full bg-brand-500/[0.10] blur-3xl" />
        <div className="absolute right-[-80px] top-24 w-[360px] h-[360px] rounded-[3rem] border border-white/[0.05] bg-white/[0.012] rotate-[26deg]" />
        <div className="absolute right-10 top-44 w-[280px] h-[280px] rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] rotate-[16deg]" />
        {/* hair grid */}
        <svg className="absolute inset-0 opacity-[0.05]" width="100%" height="100%">
          <defs>
            <pattern id="g1" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="#fff" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g1)" />
        </svg>

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="Atomberg" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="text-[15px] font-bold leading-tight">Atomberg</div>
            <div className="text-[11px] text-slate-500">Goal Tracking Portal</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/[0.10] ring-1 ring-inset ring-brand-500/[0.30] px-2.5 py-1 text-[11px] font-semibold text-brand-300">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            FY 2025-26 · Performance cycle live
          </span>
          <h1 className="text-[2.6rem] xl:text-[3rem] leading-[1.02] font-extrabold tracking-[-0.035em] mt-4">
            Set goals.<br />
            Track quarters.<br />
            <span className="text-brand-400">Ship the cycle.</span>
          </h1>
          <p className="text-slate-400 mt-4 leading-relaxed text-[13.5px] max-w-[400px]">
            The performance cycle, from goal creation through quarterly check-ins
            to audit-ready reporting — running in one fast portal.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-5">
            {TAGS.map((t) => (
              <span key={t} className="rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-5">
          {FOOTER.map(([h, s]) => (
            <div key={h}>
              <div className="text-[12.5px] font-bold text-white">{h}</div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Right sign-in panel ---- */}
      <div className="flex-1 flex items-center justify-center bg-paper-50 p-6">
        <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-[0_24px_60px_-28px_rgba(0,0,0,0.18)] border border-paper-200 p-7 aq-pop">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-5">
            <img src="/logo.png" alt="Atomberg" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-slate-900">Atomberg</span>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Sign in</div>
          <h2 className="text-[22px] font-bold text-slate-900 tracking-[-0.022em] mt-0.5">Welcome back</h2>
          <p className="text-[12.5px] text-slate-500 mt-1 mb-5">Continue to the performance portal.</p>

          <form onSubmit={submit} className="space-y-3">
            <Field label="Email address">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@atomberg.com" required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <Banner tone="error">{error}</Banner>}
            <Button type="submit" variant="primary" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in →'}
            </Button>
          </form>

          {ssoEnabled && (
            <div className="mt-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px flex-1 bg-paper-200" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">or</span>
                <span className="h-px flex-1 bg-paper-200" />
              </div>
              <div className="relative group">
                <button type="button" onClick={() => { window.location.href = '/api/auth/sso/login'; }}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-paper-300 px-3 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-paper-50 transition-colors">
                  <svg viewBox="0 0 23 23" className="w-3.5 h-3.5" aria-hidden="true">
                    <path fill="#f25022" d="M1 1h10v10H1z" />
                    <path fill="#7fba00" d="M12 1h10v10H12z" />
                    <path fill="#00a4ef" d="M1 12h10v10H1z" />
                    <path fill="#ffb900" d="M12 12h10v10H12z" />
                  </svg>
                  Continue with Microsoft
                </button>

                {/* Hover card — the three Entra ID demo accounts.
                    Wider than the button so the full email addresses fit. */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[360px] max-w-[92vw] mb-2 z-30 origin-bottom
                  opacity-0 invisible translate-y-1 transition-all duration-150
                  group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                  <div className="rounded-xl border border-paper-200 bg-white p-3 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.30)]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                      Microsoft Entra ID demo accounts
                    </div>
                    <div className="space-y-1">
                      {SSO_ACCOUNTS.map((a) => (
                        <div key={a.email} className="flex items-center justify-between gap-2 rounded-md bg-paper-50 px-2 py-1.5">
                          <span className="min-w-0">
                            <span className="block text-[11.5px] font-semibold text-slate-800">{a.name}</span>
                            <span className="block text-[10.5px] text-slate-400 whitespace-nowrap">{a.email}</span>
                          </span>
                          <span className="shrink-0 text-[9.5px] font-bold text-brand-700 bg-brand-50 ring-1 ring-inset ring-brand-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
                            {ROLE_META[a.role]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10.5px] leading-relaxed text-slate-500 mt-2 pt-2 border-t border-paper-200">
                      Already signed in on the demo device — just pick an account in the
                      Microsoft window.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-paper-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Quick demo login
              </div>
              <span className="kbd">↵</span>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {accounts.map((a) => (
                <button key={a.email} onClick={(e) => submit(e, a.email, 'password')}
                  className="w-full flex items-center justify-between rounded-lg border border-paper-200 px-2.5 py-2 hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-left">
                  <span className="min-w-0 flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 grid place-items-center font-bold text-[9.5px] ring-1 ring-inset ring-brand-200">
                      {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-slate-800">{a.name}</span>
                      <span className="block text-[10.5px] text-slate-400 truncate">{a.email}</span>
                    </span>
                  </span>
                  <span className="shrink-0 ml-2 text-[10px] font-bold text-brand-700 bg-brand-50 ring-1 ring-inset ring-brand-200 rounded-md px-1.5 py-0.5 uppercase tracking-wide">
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
