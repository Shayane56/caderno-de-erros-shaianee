import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Rating } from '@/types';
import { RATING_LABELS } from '@/services/flashcards/scheduler';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { delta, STAT_PERIODS, useStatsModel, type StatPeriod } from '../model/stats';
import { Delta, Figure, Kicker, Meter, PeriodTabs, SectionHead } from './ui';
import { AccuracyLine, InkHeatmap, MaturityStrip, SeriesBars } from './charts';

export function EditorialStats() {
  const [days, setDays] = useState<StatPeriod>(30);
  const m = useStatsModel(days);
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const totalRatings = Math.max(1, m.ratings[1] + m.ratings[2] + m.ratings[3] + m.ratings[4]);
  const maxForecast = Math.max(1, ...m.forecast.map((f) => f.count));

  return (
    <div className="space-y-16">
      <header className="ed-rise">
        <div className="flex flex-col gap-5 border-b border-ed-ink pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Kicker>Estatísticas · últimos {days} dias</Kicker>
            <h1 className="ed-serif mt-3 text-[46px] font-light leading-[0.98] tracking-[-0.025em] sm:text-[76px]">
              Relatório de <em className="text-ed-accent">aprendizagem</em>
            </h1>
          </div>
          <PeriodTabs value={days} options={STAT_PERIODS} onChange={setDays} label="Período" />
        </div>
        <blockquote className="mt-8 grid gap-4 lg:grid-cols-12">
          <Kicker className="lg:col-span-3">Leitura</Kicker>
          <p className="ed-serif text-[24px] font-light italic leading-[1.3] text-ed-ink sm:text-[30px] lg:col-span-9">{m.headline}</p>
        </blockquote>
      </header>

      <section aria-label="Figuras do período" className="grid grid-cols-2 gap-y-8 border-y border-ed-ink py-8 md:grid-cols-4 md:divide-x md:divide-ed-rule">
        <div className="pr-4 md:pr-6">
          <Figure value={m.retention === null ? '—' : `${m.retention}%`} label="Retenção" accent note={<Delta value={delta(m.retention, m.retentionPrev)} suffix=" p.p. vs. anterior" />} />
        </div>
        <div className="md:px-6">
          <Figure value={m.current.cards.toLocaleString('pt-BR')} label="Cartões respondidos" note={<Delta value={m.current.cards - m.previous.cards || null} suffix=" vs. anterior" />} />
        </div>
        <div className="pr-4 md:px-6">
          <Figure value={m.studyTime} label="Tempo de estudo" note="foco + questões + cartões" />
        </div>
        <div className="md:pl-6">
          <Figure value={`${m.activeDays}/${days}`} label="Dias com estudo" note={`sequência atual: ${m.streak} ${m.streak === 1 ? 'dia' : 'dias'}`} />
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SectionHead number="01" title={days === 90 ? 'Ritmo semanal' : 'Ritmo diário'} />
          <SeriesBars series={m.series} />
          <p className="mt-3 flex gap-5 font-ed-sans text-[11.5px] text-ed-graphite">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-ed-ink" aria-hidden /> lembrados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-ed-rule" aria-hidden /> esquecidos
            </span>
          </p>
        </div>
        <div className="lg:col-span-4">
          <SectionHead number="02" title="Respostas" />
          <dl className="space-y-4">
            {([4, 3, 2, 1] as Rating[]).map((r) => {
              const pct = Math.round((m.ratings[r] / totalRatings) * 100);
              return (
                <div key={r}>
                  <div className="flex items-baseline justify-between">
                    <dt className={cn('ed-serif text-[20px] italic', r === 1 && 'text-ed-accent')}>{RATING_LABELS[r]}</dt>
                    <dd className="ed-num font-ed-sans text-[12.5px] font-semibold">
                      {m.ratings[r]} <span className="text-ed-graphite">· {pct}%</span>
                    </dd>
                  </div>
                  <Meter value={pct} label={`${RATING_LABELS[r]}: ${pct}%`} tone={r === 1 ? 'accent' : 'ink'} className="mt-1.5" />
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionHead number="03" title="Constância — 12 semanas" />
          <InkHeatmap days={m.heatmap} />
        </div>
        <div className="lg:col-span-5">
          <SectionHead number="04" title="Previsão — 14 dias" />
          <ol className="space-y-1.5">
            {m.forecast.slice(0, 7).map((f, i) => (
              <li key={f.key} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3">
                <span className={cn('font-ed-sans text-[11.5px] font-semibold uppercase tracking-[0.06em]', i === 0 ? 'text-ed-accent' : 'text-ed-graphite')}>{f.label}</span>
                <span className="h-[9px] bg-ed-wash">
                  <span className={cn('block h-full ed-draw', i === 0 ? 'bg-ed-accent' : 'bg-ed-ink')} style={{ width: `${(f.count / maxForecast) * 100}%` }} />
                </span>
                <span className="ed-num text-right font-ed-sans text-[12.5px] font-semibold">{f.count}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 font-ed-sans text-[12px] text-ed-graphite">
            Na semana seguinte: <b className="ed-num font-semibold text-ed-ink">{m.forecast.slice(7).reduce((s, f) => s + f.count, 0)}</b> revisões previstas.
          </p>
        </div>
      </section>

      <section>
        <SectionHead number="05" title="Maturidade do acervo" />
        <MaturityStrip b={m.breakdown} />
        <p className="mt-4 max-w-2xl font-ed-sans text-[13px] leading-relaxed text-ed-graphite">
          Um cartão amadurece quando o intervalo até a próxima revisão passa de 21 dias — sinal de que a memória já se sustenta sozinha.
        </p>
      </section>

      <section className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionHead number="06" title="Por baralho" />
          {m.decks.length === 0 ? (
            <p className="ed-serif text-[18px] italic text-ed-graphite">Nenhuma revisão no período.</p>
          ) : (
            <table className="w-full font-ed-sans text-[13.5px]">
              <thead>
                <tr className="border-b border-ed-ink text-left">
                  <th className="ed-kicker pb-2 font-semibold text-ed-graphite">Baralho</th>
                  <th className="ed-kicker pb-2 text-right font-semibold text-ed-graphite">Respostas</th>
                  <th className="ed-kicker pb-2 text-right font-semibold text-ed-graphite">Lembrados</th>
                </tr>
              </thead>
              <tbody>
                {m.decks.map((d) => (
                  <tr key={d.deckId} className="border-b border-ed-rule">
                    <td className="py-3 pr-3">
                      <Link to={identityPath('editorial', `baralhos/${d.deckId}`)} className="ed-serif ed-link text-[17px]">
                        {d.name}
                      </Link>
                    </td>
                    <td className="ed-num py-3 text-right">{d.reviews}</td>
                    <td className={cn('ed-num py-3 text-right font-semibold', d.success < 70 ? 'text-ed-accent' : 'text-ed-moss')}>{d.success}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="lg:col-span-6">
          <SectionHead number="07" title="Questões" aside={<span className="ed-num font-ed-sans text-[12px] text-ed-graphite">{m.current.answered} respondidas</span>} />
          {m.current.answered === 0 && m.previous.answered === 0 ? (
            <p className="ed-serif text-[18px] italic text-ed-graphite">
              Sem questões no período. <Link to="/questoes" className="ed-link not-italic text-ed-ink">Abrir o Banco de Questões</Link>
            </p>
          ) : (
            <>
              <AccuracyLine points={m.accuracy} />
              {m.weak.length > 0 && (
                <div className="mt-6">
                  <Kicker>Pontos de atenção</Kicker>
                  <ul className="mt-2">
                    {m.weak.slice(0, 4).map((w) => (
                      <li key={`${w.subject}-${w.topic}`} className="flex items-baseline justify-between gap-3 border-b border-ed-rule py-2.5">
                        <span className="min-w-0">
                          <span className="ed-serif block truncate text-[17px]">{w.topic}</span>
                          <span className="font-ed-sans text-[12px] text-ed-graphite">{w.subject}</span>
                        </span>
                        <span className="ed-num font-ed-sans text-[13px] font-semibold text-ed-accent">{w.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
