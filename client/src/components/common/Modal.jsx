import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './Button';

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' };

// Bottom sheet on phones, centred dialog on larger screens. Esc / backdrop click closes.
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('glass-strong relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-pop sm:rounded-3xl', SIZES[size], className)}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
                <div>
                  {title && <h2 className="text-lg font-bold">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-sub">{description}</p>}
                </div>
                {onClose && <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X className="h-5 w-5" /></IconButton>}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
