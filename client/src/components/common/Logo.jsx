import { cn } from '../../lib/utils';

export function LogoMark({ className }) {
  return (
    <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow', className)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#fff" aria-hidden>
        <path d="M6 7.5A3.5 3.5 0 0 1 9.500 4h5A3.500 3.500 0 0 1 18 7.500v4a3.500 3.500 0 0 1-3.500 3.500H12l-3.500 3v-3.100A3.500 3.500 0 0 1 6 11.500z" />
      </svg>
    </span>
  );
}

export default function Logo({ compact, className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && <span className="font-display text-xl font-extrabold tracking-tight">Cove</span>}
    </span>
  );
}
