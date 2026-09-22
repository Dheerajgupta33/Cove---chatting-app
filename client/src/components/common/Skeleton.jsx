import { cn } from '../../lib/utils';

export const Skeleton = ({ className, style }) => <div className={cn('skeleton', className)} style={style} aria-hidden />;

export const ConversationSkeleton = ({ count = 7 }) => (
  <div className="space-y-1 px-2" aria-busy="true" aria-label="Loading conversations">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

export const MessagesSkeleton = () => (
  <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading messages">
    {[60, 40, 72, 48, 56, 36].map((w, i) => (
      <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
        <Skeleton className={cn('h-11 rounded-2xl')} style={{ width: `${w}%`, maxWidth: 380 }} />
      </div>
    ))}
  </div>
);
