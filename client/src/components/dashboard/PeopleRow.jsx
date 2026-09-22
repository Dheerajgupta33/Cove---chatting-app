import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../common/Avatar';
import { openDirectChat } from '../../features/chat/chatSlice';

// Horizontal list of people (favorites / active now). Tap one to open the chat.
export default function PeopleRow({ title, users, showOnline = true }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  if (!users.length) return null;
  const open = async (u) => {
    try { const conv = await dispatch(openDirectChat(u._id)).unwrap(); navigate(`/app/chat/${conv._id}`); }
    catch (e) { toast.error(e?.message || 'Could not open chat'); }
  };
  return (
    <section aria-label={title}>
      <h3 className="mb-1.5 px-4 text-xs font-semibold text-sub">{title}</h3>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {users.map((u) => (
          <button key={u._id} onClick={() => open(u)} className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl py-1 transition hover:bg-surface-2" title={u.name}>
            <Avatar src={u.avatar?.url} name={u.name} size="md" online={showOnline ? Boolean(u.isOnline) : undefined} />
            <span className="w-full truncate text-center text-[11px] text-sub">{u.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
