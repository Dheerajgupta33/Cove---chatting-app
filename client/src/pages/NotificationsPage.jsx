import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AtSign, Bell, CheckCheck, Flag, Info, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import Button, { IconButton } from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Seo from '../components/common/Seo';
import { Skeleton } from '../components/common/Skeleton';
import { allNotificationsRead, notificationRead, notificationRemoved, notificationsCleared } from '../features/notifications/notificationsSlice';
import { userService } from '../services/userService';
import { relative } from '../lib/time';
import { cn } from '../lib/utils';

const ICONS = { mention: AtSign, friend_request: UserPlus, friend_accept: UserCheck, group: Users, report: Flag, system: Info };

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unread, status } = useSelector((s) => s.notifications);

  const open = (n) => {
    if (!n.read) { dispatch(notificationRead(n._id)); userService.readNotification(n._id).catch(() => {}); }
    if (n.conversation) navigate(`/app/chat/${n.conversation}`);
    else if (n.type === 'friend_request' || n.type === 'friend_accept') navigate('/app/friends');
  };

  return (
    <div className="h-full overflow-y-auto">
      <Seo title="Notifications" noindex />
      <div className="mx-auto max-w-2xl p-5 pb-24 md:p-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Notifications</h1>
            <p className="mt-1 text-sub">{unread ? `${unread} unread` : 'You are all caught up'}</p>
          </div>
          {items.length > 0 && (
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" disabled={!unread} onClick={() => { dispatch(allNotificationsRead()); userService.readAllNotifications().catch(() => {}); }}><CheckCheck className="h-4 w-4" />Mark all read</Button>
              <Button size="sm" variant="danger-ghost" onClick={() => { dispatch(notificationsCleared()); userService.clearNotifications().catch(() => {}); }}><Trash2 className="h-4 w-4" />Clear</Button>
            </div>
          )}
        </div>

        <ul className="mt-6 space-y-2">
          {status === 'loading' && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <li key={n._id} className={cn('group flex items-center gap-3 rounded-2xl border p-3.5 transition', n.read ? 'border-line bg-surface' : 'border-brand/30 bg-brand/8')}>
                <button onClick={() => open(n)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {n.from ? <Avatar src={n.from.avatar?.url} name={n.from.name} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon className="h-5 w-5" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    {n.body && <span className="block truncate text-sm text-sub">{n.body}</span>}
                    <span className="text-xs text-sub">{relative(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </button>
                <IconButton label="Dismiss" className="opacity-60 hover:opacity-100" onClick={() => { dispatch(notificationRemoved(n._id)); userService.deleteNotification(n._id).catch(() => {}); }}><X className="h-4 w-4" /></IconButton>
              </li>
            );
          })}
        </ul>
        {status !== 'loading' && items.length === 0 && <EmptyState icon={Bell} title="Nothing new" description="Mentions, friend requests and group invites will show up here." />}
      </div>
    </div>
  );
}
