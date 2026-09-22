import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn, gradientFor, initials } from '../../lib/utils';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl', '2xl': 'h-28 w-28 text-4xl',
};
const DOT = { xs: 'h-2 w-2', sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-3.5 w-3.5', xl: 'h-4 w-4', '2xl': 'h-5 w-5' };

/** Photo when available, otherwise a deterministic gradient with initials. The AI assistant gets a sparkle. */
export default function Avatar({ src, name = '', size = 'md', online, isBot, className }) {
  const [broken, setBroken] = useState(false);
  const showImage = src && !broken;
  return (
    <span className={cn('relative inline-flex shrink-0', SIZES[size], className)}>
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-white"
        style={showImage ? undefined : { background: isBot ? 'linear-gradient(135deg,#7c5cff,#2dd4bf)' : gradientFor(name) }}
      >
        {showImage ? (
          <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        ) : isBot ? (
          <Sparkles className="h-1/2 w-1/2" />
        ) : (
          initials(name)
        )}
      </span>
      {online !== undefined && (
        <span
          className={cn('absolute bottom-0 right-0 rounded-full border-2 border-surface', DOT[size], online ? 'bg-emerald-400' : 'bg-sub/40')}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}
