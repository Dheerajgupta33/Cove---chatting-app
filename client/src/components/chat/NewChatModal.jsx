import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Sparkles, UserPlus, Users } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { fetchFriends } from '../../features/friends/friendsSlice';
import { openAiChat, openDirectChat } from '../../features/chat/chatSlice';
import { userService } from '../../services/userService';
import { useDebounce } from '../../hooks/useDebounce';
import { errorMessage } from '../../lib/utils';

// Start a direct chat with a friend or anyone found by name / @username.
export default function NewChatModal({ open, onClose, onNewGroup }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const friends = useSelector((s) => s.friends.friends);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [results, setResults] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { if (open) dispatch(fetchFriends()); }, [open, dispatch]);
  useEffect(() => {
    if (debounced.length < 2) { setResults(null); return undefined; }
    let cancelled = false;
    userService.search(debounced).then(({ data }) => !cancelled && setResults(data.users)).catch(() => !cancelled && setResults([]));
    return () => { cancelled = true; };
  }, [debounced]);

  const start = async (user) => {
    setBusyId(user._id);
    try {
      const conv = await dispatch(openDirectChat(user._id)).unwrap();
      onClose();
      navigate(`/app/chat/${conv._id}`);
    } catch (e) { toast.error(e?.message || 'Could not open chat'); } finally { setBusyId(null); }
  };
  const askAi = async () => {
    const conv = await dispatch(openAiChat()).unwrap().catch(() => null);
    if (conv) { onClose(); navigate(`/app/chat/${conv._id}`); }
  };
  const addFriend = async (e, user) => {
    e.stopPropagation();
    try { await userService.sendRequest(user._id); toast.success('Friend request sent'); setResults((r) => r?.map((u) => (u._id === user._id ? { ...u, relationship: 'pending_sent' } : u))); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const list = results ?? friends;
  return (
    <Modal open={open} onClose={onClose} title="New chat">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input className="field pl-10" placeholder="Search by name or @username" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      {!results && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button onClick={() => { onClose(); onNewGroup(); }} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left text-sm font-semibold transition hover:bg-surface-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand"><Users className="h-4 w-4" /></span>New group</button>
          <button onClick={askAi} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left text-sm font-semibold transition hover:bg-surface-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white"><Sparkles className="h-4 w-4" /></span>Ask Cove AI</button>
        </div>
      )}
      <h3 className="mb-1 mt-3 px-1 text-xs font-semibold text-sub">{results ? 'People' : 'Your friends'}</h3>
      <ul className="max-h-72 space-y-0.5 overflow-y-auto">
        {list.map((u) => (
          <li key={u._id}>
            <div role="button" tabIndex={0} onClick={() => start(u)} onKeyDown={(e) => e.key === 'Enter' && start(u)} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
              <Avatar src={u.avatar?.url} name={u.name} online={u.isOnline} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-sub">@{u.username}</span></span>
              {busyId === u._id ? <span className="text-xs text-sub">Opening…</span> : u.relationship === 'none' ? (
                <button onClick={(e) => addFriend(e, u)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"><UserPlus className="h-3.5 w-3.5" />Add</button>
              ) : u.relationship === 'pending_sent' ? <span className="text-xs text-sub">Requested</span> : null}
            </div>
          </li>
        ))}
        {!list.length && <li className="py-8 text-center text-sm text-sub">{results ? 'No one matches that search' : 'No friends yet. Search above to find people.'}</li>}
      </ul>
    </Modal>
  );
}
