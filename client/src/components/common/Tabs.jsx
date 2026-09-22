import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Segmented control with a sliding highlight. `id` keeps layout animations separate per instance.
export default function Tabs({ id, tabs, value, onChange, className, size = 'md' }) {
  return (
    <div role="tablist" className={cn('flex gap-1 rounded-2xl bg-surface-2 p-1', className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn('relative flex-1 whitespace-nowrap rounded-xl font-semibold transition', size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm', active ? 'text-ink' : 'text-sub hover:text-ink')}
          >
            {active && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-xl bg-surface shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
            <span className="relative inline-flex items-center gap-1.5">
              {t.label}
              {t.count > 0 && <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold leading-4 text-white">{t.count > 99 ? '99+' : t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
