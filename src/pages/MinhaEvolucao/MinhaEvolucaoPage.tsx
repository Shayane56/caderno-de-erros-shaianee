import { useMemo, useState } from 'react';
import {
  ChartColumn,
  CircleCheckBig,
  Flame,
  Info,
  Lightbulb,
  NotebookText,
  Percent,
  PieChart,
  Repeat,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAppData } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoader } from '@/components/common/Spinner';
import { SectionCard } from '@/components/common/Card';
import { OriginIcon } from '@/components/common/Badges';
import { StatCard } from '@/components/cards/StatCard';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { SegmentedBar } from '@/components/charts/SegmentedBar';
import { CumulativeChart, PeriodColumns } from '@/components/charts/TimelineChart';
import { StackedSubjects } from '@/components/charts/StackedSubjects';
import { CHART_COLORS } from '@/constants/app';
import { ORIGINS } from '@/constants/origins';
import { PRIORITIES } from '@/constants/priorities';
import {
  analyzeOrigins,
  autoGranularity,
  buildTimeline,
  computeOverview,
  countBySubject,
  priorityDistribution,
  type Granularity,
} from '@/utils/statistics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';

const GRANULARITY_LABEL: Record<Granularity, string> = { day: 'Dia', week: 'Semana', month: 'Mês' };

