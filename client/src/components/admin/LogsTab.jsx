import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Tabs from '../common/Tabs';
import Pagination, { Badge } from './Pagination';
import { adminService } from '../../services/adminService';
import { useDebounce } from '../../hooks/useDebounce';
import { fullDate } from '../../lib/time';

export default function LogsTab() {
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => { setPage(1); }, [level, debounced]);
  useEffect(() => { adminService.logs({ level, q: debounced, page }).then(({ data: d }) => setData(d)).catch(() => setData({ logs: [], pages: 0 })); }, [level, debounced, page]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" /><input className="field pl-10" placeholder="Filter by action, e.g. admin.ban" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <Tabs id="level" size="sm" value={level} onChange={setLevel} tabs={[{ id: 'all', label: 'All' }, { id: 'info', label: 'Info' }, { id: 'warn', label: 'Warn' }, { id: 'error', label: 'Error' }]} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-sub"><tr><th className="p-3 font-semibold">Time</th><th className="p-3 font-semibold">Level</th><th className="p-3 font-semibold">Action</th><th className="p-3 font-semibold">Who</th><th className="p-3 font-semibold">Details</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data?.logs.map((l) => (
              <tr key={l._id}>
                <td className="whitespace-nowrap p-3 text-xs text-sub">{fullDate(l.createdAt)}</td>
                <td className="p-3"><Badge tone={l.level === 'warn' ? 'amber' : l.level === 'error' ? 'red' : 'neutral'}>{l.level}</Badge></td>
                <td className="p-3 font-mono text-xs">{l.action}</td>
                <td className="p-3">{l.actor ? `@${l.actor.username}` : '-'}</td>
                <td className="max-w-xs truncate p-3 text-sub" title={l.message}>{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.logs.length && <p className="p-8 text-center text-sm text-sub">No log entries match.</p>}
      </div>
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </div>
  );
}
