import type { TooltipProps } from 'recharts';

type Payload = NonNullable<TooltipProps<number, string>['payload']>[number];

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Payload[];
  /** Formata o título (ex.: período). */
  title?: (label: string | number | undefined, payload: Payload[]) => string;
  unit?: string;
}

/** Tooltip padrão: cartão branco, marcadores com a cor da série e valores em texto. */
export function ChartTooltip({ active, payload, label, title, unit = '' }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs shadow-lift">
      <p className="mb-1.5 font-semibold text-ink">{title ? title(label, payload) : label}</p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (p.payload?.fill as string) ?? p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {p.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
