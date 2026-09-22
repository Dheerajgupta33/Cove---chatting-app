import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Search, Trash2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import Button, { IconButton } from '../common/Button';
import EmptyState from '../common/EmptyState';
import Pagination, { Badge } from './Pagination';
import { adminService } from '../../services/adminService';
import { useDebounce } from '../../hooks/useDebounce';
import { conversationMeta } from '../../lib/chat';
import { listTime, messageTime } from '../../lib/time';
import { errorMessage, messagePreview } from '../../lib/utils';

const titleOf = (c) => (c.type === 'group' ? c.group?.name : c.type === 'ai' ? `AI · ${c.participants.find((p) => !p.isBot)?.name}` : c.participants.map((p) => p.name).join(' ↔ '));

function Viewer({ conv, onClose }) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (before) => {
    setLoading(true);
    try {
      const { data } = await adminService.conversationMessages(conv._id, before);
      setMessages((m) => (before ? [...data.messages, ...m] : data.messages));
      setHasMore(data.hasMore);
    } catch (e) { toast.error(errorMessage(e)); } finally { setLoading(false); }
  }, [conv._id]);
  useEffect(() => { load(); }, [load]);

  const remove = async (m) => {
    try { await adminService.removeMessage(m._id, 'Removed by moderator'); setMessages((l) => l.map((x) => (x._id === m._id ? { ...x, deletedForEveryone: true, text: '', attachments: [] } : x))); toast.success('Message removed'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Modal open onClose={onClose} title={titleOf(conv)} size="lg" description="Read-only. Opening a conversation is recorded in the audit log.">
      {hasMore && <div className="mb-3 text-center"><Button size="sm" variant="secondary" loading={loading} onClick={() => load(messages[0]._id)}>Load earlier</Button></div>}
      <ul className="space-y-2">
        {messages.map((m) => (
          <li key={m._id} className="group flex items-start gap-3 rounded-xl p-2 hover:bg-surface-2">
            <Avatar src={m.sender?.avatar?.url} name={m.sender?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-sub"><b className="text-ink">{m.sender?.name}</b> · {listTime(m.createdAt)} {messageTime(m.createdAt)}</p>
              <p className={`break-words text-sm ${m.deletedForEveryone ? 'italic text-sub' : ''}`}>{messagePreview(m) || '(empty)'}</p>
            </div>
            {!m.deletedForEveryone && m.type !== 'system' && <IconButton label="Remove message" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-coral" /></IconButton>}
          </li>
        ))}
      </ul>
      {!messages.length && !loading && <p className="py-8 text-center text-sm text-sub">No messages.</p>}
    </Modal>
  );
}

export default function ChatsTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => { setPage(1); }, [debounced]);
  useEffect(() => { adminService.conversations({ q: debounced, page }).then(({ data: d }) => setData(d)).catch(() => setData({ conversations: [], pages: 0 })); }, [debounced, page]);

  return (
    <div>
      <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" /><input className="field pl-10" placeholder="Find conversations by member name or username" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {data?.conversations.map((c) => (
          <li key={c._id} className="flex items-center gap-3 p-3.5">
            <Avatar src={conversationMeta(c, null).avatar} name={titleOf(c) || ''} isBot={c.type === 'ai'} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-semibold">{titleOf(c)} <Badge tone={c.type === 'group' ? 'brand' : 'neutral'}>{c.type}</Badge></p>
              <p className="truncate text-xs text-sub">{c.lastMessage ? messagePreview(c.lastMessage) : 'No messages'} · {listTime(c.lastMessageAt)}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setOpen(c)}><Eye className="h-4 w-4" />View</Button>
          </li>
        ))}
      </ul>
      {data && !data.conversations.length && <EmptyState compact icon={Search} title="No conversations found" />}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      {open && <Viewer conv={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
