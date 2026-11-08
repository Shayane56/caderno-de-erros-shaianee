import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import type { CardReview, FocusSession, QuestionAnswer, QuestionAttempt } from '@/types';
import { evaluateExpression, formatResult } from '@/utils/calculator';
import { exportBackup, importBackup, parseBackupText } from '@/services/backupService';
import { runSync } from '@/services/sync/syncEngine';
import { MemoryRemote } from '@/services/sync/__tests__/memoryAdapter';
import { loadQuestionBank } from '@/data/questionBank';
import { createSimulado, finishSimulado, saveSimuladoProgress } from '../simuladoService';
import { saveQuestionNote } from '../notesService';
import { focusedMs, saveFocusSession, formatClock } from '../focusTimer';
import { accuracyTimeline, periodStats, studyTime, weakPoints } from '../statsService';

describe('calculadora', () => {
  it('respeita a precedência, parênteses, vírgula e porcentagem', () => {
    expect(evaluateExpression('2+3×4')).toBe(14);
    expect(evaluateExpression('(2+3)×4')).toBe(20);
    expect(evaluateExpression('1.000×0,1')).toBeCloseTo(0.1); // "1.000" é lido como 1,000 → ponto decimal
    expect(evaluateExpression('200×10%')).toBe(20);
    expect(evaluateExpression('−5+2')).toBe(-3);
    expect(evaluateExpression('7÷2')).toBe(3.5);
    expect(formatResult(1234.5)).toBe('1.234,5');
    expect(() => evaluateExpression('2+')).toThrow();
    expect(() => evaluateExpression('1÷0')).toThrow();
  });
});

describe('simulados', () => {
  it('sorteia, salva o andamento e corrige no final registrando as respostas', async () => {
    const bank = (await loadQuestionBank()).slice(0, 12);
    let seed = 1;
    const sim = await createSimulado(bank, { size: 5, timeLimitMin: 30, title: 'Teste' }, () => ((seed = (seed * 9301 + 49297) % 233280) / 233280));
    expect(sim.questionIds).toHaveLength(5);
    const byId = new Map(bank.map((q) => [q.id, q]));
    const [q1, q2] = sim.questionIds.map((id) => byId.get(id)!);
    const wrong = q2.format === 'multipla' ? ((q2.answer as number) + 1) % q2.options.length : q2.answer === 'C' ? 'E' : 'C';
    const answers: Record<string, QuestionAnswer> = { [q1.id]: q1.answer, [q2.id]: wrong as QuestionAnswer };
    await saveSimuladoProgress(sim.id, answers, 60_000);
    expect((await db.simulados.get(sim.id))!.answers).toEqual(answers);
    expect(await db.questionAttempts.count()).toBe(0); // gabarito só no final

    const done = await finishSimulado(sim.id, answers, 120_000, byId);
    expect(done).toMatchObject({ correct: 1, elapsedMs: 120_000 });
    expect(done.finishedAt).not.toBeNull();
    const attempts = await db.questionAttempts.toArray();
    expect(attempts).toHaveLength(2);
    expect(attempts.every((a) => a.simuladoId === sim.id)).toBe(true);
    // Finalizar de novo não duplica.
    await finishSimulado(sim.id, answers, 130_000, byId);
    expect(await db.questionAttempts.count()).toBe(2);
  });
});

describe('Modo Foco', () => {
  const base = { id: 'f1', label: 'Lei 8.080', plannedMs: 25 * 60_000, startedAt: new Date(0).toISOString() };
  it('desconta pausas e só registra sessões interrompidas a partir de 1 minuto', async () => {
    const t0 = 1_000_000;
    expect(focusedMs({ ...base, runningSince: t0, accumulatedMs: 30_000 }, t0 + 60_000)).toBe(90_000);
    expect(focusedMs({ ...base, runningSince: null, accumulatedMs: 30_000 }, t0 + 999_999)).toBe(30_000);
    expect(await saveFocusSession({ ...base, runningSince: null, accumulatedMs: 30_000 }, false)).toBeNull();
    const saved = await saveFocusSession({ ...base, runningSince: null, accumulatedMs: 10 * 60_000 }, false);
    expect(saved).toMatchObject({ focusedMs: 600_000, completed: false, label: 'Lei 8.080' });
    expect(await db.focusSessions.count()).toBe(1);
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatClock(65_000)).toBe('01:05');
  });
});

