import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Field, Input, Banner } from '../ui.jsx';

const ROLE_META = {
  admin: ['Admin / HR', 'indigo'],
  manager: ['Manager (L1)', 'blue'],
  employee: ['Employee', 'slate'],
};

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
    <div className="min-h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <div className="text-white flex flex-col justify-center px-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-xl">A</div>
            <span className="text-xl font-bold">AtomQuest</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">Goal Setting &amp; Tracking Portal</h1>
          <p className="text-slate-300 mt-3 text-sm leading-relaxed">
            Create, align, and track employee goals across the full performance cycle —
            from goal creation and manager approval to quarterly check-ins and audit-ready reporting.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-7">
          <h2 className="text-lg font-bold text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mb-4">Use a demo account or pick a role below.</p>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@atomquest.com" required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <Banner tone="error">{error}</Banner>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Quick demo login
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {accounts.map((a) => (
                <button key={a.email} onClick={(e) => submit(e, a.email, 'password')}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 text-left">
                  <span>
                    <span className="text-sm font-medium text-slate-800">{a.name}</span>
                    <span className="block text-xs text-slate-400">{a.email}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 rounded px-2 py-0.5">
                    {ROLE_META[a.role]?.[0]}
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
