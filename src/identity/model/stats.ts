import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import type { CardReview, Rating } from '@/types';
import { useFlashcardData } from '@/hooks/useFlashcards';
import { cardBreakdown, reviewsPerDay, studyStreak, type CardBreakdown } from '@/services/flashcards/stats';
import { studyDayStart } from '@/services/flashcards/scheduler';
import { accuracyTimeline, activeDays, formatDuration, periodStats, weakPoints, type PeriodStats, type TimelinePoint, type WeakPoint } from '@/services/study/statsService';
import { toLocalDateKey } from '@/utils/dates';

const DAY = 86_400_000;
export const STAT_PERIODS = [7, 30, 90] as const;
export type StatPeriod = (typeof STAT_PERIODS)[number];

export interface DayPoint {
  key: string;
  label: string;
  count: number;
  correct: number;
}

export interface DeckPerformance {
  deckId: string;
  name: string;
  reviews: number;
  /** Percentual de respostas diferentes de "Errei". */
  success: number;
}

export interface StatsModel {
  loading: boolean;
  days: StatPeriod;
  current: PeriodStats;
  previous: PeriodStats;
  /** Retenção: acertos em cartões que já estavam em revisão. */
  retention: number | null;
  retentionPrev: number | null;
  ratings: Record<Rating, number>;
  /** Respostas a cartões por dia (7 e 30 dias) ou por semana (90 dias). */
  series: DayPoint[];
  accuracy: TimelinePoint[];
  weak: WeakPoint[];
  activeDays: number;
  breakdown: CardBreakdown;
  /** Revisões previstas para os próximos 14 dias (hoje inclui atrasadas). */
  forecast: Array<{ key: string; label: string; count: number }>;
  /** Últimas 12 semanas, dia a dia (para o mapa de constância). */
  heatmap: Array<{ key: string; count: number }>;
  streak: number;
  decks: DeckPerformance[];
  studyTime: string;
  /** Uma frase de leitura dos números (usada como "nota" ou "insight"). */
  headline: string;
}

function retentionOf(reviews: CardReview[]): number | null {
  const relevant = reviews.filter((r) => r.phaseBefore === 'review');
  if (!relevant.length) return null;
  return Math.round((relevant.filter((r) => r.rating > 1).length / relevant.length) * 100);
}

function labelDay(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function useStatsModel(days: StatPeriod): StatsModel {
  const flash = useFlashcardData(60_000);
  const data = useLiveQuery(async () => {
    const since = new Date(Date.now() - 2 * 90 * DAY).toISOString();
    const [attempts, focus, reviews] = await Promise.all([
      db.questionAttempts.where('answeredAt').aboveOrEqual(since).toArray(),
      db.focusSessions.where('startedAt').aboveOrEqual(since).toArray(),
      db.cardReviews.where('reviewedAt').aboveOrEqual(since).toArray(),
    ]);
    return { attempts, focus, reviews };
  }, []);

  return useMemo(() => {
    const now = flash.now.getTime();
    const from = now - days * DAY;
    const attempts = data?.attempts ?? [];
    const focus = data?.focus ?? [];
    const reviews = data?.reviews ?? [];
    const current = periodStats(attempts, focus, reviews, from, now);
    const previous = periodStats(attempts, focus, reviews, from - days * DAY, from);
    const inPeriod = reviews.filter((r) => new Date(r.reviewedAt).getTime() >= from);
    const prevPeriod = reviews.filter((r) => {
      const t = new Date(r.reviewedAt).getTime();
      return t >= from - days * DAY && t < from;
    });

    const ratings: Record<Rating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of inPeriod) ratings[r.rating]++;

    // Série de respostas: diária até 30 dias, semanal em 90 dias.
    const series: DayPoint[] = [];
    const bucket = days === 90 ? 7 : 1;
    const start = studyDayStart(new Date(now - (days - 1) * DAY));
    for (let i = 0; i < days / bucket; i++) {
      const a = new Date(start.getTime() + i * bucket * DAY);
      const b = new Date(a.getTime() + bucket * DAY);
      const list = inPeriod.filter((r) => {
        const t = new Date(r.reviewedAt).getTime();
        return t >= a.getTime() && t < b.getTime();
      });
      series.push({
        key: toLocalDateKey(a),
        label: bucket === 1 ? (days === 7 ? a.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : labelDay(a)) : labelDay(a),
        count: list.length,
        correct: list.filter((r) => r.rating > 1).length,
      });
    }

    // Previsão: faces em revisão por dia de vencimento.
    const today = studyDayStart(flash.now);
    const forecast = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today.getTime() + i * DAY);
      return { key: toLocalDateKey(d), label: i === 0 ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), count: 0 };
    });
    for (const card of flash.cards) {
      if (card.suspended) continue;
      for (const s of Object.values(card.srs)) {
        if (s.phase === 'new' || !s.due) continue;
        const idx = Math.max(0, Math.floor((studyDayStart(new Date(s.due)).getTime() - today.getTime()) / DAY));
        if (idx < forecast.length) forecast[idx].count++;
      }
    }

    const deckName = new Map(flash.decks.map((d) => [d.id, d.name]));
    const perDeck = new Map<string, { reviews: number; ok: number }>();
    for (const r of inPeriod) {
      const e = perDeck.get(r.deckId) ?? { reviews: 0, ok: 0 };
      e.reviews++;
      if (r.rating > 1) e.ok++;
      perDeck.set(r.deckId, e);
    }
    const decks = [...perDeck.entries()]
      .filter(([id]) => deckName.has(id))
      .map(([deckId, e]) => ({ deckId, name: deckName.get(deckId)!, reviews: e.reviews, success: Math.round((e.ok / e.reviews) * 100) }))
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 6);

    const retention = retentionOf(inPeriod);
    const retentionPrev = retentionOf(prevPeriod);
    const total = inPeriod.length;
    let headline: string;
    if (total === 0 && current.answered === 0) headline = 'Ainda não há respostas neste período. Uma revisão curta hoje já começa a desenhar a sua curva.';
    else if (retention !== null && retentionPrev !== null && retention > retentionPrev)
      headline = `Sua retenção subiu de ${retentionPrev}% para ${retention}%: o que você revisa está ficando.`;
    else if (retention !== null && retention >= 85) headline = `Você lembra ${retention}% do que já estava em revisão — um ritmo sólido para manter.`;
    else if (retention !== null) headline = `Retenção de ${retention}%. Vale responder com calma e usar “Difícil” quando hesitar.`;
    else headline = `${total} ${total === 1 ? 'cartão respondido' : 'cartões respondidos'} no período. Os primeiros intervalos longos aparecem em poucos dias.`;

    return {
      loading: !data || flash.loading,
      days,
      current,
      previous,
      retention,
      retentionPrev,
      ratings,
      series,
      accuracy: accuracyTimeline(attempts, days, now),
      weak: weakPoints(attempts.filter((a) => new Date(a.answeredAt).getTime() >= from)),
      activeDays: activeDays(attempts, reviews, focus, from),
      breakdown: cardBreakdown(flash.cards),
      forecast,
      heatmap: reviewsPerDay(reviews, 84, flash.now),
      streak: studyStreak(reviews, flash.now),
      decks,
      studyTime: formatDuration(current.studyMs),
      headline,
    };
  }, [data, flash, days]);
}

export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  const d = current - previous;
  return d === 0 ? null : d;
}
