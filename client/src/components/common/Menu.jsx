import { useCallback, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import Popover from './Popover';

/**
 * Dropdown menu. `trigger` is a render prop: ({ open, toggle }) => element.
 * items: [{ label, icon: Icon, onClick, danger, hidden, divider }]
 */
export default function Menu({ trigger, items, align = 'end', width = 'w-56' }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = items.filter((i) => i && !i.hidden);

  return (
    <>
      <span ref={anchor} className="inline-flex">{trigger({ open, toggle: () => setOpen((o) => !o) })}</span>
      <Popover open={open} anchorRef={anchor} onClose={close} align={align} className={cn('p-1.5', width)}>
        {visible.map((item, i) =>
          item.divider ? (
            <div key={`d${i}`} className="my-1 h-px bg-line" />
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={() => { close(); item.onClick?.(); }}
              className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-2', item.danger ? 'text-coral' : 'text-ink')}
            >
              {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-80" />}
              <span className="truncate">{item.label}</span>
            </button>
          )
        )}
      </Popover>
    </>
  );
}
