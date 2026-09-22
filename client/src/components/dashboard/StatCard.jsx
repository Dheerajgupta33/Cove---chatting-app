import { cn } from '../../lib/utils';

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', className }) {
  const tones = { brand: 'bg-brand/15 text-brand', teal: 'bg-brand-2/15 text-brand-2', coral: 'bg-coral/15 text-coral', amber: 'bg-amber-400/15 text-amber-500' };
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4', className)}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}><Icon className="h-5 w-5" /></span>
        <span className="text-sm text-sub">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-sub">{hint}</p>}
    </div>
  );
}
