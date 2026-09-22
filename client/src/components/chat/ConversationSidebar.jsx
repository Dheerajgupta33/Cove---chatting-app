import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, MessageSquarePlus, Search, Sparkles, Star, Users, X } from 'lucide-react';
import ConversationItem from './ConversationItem';
import NewChatModal from './NewChatModal';
import NewGroupModal from './NewGroupModal';
import MessageListModal from './MessageListModal';
import Menu from '../common/Menu';
import Tabs from '../common/Tabs';
import Button, { IconButton } from '../common/Button';
import EmptyState from '../common/EmptyState';
import Avatar from '../common/Avatar';
import { ConversationSkeleton } from '../common/Skeleton';
import PeopleRow from '../dashboard/PeopleRow';
import { openAiChat } from '../../features/chat/chatSlice';
import { chatService } from '../../services/chatService';
import { useDebounce } from '../../hooks/useDebounce';
import { conversationMeta } from '../../lib/chat';
import { listTime } from '../../lib/time';
import { cn, messagePreview } from '../../lib/utils';

export default function ConversationSidebar({ activeId, className }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const meId = useSelector((s) => s.auth.user._id);
  const { byId, ids, status } = useSelector((s) => s.chat);
  const { active, favorites } = useSelector((s) => s.friends);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 350);
  const [hits, setHits] = useState(null);
  const [modal, setModal] = useState(null); // chat | group | starred | scheduled

  const convs = useMemo(() => ids.map((id) => byId[id]), [ids, byId]);
  const unreadChats = convs.filter((c) => !c.me.archived && c.me.unread > 0).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return convs.filter((c) => {
      if (tab === 'archived' ? !c.me.archived : c.me.archived) return false;
      if (tab === 'unread' && !c.me.unread) return false;
      if (tab === 'groups' && c.type !== 'group') return false;
      return !q || conversationMeta(c, meId).title.toLowerCase().includes(q);
    });
  }, [convs, tab, query, meId]);

  // Slack-style: typing in the search box also searches inside message history.
  useEffect(() => {
    if (debounced.length < 2) { setHits(null); return undefined; }
    let cancelled = false;
    chatService.search({ q: debounced }).then(({ data }) => !cancelled && setHits(data.results)).catch(() => !cancelled && setHits([]));
    return () => { cancelled = true; };
  }, [debounced]);

  const askAi = async () => {
    const conv = await dispatch(openAiChat()).unwrap().catch(() => null);
    if (conv) navigate(`/app/chat/${conv._id}`);
  };
  const loading = status === 'idle' || status === 'loading';

  return (
    <aside className={cn('flex h-full min-h-0 flex-col border-r border-line bg-surface/60', className)} aria-label="Conversations">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="font-display text-2xl font-extrabold">Chats</h1>
        <div className="flex items-center gap-1">
          <IconButton label="New chat" onClick={() => setModal('chat')} className="bg-brand/12 text-brand hover:bg-brand/20"><MessageSquarePlus className="h-5 w-5" /></IconButton>
          <Menu trigger={({ toggle }) => <IconButton label="More options" onClick={toggle}><Sparkles className="h-5 w-5" /></IconButton>} items={[
            { label: 'Ask Cove AI', icon: Sparkles, onClick: askAi },
            { label: 'New group', icon: Users, onClick: () => setModal('group') },
            { divider: true },
            { label: 'Starred messages', icon: Star, onClick: () => setModal('starred') },
            { label: 'Scheduled messages', icon: CalendarClock, onClick: () => setModal('scheduled') },
          ]} />
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
          <input className="field pl-10 pr-9" placeholder="Search chats and messages" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search chats and messages" />
          {query && <button aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-sub hover:text-ink"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {!query && (
        <div className="space-y-2 pb-2">
          <PeopleRow title="Active now" users={active} />
          <PeopleRow title="Favorites" users={favorites} />
        </div>
      )}

      <div className="px-4 pb-2">
        <Tabs id="list" size="sm" value={tab} onChange={setTab} tabs={[
          { id: 'all', label: 'All' }, { id: 'unread', label: 'Unread', count: unreadChats }, { id: 'groups', label: 'Groups' },
          { id: 'archived', label: 'Archived' },
        ]} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-4">
        {loading ? <ConversationSkeleton /> : (
          <>
            {visible.map((c) => <ConversationItem key={c._id} conv={c} active={c._id === activeId} meId={meId} />)}

            {!visible.length && !query && (
              tab === 'all' ? (
                <EmptyState icon={MessageSquarePlus} title="No conversations yet" description="Find a friend, start a group, or say hi to the assistant." action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setModal('chat')}>Find people</Button><Button variant="outline" onClick={askAi}><Sparkles className="h-4 w-4" />Ask AI</Button></div>} />
              ) : (
                <EmptyState compact icon={tab === 'groups' ? Users : Star} title={tab === 'unread' ? "You're all caught up" : tab === 'groups' ? 'No groups yet' : 'Nothing archived'} description={tab === 'unread' ? 'New messages will show up here.' : tab === 'groups' ? 'Create one to chat with several people at once.' : 'Archived chats live here until someone writes again.'} />
              )
            )}
            {query && !visible.length && !hits?.length && <p className="px-6 py-8 text-center text-sm text-sub">No chats match “{query}”.</p>}

            {hits?.length > 0 && (
              <div className="mt-2 px-2">
                <h3 className="px-3 pb-1 pt-2 text-xs font-semibold text-sub">Messages</h3>
                {hits.map((m) => (
                  <button key={m._id} onClick={() => navigate(`/app/chat/${m.conversation}?msg=${m._id}`)} className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-surface-2">
                    <Avatar src={m.sender?.avatar?.url} name={m.sender?.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold">{m.conversationTitle}</span><span className="shrink-0 text-[11px] text-sub">{listTime(m.createdAt)}</span></span>
                      <span className="line-clamp-2 text-sm text-sub">{m.sender?.name}: {messagePreview(m)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <NewChatModal open={modal === 'chat'} onClose={() => setModal(null)} onNewGroup={() => setModal('group')} />
      <NewGroupModal open={modal === 'group'} onClose={() => setModal(null)} />
      <MessageListModal open={modal === 'starred' || modal === 'scheduled'} kind={modal} onClose={() => setModal(null)} />
    </aside>
  );
}
