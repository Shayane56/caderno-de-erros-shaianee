import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, Layers, Lightbulb, ListChecks, Target } from 'lucide-react';
import type { Rating } from '@/types';
import { RATING_LABELS } from '@/services/flashcards/scheduler';
import { identityPath } from '../registry';
import { delta, STAT_PERIODS, useStatsModel, type StatPeriod } from '../model/stats';
import { Bar, IconTile, PageTitle, Segmented, Stat, Surface, SurfaceTitle } from './ui';
import { Donut, LavenderCalendar, maturityParts, SoftBars } from './charts';

const RATING_COLOR: Record<Rating, string> = { 1: '#E08AAE', 2: '#F2A57F', 3: '#6FC3A3', 4: '#7FA6DE' };

export function SoftStats() {
  const [days, setDays] = useState<StatPeriod>(30);
  const m = useStatsModel(days);
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const ret = delta(m.retention, m.retentionPrev);
  const ratingParts = ([1, 2, 3, 4] as Rating[]).map((r) => ({ label: RATING_LABELS[r], value: m.ratings[r], color: RATING_COLOR[r] }));
  const totalRatings = ratingParts.reduce((s, p) => s + p.value, 0);
  const maxF = Math.max(1, ...m.forecast.map((f) => f.count));

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageTitle
        eyebrow="Estatísticas"
        title="Como você está aprendendo"
        actions={<Segmented value={days} options={STAT_PERIODS.map((p) => ({ id: p, label: `${p} dias` }))} onChange={setDays} label="Período" />}
      />

      <Surface className="sf-in flex items-start gap-4 p-5 !bg-sf-lav" aria-label="Resumo">
        <IconTile icon={Lightbulb} className="bg-white" />
        <p className="pt-1.5 text-[15.5px] font-medium leading-relaxed text-sf-violet-deep">{m.headline}</p>
      </Surface>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Target} tone="mint" label="Retenção" value={m.retention === null ? '—' : `${m.retention}%`} note={ret !== null ? `${ret > 0 ? '+' : ''}${ret} p.p. vs. anterior` : undefined} />
        <Stat icon={Layers} tone="violet" label="Cartões" value={m.current.cards} note={`${m.previous.cards} no período anterior`} />
        <Stat icon={Clock} tone="sky" label="Tempo de estudo" value={m.studyTime} />
        <Stat icon={CalendarCheck} tone="peach" label="Dias estudando" value={`${m.activeDays}/${days}`} note={`sequência: ${m.streak} ${m.streak === 1 ? 'dia' : 'dias'}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-ritmo">
          <SurfaceTitle
            id="sf-ritmo"
            title="Ritmo de revisões"
            hint={days === 90 ? 'Por semana' : 'Por dia'}
            action={
              <div className="flex gap-3 text-[12px] text-sf-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[4px] bg-sf-violet" aria-hidden />lembrados</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[4px] bg-sf-lilac/70" aria-hidden />esquecidos</span>
              </div>
            }
          />
          <SoftBars data={m.series} height={190} />
        </Surface>
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-respostas">
          <SurfaceTitle id="sf-respostas" title="Suas respostas" />
          <div className="flex items-center gap-5">
            <Donut parts={ratingParts} label="Distribuição das respostas" center={<><span className="sf-num text-[26px] font-semibold">{totalRatings}</span><span className="text-[11.5px] text-sf-muted">respostas</span></>} />
            <ul className="flex-1 space-y-2.5 text-[13.5px]">
              {ratingParts.map((p) => (
                <li key={p.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                  <span className="text-sf-muted">{p.label}</span>
                  <span className="sf-num ml-auto font-semibold">{totalRatings ? Math.round((p.value / totalRatings) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Surface>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-const">
          <SurfaceTitle id="sf-const" title="Constância" hint="Últimas 12 semanas" />
          <LavenderCalendar days={m.heatmap} />
        </Surface>
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-prev">
          <SurfaceTitle id="sf-prev" title="Próximos dias" hint="Revisões previstas pelo agendamento" />
          <div className="flex h-[132px] items-end gap-1.5">
            {m.forecast.map((f, i) => (
              <div key={f.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${f.label}: ${f.count}`}>
                <span className="sf-num h-3.5 text-[10.5px] font-semibold leading-[14px] text-sf-muted">{f.count || ''}</span>
                <div className={`sf-grow w-full rounded-[6px] ${i === 0 ? 'bg-sf-violet' : 'bg-sf-lilac/60'}`} style={{ height: `${f.count ? Math.max(6, (f.count / maxF) * 100) : 3}%`, animationDelay: `${i * 25}ms` }} />
                <span className="h-3.5 text-[10px] font-medium leading-[14px] text-sf-muted">{i % 2 === 0 ? f.label : ''}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-matur">
          <SurfaceTitle id="sf-matur" title="Maturidade do acervo" hint={`${m.breakdown.faces} faces de cartão`} />
          <div className="flex items-center gap-5">
            <Donut parts={maturityParts(m.breakdown)} size={132} label="Maturidade" center={<><span className="sf-num text-[24px] font-semibold">{m.breakdown.faces ? Math.round((m.breakdown.mature / m.breakdown.faces) * 100) : 0}%</span><span className="text-[11px] text-sf-muted">maduro</span></>} />
            <ul className="flex-1 space-y-2 text-[13.5px]">
              {maturityParts(m.breakdown).map((p) => (
                <li key={p.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                  <span className="text-sf-muted">{p.label}</span>
                  <span className="sf-num ml-auto font-semibold">{p.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Surface>
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-pordeck">
          <SurfaceTitle id="sf-pordeck" title="Por baralho" hint="Percentual de cartões lembrados" />
          {m.decks.length === 0 ? (
            <p className="text-[14px] text-sf-muted">Nenhuma revisão neste período.</p>
          ) : (
            <ul className="space-y-3.5">
              {m.decks.map((d) => (
                <li key={d.deckId}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px]">
                    <Link to={identityPath('soft', `baralhos/${d.deckId}`)} className="truncate font-semibold hover:text-sf-violet">
                      {d.name}
                    </Link>
                    <span className="sf-num shrink-0 text-sf-muted">
                      {d.reviews} · <b className="font-semibold text-sf-plum">{d.success}%</b>
                    </span>
                  </div>
                  <Bar value={d.success} label={`${d.name}: ${d.success}% lembrados`} color={d.success < 70 ? '#E08AAE' : '#6B4FD8'} />
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <Surface className="p-5 sm:p-6" aria-labelledby="sf-quest">
        <SurfaceTitle id="sf-quest" title="Questões" hint={`${m.current.answered} respondidas no período${m.current.pct !== null ? ` · ${m.current.pct}% de acerto` : ''}`} />
        {m.current.answered === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-sf-mist p-4">
            <ListChecks className="h-5 w-5 shrink-0 text-sf-violet" strokeWidth={1.75} aria-hidden />
            <p className="flex-1 text-[14px] text-sf-muted">Sem questões neste período.</p>
            <Link to="/questoes" className="text-[14px] font-semibold text-sf-violet">Abrir o banco</Link>
          </div>
        ) : m.weak.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {m.weak.map((w) => (
              <li key={`${w.subject}-${w.topic}`} className="rounded-2xl bg-sf-mist p-4">
                <p className="truncate text-[14.5px] font-semibold">{w.topic}</p>
                <p className="text-[12.5px] text-sf-muted">{w.subject} · {w.answered} questões</p>
                <Bar value={w.pct} label={`${w.pct}% de acerto`} color="#E08AAE" className="mt-2.5" />
                <p className="sf-num mt-1 text-[12px] font-semibold text-sf-rose-ink">{w.pct}% de acerto</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-sf-muted">Nenhum assunto abaixo de 80% de acerto. Muito bem!</p>
        )}
      </Surface>
    </div>
  );
}
