import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircleOff, UploadCloud } from 'lucide-react';
import ChatHeader from './ChatHeader';
import PinnedBar from './PinnedBar';
import MessageList from './MessageList';
import Composer from './Composer';
import InfoPanel from './InfoPanel';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import { ChatContext } from './ChatContext';
import { useUploads } from '../../hooks/useUploads';
import { activeSet, editingSet, fetchConversation, fetchMessages, fetchPinned, markConversationRead, replyToSet } from '../../features/chat/chatSlice';
import { conversationMeta } from '../../lib/chat';

/** One open conversation: header, history, composer, drag & drop overlay and the details panel. */
export default function ChatWindow({ conversationId }) {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const meId = useSelector((s) => s.auth.user._id);
  const conv = useSelector((s) => s.chat.byId[conversationId]);
  const listReady = useSelector((s) => s.chat.status === 'ready');
  const initialized = useSelector((s) => s.chat.messages[conversationId]?.initialized);
  const uploader = useUploads();
  const [dragging, setDragging] = useState(false);
  const [missing, setMissing] = useState(false);

  // Register as the active chat, load history + pins, and reset transient composer state.
  useEffect(() => {
    dispatch(activeSet(conversationId));
    dispatch(replyToSet(null));
    dispatch(editingSet(null));
    setMissing(false);
    return () => { dispatch(activeSet(null)); };
  }, [conversationId, dispatch]);

  // Deep links / notifications can point at a conversation that is not in the list yet.
  useEffect(() => {
    if (!listReady || store.getState().chat.byId[conversationId]) return;
    dispatch(fetchConversation(conversationId)).unwrap().catch(() => setMissing(true));
  }, [listReady, conversationId, dispatch, store]);

  const exists = Boolean(conv);
  useEffect(() => {
    if (!exists) return;
    if (!store.getState().chat.messages[conversationId]?.initialized) dispatch(fetchMessages({ conversationId }));
    dispatch(fetchPinned(conversationId));
  }, [exists, conversationId, dispatch, store]);

  // Mark as read on open, on tab focus and whenever unread messages accumulate while looking at the chat.
  const unread = conv?.me.unread || 0;
  useEffect(() => {
    if (!exists) return undefined;
    const mark = () => document.visibilityState === 'visible' && dispatch(markConversationRead(conversationId));
    if (unread > 0 || initialized) mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [exists, initialized, unread, conversationId, dispatch]);

  // Scroll to a message, loading older pages until it appears (used by replies, pins and search).
  const jump = useCallback(async (messageId) => {
    for (let i = 0; i < 10; i += 1) {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('animate-flash');
        setTimeout(() => el.classList.remove('animate-flash'), 1700);
        return true;
      }
      if (!store.getState().chat.messages[conversationId]?.hasMore) break;
      try { await dispatch(fetchMessages({ conversationId })).unwrap(); } catch { break; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    toast('That message is too far back to jump to');
    return false;
  }, [conversationId, dispatch, store]);

  // ?msg=<id> (from global search / starred) jumps once history is ready.
  const target = params.get('msg');
  useEffect(() => {
    if (!target || !initialized) return;
    jump(target);
    setParams((p) => { p.delete('msg'); return p; }, { replace: true });
  }, [target, initialized, jump, setParams]);

  const meta = useMemo(() => conversationMeta(conv, meId), [conv, meId]);
  const ctx = useMemo(() => ({ conversationId, conv, meId, meta, jump, uploader }), [conversationId, conv, meId, meta, jump, uploader]);

  if (missing) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={MessageCircleOff} title="Conversation not found" description="It may have been removed, or you no longer have access." action={<Button onClick={() => navigate('/app/chat')}>Back to chats</Button>} />
      </div>
    );
  }
  if (!conv) return <div className="h-full" aria-busy="true" />;

  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  return (
    <ChatContext.Provider value={ctx}>
      <div className="flex h-full min-w-0">
        <section
          className="relative flex min-w-0 flex-1 flex-col"
          onDragEnter={(e) => hasFiles(e) && setDragging(true)}
          onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setDragging(false); uploader.addFiles(e.dataTransfer.files); }}
        >
          <ChatHeader />
          <PinnedBar />
          <MessageList />
          <Composer key={conversationId} />

          {dragging && (
            <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand bg-app/80 backdrop-blur-md">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-glow"><UploadCloud className="h-8 w-8" /></span>
              <p className="text-lg font-bold">Drop files to attach</p>
              <p className="text-sm text-sub">Images, video, audio and documents up to 25 MB</p>
            </div>
          )}
        </section>
        <InfoPanel />
      </div>
    </ChatContext.Provider>
  );
}
