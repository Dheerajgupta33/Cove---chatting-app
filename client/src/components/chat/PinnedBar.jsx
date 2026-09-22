import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Pin, PinOff } from 'lucide-react';
import { IconButton } from '../common/Button';
import { useChat } from './ChatContext';
import { useMessageActions } from '../../hooks/useMessageActions';
import { messagePreview } from '../../lib/utils';

// Slim banner under the header. Clicking cycles through pinned messages and scrolls to each.
export default function PinnedBar() {
  const { conversationId, jump } = useChat();
  const pinned = useSelector((s) => s.chat.pinned[conversationId]) || [];
  const actions = useMessageActions();
  const [index, setIndex] = useState(0);
  if (!pinned.length) return null;
  const current = pinned[index % pinned.length];

  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface/70 px-3 py-1.5 backdrop-blur sm:px-5">
      <Pin className="h-4 w-4 shrink-0 text-brand" />
      <button className="min-w-0 flex-1 text-left" onClick={() => { jump(current._id); setIndex((i) => (i + 1) % pinned.length); }}>
        <span className="block text-[11px] font-semibold text-brand">Pinned message {pinned.length > 1 ? `${(index % pinned.length) + 1} of ${pinned.length}` : ''}</span>
        <span className="block truncate text-sm">{current.sender?.name}: {messagePreview(current)}</span>
      </button>
      <IconButton label="Unpin message" className="h-8 w-8" onClick={() => actions.pin(current)}><PinOff className="h-4 w-4" /></IconButton>
    </div>
  );
}
