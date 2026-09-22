import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Search } from 'lucide-react';
import Avatar from '../common/Avatar';
import { fetchFriends } from '../../features/friends/friendsSlice';
import { userService } from '../../services/userService';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../lib/utils';

// Multi-select list: your friends by default, or search everyone by name / @username.
export default function UserPicker({ selected, onToggle, excludeIds = [] }) {
  const dispatch = useDispatch();
  const friends = useSelector((s) => s.friends.friends);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [results, setResults] = useState(null);

  useEffect(() => { dispatch(fetchFriends()); }, [dispatch]);
  useEffect(() => {
    if (debounced.length < 2) { setResults(null); return undefined; }
    let cancelled = false;
    userService.search(debounced).then(({ data }) => !cancelled && setResults(data.users)).catch(() => !cancelled && setResults([]));
    return () => { cancelled = true; };
  }, [debounced]);

  const list = (results ?? friends).filter((u) => !excludeIds.includes(u._id));
  const isOn = (u) => selected.some((s) => s._id === u._id);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
        <input className="field pl-10" placeholder="Search people…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <button key={u._id} onClick={() => onToggle(u)} className="flex items-center gap-1.5 rounded-full bg-brand/15 py-1 pl-1 pr-2.5 text-xs font-semibold text-brand hover:bg-brand/25">
              <Avatar src={u.avatar?.url} name={u.name} size="xs" />{u.name.split(' ')[0]} ✕
            </button>
          ))}
        </div>
      )}
      <ul className="max-h-60 space-y-0.5 overflow-y-auto">
        {list.map((u) => (
          <li key={u._id}>
            <button onClick={() => onToggle(u)} className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-left transition', isOn(u) ? 'bg-brand/10' : 'hover:bg-surface-2')}>
              <Avatar src={u.avatar?.url} name={u.name} size="sm" online={u.isOnline} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.name}</span><span className="block truncate text-xs text-sub">@{u.username}</span></span>
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', isOn(u) ? 'border-transparent bg-brand text-white' : 'border-line')}>{isOn(u) && <Check className="h-3.5 w-3.5" />}</span>
            </button>
          </li>
        ))}
        {!list.length && (
          <li className="py-8 text-center text-sm text-sub">{results ? 'No one matches that search' : 'Add friends first, or search by name or username above'}</li>
        )}
      </ul>
    </div>
  );
}
