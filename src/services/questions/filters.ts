import type { Difficulty, Question, QuestionAttempt, QuestionFormat, QuestionOrigin } from '@/types';
import { normalizeText, tokenizeSearch } from '@/utils/text';

export type AttemptStatus = '' | 'nunca' | 'errei' | 'acertei';

export interface QuestionFilters {
  search: string;
  subject: string;
  topic: string;
  bancas: string[];
  format: QuestionFormat | '';
  difficulty: Difficulty | 0;
  status: AttemptStatus;
  origin: QuestionOrigin | '';
}

export function emptyQuestionFilters(): QuestionFilters {
  return { search: '', subject: '', topic: '', bancas: [], format: '', difficulty: 0, status: '', origin: '' };
}

export function countQuestionFilters(f: QuestionFilters): number {
  return [f.search.trim(), f.subject, f.topic, f.bancas.length, f.format, f.difficulty, f.status, f.origin].filter(Boolean).length;
}

/** Última resposta de cada questão. */
export function lastAttempts(attempts: QuestionAttempt[]): Map<string, QuestionAttempt> {
  const map = new Map<string, QuestionAttempt>();
  for (const a of attempts) {
    const current = map.get(a.questionId);
    if (!current || a.answeredAt > current.answeredAt) map.set(a.questionId, a);
  }
  return map;
}

export function filterQuestions(questions: Question[], attempts: QuestionAttempt[], f: QuestionFilters): Question[] {
  const last = lastAttempts(attempts);
  const tokens = tokenizeSearch(f.search);
  return questions.filter((q) => {
    if (f.subject && q.subject !== f.subject) return false;
    if (f.topic && q.topic !== f.topic) return false;
    if (f.bancas.length && !f.bancas.includes(q.banca)) return false;
    if (f.format && q.format !== f.format) return false;
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (f.origin && q.origin !== f.origin) return false;
    if (f.status) {
      const a = last.get(q.id);
      if (f.status === 'nunca' && a) return false;
      if (f.status === 'errei' && (!a || a.correct)) return false;
      if (f.status === 'acertei' && (!a || !a.correct)) return false;
    }
    if (tokens.length) {
      const haystack = normalizeText([q.statement, q.support, q.options.join(' '), q.topic, q.subject, q.banca, q.orgao].join(' '));
      if (!tokens.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

/* ------------------------------ Filtros na URL ------------------------------ */

export function filtersToParams(f: QuestionFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set('busca', f.search.trim());
  if (f.subject) p.set('materia', f.subject);
  if (f.topic) p.set('assunto', f.topic);
  if (f.bancas.length) p.set('bancas', f.bancas.join('|'));
  if (f.format) p.set('formato', f.format);
  if (f.difficulty) p.set('dificuldade', String(f.difficulty));
  if (f.status) p.set('situacao', f.status);
  if (f.origin) p.set('origem', f.origin);
  return p;
}

export function filtersFromParams(p: URLSearchParams): QuestionFilters {
  const format = p.get('formato');
  const difficulty = Number(p.get('dificuldade'));
  const status = p.get('situacao');
  const origin = p.get('origem');
  return {
    search: p.get('busca') ?? '',
    subject: p.get('materia') ?? '',
    topic: p.get('assunto') ?? '',
    bancas: (p.get('bancas') ?? '').split('|').filter(Boolean),
    format: format === 'multipla' || format === 'certo_errado' ? format : '',
    difficulty: difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : 0,
    status: status === 'nunca' || status === 'errei' || status === 'acertei' ? status : '',
    origin: origin === 'banco' || origin === 'minha' ? origin : '',
  };
}

/* ------------------------------ Estatísticas ------------------------------ */

export interface SubjectPerformance {
  subject: string;
  answered: number;
  correct: number;
  pct: number;
}

/** Desempenho por matéria (todas as respostas, inclusive repetidas). */
export function performanceBySubject(attempts: QuestionAttempt[]): SubjectPerformance[] {
  const map = new Map<string, { answered: number; correct: number }>();
  for (const a of attempts) {
    const entry = map.get(a.subject) ?? { answered: 0, correct: 0 };
    entry.answered++;
    if (a.correct) entry.correct++;
    map.set(a.subject, entry);
  }
  return [...map.entries()]
    .map(([subject, v]) => ({ subject, ...v, pct: Math.round((v.correct / v.answered) * 100) }))
    .sort((a, b) => b.answered - a.answered);
}

export function sortByName(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
