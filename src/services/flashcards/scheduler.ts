import type { Rating, SrsState } from '@/types';

/**
 * Agendamento por repetição espaçada — variante do algoritmo SM-2 usada pelo Anki:
 * etapas de aprendizagem em minutos, depois intervalos em dias multiplicados pelo
 * fator de facilidade de cada cartão.
 */
export const SRS_CONFIG = {
  /** Etapas de aprendizagem de cartões novos (minutos). */
  learningSteps: [1, 10],
  /** Etapas de reaprendizagem após um esquecimento (minutos). */
  relearningSteps: [10],
  /** Intervalo ao "formar" um cartão com Bom (dias). */
  graduatingInterval: 1,
  /** Intervalo ao responder Fácil num cartão novo (dias). */
  easyInterval: 4,
  startingEase: 2.5,
  minEase: 1.3,
  hardFactor: 1.2,
  easyBonus: 1.3,
  /** Intervalo após esquecer um cartão em revisão (dias). */
  lapseInterval: 1,
  maxInterval: 36500,
  /** O "dia de estudo" vira às 4h (como no Anki), para quem estuda depois da meia-noite. */
  dayRolloverHour: 4,
  /** Antecipa cartões em aprendizagem quando não há mais nada para estudar (minutos). */
  learnAheadMinutes: 20,
} as const;

const MINUTE = 60_000;
const DAY = 86_400_000;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Errei',
  2: 'Difícil',
  3: 'Bom',
  4: 'Fácil',
};

export function newSrsState(): SrsState {
  return {
    phase: 'new',
    due: null,
    interval: 0,
    ease: SRS_CONFIG.startingEase,
    step: 0,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  };
}

/** Início do dia de estudo (com virada às 4h). */
export function studyDayStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(SRS_CONFIG.dayRolloverHour, 0, 0, 0);
  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
  return start;
}

/** Início do dia de estudo seguinte. */
export function nextStudyDayStart(now: Date): Date {
  const next = studyDayStart(now);
  next.setDate(next.getDate() + 1);
  return next;
}

/** Data (início do dia de estudo) daqui a `days` dias. */
function dayAfter(now: Date, days: number): Date {
  const d = studyDayStart(now);
  d.setDate(d.getDate() + days);
  return d;
}

/** Dias de estudo inteiros entre duas datas. */
function studyDaysBetween(from: Date, to: Date): number {
  return Math.round((studyDayStart(to).getTime() - studyDayStart(from).getTime()) / DAY);
}

function clampInterval(days: number): number {
  return Math.min(SRS_CONFIG.maxInterval, Math.max(1, Math.round(days)));
}

function minutesFrom(now: Date, minutes: number): string {
  return new Date(now.getTime() + minutes * MINUTE).toISOString();
}

function stepDelay(steps: readonly number[], step: number, rating: Rating): number {
  const current = steps[Math.min(step, steps.length - 1)] ?? 1;
  if (rating === 2) {
    // Difícil: na primeira etapa, a média entre as duas primeiras; depois, repete a etapa.
    if (step === 0) return steps.length > 1 ? (steps[0] + steps[1]) / 2 : current * 1.5;
    return current;
  }
  return current;
}

