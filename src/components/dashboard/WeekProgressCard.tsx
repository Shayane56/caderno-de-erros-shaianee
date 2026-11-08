import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { db } from '@/database/db';
import { Mascot } from '@/components/mimo/Mascot';
import { ProgressRing } from '@/components/mimo/ProgressRing';

const DAY = 86_400_000;

/** Atividade dos últimos 7 dias: questões, cartões e foco, comparada à semana anterior. */
export function WeekProgressCard() {
  const since = useMemo(() => new Date(Date.now() - 14 * DAY).toISOString(), []);
  const data = useLiveQuery(async () => {
    const [attempts, cardReviews, focus] = await Promise.all([
      db.questionAttempts.where('answeredAt').aboveOrEqual(since).toArray(),
      db.cardReviews.where('reviewedAt').aboveOrEqual(since).toArray(),
      db.focusSessions.where('startedAt').aboveOrEqual(since).toArray(),
    ]);
    return { attempts, cardReviews, focus };
  }, [since]);

  const view = useMemo(() => {
    const weekStart = new Date(Date.now() - 7 * DAY).toISOString();
    const thisWeek = (data?.attempts ?? []).filter((a) => a.answeredAt >= weekStart);
    const lastWeek = (data?.attempts ?? []).filter((a) => a.answeredAt < weekStart);
    const cardsWeek = (data?.cardReviews ?? []).filter((r) => r.reviewedAt >= weekStart).length;
    const focusMin = Math.round((data?.focus ?? []).filter((f) => f.startedAt >= weekStart).reduce((s, f) => s + f.focusedMs, 0) / 60_000);
    const correct = thisWeek.filter((a) => a.correct).length;
    const pct = thisWeek.length ? (correct / thisWeek.length) * 100 : 0;
    const delta = lastWeek.length ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100) : null;
    return { answered: thisWeek.length, pct, delta, cardsWeek, focusMin };
  }, [data]);

  const message = view.answered === 0 && view.cardsWeek === 0 ? 'Bora começar a semana juntinhas?' : view.pct >= 70 ? 'Você está indo muito bem!' : 'Cada erro é um degrau. Continue!';

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lilac via-surface to-blush p-5 shadow-soft ring-1 ring-line/80 sm:p-6" aria-label="Seu progresso da semana">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <Mascot pose="books" className="h-32 w-40 shrink-0 sm:h-36 sm:w-44" />
        <div className="w-full min-w-0 flex-1">
          <h2 className="section-title text-center text-base sm:text-left">Seu progresso da semana</h2>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-5 sm:justify-start">
            <ProgressRing value={view.pct} label={`${Math.round(view.pct)}% de acertos nas questões da semana`} />
            <div>
              <p className="font-display text-[34px] font-extrabold leading-none text-ink">{view.answered.toLocaleString('pt-BR')}</p>
              <p className="mt-1 text-sm text-ink-muted">questões respondidas</p>
              {view.delta !== null && (
                <p className={`mt-1 inline-flex items-center gap-0.5 text-sm font-bold ${view.delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {view.delta >= 0 ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
                  {view.delta >= 0 ? '+' : ''}
                  {view.delta}% <span className="font-medium text-ink-muted">vs. semana anterior</span>
                </p>
              )}
              <p className="mt-1 text-xs text-ink-muted">
                {view.cardsWeek} cartão(ões) revisado(s) · {view.focusMin} min de foco
              </p>
            </div>
            <p className="relative rounded-3xl bg-surface px-4 py-3 text-[15px] font-semibold text-ink shadow-soft ring-1 ring-line/80">
              {message} <span className="text-rose-pink">♡</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
