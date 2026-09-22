import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Loader2, MessageCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import EmptyState from '../common/EmptyState';
import { MessagesSkeleton } from '../common/Skeleton';
import { useChat } from './ChatContext';
import { fetchMessages } from '../../features/chat/chatSlice';
import { dayLabel, isSameDay, minutesBetween } from '../../lib/time';
import { cn, idOf } from '../../lib/utils';

const GROUP_WINDOW_MIN = 5; // consecutive messages from one sender within 5 minutes form a visual group

export default function MessageList() {
  const { conversationId, conv, meId, meta } = useChat();
  const dispatch = useDispatch();
  const bucket = useSelector((s) => s.chat.messages[conversationId]);
  const typing = useSelector((s) => s.chat.typing[conversationId]);
  const scrollRef = useRef(null);
  const topRef = useRef(null);
  const stick = useRef(true); // is the user pinned to the bottom?
  const snap = useRef({ firstId: null, lastId: null, height: 0, top: 0, conv: null });
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const items = bucket?.items || [];
  const isGroup = conv.type === 'group';

  // Turn the flat message array into rows: day separators, system notes and bubbles with grouping info.
  const rows = useMemo(() => {
    const out = [];
    items.forEach((m, i) => {
      const prev = items[i - 1];
      const next = items[i + 1];
      if (!prev || !isSameDay(prev.createdAt, m.createdAt)) out.push({ kind: 'day', key: `day-${m.clientId || m._id}`, date: m.createdAt });
      if (m.type === 'system') { out.push({ kind: 'system', key: m._id, message: m }); return; }
      const joins = (o) => o && o.type !== 'system' && idOf(o.sender) === idOf(m.sender) && isSameDay(o.createdAt, m.createdAt) && minutesBetween(o.createdAt, m.createdAt) < GROUP_WINDOW_MIN;
      const groupStart = !joins(prev);
      out.push({ kind: 'msg', key: m.clientId || m._id, message: m, groupStart, groupEnd: !joins(next), showName: groupStart, showAvatar: !joins(next) });
    });
    return out;
  }, [items]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setNewCount(0);
  }, []);

  const firstId = items[0]?._id;
  const lastId = items[items.length - 1]?._id;
  const lastKey = items[items.length - 1]?.clientId || lastId;

  // Keep the viewport stable: open at the bottom, follow new messages, and don't jump when older pages are prepended.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const s = snap.current;
    if (s.conv !== conversationId) {
      el.scrollTop = el.scrollHeight;
      stick.current = true;
    } else if (s.firstId && firstId !== s.firstId && lastKey === s.lastId) {
      el.scrollTop = el.scrollHeight - s.height + s.top; // older page prepended
    } else if (lastKey !== s.lastId) {
      const last = items[items.length - 1];
      if (stick.current || idOf(last?.sender) === meId) el.scrollTo({ top: el.scrollHeight, behavior: s.lastId ? 'smooth' : 'auto' });
      else setNewCount((c) => c + 1);
    }
    snap.current = { ...s, firstId, lastId: lastKey, conv: conversationId, height: el.scrollHeight, top: el.scrollTop };
  }, [firstId, lastKey, conversationId, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = scrollRef.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < 140;
    setShowJump(distance > 420);
    if (stick.current) setNewCount(0);
  };

  // Infinite history: when the sentinel at the top becomes visible, load the previous page.
  const canLoadMore = bucket?.initialized && bucket.hasMore && !bucket.loading;
  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (el) snap.current = { ...snap.current, height: el.scrollHeight, top: el.scrollTop };
    dispatch(fetchMessages({ conversationId }));
  }, [dispatch, conversationId]);

  useEffect(() => {
    if (!canLoadMore || !topRef.current) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadOlder(), { root: scrollRef.current, rootMargin: '240px 0px 0px 0px' });
    io.observe(topRef.current);
    return () => io.disconnect();
  }, [canLoadMore, loadOlder, items.length]);

  const onMediaLoad = useCallback(() => { if (stick.current) scrollToBottom('auto'); }, [scrollToBottom]);
  const typingNames = Object.values(typing || {});

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="chat-wallpaper h-full overflow-y-auto overscroll-contain pb-3 pt-2" role="log" aria-live="polite" aria-label="Messages">
        <div ref={topRef} className="h-px" />
        {bucket?.loading && items.length > 0 && <div className="flex justify-center py-3 text-sub"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {bucket && !bucket.hasMore && items.length > 0 && <p className="py-4 text-center text-xs text-sub">This is the start of your conversation</p>}

        {!bucket?.initialized ? (
          <MessagesSkeleton />
        ) : items.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No messages yet" description={meta.isAi ? 'Ask Cove AI anything to get started.' : `Say hello to ${meta.title} and start the conversation.`} />
        ) : (
          rows.map((row) =>
            row.kind === 'day' ? (
              <div key={row.key} className="sticky top-1 z-[5] my-3 flex justify-center">
                <span className="glass rounded-full px-3 py-1 text-xs font-medium text-sub shadow-sm">{dayLabel(row.date)}</span>
              </div>
            ) : row.kind === 'system' ? (
              <div key={row.key} className="my-2 flex justify-center px-4">
                <span className="rounded-full bg-surface-2/80 px-3 py-1 text-center text-xs text-sub">{row.message.text}</span>
              </div>
            ) : (
              <MessageBubble
                key={row.key}
                message={row.message}
                isOwn={idOf(row.message.sender) === meId}
                isGroup={isGroup}
                showName={row.showName}
                showAvatar={row.showAvatar}
                groupStart={row.groupStart}
                groupEnd={row.groupEnd}
                meId={meId}
                onMediaLoad={onMediaLoad}
              />
            )
          )
        )}
        <TypingIndicator names={typingNames} isGroup={isGroup} />
      </div>

      <AnimatePresence>
        {(showJump || newCount > 0) && (
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            onClick={() => scrollToBottom()}
            className={cn('glass-strong absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold shadow-pop', newCount > 0 && 'text-brand')}
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="h-4 w-4" />
            {newCount > 0 && <span>{newCount} new</span>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
