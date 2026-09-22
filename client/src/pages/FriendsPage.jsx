import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, Check, Heart, MessageCircle, MoreVertical, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import Button, { IconButton } from '../components/common/Button';
import Menu from '../components/common/Menu';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import Seo from '../components/common/Seo';
import { openDirectChat } from '../features/chat/chatSlice';
import { fetchFavorites, fetchFriends, fetchRequests, favoriteToggled } from '../features/friends/friendsSlice';
import { userService } from '../services/userService';
import { useDebounce } from '../hooks/useDebounce';
import { errorMessage } from '../lib/utils';

function Row({ user, sub, children }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      <Avatar src={user.avatar?.url} name={user.name} size="lg" online={user.isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-sub">{sub || `@${user.username}`}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

export default function FriendsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { friends, incoming, outgoing, favorites } = useSelector((s) => s.friends);
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [results, setResults] = useState(null);
  const [blocked, setBlocked] = useState(null);

  useEffect(() => { dispatch(fetchFriends()); dispatch(fetchRequests()); dispatch(fetchFavorites()); }, [dispatch]);
  useEffect(() => { if (tab === 'blocked') userService.blocked().then(({ data }) => setBlocked(data.users)).catch(() => setBlocked([])); }, [tab]);
  useEffect(() => {
    if (debounced.length < 2) { setResults(null); return undefined; }
    let cancelled = false;
    userService.search(debounced).then(({ data }) => !cancelled && setResults(data.users)).catch(() => !cancelled && setResults([]));
    return () => { cancelled = true; };
  }, [debounced]);

  const run = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } };
  const refresh = () => { dispatch(fetchFriends()); dispatch(fetchRequests()); };
  const message = (u) => run(async () => { const c = await dispatch(openDirectChat(u._id)).unwrap(); navigate(`/app/chat/${c._id}`); });
  const favIds = new Set(favorites.map((f) => f._id));
  const patchResult = (id, changes) => setResults((r) => r?.map((u) => (u._id === id ? { ...u, ...changes } : u)));

  return (
    <div className="h-full overflow-y-auto">
      <Seo title="Friends" noindex />
      <div className="mx-auto max-w-3xl p-5 pb-24 md:p-10">
        <h1 className="font-display text-3xl font-extrabold">Friends</h1>
        <p className="mt-1 text-sub">Add people you know, keep favorites close and manage who can reach you.</p>

        <Tabs id="friends" className="mt-6" value={tab} onChange={setTab} tabs={[
          { id: 'friends', label: 'Friends' }, { id: 'requests', label: 'Requests', count: incoming.length }, { id: 'discover', label: 'Find people' }, { id: 'blocked', label: 'Blocked' },
        ]} />

        <ul className="mt-5 space-y-2">
          {tab === 'friends' && friends.map((u) => (
            <Row key={u._id} user={u}>
              <IconButton label={favIds.has(u._id) ? 'Remove favorite' : 'Add favorite'} onClick={() => run(async () => { const { data } = await userService.toggleFavorite(u._id); dispatch(favoriteToggled({ user: u, isFavorite: data.isFavorite })); })}>
                <Heart className={favIds.has(u._id) ? 'h-5 w-5 fill-coral text-coral' : 'h-5 w-5'} />
              </IconButton>
              <IconButton label="Message" onClick={() => message(u)}><MessageCircle className="h-5 w-5" /></IconButton>
              <Menu trigger={({ toggle }) => <IconButton label="More" onClick={toggle}><MoreVertical className="h-5 w-5" /></IconButton>} items={[
                { label: 'Unfriend', icon: UserMinus, onClick: () => run(async () => { await userService.unfriend(u._id); refresh(); }, 'Removed from friends') },
                { label: 'Block', icon: Ban, danger: true, onClick: () => run(async () => { await userService.block(u._id); refresh(); }, 'User blocked') },
              ]} />
            </Row>
          ))}

          {tab === 'requests' && (
            <>
              {incoming.map((r) => (
                <Row key={r._id} user={r.from} sub="wants to be friends">
                  <Button size="sm" onClick={() => run(async () => { await userService.acceptRequest(r._id); refresh(); }, 'Friend added')}><Check className="h-4 w-4" />Accept</Button>
                  <IconButton label="Decline" onClick={() => run(async () => { await userService.rejectRequest(r._id); refresh(); })}><X className="h-5 w-5" /></IconButton>
                </Row>
              ))}
              {outgoing.map((r) => (
                <Row key={r._id} user={r.to} sub="request sent">
                  <Button size="sm" variant="secondary" onClick={() => run(async () => { await userService.cancelRequest(r._id); refresh(); })}>Cancel</Button>
                </Row>
              ))}
            </>
          )}

          {tab === 'discover' && (
            <>
              <div className="relative mb-3 list-none">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
                <input className="field pl-10" placeholder="Search by name or @username" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              </div>
              {results?.map((u) => (
                <Row key={u._id} user={u}>
                  {u.relationship === 'none' && <Button size="sm" onClick={() => run(async () => { await userService.sendRequest(u._id); patchResult(u._id, { relationship: 'pending_sent' }); dispatch(fetchRequests()); }, 'Request sent')}><UserPlus className="h-4 w-4" />Add</Button>}
                  {u.relationship === 'pending_sent' && <span className="text-sm text-sub">Requested</span>}
                  {u.relationship === 'pending_received' && <Button size="sm" onClick={() => setTab('requests')}>Respond</Button>}
                  <IconButton label="Message" onClick={() => message(u)}><MessageCircle className="h-5 w-5" /></IconButton>
                </Row>
              ))}
            </>
          )}

          {tab === 'blocked' && blocked?.map((u) => (
            <Row key={u._id} user={u}>
              <Button size="sm" variant="secondary" onClick={() => run(async () => { await userService.unblock(u._id); setBlocked((l) => l.filter((x) => x._id !== u._id)); }, 'Unblocked')}>Unblock</Button>
            </Row>
          ))}
        </ul>

        {tab === 'friends' && friends.length === 0 && <EmptyState icon={Users} title="No friends yet" description="Search for people you know and send a request." action={<Button onClick={() => setTab('discover')}>Find people</Button>} />}
        {tab === 'requests' && !incoming.length && !outgoing.length && <EmptyState icon={UserPlus} title="No pending requests" description="Requests you send or receive will appear here." />}
        {tab === 'discover' && !results && <EmptyState compact icon={Search} title="Search for people" description="Type at least two letters of a name or username." />}
        {tab === 'discover' && results?.length === 0 && <EmptyState compact icon={Search} title="No one found" description="Check the spelling or try a username." />}
        {tab === 'blocked' && blocked?.length === 0 && <EmptyState icon={Ban} title="Nobody is blocked" description="People you block can't message you or send requests." />}
      </div>
    </div>
  );
}
