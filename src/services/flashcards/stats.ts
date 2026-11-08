import type { CardReview, Flashcard } from '@/types';
import { toLocalDateKey } from '@/utils/dates';
import { MATURE_INTERVAL, formatDays, formatWait, studyDayStart } from './scheduler';

export interface CardBreakdown {
  total: number;
  faces: number;
  new: number;
  learning: number;
  young: number;
  mature: number;
  suspended: number;
}

/** Contagem de faces por maturidade (como as estatísticas do Anki). */
export function cardBreakdown(cards: Flashcard[]): CardBreakdown {
  const out: CardBreakdown = { total: cards.length, faces: 0, new: 0, learning: 0, young: 0, mature: 0, suspended: 0 };
  for (const card of cards) {
    if (card.suspended) out.suspended++;
    for (const state of Object.values(card.srs)) {
      out.faces++;
      if (state.phase === 'new') out.new++;
      else if (state.phase === 'learning' || state.phase === 'relearning') out.learning++;
      else if (state.interval >= MATURE_INTERVAL) out.mature++;
      else out.young++;
    }
  }
  return out;
}

export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';

/** Situação resumida de um cartão (a face mais urgente). */
export function cardStatus(card: Flashcard): CardStatus {
  if (card.suspended) return 'suspended';
  const states = Object.values(card.srs);
  if (states.some((s) => s.phase === 'learning' || s.phase === 'relearning')) return 'learning';
  if (states.every((s) => s.phase === 'new')) return 'new';
  return 'review';
}

/** Próxima data de estudo (a face que vence primeiro). */
export function nextDue(card: Flashcard): string | null {
  const dues = Object.values(card.srs)
    .map((s) => s.due)
    .filter((d): d is string => !!d)
    .sort();
  return dues[0] ?? null;
}

export function describeNextDue(card: Flashcard, now = new Date()): string {
  if (card.suspended) return 'Suspenso';
  const states = Object.values(card.srs);
  if (states.length && states.every((s) => s.phase === 'new')) return 'Novo';
  const due = nextDue(card);
  if (!due) return 'Novo';
  const diff = new Date(due).getTime() - now.getTime();
  if (diff <= 0) return 'Para hoje';
  const tomorrow = studyDayStart(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (new Date(due) < tomorrow) return `Hoje, em ${formatWait(diff)}`;
  const days = Math.round((studyDayStart(new Date(due)).getTime() - studyDayStart(now).getTime()) / 86_400_000);
  return days === 1 ? 'Amanhã' : `Em ${formatDays(days)}`;
}

/** Dias seguidos com pelo menos uma resposta (contando hoje ou ontem como ponto de partida). */
export function studyStreak(reviews: CardReview[], now = new Date()): number {
  const days = new Set(reviews.map((r) => toLocalDateKey(studyDayStart(new Date(r.reviewedAt)))));
  const cursor = studyDayStart(now);
  if (!days.has(toLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toLocalDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Percentual de acertos em revisões (cartões já aprendidos) no período. */
export function retentionRate(reviews: CardReview[], days = 30, now = new Date()): number | null {
  const since = now.getTime() - days * 86_400_000;
  const relevant = reviews.filter((r) => r.phaseBefore === 'review' && new Date(r.reviewedAt).getTime() >= since);
  if (relevant.length === 0) return null;
  const ok = relevant.filter((r) => r.rating > 1).length;
  return Math.round((ok / relevant.length) * 100);
}

/** Respostas por dia nos últimos `days` dias (para o mini-gráfico de constância). */
export function reviewsPerDay(reviews: CardReview[], days = 28, now = new Date()): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    const key = toLocalDateKey(studyDayStart(new Date(r.reviewedAt)));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: Array<{ key: string; count: number }> = [];
  const cursor = studyDayStart(now);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = toLocalDateKey(cursor);
    out.push({ key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
