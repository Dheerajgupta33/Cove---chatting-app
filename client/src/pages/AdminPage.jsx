import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { BarChart3, Flag, ScrollText, ShieldAlert, Users, MessagesSquare } from 'lucide-react';
import Seo from '../components/common/Seo';
import { getSocket } from '../services/socket';
import { cn } from '../lib/utils';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ChatsTab from '../components/admin/ChatsTab';
import ReportsTab from '../components/admin/ReportsTab';
import ModerationTab from '../components/admin/ModerationTab';
import LogsTab from '../components/admin/LogsTab';

const TABS = [
  { id: 'overview', label: 'Analytics', icon: BarChart3, Component: OverviewTab },
  { id: 'users', label: 'Users', icon: Users, Component: UsersTab },
  { id: 'chats', label: 'Chats', icon: MessagesSquare, Component: ChatsTab },
  { id: 'reports', label: 'Reports', icon: Flag, Component: ReportsTab },
  { id: 'moderation', label: 'Moderation', icon: ShieldAlert, Component: ModerationTab },
  { id: 'logs', label: 'System logs', icon: ScrollText, Component: LogsTab },
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [reportPing, setReportPing] = useState(0);
  const user = useSelector((s) => s.auth.user);
  const Active = TABS.find((t) => t.id === tab).Component;

  // Moderators are alerted live when someone files a report.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onReport = () => { setReportPing((n) => n + 1); toast('New report received', { icon: '🚩' }); };
    socket.on('admin:report', onReport);
    return () => socket.off('admin:report', onReport);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <Seo title="Admin" noindex />
      <div className="mx-auto max-w-6xl p-5 pb-24 md:p-10">
        <h1 className="font-display text-3xl font-extrabold">Admin dashboard</h1>
        <p className="mt-1 text-sub">Signed in as {user.name}. Actions here are recorded in the system log.</p>

        <nav className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto border-b border-line pb-px" aria-label="Admin sections">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'reports') setReportPing(0); }} aria-current={tab === t.id ? 'page' : undefined}
              className={cn('relative flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition', tab === t.id ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink')}>
              <t.icon className="h-4 w-4" />{t.label}
              {t.id === 'reports' && reportPing > 0 && <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">{reportPing}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-6" key={tab}><Active /></div>
      </div>
    </div>
  );
}
