import Avatar from '../common/Avatar';

export function Dots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-current" style={{ animationDelay: `${i * 0.16}s` }} />)}
    </span>
  );
}

// "Sam is typing…" bubble shown at the end of the message list.
export default function TypingIndicator({ names, isGroup, avatar }) {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.slice(0, 2).join(' and ')} are typing`;
  return (
    <div className="mt-2 flex items-end gap-2 px-3 sm:px-6" role="status" aria-live="polite">
      {isGroup && <Avatar name={names[0]} size="sm" src={avatar} />}
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-sub shadow-sm ring-1 ring-line/70">
        <Dots />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
