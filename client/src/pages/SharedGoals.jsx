import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Field, Input, Textarea, Select, Banner, Spinner, UOM_LABELS,
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">KPI Details</h3>
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
            <Field label="Unit of Measurement">
              <Select value={form.uom_type} onChange={(e) => set('uom_type', e.target.value)}>
                {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Default Weightage (%)">
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
          <Field label="Primary Owner" hint="Achievement updates by the owner sync to all recipients">
            <Select value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
              <option value="">Me (default)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Recipients</h3>
          <p className="text-xs text-slate-400 mb-3">Select employees to receive this shared goal.</p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {users.map((u) => (
              <label key={u.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" className="w-4 h-4 accent-brand-600"
                  checked={form.recipient_ids.includes(u.id)}
                  onChange={() => toggleRecipient(u.id)} />
                <span className="min-w-0">
                  <span className="text-sm font-medium text-slate-800">{u.name}</span>
                  <span className="block text-xs text-slate-400">{u.department} · {u.title}</span>
                </span>
              </label>
            ))}
          </div>
          {error && <div className="mt-3"><Banner tone="error">{error}</Banner></div>}
          <Button className="w-full mt-4" onClick={push}
            disabled={busy || !form.recipient_ids.length || !form.title.trim() || !form.thrust_area_id}>
            {busy ? 'Pushing…' : `Push KPI to ${form.recipient_ids.length} employee(s)`}
          </Button>
        </Card>
      </div>
    </div>
  );
}
