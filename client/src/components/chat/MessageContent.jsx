import { memo, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, FileText, Pause, Play, X } from 'lucide-react';
import { cn, formatBytes, formatDuration, idOf } from '../../lib/utils';

/* ------------------------------------------------------------------ text */

// URLs, @mentions and #hashtags become interactive; everything else stays plain text (React escapes it).
const TOKEN = /(https?:\/\/[^\s<]+|@[a-z0-9_]{3,20}|#[\p{L}\p{N}_]{2,50})/giu;

export const RichText = memo(function RichText({ text, isOwn, onHashtag }) {
  const parts = text.split(TOKEN); // odd indexes are the captured tokens
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith('http')) {
          const trail = part.match(/[.,!?;:)]+$/)?.[0] || '';
          const url = trail ? part.slice(0, -trail.length) : part;
          return (
            <span key={i}>
              <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline underline-offset-2 hover:opacity-80">{url}</a>
              {trail}
            </span>
          );
        }
        if (part.startsWith('@')) {
          return <span key={i} className={cn('rounded-md px-1 font-semibold', isOwn ? 'bg-white/20' : 'bg-brand/15 text-brand')}>{part}</span>;
        }
        return (
          <button key={i} type="button" onClick={() => onHashtag?.(part)} className={cn('font-semibold underline-offset-2 hover:underline', isOwn ? 'text-white' : 'text-brand')}>
            {part}
          </button>
        );
      })}
    </>
  );
});

/* ------------------------------------------------------------------ audio / voice notes */

export function AudioPlayer({ src, duration = 0, isOwn }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration);

  // Decorative waveform, stable per file.
  const bars = useMemo(() => {
    const seed = [...src].reduce((a, c) => a + c.charCodeAt(0), 0) % 97;
    return Array.from({ length: 30 }, (_, i) => 22 + Math.abs(Math.sin((i + 1) * (seed / 9 + 1.3))) * 78);
  }, [src]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (audio.current && total) audio.current.currentTime = ratio * total;
  };
  const progress = total ? time / total : 0;

  return (
    <div className="flex w-56 items-center gap-3 sm:w-64">
      <audio
        ref={audio} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(0); }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
      />
      <button onClick={toggle} aria-label={playing ? 'Pause voice message' : 'Play voice message'} className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isOwn ? 'bg-white/25 text-white' : 'bg-brand text-white')}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-8 cursor-pointer items-center gap-[2px]" onClick={seek} role="slider" aria-label="Seek" aria-valuenow={Math.round(progress * 100)}>
          {bars.map((h, i) => (
            <span key={i} className={cn('w-[3px] rounded-full transition-colors', i / bars.length < progress ? (isOwn ? 'bg-white' : 'bg-brand') : isOwn ? 'bg-white/40' : 'bg-sub/40')} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className={cn('text-[11px] tabular-nums', isOwn ? 'text-white/80' : 'text-sub')}>{formatDuration(playing || time ? time : total)}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ images / video / files */

function Lightbox({ item, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="absolute right-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a href={item.url} download={item.name} target="_blank" rel="noopener noreferrer" aria-label="Download" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><Download className="h-5 w-5" /></a>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
      </div>
      <img src={item.url} alt={item.name || 'Shared image'} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}

function MediaGrid({ items, onLoad }) {
  const [open, setOpen] = useState(null);
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  return (
    <>
      <div className={cn('grid gap-1 overflow-hidden rounded-xl', shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {shown.map((a, i) =>
          a.type === 'video' ? (
            <video key={a.url} src={a.url} controls preload="metadata" onLoadedMetadata={onLoad} className="max-h-72 w-full rounded-lg bg-black object-cover" />
          ) : (
            <button key={a.url} type="button" onClick={() => setOpen(a)} className="relative block overflow-hidden" aria-label={`Open ${a.name || 'image'}`}>
              <img src={a.url} alt={a.name || 'Shared image'} loading="lazy" onLoad={onLoad} className={cn('w-full object-cover transition hover:brightness-90', shown.length === 1 ? 'max-h-80 min-h-24' : 'h-32 sm:h-36')} />
              {extra > 0 && i === 3 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white">+{extra}</span>}
            </button>
          )
        )}
      </div>
      {open && <Lightbox item={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function FileCard({ a, isOwn }) {
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer" download={a.name} className={cn('flex w-60 items-center gap-3 rounded-xl p-2.5 transition sm:w-64', isOwn ? 'bg-white/15 hover:bg-white/25' : 'bg-surface-3/60 hover:bg-surface-3')}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', isOwn ? 'bg-white/20' : 'bg-brand/15 text-brand')}><FileText className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{a.name || 'File'}</span>
        <span className={cn('text-xs', isOwn ? 'text-white/70' : 'text-sub')}>{formatBytes(a.size)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}

export function Attachments({ attachments = [], isOwn, onLoad }) {
  const media = attachments.filter((a) => a.type === 'image' || a.type === 'video');
  return (
    <div className="space-y-1.5">
      {media.length > 0 && <MediaGrid items={media} onLoad={onLoad} />}
      {attachments.filter((a) => a.type === 'audio').map((a) => <AudioPlayer key={a.url} src={a.url} duration={a.duration} isOwn={isOwn} />)}
      {attachments.filter((a) => a.type === 'file').map((a) => <FileCard key={a.url} a={a} isOwn={isOwn} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ polls */

export function PollView({ poll, meId, isOwn, onVote }) {
  const total = poll.options.reduce((n, o) => n + o.votes.length, 0);
  return (
    <div className="w-64 space-y-2 sm:w-72">
      <p className="font-semibold leading-snug">📊 {poll.question}</p>
      <p className={cn('text-xs', isOwn ? 'text-white/70' : 'text-sub')}>{poll.multiple ? 'Select one or more' : 'Select one'}</p>
      {poll.options.map((o, i) => {
        const mine = o.votes.some((v) => idOf(v) === meId);
        const pct = total ? Math.round((o.votes.length / total) * 100) : 0;
        return (
          <button key={i} onClick={() => onVote(i)} className={cn('relative w-full overflow-hidden rounded-xl px-3 py-2 text-left text-sm transition', isOwn ? 'bg-white/15 hover:bg-white/25' : 'bg-surface-3/60 hover:bg-surface-3')}>
            <span className={cn('absolute inset-y-0 left-0 transition-all duration-500', isOwn ? 'bg-white/25' : 'bg-brand/25')} style={{ width: `${pct}%` }} />
            <span className="relative flex items-center gap-2">
              <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', mine ? 'border-transparent bg-brand text-white' : isOwn ? 'border-white/60' : 'border-sub/60')}>{mine && <Check className="h-3 w-3" />}</span>
              <span className="flex-1 break-words">{o.text}</span>
              <span className="text-xs tabular-nums opacity-80">{o.votes.length}</span>
            </span>
          </button>
        );
      })}
      <p className={cn('text-xs', isOwn ? 'text-white/70' : 'text-sub')}>{total} {total === 1 ? 'vote' : 'votes'}</p>
    </div>
  );
}
