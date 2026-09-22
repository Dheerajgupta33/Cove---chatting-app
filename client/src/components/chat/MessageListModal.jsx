import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarClock, Star, X } from 'lucide-react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { IconButton } from '../common/Button';
import { chatService } from '../../services/chatService';
import { fullDate, listTime } from '../../lib/time';
import { errorMessage, messagePreview } from '../../lib/utils';

// Shared list for "Starred messages" and "Scheduled messages".
export default function MessageListModal({ open, onClose, kind }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const scheduled = kind === 'scheduled';

  useEffect(() => {
    if (!open) return;
    setItems(null);
    (scheduled ? chatService.scheduled() : chatService.starred()).then(({ data }) => setItems(data.results)).catch(() => setItems([]));
  }, [open, scheduled]);

  const cancel = async (id) => {
    try { await chatService.remove(id, 'everyone'); setItems((l) => l.filter((m) => m._id !== id)); toast.success('Scheduled message cancelled'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Modal open={open} onClose={onClose} title={scheduled ? 'Scheduled messages' : 'Starred messages'} size="lg">
      {!items && <p className="py-10 text-center text-sm text-sub">Loading…</p>}
      {items?.length === 0 && (
        <EmptyState compact icon={scheduled ? CalendarClock : Star} title={scheduled ? 'Nothing scheduled' : 'No starred messages'}
          description={scheduled ? 'Write a message and tap the clock to send it later.' : 'Star a message from its menu to save it here.'} />
      )}
      <ul className="space-y-1">
        {items?.map((m) => (
          <li key={m._id} className="flex items-start gap-2 rounded-xl p-2.5 hover:bg-surface-2">
            <button className="min-w-0 flex-1 text-left" disabled={scheduled} onClick={() => { onClose(); navigate(`/app/chat/${m.conversation}?msg=${m._id}`); }}>
              <span className="flex items-center justify-between gap-2 text-xs text-sub">
                <span className="truncate font-semibold text-ink">{scheduled ? `To ${m.conversationTitle}` : `${m.sender?.name} · ${m.conversationTitle}`}</span>
                <span className="shrink-0">{scheduled ? fullDate(m.scheduledFor) : listTime(m.createdAt)}</span>
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm">{messagePreview(m)}</span>
            </button>
            {scheduled && <IconButton label="Cancel scheduled message" className="h-8 w-8" onClick={() => cancel(m._id)}><X className="h-4 w-4" /></IconButton>}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
