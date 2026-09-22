import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Trash2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import { adminService } from '../../services/adminService';
import { relative } from '../../lib/time';
import { errorMessage } from '../../lib/utils';

// Messages that hit the server-side word filter (BANNED_WORDS). Banned words are masked before delivery.
export default function ModerationTab() {
  const [items, setItems] = useState(null);
  useEffect(() => { adminService.flagged().then(({ data }) => setItems(data.messages)).catch(() => setItems([])); }, []);

  const remove = async (m) => {
    try { await adminService.removeMessage(m._id, 'Removed after word-filter flag'); setItems((l) => l.filter((x) => x._id !== m._id)); toast.success('Message removed'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-sub">Words configured in <code className="rounded bg-surface-2 px-1.5 py-0.5">BANNED_WORDS</code> are masked automatically. Review the flagged messages below and remove the ones that need it.</p>
      <ul className="space-y-2">
        {items?.map((m) => (
          <li key={m._id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
            <Avatar src={m.sender?.avatar?.url} name={m.sender?.name} size="sm" />
            <div className="min-w-0 flex-1"><p className="text-xs text-sub"><b className="text-ink">{m.sender?.name}</b> · {relative(m.createdAt)}</p><p className="break-words text-sm">{m.text}</p></div>
            <Button size="sm" variant="danger-ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4" />Remove</Button>
          </li>
        ))}
      </ul>
      {items && !items.length && <EmptyState icon={ShieldCheck} title="Nothing flagged" description="Messages caught by the word filter will queue up here." />}
    </div>
  );
}
