import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Flag } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Tabs from '../common/Tabs';
import EmptyState from '../common/EmptyState';
import { Badge } from './Pagination';
import { adminService } from '../../services/adminService';
import { relative } from '../../lib/time';
import { errorMessage, messagePreview } from '../../lib/utils';

export default function ReportsTab() {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(() => { setReports(null); adminService.reports(status).then(({ data }) => setReports(data.reports)).catch(() => setReports([])); }, [status]);
  useEffect(() => { load(); }, [load]);

  const update = async (r, nextStatus, action = 'none') => {
    try { await adminService.updateReport(r._id, { status: nextStatus, action, note: notes[r._id] || '' }); toast.success('Report updated'); load(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div>
      <Tabs id="rstatus" size="sm" className="max-w-md" value={status} onChange={setStatus} tabs={[{ id: 'open', label: 'Open' }, { id: 'reviewing', label: 'Reviewing' }, { id: 'resolved', label: 'Resolved' }, { id: 'dismissed', label: 'Dismissed' }]} />
      <ul className="mt-4 space-y-3">
        {reports?.map((r) => (
          <li key={r._id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="red">{r.reason}</Badge>
              <span className="text-sub">reported by <b className="text-ink">{r.reporter?.name}</b> · {relative(r.createdAt)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <Avatar src={r.targetUser?.avatar?.url} name={r.targetUser?.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.targetUser?.name} <span className="font-normal text-sub">@{r.targetUser?.username}</span> {r.targetUser?.isBanned && <Badge tone="red">Banned</Badge>}</p>
                {r.targetMessage && <p className="mt-0.5 break-words text-sm text-sub">“{r.targetMessage.deletedForEveryone ? 'Message already removed' : messagePreview(r.targetMessage)}”</p>}
              </div>
            </div>
            {r.details && <p className="mt-3 text-sm">{r.details}</p>}
            {['open', 'reviewing'].includes(r.status) ? (
              <>
                <input className="field mt-3" placeholder="Resolution note (optional)" value={notes[r._id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [r._id]: e.target.value }))} maxLength={500} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === 'open' && <Button size="sm" variant="secondary" onClick={() => update(r, 'reviewing')}>Start review</Button>}
                  <Button size="sm" variant="outline" onClick={() => update(r, 'dismissed')}>Dismiss</Button>
                  <Button size="sm" onClick={() => update(r, 'resolved')}>Resolve</Button>
                  {r.targetMessage && !r.targetMessage.deletedForEveryone && <Button size="sm" variant="danger" onClick={() => update(r, 'resolved', 'delete_message')}>Remove message</Button>}
                  {r.targetUser && !r.targetUser.isBanned && <Button size="sm" variant="danger" onClick={() => update(r, 'resolved', 'ban_user')}>Ban user</Button>}
                </div>
              </>
            ) : r.resolutionNote && <p className="mt-3 text-sm text-sub">Note: {r.resolutionNote}</p>}
          </li>
        ))}
      </ul>
      {reports && !reports.length && <EmptyState icon={status === 'open' ? CheckCircle2 : Flag} title={status === 'open' ? 'No open reports' : 'Nothing here'} description={status === 'open' ? 'Great news - the queue is clear.' : 'Reports with this status will appear here.'} />}
    </div>
  );
}
