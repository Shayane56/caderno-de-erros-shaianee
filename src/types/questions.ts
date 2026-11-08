/**
 * Tipos do Banco de Questões.
 * As questões do banco embutido vêm com o aplicativo (arquivos em src/data/questoes);
 * as questões cadastradas pela usuária e as respostas ficam no IndexedDB.
 */

/** Múltipla escolha (A–E) ou Certo/Errado (estilo Cebraspe). */
export type QuestionFormat = 'multipla' | 'certo_errado';

/** "banco" = questão inédita do banco embutido; "minha" = cadastrada/importada pela usuária. */
export type QuestionOrigin = 'banco' | 'minha';

/** Gabarito: índice da alternativa (0 = A) ou C/E. */
export type QuestionAnswer = number | 'C' | 'E';

export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  origin: QuestionOrigin;
  format: QuestionFormat;
  /** Banca (ou estilo de banca, nas inéditas). */
  banca: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  /** Texto de apoio (opcional). */
  support: string;
  statement: string;
  /** Alternativas (sem a letra). Vazio nas questões Certo/Errado. */
  options: string[];
  answer: QuestionAnswer;
  /** Comentário / justificativa do gabarito. */
  explanation: string;
  /** Dados da prova de origem (questões de provas reais cadastradas pela usuária). */
  year: number | null;
  orgao: string;
  cargo: string;
  createdAt: string;
  updatedAt: string;
}

/** Resposta dada a uma questão. */
export interface QuestionAttempt {
  id: string;
  questionId: string;
  answeredAt: string;
  chosen: QuestionAnswer;
  correct: boolean;
  /** Cópias para estatísticas mesmo se a questão for alterada/excluída. */
  subject: string;
  topic: string;
  banca: string;
  /** Tempo gasto na questão (ms), quando medido. */
  durationMs?: number;
  /** Simulado em que foi respondida (se houver). */
  simuladoId?: string | null;
}

/** Formato das questões nos arquivos do banco embutido (campos de controle são completados ao carregar). */
export type BankQuestionSeed = Pick<Question, 'id' | 'format' | 'banca' | 'subject' | 'topic' | 'difficulty' | 'statement' | 'options' | 'answer' | 'explanation'> &
  Partial<Pick<Question, 'support'>>;
