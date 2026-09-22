import { useId } from 'react';
import { format } from 'date-fns';

const label = (d) => format(new Date(`${d}T00:00:00`), 'EEE');

// Small dependency-free SVG charts. `data` is [{ date: 'YYYY-MM-DD', count }].
export function BarChart({ data, height = 140 }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div role="img" aria-label="Activity bar chart">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold opacity-0 transition group-hover:opacity-100">{d.count}</span>
            <div className="w-full rounded-t-lg bg-brand-gradient opacity-90 transition-all group-hover:opacity-100" style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-sub">{data.map((d) => <span key={d.date} className="flex-1 text-center">{label(d.date)}</span>)}</div>
    </div>
  );
}

export function AreaChart({ data, height = 160, color = 'var(--brand)' }) {
  const id = useId().replace(/:/g, '');
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 100;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [i * step, 46 - (d.count / max) * 40]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return (
    <div role="img" aria-label="Trend chart">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgb(${color})`} stopOpacity="0.35" />
            <stop offset="1" stopColor={`rgb(${color})`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${w},50 L0,50 Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={`rgb(${color})`} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-sub">
        <span>{label(data[0].date)} {format(new Date(`${data[0].date}T00:00:00`), 'd')}</span>
        <span>{label(data[data.length - 1].date)} {format(new Date(`${data[data.length - 1].date}T00:00:00`), 'd')}</span>
      </div>
    </div>
  );
}
