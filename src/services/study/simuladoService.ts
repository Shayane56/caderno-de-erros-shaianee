import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { Question, QuestionAnswer, Simulado } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { NotFoundError, ValidationError } from '../errors';
import { answerQuestion } from '../questions/questionService';
import { isCorrect } from '../questions/questionModel';

export const SIMULADO_SIZES = [10, 20, 30, 50, 80];
export const SIMULADO_TIMES: Array<{ min: number | null; label: string }> = [
  { min: null, label: 'Sem limite' },
  { min: 30, label: '30 min' },
  { min: 60, label: '1 h' },
  { min: 120, label: '2 h' },
  { min: 180, label: '3 h' },
  { min: 240, label: '4 h' },
];

function shuffle<T>(list: T[], random = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Sorteia as questões e cria o simulado. */
export async function createSimulado(pool: Question[], options: { size: number; timeLimitMin: number | null; title: string }, random = Math.random): Promise<Simulado> {
  if (pool.length === 0) throw new ValidationError('Nenhuma questão com esses filtros.');
  const picked = shuffle(pool, random).slice(0, Math.max(1, options.size));
  const now = nowIso();
  const simulado: Simulado = {
    id: createId(),
    title: options.title.trim() || 'Simulado',
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    timeLimitMin: options.timeLimitMin,
    questionIds: picked.map((q) => q.id),
    answers: {},
    elapsedMs: 0,
    correct: 0,
  };
  await db.transaction('rw', [db.simulados, db.pendingChanges], async () => {
    await db.simulados.add(simulado);
    await trackChange('simulados', simulado.id, now);
  });
  return simulado;
}

/** Salva o andamento (respostas marcadas e tempo) sem revelar gabaritos. */
export async function saveSimuladoProgress(id: string, answers: Record<string, QuestionAnswer>, elapsedMs: number): Promise<void> {
  await db.transaction('rw', [db.simulados, db.pendingChanges], async () => {
    const current = await db.simulados.get(id);
    if (!current || current.finishedAt) return;
    const now = nowIso();
    await db.simulados.put({ ...current, answers, elapsedMs: Math.round(elapsedMs), updatedAt: now });
    await trackChange('simulados', id, now);
  });
}

/** Encerra o simulado: corrige, registra as respostas no histórico e guarda o resultado. */
export async function finishSimulado(id: string, answers: Record<string, QuestionAnswer>, elapsedMs: number, questions: Map<string, Question>): Promise<Simulado> {
  const current = await db.simulados.get(id);
  if (!current) throw new NotFoundError('Simulado não encontrado.');
  if (current.finishedAt) return current;
  let correct = 0;
  const perQuestion = current.questionIds.length ? elapsedMs / current.questionIds.length : 0;
  for (const qid of current.questionIds) {
    const q = questions.get(qid);
    const chosen = answers[qid];
    if (!q || chosen === undefined) continue;
    if (isCorrect(q, chosen)) correct++;
    await answerQuestion(q, chosen, { simuladoId: id, durationMs: perQuestion });
  }
  const now = nowIso();
  const finished: Simulado = { ...current, answers, elapsedMs: Math.round(elapsedMs), correct, finishedAt: now, updatedAt: now };
  await db.transaction('rw', [db.simulados, db.pendingChanges], async () => {
    await db.simulados.put(finished);
    await trackChange('simulados', id, now);
  });
  return finished;
}

export async function deleteSimulado(id: string): Promise<void> {
  await db.transaction('rw', [db.simulados, db.tombstones, db.pendingChanges], async () => {
    await db.simulados.delete(id);
    await trackDeletion('simulados', id);
  });
}
