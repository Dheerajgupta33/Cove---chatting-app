import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Check, Search } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import { forwardingSet } from '../../features/ui/uiSlice';
import { chatService } from '../../services/chatService';
import { conversationMeta } from '../../lib/chat';
import { cn, errorMessage, messagePreview } from '../../lib/utils';

// Pick one or more conversations to forward the chosen message to.
export default function ForwardModal() {
  const dispatch = useDispatch();
  const message = useSelector((s) => s.ui.forwarding);
  const meId = useSelector((s) => s.auth.user._id);
  const byId = useSelector((s) => s.chat.byId);
  const ids = useSelector((s) => s.chat.ids);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () => ids.map((id) => byId[id]).filter((c) => !c.me.archived).map((c) => ({ conv: c, meta: conversationMeta(c, meId) }))
      .filter(({ meta }) => meta.title.toLowerCase().includes(query.toLowerCase())),
    [ids, byId, meId, query]
  );

  const close = () => { dispatch(forwardingSet(null)); setSelected([]); setQuery(''); };
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 10 ? [...s, id] : s));

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await chatService.forward(message._id, selected);
      toast.success(`Forwarded to ${data.forwarded} ${data.forwarded === 1 ? 'chat' : 'chats'}`);
      close();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!message} onClose={close} title="Forward message" description={message ? messagePreview(message).slice(0, 80) : ''}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button disabled={!selected.length} loading={busy} onClick={send}>Forward{selected.length ? ` (${selected.length})` : ''}</Button></>}>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input className="field pl-10" placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      <ul className="max-h-72 space-y-0.5 overflow-y-auto">
        {list.map(({ conv, meta }) => {
          const on = selected.includes(conv._id);
          return (
            <li key={conv._id}>
              <button onClick={() => toggle(conv._id)} className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition', on ? 'bg-brand/10' : 'hover:bg-surface-2')}>
                <Avatar src={meta.avatar} name={meta.title} isBot={meta.isAi} size="sm" />
                <span className="flex-1 truncate text-sm font-medium">{meta.title}</span>
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', on ? 'border-transparent bg-brand text-white' : 'border-line')}>{on && <Check className="h-3.5 w-3.5" />}</span>
              </button>
            </li>
          );
        })}
        {!list.length && <li className="py-8 text-center text-sm text-sub">No chats found</li>}
      </ul>
    </Modal>
  );
}
