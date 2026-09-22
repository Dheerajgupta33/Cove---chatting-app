import { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, MoreHorizontal } from 'lucide-react';
import Avatar from '../common/Avatar';
import Menu from '../common/Menu';
import { archivedSet } from '../../features/chat/chatSlice';
import { chatService } from '../../services/chatService';
import { conversationMeta } from '../../lib/chat';
import { listTime } from '../../lib/time';
import { cn, errorMessage, idOf, messagePreview } from '../../lib/utils';

const ConversationItem = memo(function ConversationItem({ conv, active, meId }) {
  const dispatch = useDispatch();
  const typing = Object.values(useSelector((s) => s.chat.typing[conv._id]) || {});
  const meta = conversationMeta(conv, meId);
  const lm = conv.lastMessage;
  const unread = conv.me.unread;
  const archived = conv.me.archived;

  const toggleArchive = async () => {
    try {
      await chatService.archive(conv._id, !archived);
      dispatch(archivedSet({ id: conv._id, archived: !archived }));
      toast.success(archived ? 'Chat restored' : 'Chat archived');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  let preview;
  if (typing.length) preview = <span className="text-brand">{meta.isGroup ? `${typing[0]} is typing…` : 'typing…'}</span>;
  else if (!lm) preview = <span className="italic">Say hello 👋</span>;
  else {
    const mine = idOf(lm.sender) === meId;
    const prefix = lm.type === 'system' ? '' : mine ? 'You: ' : meta.isGroup ? `${(lm.sender?.name || '').split(' ')[0]}: ` : '';
    preview = <>{prefix}{messagePreview(lm)}</>;
  }

  return (
    <div className="group relative px-2">
      <Link
        to={`/app/chat/${conv._id}`}
        aria-current={active ? 'page' : undefined}
        className={cn('flex items-center gap-3 rounded-2xl p-3 pr-4 transition', active ? 'bg-brand/12 ring-1 ring-brand/30' : 'hover:bg-surface-2')}
      >
        <Avatar src={meta.avatar} name={meta.title} size="lg" isBot={meta.isAi} online={!meta.isGroup && !meta.isAi ? Boolean(meta.peer?.isOnline) : undefined} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-[15px]', unread ? 'font-bold' : 'font-semibold')}>{meta.title}</span>
            {lm && <time className={cn('shrink-0 text-[11px]', unread ? 'font-semibold text-brand' : 'text-sub')}>{listTime(lm.createdAt)}</time>}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn('truncate text-sm', unread ? 'text-ink' : 'text-sub')}>{preview}</span>
            {unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
          </span>
        </span>
      </Link>
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 group-hover:block">
        <Menu width="w-48" trigger={({ toggle }) => <button aria-label="Chat options" onClick={toggle} className="glass-strong flex h-8 w-8 items-center justify-center rounded-lg text-sub hover:text-ink"><MoreHorizontal className="h-4 w-4" /></button>}
          items={[{ label: archived ? 'Unarchive' : 'Archive', icon: archived ? ArchiveRestore : Archive, onClick: toggleArchive }]} />
      </div>
    </div>
  );
});
export default ConversationItem;
