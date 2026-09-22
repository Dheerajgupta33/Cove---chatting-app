import { memo, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AlertCircle, Ban, Check, CheckCheck, Clock, Copy, Flag, Forward, MoreVertical, Pencil, Pin, PinOff, Reply, Smile, Star, Trash2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import { IconButton } from '../common/Button';
import Menu from '../common/Menu';
import Popover from '../common/Popover';
import ConfirmDialog from '../common/ConfirmDialog';
import ReactionPicker from './ReactionPicker';
import ReportModal from './ReportModal';
import { Attachments, PollView, RichText } from './MessageContent';
import { useChat } from './ChatContext';
import { useMessageActions } from '../../hooks/useMessageActions';
import { searchRequested } from '../../features/ui/uiSlice';
import { messageStatus, reactionGroups } from '../../lib/chat';
import { messageTime, fullDate } from '../../lib/time';
import { cn, idOf, messagePreview } from '../../lib/utils';

const NAME_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#22d3ee', '#f87171'];
const nameColor = (id = '') => NAME_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_COLORS.length];

function Ticks({ status }) {
  const label = { sending: 'Sending', failed: 'Failed', sent: 'Sent', delivered: 'Delivered', seen: 'Seen' }[status];
  const icon = {
    sending: <Clock className="h-3 w-3" />,
    failed: <AlertCircle className="h-3.5 w-3.5" />,
    sent: <Check className="h-3.5 w-3.5" />,
    delivered: <CheckCheck className="h-3.5 w-3.5" />,
    seen: <CheckCheck className="h-3.5 w-3.5 text-cyan-200" />,
  }[status];
  return <span title={label} aria-label={label} className="inline-flex">{icon}</span>;
}

