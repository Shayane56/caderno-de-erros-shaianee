import type { CardBreakdown } from '@/services/flashcards/stats';
import type { TimelinePoint } from '@/services/study/statsService';
import { cn } from '@/utils/cn';
import type { DayBar } from '../model/home';
import type { DayPoint } from '../model/stats';

/** Sete colunas finas — a semana como uma régua tipográfica. */
export function WeekColumns({ days }: { days: DayBar[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <figure>
      <div className="flex h-32 items-end gap-3" role="img" aria-label={`Cartões por dia: ${days.map((d) => `${d.label} ${d.count}`).join(', ')}`}>
        {days.map((d, i) => (
          <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="ed-num font-ed-sans text-[10.5px] font-semibold text-ed-graphite">{d.count || ''}</span>
            <div
              className={cn('w-full origin-bottom transition-[height] duration-700', d.isToday ? 'bg-ed-accent' : 'bg-ed-ink')}
              style={{ height: `${d.count ? Math.max(4, (d.count / max) * 100) : 1}%`, opacity: d.count ? 1 : 0.25, transitionDelay: `${i * 40}ms` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex gap-3 border-t border-ed-ink pt-1.5">
        {days.map((d) => (
          <span key={d.key} className={cn('flex-1 text-center font-ed-sans text-[10.5px] font-semibold uppercase tracking-[0.08em]', d.isToday ? 'text-ed-accent' : 'text-ed-graphite')}>
            {d.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Barras do período: altura = respostas; o trecho escuro = lembrados. */
export function SeriesBars({ series }: { series: DayPoint[] }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  const step = series.length > 14 ? Math.ceil(series.length / 8) : 1;
  return (
    <figure>
      <div className="relative h-56">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dotted border-ed-rule" style={{ bottom: `${f * 100}%` }} aria-hidden>
            <span className="ed-num absolute -top-2.5 right-0 bg-ed-paper pl-1 font-ed-sans text-[10px] text-ed-stone">{Math.round(max * f)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px] pr-8" role="img" aria-label="Respostas por dia no período">
          {series.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count} respostas, ${d.correct} lembradas`}>
              <div className="w-full bg-ed-rule" style={{ height: `${(Math.max(0, d.count - d.correct) / max) * 100}%` }} />
              <div className="w-full bg-ed-ink transition-colors group-hover:bg-ed-accent" style={{ height: `${(d.correct / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-1.5 flex gap-[3px] border-t border-ed-ink pr-8 pt-1.5">
        {series.map((d, i) => (
          <span key={d.key} className="ed-num flex-1 overflow-visible whitespace-nowrap font-ed-sans text-[10px] text-ed-graphite">
            {i % step === 0 ? d.label : ''}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Mapa de constância: 12 colunas (semanas) × 7 linhas, tons de tinta. */
export function InkHeatmap({ days }: { days: Array<{ key: string; count: number }> }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const active = days.filter((d) => d.count > 0).length;
  return (
    <figure>
      <div className="flex gap-[3px]" role="img" aria-label={`${active} dias com revisões nas últimas 12 semanas`}>
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {w.map((d) => (
              <span
                key={d.key}
                title={`${d.key.split('-').reverse().join('/')}: ${d.count}`}
                className="h-3.5 w-full sm:h-4"
                style={{ background: d.count ? `rgb(23 21 19 / ${0.18 + 0.82 * (d.count / max)})` : 'transparent', boxShadow: d.count ? undefined : 'inset 0 0 0 1px #DCD5CA' }}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between font-ed-sans text-[11px] text-ed-graphite">
        <span>12 semanas atrás</span>
        <span>hoje</span>
      </figcaption>
    </figure>
  );
}

/** Linha fina de acerto nas questões (SVG). */
export function AccuracyLine({ points }: { points: TimelinePoint[] }) {
  const w = 600;
  const h = 160;
  const valid = points.map((p, i) => ({ ...p, i })).filter((p) => p.pct !== null);
  const x = (i: number) => (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => h - (v / 100) * h;
  const d = valid.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.pct!).toFixed(1)}`).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="h-44 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Acerto nas questões ao longo do período">
        {[25, 50, 75].map((v) => (
          <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke="#DCD5CA" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={0} x2={w} y1={h} y2={h} stroke="#171513" vectorEffect="non-scaling-stroke" />
        {d && <path d={d} fill="none" stroke="#7B2D4E" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="ed-fade" />}
        {valid.map((p) => (
          <circle key={p.i} cx={x(p.i)} cy={y(p.pct!)} r={2.5} fill="#F6F3EE" stroke="#7B2D4E" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between font-ed-sans text-[10.5px] text-ed-graphite">
        {points.map((p, i) => (
          <span key={i} className={cn(points.length > 8 && i % 2 === 1 && 'invisible')}>
            {p.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Barra empilhada do acervo: novos, aprendendo, jovens e maduros. */
export function MaturityStrip({ b }: { b: CardBreakdown }) {
  const parts = [
    { label: 'Maduros', value: b.mature, cls: 'bg-ed-ink' },
    { label: 'Jovens', value: b.young, cls: 'bg-ed-graphite' },
    { label: 'Aprendendo', value: b.learning, cls: 'bg-ed-accent' },
    { label: 'Novos', value: b.new, cls: 'bg-ed-rule' },
  ];
  const total = Math.max(1, b.faces);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {parts.map((p) => (p.value ? <div key={p.label} className={cn(p.cls, 'ed-draw')} style={{ width: `${(p.value / total) * 100}%` }} /> : null))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {parts.map((p) => (
          <div key={p.label} className="flex items-start gap-2">
            <span className={cn('mt-1 h-2.5 w-2.5 shrink-0', p.cls)} aria-hidden />
            <div>
              <dt className="ed-kicker text-[10px] text-ed-graphite">{p.label}</dt>
              <dd className="ed-serif ed-num text-[22px] leading-tight">{p.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
