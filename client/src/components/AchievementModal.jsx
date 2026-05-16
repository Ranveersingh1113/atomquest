import { useState } from 'react';
import { Modal, Field, Input, Select, Button, Banner } from '../ui.jsx';

export default function AchievementModal({ open, onClose, onSave, goal, quarter }) {
  const ach = goal?.achievements?.[quarter] || {};
  const [actual, setActual] = useState(ach.actual_value ?? '');
  const [completionDate, setCompletionDate] = useState(ach.completion_date || '');
  const [status, setStatus] = useState(ach.status || 'Not Started');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isTimeline = goal?.uom_type === 'timeline';
  const isZero = goal?.uom_type === 'zero';

  async function save() {
    setError(''); setBusy(true);
    try {
      await onSave({
        quarter, status,
        actual_value: isTimeline ? null : (actual === '' ? null : Number(actual)),
        completion_date: isTimeline ? (completionDate || null) : null,
      });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${quarter} Achievement — ${goal?.title || ''}`}>
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          {isTimeline
            ? `Planned completion: ${goal?.target_date || '—'}`
            : isZero
              ? 'Target: 0 (zero-based goal)'
              : `Planned target: ${goal?.target}`}
        </div>
        {isTimeline ? (
          <Field label="Actual Completion Date">
            <Input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
          </Field>
        ) : (
          <Field label={isZero ? 'Actual Count (0 = success)' : 'Actual Achievement'}>
            <Input type="number" value={actual} onChange={(e) => setActual(e.target.value)}
              placeholder="Enter the value achieved" />
          </Field>
        )}
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Not Started</option>
            <option>On Track</option>
            <option>Completed</option>
          </Select>
        </Field>
        {error && <Banner tone="error">{error}</Banner>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Achievement'}</Button>
        </div>
      </div>
    </Modal>
  );
}
