import type { FocusSession, QuestionAnswer, QuestionNote, Simulado } from '@/types';
import { isValidIsoDate } from '@/utils/dates';

type Raw = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const ms = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const isAnswer = (v: unknown): v is QuestionAnswer => v === 'C' || v === 'E' || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10);

export function normalizeFocusSession(raw: unknown): FocusSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  if (!id || !isValidIsoDate(r.startedAt) || !isValidIsoDate(r.endedAt)) return null;
  return {
    id,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    plannedMs: ms(r.plannedMs),
    focusedMs: Math.min(ms(r.focusedMs), 24 * 3_600_000),
    completed: r.completed === true,
    label: str(r.label).slice(0, 120),
  };
}

export function normalizeQuestionNote(raw: unknown): QuestionNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  if (!id || !isValidIsoDate(r.updatedAt)) return null;
  return { id, text: str(r.text).slice(0, 20_000), updatedAt: r.updatedAt };
}

export function normalizeSimulado(raw: unknown): Simulado | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const questionIds = Array.isArray(r.questionIds) ? r.questionIds.filter((q): q is string => typeof q === 'string') : [];
  if (!id || !isValidIsoDate(r.createdAt) || questionIds.length === 0) return null;
  const answers: Record<string, QuestionAnswer> = {};
  if (r.answers && typeof r.answers === 'object') {
    for (const [qid, a] of Object.entries(r.answers as Raw)) if (questionIds.includes(qid) && isAnswer(a)) answers[qid] = a;
  }
  const limit = typeof r.timeLimitMin === 'number' && r.timeLimitMin > 0 ? Math.min(600, Math.round(r.timeLimitMin)) : null;
  return {
    id,
    title: str(r.title) || 'Simulado',
    createdAt: r.createdAt,
    updatedAt: isValidIsoDate(r.updatedAt) ? r.updatedAt : r.createdAt,
    finishedAt: isValidIsoDate(r.finishedAt) ? r.finishedAt : null,
    timeLimitMin: limit,
    questionIds,
    answers,
    elapsedMs: ms(r.elapsedMs),
    correct: Math.min(questionIds.length, ms(r.correct)),
  };
}
