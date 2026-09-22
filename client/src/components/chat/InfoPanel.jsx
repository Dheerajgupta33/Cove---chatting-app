import { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Ban, Camera, Crown, FileText, Film, Flag, Heart, MoreVertical, Pin, Search, ShieldCheck, ShieldOff, UserMinus, UserPlus, X } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button, { IconButton } from '../common/Button';
import Menu from '../common/Menu';
import Modal from '../common/Modal';
import Tabs from '../common/Tabs';
import EmptyState from '../common/EmptyState';
import ConfirmDialog from '../common/ConfirmDialog';
import ReportModal from './ReportModal';
import UserPicker from './UserPicker';
import { useChat } from './ChatContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMessageActions } from '../../hooks/useMessageActions';
import { infoPanelClosed, infoTabSet } from '../../features/ui/uiSlice';
import { favoriteToggled } from '../../features/friends/friendsSlice';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import { lastSeenLabel, listTime } from '../../lib/time';
import { cn, errorMessage, messagePreview } from '../../lib/utils';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function Highlight({ text, query }) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRe(query.replace(/^#/, ''))})`, 'ig'));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-brand/25 px-0.5 text-inherit">{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

/* ---------------------------------------------------------------- About */
function AboutDirect() {
  const { meta } = useChat();
  const dispatch = useDispatch();
  const peer = meta.peer;
  const [info, setInfo] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [report, setReport] = useState(false);

  useEffect(() => {
    if (!peer?._id || meta.isAi) return;
    userService.get(peer._id).then(({ data }) => setInfo(data.user)).catch(() => {});
  }, [peer?._id, meta.isAi]);

  const run = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } };
  const favorite = () => run(async () => {
    const { data } = await userService.toggleFavorite(peer._id);
    setInfo((i) => ({ ...i, isFavorite: data.isFavorite }));
    dispatch(favoriteToggled({ user: peer, isFavorite: data.isFavorite }));
  });
  const addFriend = () => run(async () => { await userService.sendRequest(peer._id); setInfo((i) => ({ ...i, relationship: 'pending_sent' })); }, 'Friend request sent');
  const toggleBlock = () => run(async () => {
    if (info?.isBlocked) await userService.unblock(peer._id); else await userService.block(peer._id);
    setInfo((i) => ({ ...i, isBlocked: !i.isBlocked }));
    setConfirmBlock(false);
  }, info?.isBlocked ? 'Unblocked' : 'Blocked');

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar src={meta.avatar} name={meta.title} size="2xl" isBot={meta.isAi} online={meta.isAi ? undefined : Boolean(peer?.isOnline)} />
        <h3 className="mt-4 text-xl font-bold">{meta.title}</h3>
        {!meta.isAi && <p className="text-sm text-sub">@{peer?.username}</p>}
        <p className="mt-1 text-xs text-sub">{lastSeenLabel(peer)}</p>
        {(peer?.statusText || peer?.statusEmoji) && <p className="mt-3 rounded-full bg-surface-2 px-3 py-1.5 text-sm">{peer.statusEmoji} {peer.statusText}</p>}
      </div>
      {peer?.bio && <section><h4 className="mb-1 text-xs font-semibold text-sub">About</h4><p className="text-sm leading-relaxed">{peer.bio}</p></section>}
      {meta.isAi && <p className="rounded-2xl bg-brand/10 p-4 text-sm leading-relaxed">Cove AI can answer questions, draft messages and explain things. Your chat with it is private to you.</p>}

      {!meta.isAi && (
        <div className="space-y-2">
          <Button variant="secondary" className="w-full justify-start" onClick={favorite}><Heart className={cn('h-4 w-4', info?.isFavorite && 'fill-coral text-coral')} />{info?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</Button>
          {info?.relationship === 'none' && <Button variant="secondary" className="w-full justify-start" onClick={addFriend}><UserPlus className="h-4 w-4" />Add friend</Button>}
          {info?.relationship === 'pending_sent' && <Button variant="secondary" disabled className="w-full justify-start"><UserPlus className="h-4 w-4" />Friend request sent</Button>}
          {info?.relationship === 'friend' && <p className="px-1 text-sm text-sub">You are friends</p>}
          <Button variant="danger-ghost" className="w-full justify-start" onClick={() => (info?.isBlocked ? toggleBlock() : setConfirmBlock(true))}><Ban className="h-4 w-4" />{info?.isBlocked ? 'Unblock' : 'Block'} {meta.title.split(' ')[0]}</Button>
          <Button variant="danger-ghost" className="w-full justify-start" onClick={() => setReport(true)}><Flag className="h-4 w-4" />Report</Button>
        </div>
      )}
      <ConfirmDialog open={confirmBlock} onClose={() => setConfirmBlock(false)} danger title={`Block ${meta.title}?`} message="They won't be able to message you." confirmLabel="Block" onConfirm={toggleBlock} />
      {!meta.isAi && <ReportModal open={report} onClose={() => setReport(false)} targetUser={peer?._id} name={peer?.name} />}
    </div>
  );
}