/** Calcula o novo estado de uma face após a resposta. Função pura. */
export function scheduleAnswer(state: SrsState, rating: Rating, now: Date): SrsState {
  const base: SrsState = { ...state, reps: state.reps + 1, lastReviewedAt: now.toISOString() };

  if (state.phase === 'new' || state.phase === 'learning') {
    const steps = SRS_CONFIG.learningSteps;
    const step = state.phase === 'new' ? 0 : state.step;
    if (rating === 1) return { ...base, phase: 'learning', step: 0, interval: 0, due: minutesFrom(now, steps[0]) };
    if (rating === 2) return { ...base, phase: 'learning', step, interval: 0, due: minutesFrom(now, stepDelay(steps, step, 2)) };
    if (rating === 3) {
      const next = step + 1;
      if (next < steps.length) return { ...base, phase: 'learning', step: next, interval: 0, due: minutesFrom(now, steps[next]) };
      const interval = SRS_CONFIG.graduatingInterval;
      return { ...base, phase: 'review', step: 0, interval, due: dayAfter(now, interval).toISOString() };
    }
    const interval = SRS_CONFIG.easyInterval;
    return { ...base, phase: 'review', step: 0, interval, due: dayAfter(now, interval).toISOString() };
  }

  if (state.phase === 'relearning') {
    const steps = SRS_CONFIG.relearningSteps;
    if (rating === 1) return { ...base, step: 0, due: minutesFrom(now, steps[0]) };
    if (rating === 2) return { ...base, due: minutesFrom(now, stepDelay(steps, state.step, 2)) };
    if (rating === 3) {
      const next = state.step + 1;
      if (next < steps.length) return { ...base, step: next, due: minutesFrom(now, steps[next]) };
      const interval = clampInterval(state.interval);
      return { ...base, phase: 'review', step: 0, interval, due: dayAfter(now, interval).toISOString() };
    }
    const interval = clampInterval(state.interval + 1);
    return { ...base, phase: 'review', step: 0, interval, due: dayAfter(now, interval).toISOString() };
  }

  // Revisão
  const current = Math.max(1, state.interval);
  const overdue = state.due ? Math.max(0, studyDaysBetween(new Date(state.due), now)) : 0;
  if (rating === 1) {
    return {
      ...base,
      phase: 'relearning',
      step: 0,
      lapses: state.lapses + 1,
      ease: Math.max(SRS_CONFIG.minEase, state.ease - 0.2),
      interval: SRS_CONFIG.lapseInterval,
      due: minutesFrom(now, SRS_CONFIG.relearningSteps[0]),
    };
  }
  const hard = clampInterval(Math.max(current + 1, current * SRS_CONFIG.hardFactor));
  const good = clampInterval(Math.max(hard + 1, (current + overdue / 2) * state.ease));
  const easy = clampInterval(Math.max(good + 1, (current + overdue) * state.ease * SRS_CONFIG.easyBonus));
  const interval = rating === 2 ? hard : rating === 3 ? good : easy;
  const ease =
    rating === 2
      ? Math.max(SRS_CONFIG.minEase, state.ease - 0.15)
      : rating === 4
        ? state.ease + 0.15
        : state.ease;
  return { ...base, phase: 'review', step: 0, interval, ease: Math.round(ease * 100) / 100, due: dayAfter(now, interval).toISOString() };
}

/** Texto curto de um intervalo em dias ("1 d", "3 meses", "1,2 ano"). */
export function formatDays(days: number): string {
  if (days < 30) return `${days} d`;
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${months.toLocaleString('pt-BR')} ${months < 2 ? 'mês' : 'meses'}`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years.toLocaleString('pt-BR')} ${years < 2 ? 'ano' : 'anos'}`;
}

/** Texto curto de uma espera em milissegundos ("<1 min", "10 min", "3 h"). */
export function formatWait(ms: number): string {
  if (ms < MINUTE) return '<1 min';
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} h`;
  return formatDays(Math.round(ms / DAY));
}

/** Prévia do próximo intervalo de cada botão (exibida sobre as opções de resposta). */
export function previewIntervals(state: SrsState, now: Date): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  for (const rating of [1, 2, 3, 4] as Rating[]) {
    const next = scheduleAnswer(state, rating, now);
    out[rating] = next.phase === 'review' ? formatDays(next.interval) : formatWait(new Date(next.due!).getTime() - now.getTime());
  }
  return out;
}

/** Maturidade: cartões com intervalo de 21 dias ou mais são considerados "maduros" (como no Anki). */
export const MATURE_INTERVAL = 21;
