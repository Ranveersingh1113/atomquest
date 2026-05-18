import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Field, Input, Textarea, Select, Banner, Spinner, Icon, UOM_LABELS,
} from '../ui.jsx';

export default function SharedGoals() {
  const [thrustAreas, setThrustAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    thrust_area_id: '', title: '', description: '',
    uom_type: 'numeric_min', target: '', target_date: '', weightage: 10,
    owner_id: '', recipient_ids: [],
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/thrust-areas'), api.get('/users')]).then(([ta, u]) => {
      setThrustAreas(ta); setUsers(u); setLoading(false);
    });
  }, []);
  if (loading) return <Spinner />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRecipient = (id) =>
    setForm((f) => ({
      ...f,
      recipient_ids: f.recipient_ids.includes(id)
        ? f.recipient_ids.filter((x) => x !== id)
        : [...f.recipient_ids, id],
    }));

  const isTimeline = form.uom_type === 'timeline';
  const isZero = form.uom_type === 'zero';

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const hay = `${u.name} ${u.department || ''} ${u.title || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  async function push() {
    setError(''); setResult(null); setBusy(true);
    try {
      const r = await api.post('/shared-goals', {
        ...form,
        thrust_area_id: Number(form.thrust_area_id),
        weightage: Number(form.weightage),
        target: isTimeline ? null : Number(form.target || 0),
        owner_id: form.owner_id ? Number(form.owner_id) : undefined,
        recipient_ids: form.recipient_ids,
      });
      setResult(r);
      setForm((f) => ({ ...f, title: '', description: '', recipient_ids: [] }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Shared Goals"
        subtitle="Push a departmental KPI to multiple employees. Recipients may adjust only their weightage — title and target stay read-only." />

      {result && (
        <div className="mb-4">
          <Banner tone="success">
            KPI pushed to {result.pushed.length} employee(s): {result.pushed.join(', ') || '—'}.
            {result.skipped.length > 0 &&
              ` Skipped (locked sheet): ${result.skipped.join(', ')}.`}
          </Banner>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-[13.5px]">KPI details</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Step 1</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mb-4">The goal that will be cloned to each recipient.</p>
          <div className="space-y-3">
            <Field label="Thrust Area">
              <Select value={form.thrust_area_id} onChange={(e) => set('thrust_area_id', e.target.value)}>
                <option value="">Select…</option>
                {thrustAreas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Goal Title">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Department NPS target" />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit of measurement">
                <Select value={form.uom_type} onChange={(e) => set('uom_type', e.target.value)}>
                  {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Default weightage (%)">
                <Input type="number" min="10" max="100" value={form.weightage}
                  onChange={(e) => set('weightage', e.target.value)} />
              </Field>
            </div>
            {isTimeline ? (
              <Field label="Target Date">
                <Input type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} />
              </Field>
            ) : isZero ? (
              <Banner tone="info">Zero-based KPI — target is 0.</Banner>
            ) : (
              <Field label="Target Value">
                <Input type="number" value={form.target} onChange={(e) => set('target', e.target.value)} />
              </Field>
            )}
            <Field label="Primary owner" hint="Achievement updates by the owner sync to all recipients">
              <Select value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
                <option value="">Me (default)</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-[13.5px]">Recipients</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Step 2</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mb-3">
            {form.recipient_ids.length
              ? <><span className="font-semibold text-slate-700 num">{form.recipient_ids.length}</span> selected of {users.length}</>
              : <>Select employees to receive this shared goal.</>}
          </p>

          <div className="relative mb-2.5">
            <Icon name="search" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter employees…"
              className="w-full rounded-lg border border-paper-300 bg-white pl-9 pr-3 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const checked = form.recipient_ids.includes(u.id);
              return (
                <label key={u.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    checked ? 'border-brand-300 bg-brand-50/40' : 'border-paper-200 hover:bg-paper-50'
                  }`}>
                  <input type="checkbox" className="w-4 h-4 accent-brand-500"
                    checked={checked} onChange={() => toggleRecipient(u.id)} />
                  <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 grid place-items-center font-bold text-[10px] shrink-0">
                    {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-slate-800 truncate">{u.name}</span>
                    <span className="block text-[10.5px] text-slate-400 truncate">{u.department} · {u.title}</span>
                  </span>
                </label>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center text-[12px] text-slate-400 py-6">No employees match “{search}”.</div>
            )}
          </div>
          {error && <div className="mt-3"><Banner tone="error">{error}</Banner></div>}
          <Button variant="primary" className="w-full mt-4" onClick={push}
            disabled={busy || !form.recipient_ids.length || !form.title.trim() || !form.thrust_area_id}>
            {busy
              ? 'Pushing…'
              : <>Push KPI to <span className="num">{form.recipient_ids.length}</span> employee(s)</>}
          </Button>
        </Card>
      </div>
    </div>
  );
}
