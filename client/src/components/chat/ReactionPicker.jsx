import { lazy, Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import { isDarkNow } from '../../hooks/useTheme';

const EmojiPicker = lazy(() => import('emoji-picker-react')); // ~200 KB, only loaded when needed
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

// Quick reaction row with a "more" button that expands into the full picker.
export default function ReactionPicker({ onPick }) {
  const [full, setFull] = useState(false);
  if (full) {
    return (
      <Suspense fallback={<div className="h-72 w-72 p-4 text-sm text-sub">Loading emoji…</div>}>
        <EmojiPicker onEmojiClick={(e) => onPick(e.emoji)} theme={isDarkNow() ? 'dark' : 'light'} width={300} height={360} lazyLoadEmojis previewConfig={{ showPreview: false }} />
      </Suspense>
    );
  }
  return (
    <div className="flex items-center gap-0.5 p-1.5">
      {QUICK_REACTIONS.map((e) => (
        <button key={e} onClick={() => onPick(e)} aria-label={`React with ${e}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:scale-125 hover:bg-surface-2">
          {e}
        </button>
      ))}
      <button onClick={() => setFull(true)} aria-label="More emoji" className="flex h-9 w-9 items-center justify-center rounded-xl text-sub hover:bg-surface-2">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