export default function MinhaEvolucaoPage() {
  const data = useAppData();
  const wide = useMediaQuery('(min-width: 640px)');
  const [granularity, setGranularity] = useState<Granularity | 'auto'>('auto');

  const view = useMemo(() => {
    const g = granularity === 'auto' ? autoGranularity(data.errors) : granularity;
    const bySubject = countBySubject(data.errors, data.subjects).filter((s) => s.total > 0);
    return {
      granularity: g,
      overview: computeOverview(data.errors, data.subjects, data.topics, data.reviews),
      timeline: buildTimeline(data.errors, g),
      bySubject,
      priorities: priorityDistribution(data.errors),
      origins: analyzeOrigins(data.errors),
    };
  }, [data, granularity]);

  if (data.loading) return <PageLoader />;
  const { overview, origins } = view;
  const main = origins.mostFrequent;
  const empty = overview.total === 0;

  const granularityControl = (
    <div className="flex rounded-xl bg-canvas p-0.5" role="group" aria-label="Agrupar por período">
      {(['auto', 'day', 'week', 'month'] as const).map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={granularity === g}
          onClick={() => setGranularity(g)}
          className={cn('rounded-[10px] px-3 py-1.5 text-xs font-semibold transition', granularity === g ? 'bg-white text-rose-pink shadow-soft' : 'text-ink-muted hover:text-rose-ink')}
        >
          {g === 'auto' ? 'Automático' : GRANULARITY_LABEL[g]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Evolução"
        eyebrow="Acompanhamento do aprendizado"
        icon={TrendingUp}
        subtitle="Acompanhe as dificuldades que você identificou e as que já superou."
      />

      <div className="flex items-start gap-3 rounded-3xl bg-blush/50 p-4 text-sm text-rose-ink ring-1 ring-petal">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <strong>Mais registros não significam piora.</strong> Cada erro registrado é uma dificuldade identificada — e uma oportunidade de
          aprendizado. O que importa é quantas dificuldades você está superando ao longo do tempo.
        </p>
      </div>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Erros registrados" value={overview.total} icon={NotebookText} />
        <StatCard label="Superados" value={overview.superado} icon={CircleCheckBig} accent={PRIORITIES.superado.color} />
        <StatCard label="Prioridade alta" value={overview.alta} icon={Flame} accent={PRIORITIES.alta.color} />
        <StatCard label="Prioridade média" value={overview.media} icon={RotateCcw} accent="#B7791F" />
        <StatCard label="Percentual superado" value={`${overview.superadoPct.toLocaleString('pt-BR')}%`} icon={Percent} />
        <StatCard label="Revisões realizadas" value={overview.reviews} icon={Repeat} accent="#D98BAE" />
      </section>

      {/* Análise das origens */}
      <SectionCard
        title="Análise das origens dos erros"
        subtitle={
          origins.unclassified
            ? `Percentuais calculados sobre ${origins.classified} registro(s) classificado(s) · ${origins.unclassified} não classificado(s)`
            : `Percentuais calculados sobre ${origins.classified} registro(s) classificado(s)`
        }
        icon={Target}
      >
        {origins.classified === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-canvas/50 p-6 text-center text-sm text-ink-muted">
            Nenhum registro com origem classificada ainda. A análise aparece assim que você registrar erros.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="min-w-0 space-y-3 lg:col-span-3">
              <ul className="grid gap-3 sm:grid-cols-2">
                {origins.stats.map((s) => {
                  const isMain = main.some((m) => m.id === s.id);
                  return (
                    <li key={s.id} className={cn('rounded-2xl border p-4 transition', isMain ? 'border-rose-medium/50 bg-blush/30' : 'border-line bg-white')}>
                      <div className="flex items-start gap-3">
                        <OriginIcon origin={s.id} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">{s.label}</p>
                          <p className="text-xs text-ink-muted">
                            {s.pending} pendente{s.pending === 1 ? '' : 's'} · {s.superado} superado{s.superado === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold leading-none text-ink">{s.count}</p>
                          <p className="text-xs font-semibold text-ink-muted">{s.pct.toLocaleString('pt-BR')}%</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                      </div>
                      {isMain && (
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-rose-pink">
                          {main.length > 1 ? 'Empatada entre as mais frequentes' : 'Origem mais frequente'}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="min-w-0 lg:col-span-2">
              <div className="h-full rounded-3xl bg-gradient-to-br from-blush to-petal/80 p-5 ring-1 ring-petal">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-antique">
                  <Lightbulb className="h-4 w-4" aria-hidden /> Onde concentrar seus esforços
                </p>
                {main.length === 1 ? (
                  <>
                    <p className="mt-3 font-display text-lg font-semibold leading-snug text-[#7A2E52]">
                      Sua principal dificuldade está relacionada a{' '}
                      {main[0].id === 'desconhecimento'
                        ? 'conteúdos que você ainda não conhecia (desconhecimento)'
                        : main[0].id === 'confusao'
                          ? 'confusão entre conceitos'
                          : main[0].id === 'esquecimento'
                            ? 'esquecimento de conteúdos já estudados'
                            : 'erros de interpretação dos enunciados'}
                      .
                    </p>
                    <p className="mt-1 text-sm text-rose-ink">
                      {main[0].count} de {origins.classified} registros classificados ({main[0].pct.toLocaleString('pt-BR')}%).
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink">{ORIGINS[main[0].id].strategy}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-display text-lg font-semibold leading-snug text-[#7A2E52]">
                      Empate entre {main.map((m) => m.label.toLowerCase()).join(' e ')}.
                    </p>
                    <p className="mt-1 text-sm text-rose-ink">Cada uma representa {main[0].pct.toLocaleString('pt-BR')}% dos registros classificados.</p>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
                      {main.map((m) => (
                        <li key={m.id}>
                          <strong>{m.label}:</strong> {ORIGINS[m.id].strategy}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          title="Comparativo das origens"
          subtitle="Quantidade de registros por origem"
          icon={ChartColumn}
          empty={origins.classified === 0}
          table={{
            columns: [
              { key: 'label', label: 'Origem' },
              { key: 'count', label: 'Registros', align: 'right' },
              { key: 'pct', label: '%', align: 'right' },
              { key: 'pending', label: 'Pendentes', align: 'right' },
              { key: 'superado', label: 'Superados', align: 'right' },
            ],
            rows: origins.stats.map((s) => ({ ...s, pct: `${s.pct}%` })),
          }}
        >
          <HorizontalBars
            seriesName="Registros"
            labelWidth={wide ? 170 : 112}
            data={origins.stats.map((s) => ({ name: s.label, value: s.count, fill: s.color, hint: `${s.label} — ${s.pct}%` }))}
          />
        </ChartFrame>

        <ChartFrame
          title="Distribuição por prioridade"
          icon={PieChart}
          empty={empty}
          table={{
            columns: [
              { key: 'label', label: 'Classificação' },
              { key: 'value', label: 'Registros', align: 'right' },
              { key: 'pct', label: '%', align: 'right' },
            ],
            rows: view.priorities.map((p) => ({ ...p, pct: `${p.pct}%` })),
          }}
        >
          <SegmentedBar ariaLabel="Distribuição por prioridade" segments={view.priorities.map((p) => ({ id: p.id, label: p.label, value: p.value, color: p.color }))} />
        </ChartFrame>

        <ChartFrame
          title="Evolução dos registros"
          subtitle={`Erros registrados por ${GRANULARITY_LABEL[view.granularity].toLowerCase()}`}
          icon={TrendingUp}
          empty={empty}
          table={{
            columns: [
              { key: 'label', label: 'Período' },
              { key: 'created', label: 'Registrados', align: 'right' },
            ],
            rows: view.timeline,
          }}
        >
          <div className="mb-3 flex justify-end">{granularityControl}</div>
          <PeriodColumns data={view.timeline} dataKey="created" name="Registrados" color={CHART_COLORS.primary} />
        </ChartFrame>

        <ChartFrame
          title="Evolução dos erros superados"
          subtitle={`Erros superados por ${GRANULARITY_LABEL[view.granularity].toLowerCase()}`}
          icon={CircleCheckBig}
          empty={empty}
          emptyText="Ainda não há erros superados."
          table={{
            columns: [
              { key: 'label', label: 'Período' },
              { key: 'resolved', label: 'Superados', align: 'right' },
            ],
            rows: view.timeline,
          }}
        >
          <div className="mb-3 flex justify-end">{granularityControl}</div>
          <PeriodColumns data={view.timeline} dataKey="resolved" name="Superados" color={CHART_COLORS.resolved} />
        </ChartFrame>
      </div>

      <ChartFrame
        title="Dificuldades identificadas × superadas"
        subtitle="Total acumulado ao longo do tempo"
        icon={TrendingUp}
        empty={empty}
        table={{
          columns: [
            { key: 'label', label: 'Período' },
            { key: 'cumulativeCreated', label: 'Identificadas', align: 'right' },
            { key: 'cumulativeResolved', label: 'Superadas', align: 'right' },
          ],
          rows: view.timeline,
        }}
      >
        <CumulativeChart data={view.timeline} height={280} />
      </ChartFrame>

      <ChartFrame
        title="Distribuição por matéria"
        subtitle="Pendentes e superados em cada matéria"
        icon={ChartColumn}
        empty={empty}
        table={{
          columns: [
            { key: 'name', label: 'Matéria' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'alta', label: 'Alta', align: 'right' },
            { key: 'media', label: 'Média', align: 'right' },
            { key: 'superado', label: 'Superados', align: 'right' },
          ],
          rows: view.bySubject,
        }}
      >
        <StackedSubjects groups={view.bySubject.slice(0, 12)} labelWidth={wide ? 180 : 120} />
      </ChartFrame>
    </div>
  );
}
