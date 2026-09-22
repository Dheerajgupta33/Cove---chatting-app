import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Bell, LogOut, MessageCircle, Settings, Shield, Users } from 'lucide-react';
import Avatar from '../common/Avatar';
import { LogoMark } from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';
import ErrorBoundary from '../common/ErrorBoundary';
import Button, { IconButton } from '../common/Button';
import CallOverlay from '../chat/CallOverlay';
import ForwardModal from '../chat/ForwardModal';
import { useSocketEvents } from '../../hooks/useSocketEvents';
import { logoutUser } from '../../features/auth/authSlice';
import { fetchConversations } from '../../features/chat/chatSlice';
import { fetchNotifications } from '../../features/notifications/notificationsSlice';
import { fetchActive, fetchFavorites, fetchFriends, fetchRequests } from '../../features/friends/friendsSlice';
import { settingsLoaded, themeSet } from '../../features/ui/uiSlice';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { selectUnreadTotal } from '../../lib/chat';
import { cn, errorMessage } from '../../lib/utils';

function RailLink({ to, icon: Icon, label, badge, end }) {
  return (
    <NavLink to={to} end={end} aria-label={label} title={label} className={({ isActive }) => cn('relative flex h-12 w-12 items-center justify-center rounded-2xl text-sub transition hover:bg-surface-2 hover:text-ink', isActive && 'text-brand')}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="rail-active" className="absolute inset-0 rounded-2xl bg-brand/15" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
          <Icon className="relative h-[22px] w-[22px]" />
          {badge > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{badge > 99 ? '99+' : badge}</span>}
        </>
      )}
    </NavLink>
  );
}

function TabLink({ to, icon: Icon, label, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand' : 'text-sub')}>
      <span className="relative"><Icon className="h-5 w-5" />{badge > 0 && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{badge > 99 ? '99+' : badge}</span>}</span>
      {label}
    </NavLink>
  );
}

// Authenticated frame: icon rail (desktop) / tab bar (mobile) + the routed page.
export default function AppShell() {
  useSocketEvents();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const unreadChats = useSelector(selectUnreadTotal);
  const unreadNotifs = useSelector((s) => s.notifications.unread);
  const incoming = useSelector((s) => s.friends.incoming.length);
  const inConversation = useMatch('/app/chat/:conversationId');
  const [resending, setResending] = useState(false);

  // Load everything the shell needs once.
  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchNotifications());
    dispatch(fetchFriends());
    dispatch(fetchRequests());
    dispatch(fetchFavorites());
    dispatch(fetchActive());
    userService.getSettings().then(({ data }) => {
      dispatch(settingsLoaded(data.settings));
      dispatch(themeSet(data.settings.theme));
    }).catch(() => {});
  }, [dispatch]);

  const resend = async () => {
    setResending(true);
    try { const { data } = await authService.resendVerification(); toast.success(data.message); } catch (e) { toast.error(errorMessage(e)); } finally { setResending(false); }
  };

  return (
    <div className="flex h-screen-safe flex-col bg-app md:flex-row">
      {/* Desktop rail */}
      <nav className="glass hidden w-[76px] shrink-0 flex-col items-center gap-2 border-y-0 border-l-0 py-4 md:flex" aria-label="Main">
        <NavLink to="/app/chat" className="mb-3" aria-label="Cove home"><LogoMark className="h-11 w-11 rounded-2xl" /></NavLink>
        <RailLink to="/app/chat" icon={MessageCircle} label="Chats" badge={unreadChats} />
        <RailLink to="/app/friends" icon={Users} label="Friends" badge={incoming} />
        <RailLink to="/app/notifications" icon={Bell} label="Notifications" badge={unreadNotifs} />
        {user.role === 'admin' && <RailLink to="/app/admin" icon={Shield} label="Admin" />}
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <RailLink to="/app/settings" icon={Settings} label="Settings" />
          <IconButton label="Sign out" onClick={() => dispatch(logoutUser()).then(() => navigate('/login'))}><LogOut className="h-5 w-5" /></IconButton>
          <NavLink to="/app/profile" aria-label="Your profile" className="mt-1 rounded-full transition hover:ring-brand"><Avatar src={user.avatar?.url} name={user.name} size="md" /></NavLink>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!user.isVerified && (
          <div className="flex items-center justify-center gap-3 bg-brand/15 px-4 py-2 text-sm">
            <span>Confirm your email to secure your account.</span>
            <Button size="sm" variant="secondary" loading={resending} onClick={resend}>Resend email</Button>
          </div>
        )}
        <main className="min-h-0 flex-1">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>

      {/* Mobile tab bar (hidden inside a conversation so the composer has room) */}
      {!inConversation && (
        <nav className="glass pb-safe flex border-x-0 border-b-0 md:hidden" aria-label="Main">
          <TabLink to="/app/chat" icon={MessageCircle} label="Chats" badge={unreadChats} />
          <TabLink to="/app/friends" icon={Users} label="Friends" badge={incoming} />
          <TabLink to="/app/notifications" icon={Bell} label="Alerts" badge={unreadNotifs} />
          <TabLink to="/app/settings" icon={Settings} label="Settings" />
          <TabLink to="/app/profile" icon={() => <Avatar src={user.avatar?.url} name={user.name} size="xs" />} label="You" />
        </nav>
      )}

      <CallOverlay />
      <ForwardModal />
    </div>
  );
}
