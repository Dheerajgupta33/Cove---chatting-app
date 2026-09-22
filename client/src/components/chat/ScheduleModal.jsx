import { useState } from 'react';
import { addDays, addHours, format, set } from 'date-fns';
import Modal from '../common/Modal';
import Button from '../common/Button';

const toLocalInput = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

export default function ScheduleModal({ open, onClose, onSubmit }) {
  const [value, setValue] = useState(() => toLocalInput(addHours(new Date(), 1)));
  const [error, setError] = useState('');

  const presets = [
    ['In 1 hour', addHours(new Date(), 1)],
    ['This evening', set(new Date(), { hours: 18, minutes: 0, seconds: 0 })],
    ['Tomorrow 9:00', set(addDays(new Date(), 1), { hours: 9, minutes: 0, seconds: 0 })],
  ].filter(([, d]) => d.getTime() > Date.now() + 60_000);

  const submit = () => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 30_000) return setError('Pick a time in the future');
    onSubmit(date.toISOString());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Schedule message" description="Cove sends it for you at this time, even if you are offline." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}>Schedule</Button></>}>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map(([label, d]) => <Button key={label} variant="secondary" size="sm" onClick={() => { setValue(toLocalInput(d)); setError(''); }}>{label}</Button>)}
      </div>
      <input type="datetime-local" className="field" value={value} min={toLocalInput(new Date())} onChange={(e) => { setValue(e.target.value); setError(''); }} />
      {error && <p className="mt-2 text-xs text-coral">{error}</p>}
    </Modal>
  );
}
