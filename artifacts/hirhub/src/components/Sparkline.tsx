import { useId } from 'react';

const W = 100;
const H = 36;
const PAD = 3;

type Point = readonly [number, number];

/** Smooth curve through the points: one cubic segment per gap, slopes averaged at each point */
function segments(points: Point[]): string[] {
  const slope = (i: number) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    const p = points[i]!;
    if (prev && next) return (next[1] - prev[1]) / (next[0] - prev[0]);
    const other = (next ?? prev)!;
    return (other[1] - p[1]) / (other[0] - p[0]);
  };
  return points.slice(0, -1).map(([x0, y0], i) => {
    const [x1, y1] = points[i + 1]!;
    const dx = (x1 - x0) / 3;
    return `C${x0 + dx},${y0 + slope(i) * dx} ${x1 - dx},${y1 - slope(i + 1) * dx} ${x1},${y1}`;
  });
}

/**
 * Small trend line without axes (Premium Dashboard). The last point is the
 * month still running: its stretch is dashed, so a month that has just begun
 * doesn't read as a drop. Scales with its box (sized in rem by the caller).
 */
export const Sparkline = ({
  values,
  color,
  title,
  className,
}: {
  values: number[];
  color: string;
  title: string;
  className?: string;
}) => {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points: Point[] = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    PAD + (1 - (v - min) / span) * (H - 2 * PAD),
  ]);
  const segs = segments(points);
  const start = (p: Point) => `M${p[0]},${p[1]}`;
  const line = `${start(points[0]!)} ${segs.join(' ')}`;
  const closed = `${start(points[0]!)} ${segs.slice(0, -1).join(' ')}`;
  const running = `${start(points[points.length - 2]!)} ${segs[segs.length - 1]}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gradientId})`} />
      <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
        {points.length > 2 && <path d={closed} vectorEffect="non-scaling-stroke" />}
        <path d={running} vectorEffect="non-scaling-stroke" strokeDasharray="3 4" />
      </g>
    </svg>
  );
};
