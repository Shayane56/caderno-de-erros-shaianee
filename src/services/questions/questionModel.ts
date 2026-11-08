import type { BankQuestionSeed, Difficulty, Question, QuestionAnswer, QuestionAttempt, QuestionFormat } from '@/types';
import { isValidIsoDate } from '@/utils/dates';
import { cleanName } from '@/utils/text';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const MAX_OPTIONS = 6;

export const FORMAT_LABELS: Record<QuestionFormat, string> = {
  multipla: 'Múltipla escolha',
  certo_errado: 'Certo ou Errado',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' };

/** Bancas sugeridas no cadastro (qualquer outra pode ser digitada). */
export const BANCAS = [
  'Cebraspe',
  'FGV',
  'FCC',
  'Vunesp',
  'Cesgranrio',
  'IBFC',
  'Instituto AOCP',
  'Quadrix',
  'Consulplan',
  'IDECAN',
  'Fundatec',
  'IADES',
  'Selecon',
  'Objetiva',
];

/** Letra/texto do gabarito ("B", "Certo"). */
export function answerLabel(answer: QuestionAnswer): string {
  if (answer === 'C') return 'Certo';
  if (answer === 'E') return 'Errado';
  return LETTERS[answer] ?? '?';
}

export function isCorrect(question: Pick<Question, 'answer'>, chosen: QuestionAnswer): boolean {
  return question.answer === chosen;
}

export interface QuestionInput {
  format: QuestionFormat;
  banca: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  support: string;
  statement: string;
  options: string[];
  answer: QuestionAnswer | null;
  explanation: string;
  year: number | null;
  orgao: string;
  cargo: string;
}

export function emptyQuestionInput(format: QuestionFormat = 'multipla'): QuestionInput {
  return {
    format,
    banca: '',
    subject: '',
    topic: '',
    difficulty: 2,
    support: '',
    statement: '',
    options: format === 'multipla' ? ['', '', '', '', ''] : [],
    answer: null,
    explanation: '',
    year: null,
    orgao: '',
    cargo: '',
  };
}

export function inputFromQuestion(q: Question): QuestionInput {
  return {
    format: q.format,
    banca: q.banca,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    support: q.support,
    statement: q.statement,
    options: [...q.options],
    answer: q.answer,
    explanation: q.explanation,
    year: q.year,
    orgao: q.orgao,
    cargo: q.cargo,
  };
}

export type QuestionInputErrors = Partial<Record<'banca' | 'subject' | 'statement' | 'options' | 'answer' | 'year', string>>;

export function validateQuestionInput(input: QuestionInput): QuestionInputErrors {
  const errors: QuestionInputErrors = {};
  if (!cleanName(input.banca)) errors.banca = 'Informe a banca (ou "Própria").';
  if (!cleanName(input.subject)) errors.subject = 'Informe a matéria.';
  if (!input.statement.trim()) errors.statement = 'Escreva o enunciado.';
  if (input.format === 'multipla') {
    const filled = input.options.filter((o) => o.trim());
    if (filled.length < 2) errors.options = 'Preencha pelo menos duas alternativas.';
    else if (filled.length !== input.options.length) errors.options = 'Preencha ou remova as alternativas vazias.';
    if (typeof input.answer !== 'number' || input.answer < 0 || input.answer >= input.options.length) errors.answer = 'Marque a alternativa correta.';
  } else if (input.answer !== 'C' && input.answer !== 'E') {
    errors.answer = 'Marque o gabarito: Certo ou Errado.';
  }
  if (input.year !== null && (!Number.isInteger(input.year) || input.year < 1950 || input.year > 2100)) errors.year = 'Ano inválido.';
  return errors;
}

/* ============================== Normalização ============================== */

type Raw = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function normalizeAnswer(format: QuestionFormat, value: unknown, optionCount: number): QuestionAnswer | null {
  if (format === 'certo_errado') return value === 'C' || value === 'E' ? value : null;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < optionCount ? value : null;
}

/** Valida questões vindas de backup, sincronização ou importação. */
export function normalizeQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const format: QuestionFormat | null = r.format === 'multipla' || r.format === 'certo_errado' ? r.format : null;
  const statement = str(r.statement).trim();
  if (!id || !format || !statement) return null;
  const options = format === 'multipla' && Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === 'string').slice(0, MAX_OPTIONS) : [];
  if (format === 'multipla' && options.length < 2) return null;
  const answer = normalizeAnswer(format, r.answer, options.length);
  if (answer === null) return null;
  const createdAt = isValidIsoDate(r.createdAt) ? r.createdAt : new Date().toISOString();
  const year = typeof r.year === 'number' && Number.isInteger(r.year) ? r.year : null;
  const difficulty = r.difficulty === 1 || r.difficulty === 3 ? r.difficulty : 2;
  return {
    id,
    origin: r.origin === 'banco' ? 'banco' : 'minha',
    format,
    banca: cleanName(str(r.banca)) || 'Própria',
    subject: cleanName(str(r.subject)) || 'Geral',
    topic: cleanName(str(r.topic)),
    difficulty,
    support: str(r.support),
    statement,
    options,
    answer,
    explanation: str(r.explanation),
    year,
    orgao: cleanName(str(r.orgao)),
    cargo: cleanName(str(r.cargo)),
    createdAt,
    updatedAt: isValidIsoDate(r.updatedAt) ? r.updatedAt : createdAt,
  };
}

export function normalizeQuestionAttempt(raw: unknown): QuestionAttempt | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const questionId = str(r.questionId);
  const chosen = r.chosen === 'C' || r.chosen === 'E' || (typeof r.chosen === 'number' && Number.isInteger(r.chosen) && r.chosen >= 0) ? (r.chosen as QuestionAnswer) : null;
  if (!id || !questionId || chosen === null || !isValidIsoDate(r.answeredAt)) return null;
  return {
    id,
    questionId,
    answeredAt: r.answeredAt,
    chosen,
    correct: r.correct === true,
    subject: str(r.subject),
    topic: str(r.topic),
    banca: str(r.banca),
    ...(typeof r.durationMs === 'number' && Number.isFinite(r.durationMs) && r.durationMs >= 0 ? { durationMs: Math.min(Math.round(r.durationMs), 3_600_000) } : {}),
    ...(typeof r.simuladoId === 'string' && r.simuladoId ? { simuladoId: r.simuladoId } : {}),
  };
}

/** Questão do banco embutido (completa os campos de controle). */
export function fromSeed(seed: BankQuestionSeed): Question {
  return {
    origin: 'banco',
    support: '',
    year: null,
    orgao: '',
    cargo: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...seed,
  };
}
