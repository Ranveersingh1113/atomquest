import { useState } from 'react';
import { Modal, Field, Input, Textarea, Select, Button, Banner, UOM_LABELS } from '../ui.jsx';

const EMPTY = {
  thrust_area_id: '', title: '', description: '',
  uom_type: 'numeric_min', target: '', target_date: '', weightage: '',
};

export default function GoalFormModal({ open, onClose, onSave, thrustAreas, initial, lockedFields = [] }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const locked = (f) => lockedFields.includes(f);

  async function save() {
    setError(''); setBusy(true);
    try {
      await onSave({
        ...form,
        thrust_area_id: Number(form.thrust_area_id),
        weightage: Number(form.weightage),
        target: form.uom_type === 'timeline' ? null : Number(form.target || 0),
      });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const isTimeline = form.uom_type === 'timeline';
  const isZero = form.uom_type === 'zero';

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit Goal' : 'Add Goal'} wide>
      <div className="space-y-3">
        <Field label="Thrust Area">
          <Select value={form.thrust_area_id} disabled={locked('thrust_area_id')}
            onChange={(e) => set('thrust_area_id', e.target.value)}>
            <option value="">Select a thrust area…</option>
            {thrustAreas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Goal Title">
          <Input value={form.title} disabled={locked('title')}
            onChange={(e) => set('title', e.target.value)} placeholder="e.g. Achieve annual sales quota" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={form.description} disabled={locked('description')}
            onChange={(e) => set('description', e.target.value)} placeholder="What does success look like?" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit of Measurement">
            <Select value={form.uom_type} disabled={locked('uom_type')}
              onChange={(e) => set('uom_type', e.target.value)}>
              {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Weightage (%)" hint="Min 10% · all goals must total 100%">
            <Input type="number" min="10" max="100" value={form.weightage}
              onChange={(e) => set('weightage', e.target.value)} placeholder="e.g. 25" />
          </Field>
        </div>
        {isTimeline ? (
          <Field label="Target Date">
            <Input type="date" value={form.target_date || ''} disabled={locked('target_date')}
              onChange={(e) => set('target_date', e.target.value)} />
          </Field>
        ) : isZero ? (
          <Banner tone="info">Zero-based goal — success means a final value of exactly 0 (e.g. zero incidents).</Banner>
        ) : (
          <Field label="Target Value"
            hint={form.uom_type === 'numeric_max' ? 'Lower achievement is better' : 'Higher achievement is better'}>
            <Input type="number" value={form.target} disabled={locked('target')}
              onChange={(e) => set('target', e.target.value)} placeholder="e.g. 1000000" />
          </Field>
        )}
        {error && <Banner tone="error">{error}</Banner>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Goal'}</Button>
        </div>
      </div>
    </Modal>
  );
}
