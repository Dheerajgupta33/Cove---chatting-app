import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, MoreVertical, Search, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import Avatar from '../common/Avatar';
import Tabs from '../common/Tabs';
import Menu from '../common/Menu';
import { IconButton } from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import Pagination, { Badge } from './Pagination';
import { adminService } from '../../services/adminService';
import { useDebounce } from '../../hooks/useDebounce';
import { relative } from '../../lib/time';
import { errorMessage } from '../../lib/utils';

export default function UsersTab() {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => adminService.users({ q: debounced, status, page }).then(({ data: d }) => setData(d)).catch(() => setData({ users: [], pages: 0 })), [debounced, status, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, status]);

  const run = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errorMessage(e)); } };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" /><input className="field pl-10" placeholder="Search name, username or email" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <Tabs id="ustatus" size="sm" value={status} onChange={setStatus} tabs={[{ id: 'all', label: 'All' }, { id: 'online', label: 'Online' }, { id: 'unverified', label: 'Unverified' }, { id: 'banned', label: 'Banned' }]} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {data?.users.map((u) => (
            <li key={u._id} className="flex items-center gap-3 p-3.5">
              <Avatar src={u.avatar?.url} name={u.name} online={u.isOnline} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold">{u.name} <span className="font-normal text-sub">@{u.username}</span>
                  {u.role === 'admin' && <Badge tone="brand">Admin</Badge>}{u.isBanned && <Badge tone="red">Banned</Badge>}{!u.isVerified && <Badge tone="amber">Unverified</Badge>}</p>
                <p className="truncate text-xs text-sub">{u.email} · joined {relative(u.createdAt)} · {u.activity?.messagesSent ?? 0} messages</p>
                {u.isBanned && u.banReason && <p className="text-xs text-coral">Reason: {u.banReason}</p>}
              </div>
              {(
                <Menu trigger={({ toggle }) => <IconButton label={`Actions for ${u.name}`} onClick={toggle}><MoreVertical className="h-5 w-5" /></IconButton>} items={[
                  { label: 'Ban user', icon: Ban, danger: true, hidden: u.isBanned || u.role === 'admin', onClick: () => { setBanTarget(u); setReason(''); } },
                  { label: 'Unban user', icon: UserCheck, hidden: !u.isBanned, onClick: () => run(() => adminService.unban(u._id), 'User unbanned') },
                  { label: u.role === 'admin' ? 'Remove admin role' : 'Make admin', icon: u.role === 'admin' ? ShieldOff : ShieldCheck, onClick: () => run(() => adminService.setRole(u._id, u.role === 'admin' ? 'user' : 'admin'), 'Role updated') },
                ]} />
              )}
            </li>
          ))}
        </ul>
        {data && !data.users.length && <EmptyState compact icon={Search} title="No users found" description="Try another search or filter." />}
      </div>
      <Pagination page={page} pages={data?.pages} onChange={setPage} />

      <ConfirmDialog open={!!banTarget} onClose={() => setBanTarget(null)} danger title={`Ban @${banTarget?.username}?`} confirmLabel="Ban user"
        message="They will be signed out immediately and cannot sign in until unbanned."
        onConfirm={() => { const id = banTarget._id; setBanTarget(null); run(() => adminService.ban(id, reason), 'User banned'); }}>
        <input className="field mt-3" placeholder="Reason (shown to the user)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>
    </div>
  );
}
