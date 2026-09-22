import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

// Works with react-hook-form's register() (forwards the ref) and shows inline errors.
const Input = forwardRef(function Input({ label, error, hint, icon: Icon, type = 'text', className, id, ...props }, ref) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          className={cn('field', Icon && 'pl-10', isPassword && 'pr-11', error && 'border-coral focus:border-coral')}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sub hover:text-ink">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? <p className="mt-1.5 text-xs text-coral">{error}</p> : hint ? <p className="mt-1.5 text-xs text-sub">{hint}</p> : null}
    </div>
  );
});
export default Input;
