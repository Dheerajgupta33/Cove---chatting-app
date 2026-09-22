import { format } from 'date-fns';

// Dependency-free area chart (SVG). data: [{ date: 'yyyy-mm-dd', count }]
export default function AreaChart({ data, height = 120, label = 'Chart' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 100;
  const h = 40;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => [i * step, h - (d.count / max) * (h - 4) - 2]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const gid = `g-${label.replace(/\W/g, '')}`;

  return (
    <figure aria-label={label} className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--brand))" stopOpacity="0.45" />
            <stop offset="1" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="rgb(var(--brand))" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 flex justify-between text-[11px] text-sub">
        <span>{format(new Date(data[0]?.date || Date.now()), 'MMM d')}</span>
        <span>Peak {max}</span>
        <span>{format(new Date(data[data.length - 1]?.date || Date.now()), 'MMM d')}</span>
      </figcaption>
    </figure>
  );
}
