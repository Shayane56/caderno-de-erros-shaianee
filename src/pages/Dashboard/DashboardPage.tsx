import { THEME } from '@/constants/theme';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChartColumn,
  CircleCheckBig,
  Clock,
  DatabaseBackup,
  Flame,
  Layers,
  Library,
  NotebookPen,
  NotebookText,
  Percent,
  PieChart,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAppData } from '@/hooks/useData';
import { StatCard } from '@/components/cards/StatCard';
import { ErrorListItem } from '@/components/cards/ErrorListItem';
import { HomeHeader } from '@/components/dashboard/HomeHeader';
import { WeekProgressCard } from '@/components/dashboard/WeekProgressCard';
import { QuickAccess } from '@/components/dashboard/QuickAccess';
import { MotivationCard } from '@/components/dashboard/MotivationCard';
import { DifficultyList } from '@/components/dashboard/DifficultyList';
import { FlashcardsTodayCard } from '@/components/dashboard/FlashcardsTodayCard';
import { SectionCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { PageLoader } from '@/components/common/Spinner';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { SegmentedBar } from '@/components/charts/SegmentedBar';
import { CumulativeChart } from '@/components/charts/TimelineChart';
import { StackedSubjects } from '@/components/charts/StackedSubjects';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { PRIORITIES } from '@/constants/priorities';
import { ORIGINS } from '@/constants/origins';
import { readPreference } from '@/services/preferences';
import { LAST_BACKUP_PREF } from '@/services/backupService';
import {
  analyzeOrigins,
  buildReviewQueue,
  buildTimeline,
  computeOverview,
  countBySubject,
  countByTopic,
  priorityDistribution,
  rankDifficulties,
  recentErrors,
} from '@/utils/statistics';
import { daysSince, formatDate } from '@/utils/dates';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TOP_SUBJECTS = 8;

export default function DashboardPage() {
  const data = useAppData();
  const { openCreate } = useErrorForm();
  const wide = useMediaQuery('(min-width: 640px)');

  const stats = useMemo(() => {
    const { errors, subjects, topics, reviews } = data;
    const bySubject = countBySubject(errors, subjects);
    const byTopic = countByTopic(errors, topics, subjects);
    return {
      overview: computeOverview(errors, subjects, topics, reviews),
      bySubject,
      subjectsWithErrors: bySubject.filter((s) => s.total > 0),
      priorities: priorityDistribution(errors),
      origins: analyzeOrigins(errors),
      timeline: buildTimeline(errors),
      recent: recentErrors(errors, 5),
      queue: buildReviewQueue(errors).slice(0, 5),
      hardSubjects: rankDifficulties(bySubject, 5),
      hardTopics: rankDifficulties(byTopic, 5),
    };
  }, [data]);

  if (data.loading) return <PageLoader />;
  const { overview } = stats;
  const lastBackup = readPreference<string | null>(LAST_BACKUP_PREF, null);
  const backupDue = overview.total > 0 && (!lastBackup || daysSince(lastBackup) >= 7);

  return (
    <div className="space-y-6">
      <HomeHeader />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <WeekProgressCard />
          <QuickAccess />
        </div>
        <MotivationCard />
      </div>
      <FlashcardsTodayCard />

      <h2 className="section-title flex items-center gap-2 pt-2 text-xl">
        <NotebookText className="h-5 w-5 text-rose-pink" aria-hidden /> Seu caderno de erros
        {overview.pending > 0 && (
          <Link to="/segundo-ciclo" className="ml-auto rounded-full bg-blush px-3 py-1 text-xs font-bold text-rose-ink transition hover:bg-petal">
            {overview.pending} para revisar →
          </Link>
        )}
      </h2>

      <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Erros registrados" value={overview.total} icon={NotebookText} to="/erros" hint={`${overview.topics} tópicos`} />
        <StatCard label="Matérias" value={overview.subjects} icon={Library} to="/materias" accent={THEME.antique} hint="em estudo" />
        <StatCard
          label="Prioridade alta"
          value={overview.alta}
          icon={Flame}
          accent={PRIORITIES.alta.color}
          to="/erros?prioridade=alta"
          hint="atenção imediata"
        />
        <StatCard
          label="Prioridade média"
          value={overview.media}
          icon={RotateCcw}
          accent="#B7791F"
          to="/erros?prioridade=media"
          hint="precisam de reforço"
        />
        <StatCard
          label="Superados"
          value={overview.superado}
          icon={CircleCheckBig}
          accent={PRIORITIES.superado.color}
          to="/erros?prioridade=superado"
          hint="dificuldades vencidas"
        />
        <StatCard label="Superação" value={`${overview.superadoPct.toLocaleString('pt-BR')}%`} icon={Percent} accent={THEME.pink} to="/evolucao">
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={overview.superadoPct} aria-valuemin={0} aria-valuemax={100} aria-label="Percentual de erros superados">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-medium to-rose-pink transition-all duration-700" style={{ width: `${overview.superadoPct}%` }} />
          </div>
        </StatCard>
      </section>

      {overview.total === 0 ? (
        <section className="card p-6 sm:p-10">
          <EmptyState
            icon={NotebookPen}
            title="Seu caderno está pronto para começar"
            description="Registre o primeiro erro de uma questão: escolha a matéria, o tópico, descreva o que aconteceu e por que você errou. Os indicadores e gráficos serão montados a partir dos seus registros reais."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => openCreate()} icon={NotebookPen}>
                  Registrar primeiro erro
                </Button>
                <Link to="/materias" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-5 text-[15px] font-semibold text-ink transition hover:border-rose-medium">
                  <Library className="h-[18px] w-[18px]" aria-hidden /> Cadastrar matérias
                </Link>
              </div>
            }
          />
        </section>
      ) : (
        <>
          {backupDue && (
            <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
              <DatabaseBackup className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <p className="flex-1 text-sm text-amber-900">
                {lastBackup ? `Seu último backup foi em ${formatDate(lastBackup)}.` : 'Você ainda não fez nenhum backup.'} Exporte uma cópia dos seus dados para
                guardar em segurança.
              </p>
              <Link to="/backup" className="text-sm font-semibold text-amber-900 underline-offset-2 hover:underline">
                Fazer backup agora
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartFrame
              title="Erros por matéria"
              subtitle={stats.subjectsWithErrors.length > TOP_SUBJECTS ? `As ${TOP_SUBJECTS} matérias com mais registros` : 'Total de registros por matéria'}
              icon={ChartColumn}
              table={{
                columns: [
                  { key: 'name', label: 'Matéria' },
                  { key: 'total', label: 'Total', align: 'right' },
                  { key: 'pending', label: 'Pendentes', align: 'right' },
                  { key: 'superado', label: 'Superados', align: 'right' },
                ],
                rows: stats.subjectsWithErrors,
              }}
            >
              <HorizontalBars
                seriesName="Registros"
                labelWidth={wide ? 168 : 120}
                data={stats.subjectsWithErrors.slice(0, TOP_SUBJECTS).map((s) => ({ name: s.name, value: s.total, hint: `${s.name} — ${s.pending} pendentes` }))}
              />
            </ChartFrame>

            <ChartFrame
              title="Distribuição por prioridade"
              subtitle="Como estão classificados os seus registros"
              icon={PieChart}
              table={{
                columns: [
                  { key: 'label', label: 'Classificação' },
                  { key: 'value', label: 'Registros', align: 'right' },
                  { key: 'pct', label: '%', align: 'right' },
                ],
                rows: stats.priorities.map((p) => ({ ...p, pct: `${p.pct}%` })),
              }}
            >
              <SegmentedBar
                ariaLabel="Distribuição por prioridade"
                segments={stats.priorities.map((p) => ({ id: p.id, label: p.label, value: p.value, color: p.color }))}
              />
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-3 text-sm font-semibold text-ink">Pendentes × superados</p>
                <SegmentedBar
                  ariaLabel="Erros pendentes e superados"
                  showLegend={false}
                  segments={[
                    { id: 'p', label: 'Pendentes', value: overview.pending, color: THEME.pink },
                    { id: 's', label: 'Superados', value: overview.superado, color: '#15803D' },
                  ]}
                />
                <p className="mt-2 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{overview.pending}</span> pendentes ·{' '}
                  <span className="font-semibold text-ink">{overview.superado}</span> superados
                </p>
              </div>
            </ChartFrame>

            <ChartFrame
              title="Distribuição por origem"
              subtitle={
                stats.origins.unclassified
                  ? `Por que você erra · ${stats.origins.unclassified} não classificado(s)`
                  : 'Por que você erra'
              }
              icon={Target}
              empty={stats.origins.classified === 0}
              emptyText="Nenhum registro com origem classificada ainda."
              table={{
                columns: [
                  { key: 'label', label: 'Origem' },
                  { key: 'count', label: 'Registros', align: 'right' },
                  { key: 'pct', label: '% dos classificados', align: 'right' },
                ],
                rows: stats.origins.stats.map((s) => ({ ...s, pct: `${s.pct}%` })),
              }}
            >
              <HorizontalBars
                seriesName="Registros"
                labelWidth={wide ? 170 : 112}
                data={stats.origins.stats.map((s) => ({ name: ORIGINS[s.id].label, value: s.count, fill: s.color, hint: `${s.label} — ${s.pct}% dos classificados` }))}
              />
            </ChartFrame>

            <ChartFrame
              title="Evolução dos registros"
              subtitle="Dificuldades identificadas e superadas (acumulado)"
              icon={TrendingUp}
              table={{
                columns: [
                  { key: 'label', label: 'Período' },
                  { key: 'created', label: 'Registrados', align: 'right' },
                  { key: 'resolved', label: 'Superados', align: 'right' },
                  { key: 'cumulativeCreated', label: 'Total identificado', align: 'right' },
                  { key: 'cumulativeResolved', label: 'Total superado', align: 'right' },
                ],
                rows: stats.timeline,
              }}
            >
              <CumulativeChart data={stats.timeline} />
            </ChartFrame>
          </div>

          <ChartFrame
            title="Pendentes × superados por matéria"
            subtitle="Comparação entre o que ainda precisa de atenção e o que já foi vencido"
            icon={Layers}
            table={{
              columns: [
                { key: 'name', label: 'Matéria' },
                { key: 'pending', label: 'Pendentes', align: 'right' },
                { key: 'superado', label: 'Superados', align: 'right' },
              ],
              rows: stats.subjectsWithErrors,
            }}
          >
            <StackedSubjects groups={stats.subjectsWithErrors.slice(0, TOP_SUBJECTS)} labelWidth={wide ? 170 : 120} />
          </ChartFrame>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Precisam de revisão"
              subtitle="Prioridade alta primeiro, depois os mais antigos sem revisão"
              icon={CalendarClock}
              action={
                <Link to="/segundo-ciclo" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-rose-pink hover:text-rose-deep">
                  Revisar <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            >
              {stats.queue.length ? (
                <ul className="-mx-2 divide-y divide-line">
                  {stats.queue.map((e) => (
                    <ErrorListItem key={e.id} record={e} lookup={data.lookup} meta="review" />
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={CircleCheckBig} title="Tudo revisado!" description="Nenhum erro pendente no momento." />
              )}
            </SectionCard>

            <SectionCard
              title="Últimos erros registrados"
              icon={Clock}
              action={
                <Link to="/erros" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-rose-pink hover:text-rose-deep">
                  Ver todos <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            >
              <ul className="-mx-2 divide-y divide-line">
                {stats.recent.map((e) => (
                  <ErrorListItem key={e.id} record={e} lookup={data.lookup} />
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Matérias com mais dificuldades" subtitle="Pendências ponderadas pela prioridade" icon={BookOpen}>
              {stats.hardSubjects.length ? (
                <DifficultyList groups={stats.hardSubjects} linkFor={(g) => `/erros?materia=${g.id}&prioridade=alta,media`} />
              ) : (
                <EmptyState compact icon={CircleCheckBig} title="Nenhuma pendência" description="Todos os erros estão superados." />
              )}
            </SectionCard>

            <SectionCard title="Tópicos com mais dificuldades" subtitle="Onde concentrar a próxima revisão" icon={Target}>
              {stats.hardTopics.length ? (
                <DifficultyList
                  showSubject
                  groups={stats.hardTopics}
                  linkFor={(g) => `/erros?topico=${g.id}&prioridade=alta,media`}
                />
              ) : (
                <EmptyState compact icon={CircleCheckBig} title="Nenhuma pendência" description="Todos os erros estão superados." />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
