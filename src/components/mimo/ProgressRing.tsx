import { useId } from 'react';

/** Anel de progresso com degradê rosa → lavanda. */
export function ProgressRing({ value, size = 112, stroke = 12, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const id = `ring-${useId().replace(/:/g, '')}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'rgb(var(--c-rose-medium))' }} />
            <stop offset="1" style={{ stopColor: 'rgb(var(--c-lilac-deep))' }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'rgb(var(--c-lilac))' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={`url(#${id})`}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[26px] font-extrabold text-ink" aria-hidden>
        {Math.round(pct)}%
      </span>
    </div>
  );
}