function AboutGroup() {
  const { conv, meId } = useChat();
  const group = conv.group;
  const isOwner = group.owner === meId;
  const isAdmin = isOwner || group.admins?.includes(meId);
  const avatarInput = useRef(null);
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: group.name, description: group.description || '' });
  const [busy, setBusy] = useState(false);

  const run = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } };
  const save = () => run(async () => { setBusy(true); await chatService.updateGroup(group._id, form); setEditing(false); setBusy(false); }, 'Group updated').finally(() => setBusy(false));
  const addMembers = () => run(async () => { setBusy(true); await chatService.addMembers(group._id, picked.map((u) => u._id)); setAddOpen(false); setPicked([]); }, 'Members added').finally(() => setBusy(false));

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar src={group.avatar?.url} name={group.name} size="2xl" />
          {isAdmin && (
            <>
              <button onClick={() => avatarInput.current.click()} aria-label="Change group photo" className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-glow"><Camera className="h-4 w-4" /></button>
              <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) run(() => chatService.updateGroupAvatar(group._id, f), 'Group photo updated'); }} />
            </>
          )}
        </div>
        {editing ? (
          <div className="mt-4 w-full space-y-2 text-left">
            <input className="field" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Group name" />
            <textarea className="field resize-none" rows={3} maxLength={240} value={form.description} placeholder="What is this group about?" onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save</Button></div>
          </div>
        ) : (
          <>
            <h3 className="mt-4 text-xl font-bold">{group.name}</h3>
            <p className="mt-1 text-sm text-sub">{group.description || 'No description yet'}</p>
            {isAdmin && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(true)}>Edit details</Button>}
          </>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">{conv.participants.length} members</h4>
          {isAdmin && <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" />Add</Button>}
        </div>
        <ul className="space-y-0.5">
          {conv.participants.map((u) => {
            const owner = group.owner === u._id;
            const admin = owner || group.admins?.includes(u._id);
            return (
              <li key={u._id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                <Avatar src={u.avatar?.url} name={u.name} size="sm" online={u.isOnline} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.name}{u._id === meId && ' (you)'}</span>
                  <span className="block truncate text-xs text-sub">@{u.username}</span>
                </span>
                {owner ? <span title="Owner" className="text-amber-400"><Crown className="h-4 w-4" /></span> : admin && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">Admin</span>}
                {isAdmin && u._id !== meId && !owner && (
                  <Menu width="w-52" trigger={({ toggle }) => <IconButton label={`Manage ${u.name}`} className="h-8 w-8" onClick={toggle}><MoreVertical className="h-4 w-4" /></IconButton>}
                    items={[
                      { label: admin ? 'Remove admin' : 'Make admin', icon: admin ? ShieldOff : ShieldCheck, hidden: !isOwner, onClick: () => run(() => chatService.toggleAdmin(group._id, u._id)) },
                      { label: 'Remove from group', icon: UserMinus, danger: true, onClick: () => run(() => chatService.removeMember(group._id, u._id), 'Member removed') },
                    ]} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add members" footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button disabled={!picked.length} loading={busy} onClick={addMembers}>Add {picked.length || ''}</Button></>}>
        <UserPicker selected={picked} excludeIds={conv.participants.map((p) => p._id)} onToggle={(u) => setPicked((s) => (s.some((x) => x._id === u._id) ? s.filter((x) => x._id !== u._id) : [...s, u]))} />
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- Search */
function SearchTab() {
  const { conversationId, jump } = useChat();
  const seed = useSelector((s) => s.ui.infoPanel.query);
  const [query, setQuery] = useState(seed || '');
  const debounced = useDebounce(query.trim(), 350);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (seed) setQuery(seed); }, [seed]);
  useEffect(() => {
    if (!debounced) { setResults(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    chatService.search({ q: debounced, conversationId })
      .then(({ data }) => !cancelled && setResults(data.results))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debounced, conversationId]);

  return (
    <div className="p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input className="field pl-10" placeholder="Search messages or #hashtags" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      <div className="mt-3 space-y-1">
        {loading && <p className="py-6 text-center text-sm text-sub">Searching…</p>}
        {!loading && results?.length === 0 && <EmptyState compact icon={Search} title="No matches" description="Try a different word or a #hashtag." />}
        {!loading && !results && <p className="py-6 text-center text-sm text-sub">Type to search this conversation.</p>}
        {results?.map((r) => (
          <button key={r._id} onClick={() => jump(r._id)} className="block w-full rounded-xl p-3 text-left transition hover:bg-surface-2">
            <span className="flex items-center justify-between text-xs text-sub"><span className="font-semibold text-ink">{r.sender?.name}</span><span>{listTime(r.createdAt)}</span></span>
            <span className="mt-0.5 line-clamp-2 text-sm"><Highlight text={messagePreview(r)} query={debounced} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Pinned + media */
function PinnedTab() {
  const { conversationId, jump } = useChat();
  const pinned = useSelector((s) => s.chat.pinned[conversationId]) || [];
  const actions = useMessageActions();
  if (!pinned.length) return <EmptyState compact icon={Pin} title="Nothing pinned" description="Pin important messages from the message menu to keep them handy." />;
  return (
    <ul className="space-y-1 p-3">
      {pinned.map((m) => (
        <li key={m._id} className="flex items-start gap-2 rounded-xl p-2 hover:bg-surface-2">
          <button onClick={() => jump(m._id)} className="min-w-0 flex-1 text-left">
            <span className="block text-xs text-sub"><b className="text-ink">{m.sender?.name}</b> · {listTime(m.createdAt)}</span>
            <span className="line-clamp-3 text-sm">{messagePreview(m)}</span>
          </button>
          <IconButton label="Unpin" className="h-8 w-8" onClick={() => actions.pin(m)}><X className="h-4 w-4" /></IconButton>
        </li>
      ))}
    </ul>
  );
}

function MediaTab() {
  const { conversationId } = useChat();
  const [kind, setKind] = useState('media');
  const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    chatService.media(conversationId, kind).then(({ data }) => setItems(data.items)).catch(() => setItems([]));
  }, [conversationId, kind]);

  return (
    <div className="p-4">
      <Tabs id="media" size="sm" value={kind} onChange={setKind} tabs={[{ id: 'media', label: 'Photos & videos' }, { id: 'files', label: 'Files & audio' }]} />
      <div className="mt-3">
        {!items && <p className="py-6 text-center text-sm text-sub">Loading…</p>}
        {items?.length === 0 && <EmptyState compact icon={kind === 'media' ? Film : FileText} title="Nothing shared yet" description="Shared media will collect here." />}
        {kind === 'media' ? (
          <div className="grid grid-cols-3 gap-1.5">
            {items?.map((a) => (
              <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="relative aspect-square overflow-hidden rounded-xl bg-surface-3">
                {a.type === 'image' ? <img src={a.url} alt={a.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sub"><Film className="h-6 w-6" /></span>}
              </a>
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {items?.map((a) => (
              <li key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand"><FileText className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{a.name || 'Voice message'}</span><span className="text-xs text-sub">{a.sender?.name} · {listTime(a.createdAt)}</span></span></a></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Panel */
function Panel() {
  const dispatch = useDispatch();
  const { conv } = useChat();
  const tab = useSelector((s) => s.ui.infoPanel.tab);
  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <Tabs id="info" size="sm" className="flex-1" value={tab} onChange={(t) => dispatch(infoTabSet(t))} tabs={[{ id: 'about', label: conv.type === 'group' ? 'Group' : 'Profile' }, { id: 'search', label: 'Search' }, { id: 'pinned', label: 'Pinned' }, { id: 'media', label: 'Media' }]} />
        <IconButton label="Close panel" onClick={() => dispatch(infoPanelClosed())}><X className="h-5 w-5" /></IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'about' && (conv.type === 'group' ? <AboutGroup /> : <AboutDirect />)}
        {tab === 'search' && <SearchTab />}
        {tab === 'pinned' && <PinnedTab />}
        {tab === 'media' && <MediaTab />}
      </div>
    </div>
  );
}

// Side column on wide screens, slide-over drawer everywhere else.
export default function InfoPanel() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.infoPanel.open);
  const wide = useMediaQuery('(min-width: 1280px)');
  return (
    <AnimatePresence initial={false}>
      {open && wide && (
        <motion.aside key="side" initial={{ width: 0 }} animate={{ width: 350 }} exit={{ width: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} className="shrink-0 overflow-hidden border-l border-line">
          <div className="h-full w-[350px]"><Panel /></div>
        </motion.aside>
      )}
      {open && !wide && (
        <motion.div key="drawer" className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => dispatch(infoPanelClosed())} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} className="absolute inset-y-0 right-0 w-[min(390px,100vw)] shadow-pop">
            <Panel />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
