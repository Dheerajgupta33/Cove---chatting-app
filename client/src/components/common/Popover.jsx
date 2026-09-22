import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

/**
 * Floating panel anchored to an element. Rendered in a portal with fixed positioning so it is never
 * clipped by scrolling message lists, and it flips above the anchor when there is no room below.
 */
export default function Popover({ open, anchorRef, onClose, children, align = 'end', className }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !ref.current) { setPos(null); return undefined; }
    const place = () => {
      if (!anchorRef.current || !ref.current) return;
      const a = anchorRef.current.getBoundingClientRect();
      const { offsetWidth: w, offsetHeight: h } = ref.current;
      const fitsBelow = window.innerHeight - a.bottom > h + 12;
      const top = fitsBelow || a.top < h + 12 ? a.bottom + 6 : a.top - h - 6;
      const left = align === 'end' ? a.right - w : a.left;
      setPos({ top: clamp(top, 8, window.innerHeight - h - 8), left: clamp(left, 8, window.innerWidth - w - 8) });
    };
    place();
    const ro = new ResizeObserver(place); // content can grow after opening
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [open, align, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(); };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <motion.div
      ref={ref}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 70, opacity: pos ? 1 : 0 }}
      initial={{ scale: 0.96 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.12 }}
      className={cn('glass-strong rounded-2xl shadow-pop', className)}
    >
      {children}
    </motion.div>,
    document.body
  );
}
