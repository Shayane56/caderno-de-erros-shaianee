import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { useAllCardReviews, useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { useSubjects } from '@/hooks/useData';
import { firstName, useProfile } from '@/services/profile';
import { retentionRate, reviewsPerDay, studyStreak } from '@/services/flashcards/stats';
import { studyDayStart } from '@/services/flashcards/scheduler';
import { weakPoints, type WeakPoint } from '@/services/study/statsService';
import { summarizeDecks, type DeckSummary, type DueCountsView } from './decks';

const DAY = 86_400_000;

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / DAY);
}

export interface DayBar {
  key: string;
  /** Rótulo curto do dia da semana ("seg"). */
  label: string;
  count: number;
  isToday: boolean;
}

export interface HomeModel {
  loading: boolean;
  firstName: string;
  greeting: string;
  now: Date;
  due: DueCountsView;
  nextDueAt: string | null;
  laterToday: number;
  doneToday: number;
  correctToday: number;
  /** Progresso do dia: respondidos ÷ (respondidos + pendentes), 0–100. */
  dayProgress: number;
  streak: number;
  retention: number | null;
  week: { answered: number; pct: number | null; cards: number; cardsPrev: number; focusMin: number; deltaCards: number | null };
  last7: DayBar[];
  last28: Array<{ key: string; count: number }>;
  decks: DeckSummary[];
  dueDecks: DeckSummary[];
  totals: { decks: number; cards: number; faces: number; mature: number };
  pendingErrors: number;
  weakest: WeakPoint | null;
  /** Estimativa de minutos para zerar a fila de hoje (pela média de tempo por resposta). */
  etaMinutes: number;
}

/** Tudo o que o Início mostra — o mesmo modelo nas três identidades. */
export function useHomeModel(): HomeModel {
  const { name } = useProfile();
  const data = useFlashcardData();
  const queue = useStudyQueue(data);
  const allReviews = useAllCardReviews();
  const subjects = useSubjects();
  const since = useMemo(() => new Date(Date.now() - 30 * DAY).toISOString(), []);
  const extra = useLiveQuery(async () => {
    const [attempts, focus, pendingErrors] = await Promise.all([
      db.questionAttempts.where('answeredAt').aboveOrEqual(since).toArray(),
      db.focusSessions.where('startedAt').aboveOrEqual(since).toArray(),
      db.errors.where('priority').anyOf('alta', 'media').count(),
    ]);
    return { attempts, focus, pendingErrors };
  }, [since]);

  return useMemo(() => {
    const now = data.now;
    const reviews = allReviews ?? [];
    const decks = summarizeDecks(data.decks, data.cards, data.reviewsToday, reviews, subjects ?? [], now);
    const due = { ...queue.counts, total: queue.counts.new + queue.counts.learning + queue.counts.review };
    const doneToday = data.reviewsToday.length;
    const weekStart = now.getTime() - 7 * DAY;
    const prevStart = weekStart - 7 * DAY;
    const attempts = extra?.attempts ?? [];
    const weekAttempts = attempts.filter((a) => new Date(a.answeredAt).getTime() >= weekStart);
    const weekCorrect = weekAttempts.filter((a) => a.correct).length;
    const cards = reviews.filter((r) => new Date(r.reviewedAt).getTime() >= weekStart).length;
    const cardsPrev = reviews.filter((r) => {
      const t = new Date(r.reviewedAt).getTime();
      return t >= prevStart && t < weekStart;
    }).length;
    const focusMin = Math.round((extra?.focus ?? []).filter((f) => new Date(f.startedAt).getTime() >= weekStart).reduce((s, f) => s + f.focusedMs, 0) / 60_000);
    const todayKey = reviewsPerDay(reviews, 1, now)[0]?.key;
    const last28 = reviewsPerDay(reviews, 28, now);
    const last7 = last28.slice(-7).map((d) => {
      const [y, m, dd] = d.key.split('-').map(Number);
      return { ...d, label: new Date(y, m - 1, dd).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), isToday: d.key === todayKey };
    });
    const timed = reviews.filter((r) => r.durationMs > 0).slice(-300);
    const avgMs = timed.length ? Math.min(60_000, timed.reduce((s, r) => s + Math.min(r.durationMs, 60_000), 0) / timed.length) : 12_000;
    const faces = decks.reduce((s, d) => s + d.faces, 0);
    const mature = Math.round(decks.reduce((s, d) => s + (d.mastery * d.faces) / 100, 0));
    return {
      loading: data.loading || allReviews === undefined || extra === undefined,
      firstName: firstName(name),
      greeting: greetingFor(now),
      now,
      due,
      nextDueAt: queue.nextDueAt,
      laterToday: queue.laterToday,
      doneToday,
      correctToday: data.reviewsToday.filter((r) => r.rating > 1).length,
      dayProgress: doneToday + due.total === 0 ? 0 : Math.round((doneToday / (doneToday + due.total)) * 100),
      streak: studyStreak(reviews, now),
      retention: retentionRate(reviews, 30, now),
      week: {
        answered: weekAttempts.length,
        pct: weekAttempts.length ? Math.round((weekCorrect / weekAttempts.length) * 100) : null,
        cards,
        cardsPrev,
        focusMin,
        deltaCards: cardsPrev ? Math.round(((cards - cardsPrev) / cardsPrev) * 100) : null,
      },
      last7,
      last28,
      decks,
      dueDecks: decks.filter((d) => d.due.total > 0).sort((a, b) => b.due.total - a.due.total),
      totals: { decks: decks.length, cards: data.cards.length, faces, mature },
      pendingErrors: extra?.pendingErrors ?? 0,
      weakest: weakPoints(attempts)[0] ?? null,
      etaMinutes: due.total ? Math.max(1, Math.round((due.total * avgMs) / 60_000)) : 0,
    };
  }, [data, queue, allReviews, subjects, extra, name]);
}

/** "Hoje, 14:20" / "amanhã" — quando o próximo cartão em aprendizagem volta. */
export function describeReturn(iso: string | null, now = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  const sameDay = studyDayStart(at).getTime() === studyDayStart(now).getTime();
  const time = at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `hoje, às ${time}` : `amanhã, às ${time}`;
}
