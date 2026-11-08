import type { QuestionAnswer } from './questions';

/** Sessão do Modo Foco. */
export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string;
  /** Duração planejada (ms). */
  plannedMs: number;
  /** Tempo efetivamente focado, descontando pausas (ms). */
  focusedMs: number;
  /** Chegou ao fim do tempo planejado. */
  completed: boolean;
  /** O que foi estudado (opcional). */
  label: string;
}

/** Anotação pessoal em uma questão (o id é o da questão). */
export interface QuestionNote {
  id: string;
  text: string;
  updatedAt: string;
}

/** Simulado: lista fixa de questões, com tempo opcional e gabarito só no final. */
export interface Simulado {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  /** Limite de tempo em minutos (null = sem limite). */
  timeLimitMin: number | null;
  questionIds: string[];
  answers: Record<string, QuestionAnswer>;
  /** Tempo total gasto (ms). */
  elapsedMs: number;
  correct: number;
}
