import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';

export default function PollModal({ open, onClose, onSubmit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiple, setMultiple] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setQuestion(''); setOptions(['', '']); setMultiple(false); setError(''); };
  const submit = () => {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setError('Ask a question first');
    if (clean.length < 2) return setError('Add at least two options');
    onSubmit({ question: question.trim(), options: clean, multiple });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a poll" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send poll</Button></>}>
      <div className="space-y-3">
        <Input label="Question" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} placeholder="Where should we eat on Friday?" autoFocus />
        <div className="space-y-2">
          <span className="block text-sm font-medium">Options</span>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="field" value={o} maxLength={100} placeholder={`Option ${i + 1}`} onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))} />
              {options.length > 2 && <button aria-label="Remove option" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} className="rounded-lg p-2 text-sub hover:bg-surface-2"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          {options.length < 6 && <Button variant="ghost" size="sm" onClick={() => setOptions((l) => [...l, ''])}><Plus className="h-4 w-4" /> Add option</Button>}
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />
          Allow people to pick more than one option
        </label>
        {error && <p className="text-xs text-coral">{error}</p>}
      </div>
    </Modal>
  );
}
