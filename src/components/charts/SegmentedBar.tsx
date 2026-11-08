import { cn } from '@/utils/cn';

export interface Segment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface SegmentedBarProps {
  segments: Segment[];
  ariaLabel: string;
  className?: string;
  showLegend?: boolean;
}

/** Barra segmentada de parte-do-todo (≤ 6 segmentos), com rótulos e percentuais. */
export function SegmentedBar({ segments, ariaLabel, className, showLegend = true }: SegmentedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-canvas" role="img" aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value} (${pct(s.value)}%)`).join(', ')}`}>
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.id}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
                title={`${s.label}: ${s.value} (${pct(s.value)}%)`}
              />
            ))}
      </div>
      {showLegend && (
        <ul className="grid gap-2 sm:grid-cols-3">
          {segments.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas/70 px-3 py-2.5 sm:block">
              <span className="flex min-w-0 items-center gap-2 text-sm leading-snug text-ink-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <span>{s.label}</span>
              </span>
              <span className="text-right sm:mt-1.5 sm:flex sm:items-baseline sm:gap-1.5 sm:pl-[18px] sm:text-left">
                <span className="block text-base font-semibold leading-none text-ink sm:text-lg">{s.value}</span>
                <span className="text-[11px] text-ink-muted">{pct(s.value)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
