import type { CardReview, FocusSession, QuestionAttempt } from '@/types';
import { toLocalDateKey } from '@/utils/dates';

const DAY = 86_400_000;

export interface PeriodStats {
  answered: number;
  correct: number;
  pct: number | null;
  studyMs: number;
  focusMs: number;
  cards: number;
}

/**
 * Tempo de estudo = tempo no Modo Foco + tempo respondendo questões e cartões
 * fora das sessões de foco (para não contar duas vezes).
 */
export function studyTime(focus: FocusSession[], attempts: QuestionAttempt[], reviews: CardReview[]): number {
  const intervals = focus.map((f) => [new Date(f.startedAt).getTime(), new Date(f.endedAt).getTime()] as const);
  const inFocus = (iso: string) => {
    const t = new Date(iso).getTime();
    return intervals.some(([a, b]) => t >= a && t <= b);
  };
  let total = focus.reduce((s, f) => s + f.focusedMs, 0);
  for (const a of attempts) if (a.durationMs && !inFocus(a.answeredAt)) total += Math.min(a.durationMs, 15 * 60_000);
  for (const r of reviews) if (r.durationMs && !inFocus(r.reviewedAt)) total += Math.min(r.durationMs, 5 * 60_000);
  return total;
}

export function periodStats(attempts: QuestionAttempt[], focus: FocusSession[], reviews: CardReview[], fromMs: number, toMs: number): PeriodStats {
  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= fromMs && t < toMs;
  };
  const a = attempts.filter((x) => inRange(x.answeredAt));
  const f = focus.filter((x) => inRange(x.startedAt));
  const r = reviews.filter((x) => inRange(x.reviewedAt));
  const correct = a.filter((x) => x.correct).length;
  return {
    answered: a.length,
    correct,
    pct: a.length ? Math.round((correct / a.length) * 100) : null,
    studyMs: studyTime(f, a, r),
    focusMs: f.reduce((s, x) => s + x.focusedMs, 0),
    cards: r.length,
  };
}

export interface TimelinePoint {
  label: string;
  pct: number | null;
  answered: number;
}

/** Acerto por dia (períodos curtos) ou por semana. */
export function accuracyTimeline(attempts: QuestionAttempt[], days: number, now = Date.now()): TimelinePoint[] {
  const bucketDays = days <= 7 ? 1 : 7;
  const buckets = Math.ceil(days / bucketDays);
  const start = now - days * DAY;
  const out: TimelinePoint[] = [];
  for (let i = 0; i < buckets; i++) {
    const from = start + i * bucketDays * DAY;
    const to = from + bucketDays * DAY;
    const list = attempts.filter((a) => {
      const t = new Date(a.answeredAt).getTime();
      return t >= from && t < to;
    });
    const correct = list.filter((a) => a.correct).length;
    const d = new Date(from + (bucketDays === 1 ? 0 : 3 * DAY));
    out.push({
      label: bucketDays === 1 ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : `Sem ${i + 1}`,
      pct: list.length ? Math.round((correct / list.length) * 100) : null,
      answered: list.length,
    });
  }
  return out;
}

export interface WeakPoint {
  subject: string;
  topic: string;
  answered: number;
  pct: number;
}

/** Assuntos com menor percentual de acerto (mínimo de respostas para contar). */
export function weakPoints(attempts: QuestionAttempt[], min = 3, limit = 5): WeakPoint[] {
  const map = new Map<string, { subject: string; topic: string; answered: number; correct: number }>();
  for (const a of attempts) {
    const key = `${a.subject}::${a.topic}`;
    const e = map.get(key) ?? { subject: a.subject, topic: a.topic, answered: 0, correct: 0 };
    e.answered++;
    if (a.correct) e.correct++;
    map.set(key, e);
  }
  return [...map.values()]
    .filter((e) => e.answered >= min)
    .map((e) => ({ subject: e.subject, topic: e.topic || 'Geral', answered: e.answered, pct: Math.round((e.correct / e.answered) * 100) }))
    .filter((e) => e.pct < 80)
    .sort((a, b) => a.pct - b.pct || b.answered - a.answered)
    .slice(0, limit);
}

/** Dias distintos com alguma atividade no período (constância). */
export function activeDays(attempts: QuestionAttempt[], reviews: CardReview[], focus: FocusSession[], fromMs: number): number {
  const days = new Set<string>();
  for (const a of attempts) if (new Date(a.answeredAt).getTime() >= fromMs) days.add(toLocalDateKey(a.answeredAt));
  for (const r of reviews) if (new Date(r.reviewedAt).getTime() >= fromMs) days.add(toLocalDateKey(r.reviewedAt));
  for (const f of focus) if (new Date(f.startedAt).getTime() >= fromMs) days.add(toLocalDateKey(f.startedAt));
  return days.size;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
