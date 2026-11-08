import { describe, expect, it } from 'vitest';
import type { SrsState } from '@/types';
import { formatDays, formatWait, newSrsState, previewIntervals, scheduleAnswer, studyDayStart } from '../scheduler';

const at = (iso: string) => new Date(iso);
const MIN = 60_000;

function minutesUntil(state: SrsState, now: Date) {
  return Math.round((new Date(state.due!).getTime() - now.getTime()) / MIN);
}

describe('agendamento (SM-2 estilo Anki)', () => {
  const now = at('2026-03-10T15:00:00');

  it('cartão novo percorre as etapas de aprendizagem e se forma com intervalo de 1 dia', () => {
    const s0 = newSrsState();
    const s1 = scheduleAnswer(s0, 3, now);
    expect(s1).toMatchObject({ phase: 'learning', step: 1, reps: 1 });
    expect(minutesUntil(s1, now)).toBe(10);

    const later = new Date(now.getTime() + 10 * MIN);
    const s2 = scheduleAnswer(s1, 3, later);
    expect(s2).toMatchObject({ phase: 'review', interval: 1 });
    // Vence no início do próximo dia de estudo (4h).
    expect(new Date(s2.due!).getHours()).toBe(4);
    expect(new Date(s2.due!).getDate()).toBe(11);
  });

  it('Errei volta para a primeira etapa (1 min) e Fácil forma direto com 4 dias', () => {
    const again = scheduleAnswer(newSrsState(), 1, now);
    expect(again.phase).toBe('learning');
    expect(minutesUntil(again, now)).toBe(1);
    const hard = scheduleAnswer(newSrsState(), 2, now);
    expect(minutesUntil(hard, now)).toBe(6); // média de 1 e 10 min (arredondada)
    const easy = scheduleAnswer(newSrsState(), 4, now);
    expect(easy).toMatchObject({ phase: 'review', interval: 4 });
  });

  it('revisões multiplicam o intervalo pela facilidade; Difícil e Fácil ajustam a facilidade', () => {
    const review: SrsState = { ...newSrsState(), phase: 'review', interval: 10, ease: 2.5, due: now.toISOString() };
    expect(scheduleAnswer(review, 3, now)).toMatchObject({ interval: 25, ease: 2.5 });
    expect(scheduleAnswer(review, 2, now)).toMatchObject({ interval: 12, ease: 2.35 });
    const easy = scheduleAnswer(review, 4, now);
    expect(easy.interval).toBe(33);
    expect(easy.ease).toBe(2.65);
  });

  it('considera os dias de atraso ao calcular o novo intervalo', () => {
    const due = at('2026-03-05T04:00:00');
    const review: SrsState = { ...newSrsState(), phase: 'review', interval: 10, ease: 2.5, due: due.toISOString() };
    // 5 dias de atraso: Bom = (10 + 5/2) × 2,5 = 31
    expect(scheduleAnswer(review, 3, now).interval).toBe(31);
  });

  it('esquecer um cartão maduro gera lapso, reduz a facilidade e entra em reaprendizagem', () => {
    const review: SrsState = { ...newSrsState(), phase: 'review', interval: 30, ease: 2.5, due: now.toISOString(), reps: 5 };
    const lapse = scheduleAnswer(review, 1, now);
    expect(lapse).toMatchObject({ phase: 'relearning', lapses: 1, ease: 2.3, interval: 1 });
    expect(minutesUntil(lapse, now)).toBe(10);
    const back = scheduleAnswer(lapse, 3, new Date(now.getTime() + 10 * MIN));
    expect(back).toMatchObject({ phase: 'review', interval: 1 });
  });

  it('a facilidade nunca fica abaixo de 130%', () => {
    let s: SrsState = { ...newSrsState(), phase: 'review', interval: 5, ease: 1.35, due: now.toISOString() };
    s = scheduleAnswer(s, 1, now);
    expect(s.ease).toBe(1.3);
  });

  it('o dia de estudo vira às 4h', () => {
    expect(studyDayStart(at('2026-03-10T02:30:00')).getDate()).toBe(9);
    expect(studyDayStart(at('2026-03-10T05:00:00')).getDate()).toBe(10);
  });

  it('mostra a prévia dos intervalos de cada botão', () => {
    expect(previewIntervals(newSrsState(), now)).toEqual({ 1: '1 min', 2: '6 min', 3: '10 min', 4: '4 d' });
    const review: SrsState = { ...newSrsState(), phase: 'review', interval: 10, ease: 2.5, due: now.toISOString() };
    expect(previewIntervals(review, now)).toEqual({ 1: '10 min', 2: '12 d', 3: '25 d', 4: '1,1 mês' });
  });

  it('formata intervalos longos em meses e anos', () => {
    expect(formatDays(3)).toBe('3 d');
    expect(formatDays(45)).toBe('1,5 mês');
    expect(formatDays(120)).toBe('4 meses');
    expect(formatDays(800)).toBe('2,2 anos');
    expect(formatWait(30_000)).toBe('<1 min');
    expect(formatWait(3 * 3_600_000)).toBe('3 h');
  });
});
