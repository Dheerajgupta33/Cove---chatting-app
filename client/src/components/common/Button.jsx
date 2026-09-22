import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const VARIANTS = {
  primary: 'bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
  ghost: 'bg-transparent text-sub hover:bg-surface-2 hover:text-ink',
  danger: 'bg-coral text-white hover:brightness-110',
  'danger-ghost': 'bg-transparent text-coral hover:bg-coral/10',
};
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-base gap-2' };

// Exported so <Link> elements can share the exact same look.
export const buttonStyles = ({ variant = 'primary', size = 'md', className } = {}) =>
  cn('inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50', VARIANTS[variant], SIZES[size], className);

const Button = forwardRef(function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonStyles({ variant, size, className })} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
export default Button;

export const IconButton = forwardRef(function IconButton({ label, className, children, active, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sub transition hover:bg-surface-2 hover:text-ink disabled:opacity-40', active && 'bg-brand/15 text-brand hover:bg-brand/20 hover:text-brand', className)}
      {...props}
    >
      {children}
    </button>
  );
});
