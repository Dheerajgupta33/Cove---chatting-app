import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, MessageCircle, Sparkles, Users, UserCheck } from 'lucide-react';
import { BarChart } from './Charts';
import StatCard from './StatCard';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import { Skeleton } from '../common/Skeleton';
import { openAiChat, openDirectChat } from '../../features/chat/chatSlice';
import { userService } from '../../services/userService';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// Shown in the main pane on desktop when no conversation is open: stats, activity and shortcuts.
export default function DashboardHome() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { favorites, active } = useSelector((s) => s.friends);
  const [stats, setStats] = useState(null);

  useEffect(() => { userService.stats().then(({ data }) => setStats(data.stats)).catch(() => setStats(false)); }, []);

  const open = async (userId) => { const c = await dispatch(openDirectChat(userId)).unwrap().catch(() => null); if (c) navigate(`/app/chat/${c._id}`); };
  const askAi = async () => { const c = await dispatch(openAiChat()).unwrap().catch(() => null); if (c) navigate(`/app/chat/${c._id}`); };

  return (
    <div className="chat-wallpaper h-full overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-4xl font-extrabold">{greeting()}, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sub">Pick a chat on the left, or jump back in from here.</p>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats === null ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />) : (
            <>
              <StatCard icon={ArrowUpRight} label="Sent today" value={stats?.sentToday ?? 0} hint={`${stats?.messagesSent ?? 0} all time`} />
              <StatCard icon={ArrowDownLeft} label="Received today" value={stats?.receivedToday ?? 0} tone="teal" />
              <StatCard icon={MessageCircle} label="Conversations" value={stats?.conversations ?? 0} hint={`${stats?.groups ?? 0} groups`} tone="amber" />
              <StatCard icon={UserCheck} label="Friends" value={stats?.friends ?? 0} hint={`${stats?.mediaShared ?? 0} media shared`} tone="coral" />
            </>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <section className="rounded-2xl border border-line bg-surface p-5 lg:col-span-3">
            <h3 className="font-bold">Messages you sent this week</h3>
            <div className="mt-6">{stats ? <BarChart data={stats.days} /> : <Skeleton className="h-40" />}</div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white"><Sparkles className="h-5 w-5" /></span>
              <h3 className="font-bold">Cove AI</h3>
            </div>
            <p className="mt-3 text-sm text-sub">Draft a reply, summarise a long thread, or just think out loud with the built-in assistant.</p>
            <Button className="mt-4 w-full" onClick={askAi}>Start a chat</Button>
          </section>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[['Favorites', favorites, 'Add someone to favorites from their profile panel.'], ['Active now', active, 'When your friends are online they show up here.']].map(([title, list, empty]) => (
            <section key={title} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-brand" />{title}</h3>
              {list.length === 0 ? <p className="mt-3 text-sm text-sub">{empty}</p> : (
                <ul className="mt-3 space-y-1">
                  {list.slice(0, 5).map((u) => (
                    <li key={u._id}><button onClick={() => open(u._id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface-2"><Avatar src={u.avatar?.url} name={u.name} size="sm" online={u.isOnline} /><span className="truncate text-sm font-medium">{u.name}</span></button></li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
