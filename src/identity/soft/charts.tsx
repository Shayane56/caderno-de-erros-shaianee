import { cn } from '@/utils/cn';
import type { CardBreakdown } from '@/services/flashcards/stats';
import type { DayPoint } from '../model/stats';

/** Barras arredondadas: violeta = lembrados, lilás = esquecidos. */
export function SoftBars({ data, height = 168, highlightLast }: { data: Array<{ key: string; label: string; count: number; correct?: number }>; height?: number; highlightLast?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  return (
    <figure>
      <div className="flex items-end gap-[5px] sm:gap-2" style={{ height }} role="img" aria-label={`Respostas: ${data.map((d) => `${d.label} ${d.count}`).join(', ')}`}>
        {data.map((d, i) => {
          const correct = d.correct ?? d.count;
          const last = highlightLast && i === data.length - 1;
          return (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count}`}>
              <div className="sf-grow flex w-full flex-col justify-end overflow-hidden rounded-[8px] bg-sf-lav-50" style={{ height: `${d.count ? Math.max(6, (d.count / max) * 100) : 4}%`, animationDelay: `${i * 25}ms` }}>
                {d.count > 0 && <div className="w-full bg-sf-lilac/70" style={{ height: `${((d.count - correct) / d.count) * 100}%` }} />}
                {d.count > 0 && <div className={cn('w-full transition-colors', last ? 'bg-sf-violet-deep' : 'bg-sf-violet group-hover:bg-sf-violet-deep')} style={{ height: `${(correct / d.count) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 flex gap-[5px] sm:gap-2">
        {data.map((d, i) => (
          <span key={d.key} className="sf-num flex-1 whitespace-nowrap text-center text-[11px] font-medium text-sf-muted">
            {i % step === 0 ? d.label : ''}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Rosca de distribuição (respostas, maturidade). */
export function Donut({ parts, size = 148, label, center }: { parts: Array<{ label: string; value: number; color: string }>; size?: number; label: string; center?: React.ReactNode }) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0);
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F2FE" strokeWidth={stroke} />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.value / total) * c;
            const gap = parts.filter((x) => x.value > 0).length > 1 ? 3 : 0;
            const el = (
              <circle
                key={p.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}

/** Calendário de constância em lavanda (12 semanas). */
export function LavenderCalendar({ days }: { days: Array<{ key: string; count: number }> }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const shade = (n: number) => {
    if (!n) return '#F2EFF9';
    const f = n / max;
    return f > 0.75 ? '#4E37AE' : f > 0.5 ? '#6B4FD8' : f > 0.25 ? '#9C86EC' : '#CFC2F7';
  };
  return (
    <figure>
      <div className="flex gap-1" role="img" aria-label={`${days.filter((d) => d.count).length} dias com revisões nas últimas 12 semanas`}>
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col gap-1">
            {w.map((d) => (
              <span key={d.key} className="h-3.5 w-full rounded-[5px] sm:h-4" style={{ background: shade(d.count) }} title={`${d.key.split('-').reverse().join('/')}: ${d.count}`} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 flex items-center justify-end gap-1.5 text-[11.5px] text-sf-muted">
        menos
        {['#F2EFF9', '#CFC2F7', '#9C86EC', '#6B4FD8', '#4E37AE'].map((c) => (
          <span key={c} className="h-3 w-3 rounded-[4px]" style={{ background: c }} aria-hidden />
        ))}
        mais
      </figcaption>
    </figure>
  );
}

export function maturityParts(b: CardBreakdown) {
  return [
    { label: 'Maduros', value: b.mature, color: '#4E37AE' },
    { label: 'Jovens', value: b.young, color: '#9C86EC' },
    { label: 'Aprendendo', value: b.learning, color: '#F2A57F' },
    { label: 'Novos', value: b.new, color: '#DCD3F7' },
  ];
}

export type { DayPoint };
