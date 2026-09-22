import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../common/Button';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm text-sub">
      <IconButton label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" /></IconButton>
      <span>Page {page} of {pages}</span>
      <IconButton label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="h-4 w-4" /></IconButton>
    </div>
  );
}

export const Badge = ({ tone = 'neutral', children }) => {
  const tones = { neutral: 'bg-surface-3 text-sub', green: 'bg-emerald-500/15 text-emerald-500', red: 'bg-coral/15 text-coral', brand: 'bg-brand/15 text-brand', amber: 'bg-amber-400/20 text-amber-500' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
};
