import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowRight, ArrowUp, CalendarCheck, Clock, Layers, ListChecks, Target, TrendingUp } from 'lucide-react';
import { db } from '@/database/db';
import { PageLoader } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Mascot } from '@/components/mimo/Mascot';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { CHART_COLORS } from '@/constants/app';
import { accuracyTimeline, activeDays, formatDuration, periodStats, weakPoints } from '@/services/study/statsService';
import { cn } from '@/utils/cn';

const PERIODS = [7, 30, 90] as const;
const DAY = 86_400_000;

function Delta({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  return (
    <span className={cn('inline-flex items-center text-xs font-bold', up ? 'text-emerald-700' : 'text-red-700')}>
      {up ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden />}
      {up ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

function Metric({ icon: Icon, label, value, delta, tint }: { icon: typeof Target; label: string; value: string; delta?: React.ReactNode; tint: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tint)}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-muted">{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-2 font-display text-[26px] font-extrabold leading-tight text-ink">
          {value} {delta}
        </p>
      </div>
    </div>
  );
}

export default function EstatisticasPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const data = useLiveQuery(async () => {
    const since = new Date(Date.now() - 2 * 90 * DAY).toISOString();
    const [attempts, focus, reviews, errors] = await Promise.all([
      db.questionAttempts.where('answeredAt').aboveOrEqual(since).toArray(),
      db.focusSessions.where('startedAt').aboveOrEqual(since).toArray(),
      db.cardReviews.where('reviewedAt').aboveOrEqual(since).toArray(),
      db.errors.toArray(),
    ]);
    return { attempts, focus, reviews, errors };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const from = now - days * DAY;
    const current = periodStats(data.attempts, data.focus, data.reviews, from, now);
    const previous = periodStats(data.attempts, data.focus, data.reviews, from - days * DAY, from);
    const inPeriod = data.attempts.filter((a) => new Date(a.answeredAt).getTime() >= from);
    return {
      current,
      previous,
      timeline: accuracyTimeline(data.attempts, days, now),
      weak: weakPoints(inPeriod),
      active: activeDays(data.attempts, data.reviews, data.focus, from),
      superados: data.errors.filter((e) => e.priority === 'superado' && e.resolvedAt && new Date(e.resolvedAt).getTime() >= from).length,
    };
  }, [data, days]);

  if (!view) return <PageLoader />;
  const { current, previous } = view;
  const pctDelta = current.pct !== null && previous.pct !== null ? current.pct - previous.pct : null;
  const improved = pctDelta !== null && pctDelta > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink sm:text-[32px]">
            Suas Estatísticas <span aria-hidden>💜</span>
          </h1>
          <p className="mt-1 text-[15px] text-ink-muted">Acompanhe seu progresso e identifique seus pontos de melhoria.</p>
        </div>
        <div className="inline-flex self-start rounded-full bg-surface p-1 shadow-soft ring-1 ring-line/80 sm:self-auto" role="group" aria-label="Período">
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={days === p} onClick={() => setDays(p)} className={cn('rounded-full px-4 py-1.5 text-sm font-bold transition', days === p ? 'bg-rose-pink text-white' : 'text-ink-muted hover:text-rose-ink')}>
              {p} dias
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Target} label="Acertos" value={current.pct === null ? '—' : `${current.pct}%`} delta={<Delta value={pctDelta} suffix="%" />} tint="bg-[#FFF1C9] text-[#C98A00]" />
        <Metric icon={ListChecks} label="Questões" value={current.answered.toLocaleString('pt-BR')} delta={<Delta value={current.answered - previous.answered || null} />} tint="bg-[#D9F3EA] text-[#1F9E78]" />
        <Metric icon={Clock} label="Tempo de estudo" value={formatDuration(current.studyMs)} delta={<Delta value={Math.round((current.studyMs - previous.studyMs) / 3_600_000) || null} suffix="h" />} tint="bg-lilac text-lilac-deep" />
        <Metric icon={CalendarCheck} label="Dias estudando" value={`${view.active}/${days}`} delta={<span className="text-xs font-semibold text-ink-muted">{current.cards} cartões</span>} tint="bg-blush text-rose-pink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5" aria-label="Desempenho ao longo do tempo">
          <h2 className="section-title mb-4 text-base">Desempenho ao longo do tempo</h2>
          {current.answered === 0 && previous.answered === 0 ? (
            <EmptyState compact icon={TrendingUp} title="Ainda sem respostas neste período" description="Resolva questões no Banco de Questões para ver sua curva de acertos." />
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={view.timeline} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="pct" name="Acertos (%)" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.primary }} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card p-5" aria-label="Seus pontos fracos">
          <h2 className="section-title mb-3 text-base">Seus pontos fracos</h2>
          {view.weak.length === 0 ? (
            <p className="text-sm text-ink-muted">Responda pelo menos 3 questões de um assunto para o Mimo encontrar onde vale reforçar. 💗</p>
          ) : (
            <ul className="space-y-2">
              {view.weak.map((w, i) => (
                <li key={`${w.subject}-${w.topic}`}>
                  <Link
                    to={`/questoes/resolver?materia=${encodeURIComponent(w.subject)}&assunto=${encodeURIComponent(w.topic === 'Geral' ? '' : w.topic)}`}
                    className={cn('flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5', i % 2 ? 'bg-lilac text-lilac-deep' : 'bg-blush text-rose-ink')}
                  >
                    <span className="min-w-0 truncate">
                      {w.topic}
                      <span className="block truncate text-[11px] font-semibold opacity-80">{w.subject}</span>
                    </span>
                    <span className="shrink-0">{w.pct}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/questoes?situacao=errei" className="mt-4 inline-flex items-center gap-1 rounded-full bg-lilac px-4 py-2 text-sm font-bold text-lilac-deep transition hover:brightness-95">
            Refazer as que errei <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      </div>

      <section className="flex flex-col items-center gap-4 rounded-[28px] bg-gradient-to-r from-[#FFF4D6] via-blush to-lilac p-5 shadow-soft ring-1 ring-line/80 sm:flex-row" aria-label="Resumo">
        <Mascot pose="cheer" className="h-24 w-24 shrink-0" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-display text-xl font-extrabold text-[#3D2E4A]">{improved ? 'Você evoluiu! ✨' : current.answered ? 'Continue assim, você consegue! ✨' : 'Bora começar? ✨'}</p>
          <p className="text-sm text-[#5A4A66]">
            {improved
              ? `Seu acerto subiu ${pctDelta} pontos em relação aos ${days} dias anteriores.`
              : `${view.superados} erro(s) superado(s) no caderno neste período · ${formatDuration(current.focusMs)} no Modo Foco.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-center gap-2">
          <Link to="/evolucao" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#B3306E] transition hover:bg-white">
            Evolução do caderno <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link to="/flashcards" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#6B4FC4] transition hover:bg-white">
            <Layers className="h-4 w-4" aria-hidden /> Baralhos
          </Link>
        </div>
      </section>
    </div>
  );
}