describe('estatísticas', () => {
  const attempt = (i: number, subject: string, topic: string, correct: boolean, at: string, durationMs?: number): QuestionAttempt => ({
    id: `a${i}`,
    questionId: `q${i}`,
    answeredAt: at,
    chosen: 0,
    correct,
    subject,
    topic,
    banca: 'FGV',
    ...(durationMs ? { durationMs } : {}),
  });

  it('acha os pontos fracos e calcula o tempo de estudo sem contar duas vezes', () => {
    const now = new Date('2026-05-10T12:00:00Z').getTime();
    const iso = (min: number) => new Date(now - min * 60_000).toISOString();
    const attempts = [
      attempt(1, 'Saúde Pública', 'SUS', false, iso(10), 60_000),
      attempt(2, 'Saúde Pública', 'SUS', false, iso(20), 60_000),
      attempt(3, 'Saúde Pública', 'SUS', true, iso(30), 60_000),
      attempt(4, 'Português', 'Crase', true, iso(500), 120_000),
      attempt(5, 'Português', 'Crase', true, iso(510)),
      attempt(6, 'Português', 'Crase', true, iso(520)),
    ];
    expect(weakPoints(attempts)).toEqual([{ subject: 'Saúde Pública', topic: 'SUS', answered: 3, pct: 33 }]);
    const focus: FocusSession[] = [{ id: 'f', startedAt: iso(40), endedAt: iso(0), plannedMs: 0, focusedMs: 40 * 60_000, completed: true, label: '' }];
    const reviews: CardReview[] = [];
    // 40 min de foco + 2 min da questão de Português (fora do foco); as de Saúde estavam dentro do foco.
    expect(studyTime(focus, attempts, reviews)).toBe(42 * 60_000);
    const stats = periodStats(attempts, focus, reviews, now - 86_400_000, now + 1);
    expect(stats).toMatchObject({ answered: 6, correct: 4, pct: 67 });
    const timeline = accuracyTimeline(attempts, 7, now + 1);
    expect(timeline).toHaveLength(7);
    expect(timeline[6].answered).toBe(6);
  });
});

describe('backup e sincronização das novidades do Mimo', () => {
  it('anotações, simulados e sessões de foco entram no backup e na sincronização', async () => {
    await saveQuestionNote('por-001', 'Crase obrigatória aqui!');
    await saveFocusSession({ id: 'foco-1', label: '', plannedMs: 60_000, startedAt: new Date().toISOString(), runningSince: null, accumulatedMs: 60_000 }, true);
    const bank = await loadQuestionBank();
    await createSimulado(bank.slice(0, 3), { size: 3, timeLimitMin: null, title: 'S' });

    const { content } = await exportBackup();
    await Promise.all([db.questionNotes.clear(), db.focusSessions.clear(), db.simulados.clear()]);
    await importBackup(parseBackupText(content), 'merge');
    expect((await db.questionNotes.get('por-001'))?.text).toBe('Crase obrigatória aqui!');
    expect(await db.focusSessions.count()).toBe(1);
    expect(await db.simulados.count()).toBe(1);

    const remote = new MemoryRemote();
    await runSync(remote.adapter(), 'u1');
    expect([...remote.rows.keys()].filter((k) => /^(questionNotes|simulados|focusSessions):/.test(k))).toHaveLength(3);

    await saveQuestionNote('por-001', '   ');
    expect(await db.questionNotes.get('por-001')).toBeUndefined();
  });
});
