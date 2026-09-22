import { useEffect, useState } from 'react';
import { Ban, Flag, MessageSquare, MessagesSquare, Radio, Users } from 'lucide-react';
import StatCard from '../dashboard/StatCard';
import { AreaChart, BarChart } from '../dashboard/Charts';
import Avatar from '../common/Avatar';
import { Skeleton } from '../common/Skeleton';
import { adminService } from '../../services/adminService';

export default function OverviewTab() {
  const [data, setData] = useState(null);
  useEffect(() => { adminService.stats().then(({ data: d }) => setData(d)).catch(() => setData(false)); }, []);
  if (data === null) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  if (!data) return <p className="text-sm text-sub">Could not load analytics.</p>;
  const t = data.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Users} label="Users" value={t.users.toLocaleString()} hint={`${t.verified} verified`} />
        <StatCard icon={Radio} label="Online now" value={t.online} tone="teal" />
        <StatCard icon={MessageSquare} label="Messages" value={t.messages.toLocaleString()} tone="amber" />
        <StatCard icon={MessagesSquare} label="Conversations" value={t.conversations.toLocaleString()} hint={`${t.groups} groups`} />
        <StatCard icon={Flag} label="Open reports" value={t.openReports} tone="coral" />
        <StatCard icon={Ban} label="Banned" value={t.banned} tone="coral" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5"><h3 className="mb-4 font-bold">New sign-ups (14 days)</h3><AreaChart data={data.signups} color="var(--brand-2)" /></section>
        <section className="rounded-2xl border border-line bg-surface p-5"><h3 className="mb-4 font-bold">Messages per day (14 days)</h3><BarChart data={data.messagesPerDay} /></section>
      </div>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="mb-3 font-bold">Most active members</h3>
        <ul className="divide-y divide-line">
          {data.topSenders.map((u, i) => (
            <li key={u._id} className="flex items-center gap-3 py-2.5"><span className="w-5 text-sm text-sub">{i + 1}</span><Avatar src={u.avatar?.url} name={u.name} size="sm" /><span className="flex-1 truncate text-sm font-medium">{u.name} <span className="text-sub">@{u.username}</span></span><span className="text-sm font-semibold tabular-nums">{u.activity?.messagesSent ?? 0}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
