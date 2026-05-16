import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Field, Input, Select, Badge, Banner, Spinner,
} from '../ui.jsx';

const WINDOWS = [
  ['goal_window_open', 'Goal Setting — window opens'],
  ['q1_open', 'Q1 Check-in — window opens'],
  ['q2_open', 'Q2 Check-in — window opens'],
  ['q3_open', 'Q3 Check-in — window opens'],
  ['q4_open', 'Q4 / Annual — window opens'],
];

export default function CycleAdmin() {
  const [cycle, setCycle] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const c = await api.get('/cycle');
    setCycle(c);
    setForm(c);
  }
  useEffect(() => { load(); }, []);
  if (!form) return <Spinner />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true); setMsg('');
    try {
      const payload = {};
      ['name', 'fy', 'status', ...WINDOWS.map((w) => w[0])].forEach((k) => { payload[k] = form[k]; });
      await api.put(`/cycles/${form.id}`, payload);
      await load();
      setMsg('Cycle configuration saved.');
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Cycle Administration"
        subtitle="Configure the performance cycle and quarterly check-in windows" />

      {msg && <div className="mb-4"><Banner tone={msg.includes('saved') ? 'success' : 'error'}>{msg}</Banner></div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Cycle Details</h3>
          <Field label="Cycle Name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Financial Year">
            <Input value={form.fy} onChange={(e) => set('fy', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-slate-500">Currently open:</span>
            {cycle.openQuarters?.length
              ? cycle.openQuarters.map((q) => <Badge key={q} color="green">{q}</Badge>)
              : <span className="text-sm text-slate-400">none</span>}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Check-in Windows</h3>
          <p className="text-xs text-slate-400">
            A quarter's achievement capture opens on its date. Employees cannot log
            achievement for a quarter before its window opens.
          </p>
          {WINDOWS.map(([key, label]) => (
            <Field key={key} label={label}>
              <Input type="date" value={form[key] || ''} onChange={(e) => set(key, e.target.value)} />
            </Field>
          ))}
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Configuration'}</Button>
      </div>
    </div>
  );
}
