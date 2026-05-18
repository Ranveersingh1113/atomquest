import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Card, PageHeader, Button, Field, Input, Select, Badge, Banner, Spinner, Icon,
} from '../ui.jsx';

const WINDOWS = [
  ['goal_window_open', 'Goal Setting',     'Window opens for employees to create goals'],
  ['q1_open',          'Q1 Check-in',      'Q1 achievement capture opens'],
  ['q2_open',          'Q2 Check-in',      'Q2 achievement capture opens'],
  ['q3_open',          'Q3 Check-in',      'Q3 achievement capture opens'],
  ['q4_open',          'Q4 / Annual',      'Annual close-out window'],
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

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-[13.5px]">Cycle details</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Section 1 of 2</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mb-4">Identity and lifecycle state of this performance cycle.</p>
          <div className="space-y-3">
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
          </div>
          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-paper-200 flex-wrap">
            <span className="text-[11.5px] font-semibold text-slate-500">Currently open:</span>
            {cycle.openQuarters?.length
              ? cycle.openQuarters.map((q) => <Badge key={q} color="green" dot>{q}</Badge>)
              : <span className="text-[12px] text-slate-400">no quarter is open</span>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-[13.5px]">Check-in windows</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Section 2 of 2</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mb-4">
            A quarter&#39;s achievement capture opens on its date. Employees cannot log
            achievement before its window opens.
          </p>
          <div className="space-y-3">
            {WINDOWS.map(([key, label, hint]) => (
              <div key={key} className="grid grid-cols-[140px_1fr] items-center gap-3 py-1 border-t border-paper-100 first:border-t-0 pt-2 first:pt-0">
                <div>
                  <div className="text-[12.5px] font-semibold text-slate-800">{label}</div>
                  <div className="text-[10.5px] text-slate-400">{hint}</div>
                </div>
                <Input type="date" value={form[key] || ''} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={load} disabled={busy}>Reset</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : (<><Icon name="check" className="w-3.5 h-3.5" />Save configuration</>)}
        </Button>
      </div>
    </div>
  );
}
