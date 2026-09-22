import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { userService } from '../../services/userService';
import { cn, errorMessage } from '../../lib/utils';

const REASONS = [
  ['spam', 'Spam or unwanted promotion'], ['harassment', 'Harassment or bullying'], ['hate', 'Hate speech'],
  ['violence', 'Threats or violence'], ['nudity', 'Nudity or sexual content'], ['scam', 'Scam or fraud'], ['other', 'Something else'],
];

// Reports a person or a specific message to the moderation team.
export default function ReportModal({ open, onClose, targetUser, targetMessage, name }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await userService.report({ targetUser, targetMessage, reason, details });
      toast.success(data.message);
      setDetails('');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={targetMessage ? 'Report message' : `Report ${name || 'user'}`}
      description="Reports are reviewed by our moderators. The other person is not told who reported them."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={submit}>Send report</Button></>}
    >
      <div className="space-y-1.5">
        {REASONS.map(([id, label]) => (
          <label key={id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition', reason === id ? 'border-brand bg-brand/10' : 'border-line hover:bg-surface-2')}>
            <input type="radio" name="reason" checked={reason === id} onChange={() => setReason(id)} className="accent-[rgb(var(--brand))]" />
            {label}
          </label>
        ))}
      </div>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="Anything else we should know? (optional)" className="field mt-3 resize-none" />
    </Modal>
  );
}
