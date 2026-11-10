import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Rating } from '@/types';
import { RATING_LABELS } from '@/services/flashcards/scheduler';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { delta, STAT_PERIODS, useStatsModel, type StatPeriod } from '../model/stats';
import { BIcon } from './icons';
import { BdTitle, Big, Label, SectionBar, Thick, Toggle, pad } from './ui';

const RATING_COLOR: Record<Rating, string> = { 1: 'bg-bd-signal', 2: 'bg-bd-ink text-bd-bone', 3: 'bg-bd-uv text-white', 4: 'bg-bd-lav' };

export function BoldStats() {
  const [days, setDays] = useState<StatPeriod>(30);
  const m = useStatsModel(days);
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const ret = delta(m.retention, m.retentionPrev);
  const max = Math.max(1, ...m.series.map((d) => d.count));
  const maxF = Math.max(1, ...m.forecast.map((f) => f.count));
  const totalRatings = Math.max(1, m.ratings[1] + m.ratings[2] + m.ratings[3] + m.ratings[4]);
  const maxHeat = Math.max(1, ...m.heatmap.map((d) => d.count));
  const weeks: Array<typeof m.heatmap> = [];
  for (let i = 0; i < m.heatmap.length; i += 7) weeks.push(m.heatmap.slice(i, i + 7));
  const step = m.series.length > 14 ? Math.ceil(m.series.length / 6) : 1;

  return (
    <div className="space-y-12">
      <BdTitle index={`Estatísticas / últimos ${days} dias`} title="Dados" actions={<Toggle value={days} onChange={setDays} label="Período" options={STAT_PERIODS.map((p) => ({ id: p, label: `${p}d` }))} />}>
        {m.headline}
      </BdTitle>

      {/* Retenção em destaque + métricas */}
      <section className="grid border-2 border-bd-ink lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" aria-label="Indicadores">
        <div className="relative overflow-hidden bg-bd-paper p-5 sm:p-8">
          <span className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full border-[24px] border-bd-lav" aria-hidden />
          <div className="relative">
            <Big value={m.retention === null ? '—' : `${m.retention}%`} label="Retenção" tone="uv" size="xl" />
            <p className="bd-mono mt-4">{ret === null ? 'Sem base de comparação' : `${ret > 0 ? '▲ +' : '▼ '}${ret} p.p. vs. período anterior`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t-2 border-bd-ink bg-bd-ink text-bd-bone lg:border-l-2 lg:border-t-0">
          {(
            [
              ['Cartões', pad(m.current.cards), `${m.previous.cards} antes`],
              ['Tempo', m.studyTime, 'foco + estudo'],
              ['Dias ativos', `${m.activeDays}/${days}`, 'constância'],
              ['Sequência', pad(m.streak), m.streak === 1 ? 'dia' : 'dias'],
            ] as const
          ).map(([label, value, note], i) => (
            <div key={label} className={cn('p-4 sm:p-6', i % 2 === 1 && 'border-l-2 border-bd-bone/15', i >= 2 && 'border-t-2 border-bd-bone/15')}>
              <Big value={value} label={label} tone="bone" size="md" note={note} />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="bd-ritmo">
        <SectionBar label={days === 90 ? 'Ritmo semanal' : 'Ritmo diário'} id="bd-ritmo" aside={<span className="bd-mono text-bd-grey">■ lembrados ▢ esquecidos</span>} />
        <div className="flex h-60 items-end gap-[3px] sm:gap-1" role="img" aria-label="Respostas por dia no período">
          {m.series.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count}`}>
              <div className="w-full border-2 border-b-0 border-bd-ink" style={{ height: `${((d.count - d.correct) / max) * 100}%`, borderWidth: d.count - d.correct ? undefined : 0 }} />
              <div className="bd-up w-full bg-bd-ink" style={{ height: `${(d.correct / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-[3px] border-t-2 border-bd-ink pt-1.5 sm:gap-1">
          {m.series.map((d, i) => (
            <span key={d.key} className="bd-mono flex-1 whitespace-nowrap text-[9.5px] text-bd-grey">
              {i % step === 0 ? d.label : ''}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="bd-resp">
        <SectionBar label="Respostas" id="bd-resp" aside={<span className="bd-mono text-bd-grey">{totalRatings} no total</span>} />
        <div className="flex h-16 border-2 border-bd-ink" role="img" aria-label={([1, 2, 3, 4] as Rating[]).map((r) => `${RATING_LABELS[r]}: ${m.ratings[r]}`).join(', ')}>
          {([1, 2, 3, 4] as Rating[]).map((r) =>
            m.ratings[r] ? (
              <div key={r} className={cn('bd-wipe flex flex-col justify-center overflow-hidden px-2', RATING_COLOR[r])} style={{ width: `${(m.ratings[r] / totalRatings) * 100}%` }}>
                {m.ratings[r] / totalRatings >= 0.22 && <span className="bd-wide truncate text-[13px] uppercase">{RATING_LABELS[r]}</span>}
                <span className="bd-mono truncate">{Math.round((m.ratings[r] / totalRatings) * 100)}%</span>
              </div>
            ) : null,
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {([1, 2, 3, 4] as Rating[]).map((r) => (
            <li key={r} className="bd-mono flex items-center gap-1.5">
              <span className={cn('h-3 w-3 border-2 border-bd-ink', RATING_COLOR[r])} aria-hidden />
              {RATING_LABELS[r]} <b>{m.ratings[r]}</b>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="bd-const">
          <SectionBar label="Constância" id="bd-const" aside={<span className="bd-mono text-bd-grey">12 semanas</span>} />
          <div className="flex gap-1" role="img" aria-label="Mapa de dias com revisões">
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col gap-1">
                {w.map((d) => (
                  <span key={d.key} className={cn('h-4 w-full', !d.count && 'border border-bd-line')} style={d.count ? { background: d.count / maxHeat > 0.66 ? '#0E0E10' : d.count / maxHeat > 0.33 ? '#4A2BFF' : '#D8D1FF' } : undefined} title={`${d.key}: ${d.count}`} />
                ))}
              </div>
            ))}
          </div>
        </section>
        <section aria-labelledby="bd-prev">
          <SectionBar label="Previsão" id="bd-prev" aside={<span className="bd-mono text-bd-grey">14 dias</span>} />
          <div className="flex h-[132px] items-end gap-1">
            {m.forecast.map((f, i) => (
              <div key={f.key} className="flex h-full flex-1 flex-col items-center justify-end">
                <span className="bd-mono h-4 text-[9.5px] font-bold">{f.count || ''}</span>
                <div className={cn('w-full', i === 0 ? 'bg-bd-signal' : 'bg-bd-ink')} style={{ height: `${f.count ? Math.max(5, (f.count / maxF) * 100) : 2}%`, opacity: f.count ? 1 : 0.2 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1 border-t-2 border-bd-ink pt-1.5">
            {m.forecast.map((f, i) => (
              <span key={f.key} className={cn('bd-mono flex-1 text-center text-[9px]', i === 0 ? 'font-bold text-bd-signal' : 'text-bd-grey')}>
                {i % 2 === 0 ? f.label.slice(0, 3) : ''}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="bd-pordeck">
          <SectionBar label="Por baralho" id="bd-pordeck" />
          {m.decks.length === 0 ? (
            <p className="bd-mono text-bd-grey">Sem revisões no período.</p>
          ) : (
            <ul className="space-y-4">
              {m.decks.map((d) => (
                <li key={d.deckId}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <Link to={identityPath('bold', `baralhos/${d.deckId}`)} className="bd-wide truncate text-[15px] uppercase hover:text-bd-uv">
                      {d.name}
                    </Link>
                    <span className="bd-mono shrink-0">
                      {d.reviews} · <b className={d.success < 70 ? 'text-bd-signal' : 'text-bd-uv'}>{d.success}%</b>
                    </span>
                  </div>
                  <Thick value={d.success} label={`${d.name}: ${d.success}%`} color={d.success < 70 ? '#FF5A1F' : '#4A2BFF'} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="bd-quest">
          <SectionBar label="Questões" id="bd-quest" aside={<span className="bd-mono text-bd-grey">{pad(m.current.answered)} feitas</span>} />
          {m.current.answered === 0 ? (
            <Link to="/questoes" className="bd-hit flex items-center justify-between border-2 border-bd-ink bg-bd-paper p-5">
              <span>
                <Label>Sem questões no período</Label>
                <span className="bd-wide mt-1 block text-[18px] uppercase">Abrir o banco</span>
              </span>
              <BIcon name="out" size={24} />
            </Link>
          ) : (
            <>
              <Big value={m.current.pct === null ? '—' : `${m.current.pct}%`} label="Acerto" size="lg" />
              <ul className="mt-5 border-t-2 border-bd-ink">
                {m.weak.slice(0, 4).map((w) => (
                  <li key={`${w.subject}-${w.topic}`} className="flex items-baseline justify-between gap-3 border-b-2 border-bd-line py-2.5">
                    <span className="min-w-0 truncate font-semibold">{w.topic}</span>
                    <span className="bd-mono shrink-0 text-bd-signal">{w.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