function ReplyQuote({ reply, isOwn, onJump }) {
  const deleted = reply.deletedForEveryone;
  return (
    <button type="button" onClick={onJump} className={cn('mb-1.5 block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs', isOwn ? 'border-white/70 bg-white/15' : 'border-brand bg-brand/10')}>
      <span className={cn('block truncate font-semibold', isOwn ? 'text-white' : 'text-brand')}>{reply.sender?.name || 'Message'}</span>
      <span className={cn('block truncate', isOwn ? 'text-white/80' : 'text-sub', deleted && 'italic')}>{messagePreview(reply) || 'Message'}</span>
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({ message: m, isOwn, isGroup, showAvatar, showName, groupStart, groupEnd, meId, onMediaLoad }) {
  const dispatch = useDispatch();
  const actions = useMessageActions();
  const { jump } = useChat();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [active, setActive] = useState(false); // touch devices: tap a bubble to reveal its toolbar
  const pickerAnchor = useRef(null);
  const wrapper = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const off = (e) => { if (!wrapper.current?.contains(e.target)) setActive(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [active]);

  const sender = m.sender || {};
  const deleted = m.deletedForEveryone;
  const status = isOwn ? messageStatus(m) : null;
  const reactions = reactionGroups(m.reactions, meId);
  const canEdit = isOwn && !m._status && m.type !== 'poll' && !deleted;

  const menuItems = [
    { label: 'Reply', icon: Reply, onClick: () => actions.reply(m) },
    { label: 'Copy text', icon: Copy, onClick: () => actions.copy(m), hidden: !m.text },
    { label: 'Forward', icon: Forward, onClick: () => actions.forward(m) },
    { label: m.pinned ? 'Unpin' : 'Pin to chat', icon: m.pinned ? PinOff : Pin, onClick: () => actions.pin(m) },
    { label: m.isStarred ? 'Remove star' : 'Star message', icon: Star, onClick: () => actions.star(m) },
    { label: 'Edit', icon: Pencil, onClick: () => actions.startEdit(m), hidden: !canEdit },
    { divider: true },
    { label: 'Delete for me', icon: Trash2, danger: true, onClick: () => actions.remove(m, 'me') },
    { label: 'Delete for everyone', icon: Trash2, danger: true, hidden: !isOwn, onClick: () => setConfirmDelete(true) },
    { label: 'Report message', icon: Flag, danger: true, hidden: isOwn, onClick: () => setReportOpen(true) },
  ];

  return (
    <div id={`msg-${m._id}`} className={cn('flex gap-2 rounded-xl px-3 sm:px-6', isOwn ? 'justify-end' : 'justify-start', groupStart ? 'mt-3' : 'mt-0.5')}>
      {isGroup && !isOwn && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar && <Avatar src={sender.avatar?.url} name={sender.name} size="sm" />}
        </div>
      )}

      <div className={cn('flex max-w-[84%] flex-col sm:max-w-[68%]', isOwn ? 'items-end' : 'items-start')}>
        {showName && isGroup && !isOwn && <span className="mb-0.5 ml-3 text-xs font-semibold" style={{ color: nameColor(idOf(sender)) }}>{sender.name}</span>}

        <div ref={wrapper} className="group relative" onClick={() => setActive((a) => !a)}>
          <div
            className={cn(
              'relative rounded-2xl px-3 py-2 text-[15px] leading-relaxed shadow-sm transition',
              deleted ? 'bg-transparent italic text-sub ring-1 ring-line' : isOwn ? 'bg-bubble-own text-white' : 'bg-surface text-ink ring-1 ring-line/70',
              isOwn && groupEnd && 'rounded-br-md', !isOwn && groupEnd && 'rounded-bl-md',
              m._status === 'sending' && 'opacity-70', m._status === 'failed' && 'ring-2 ring-coral',
              m.pinned && !deleted && 'ring-1 ring-brand/60'
            )}
          >
            {deleted ? (
              <span className="inline-flex items-center gap-2 text-sm"><Ban className="h-4 w-4" /> This message was deleted</span>
            ) : (
              <>
                {m.forwardedFrom && (
                  <p className={cn('mb-1 flex items-center gap-1 text-xs italic', isOwn ? 'text-white/75' : 'text-sub')}>
                    <Forward className="h-3 w-3" /> Forwarded from {m.forwardedFrom.name}
                  </p>
                )}
                {m.replyTo && <ReplyQuote reply={m.replyTo} isOwn={isOwn} onJump={() => jump(idOf(m.replyTo))} />}
                {m.type === 'poll' && m.poll ? (
                  <PollView poll={m.poll} meId={meId} isOwn={isOwn} onVote={(i) => actions.vote(m, i)} />
                ) : (
                  <>
                    {m.attachments?.length > 0 && <Attachments attachments={m.attachments} isOwn={isOwn} onLoad={onMediaLoad} />}
                    {m.text && (
                      <p className={cn('whitespace-pre-wrap break-words', m.attachments?.length > 0 && 'mt-1.5')}>
                        <RichText text={m.text} isOwn={isOwn} onHashtag={(tag) => dispatch(searchRequested(tag))} />
                      </p>
                    )}
                  </>
                )}
                <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[11px]', isOwn ? 'text-white/75' : 'text-sub')}>
                  {m.pinned && <Pin className="h-3 w-3" aria-label="Pinned" />}
                  {m.isStarred && <Star className="h-3 w-3 fill-current" aria-label="Starred" />}
                  {m.edited && <span>edited</span>}
                  <time dateTime={m.createdAt} title={fullDate(m.createdAt)}>{messageTime(m.createdAt)}</time>
                  {status && <Ticks status={status} />}
                </div>
              </>
            )}
          </div>

          {/* Hover toolbar (tap a bubble on touch screens) */}
          {!deleted && !m._status && (
            <div className={cn('glass-strong absolute -top-4 z-10 flex items-center rounded-xl p-0.5 shadow-pop transition', isOwn ? 'right-2' : 'left-2', active ? 'opacity-100' : 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100')} onClick={(e) => e.stopPropagation()}>
              <span ref={pickerAnchor} className="inline-flex"><IconButton label="Add reaction" className="h-7 w-7" onClick={() => setPickerOpen(true)}><Smile className="h-4 w-4" /></IconButton></span>
              <IconButton label="Reply" className="h-7 w-7" onClick={() => actions.reply(m)}><Reply className="h-4 w-4" /></IconButton>
              <Menu trigger={({ toggle }) => <IconButton label="More actions" className="h-7 w-7" onClick={toggle}><MoreVertical className="h-4 w-4" /></IconButton>} items={menuItems} align={isOwn ? 'end' : 'start'} />
            </div>
          )}
        </div>

        {m._status === 'failed' && (
          <p className="mt-1 flex items-center gap-2 text-xs text-coral">
            <AlertCircle className="h-3.5 w-3.5" /> Not sent.
            <button className="font-semibold underline" onClick={() => actions.retry(m)}>Retry</button>
            <button className="font-semibold underline" onClick={() => actions.discard(m)}>Discard</button>
          </p>
        )}

        {reactions.length > 0 && !deleted && (
          <div className={cn('-mt-1 flex flex-wrap gap-1 px-2', isOwn && 'justify-end')}>
            {reactions.map((g) => (
              <button key={g.emoji} onClick={() => actions.react(m, g.emoji)} aria-label={`${g.emoji} ${g.count}`} className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition hover:scale-105', g.mine ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-surface')}>
                <span>{g.emoji}</span><span className="font-semibold">{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Popover open={pickerOpen} anchorRef={pickerAnchor} onClose={() => setPickerOpen(false)} align="start">
        <ReactionPicker onPick={(emoji) => { setPickerOpen(false); actions.react(m, emoji); }} />
      </Popover>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} danger title="Delete for everyone?" message="Everyone in this chat will see that the message was deleted. This can't be undone." confirmLabel="Delete" onConfirm={() => { setConfirmDelete(false); actions.remove(m, 'everyone'); }} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetMessage={m._id} name={sender.name} />
    </div>
  );
});

export default MessageBubble;
