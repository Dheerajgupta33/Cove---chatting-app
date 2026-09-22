import { cn } from '../../lib/utils';

// Gives empty screens a direction: what is missing and the next action.
export default function EmptyState({ icon: Icon, title, description, action, className, compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-0 scale-150 rounded-full bg-brand-gradient opacity-20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-2 text-brand ring-1 ring-line">
          {Icon && <Icon className="h-7 w-7" />}
        </div>
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-sub">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
