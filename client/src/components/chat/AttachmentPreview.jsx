import { FileText, Film, Music, X, AlertCircle } from 'lucide-react';
import { cn, formatBytes } from '../../lib/utils';

// Staged files with live upload progress, shown above the input.
export default function AttachmentPreview({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto py-1">
      {items.map((i) => {
        const Icon = i.file.type.startsWith('video/') ? Film : i.file.type.startsWith('audio/') ? Music : FileText;
        return (
          <div key={i.id} className={cn('relative flex h-16 shrink-0 items-center gap-2 overflow-hidden rounded-xl border bg-surface-2 pr-8', i.preview ? 'w-16 pr-0' : 'w-48 px-2.5', i.status === 'error' ? 'border-coral' : 'border-line')}>
            {i.preview ? <img src={i.preview} alt="" className="h-full w-full object-cover" /> : (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{i.file.name}</span>
                  <span className="text-[11px] text-sub">{i.status === 'error' ? 'Upload failed' : formatBytes(i.file.size)}</span>
                </span>
              </>
            )}
            {i.status === 'uploading' && <span className="absolute inset-x-0 bottom-0 h-1 bg-brand-gradient transition-all" style={{ width: `${i.progress}%` }} />}
            {i.status === 'error' && <AlertCircle className="absolute left-1 top-1 h-4 w-4 text-coral" />}
            <button onClick={() => onRemove(i.id)} aria-label={`Remove ${i.file.name}`} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><X className="h-3 w-3" /></button>
          </div>
        );
      })}
    </div>
  );
}
