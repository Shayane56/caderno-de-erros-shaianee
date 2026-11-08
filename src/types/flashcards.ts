/**
 * Tipos do módulo de Flashcards (repetição espaçada no estilo Anki).
 * Todas as datas são strings ISO 8601 (UTC).
 */

/** Tipos de cartão. */
export type CardType = 'basic' | 'cloze' | 'truefalse';

/** Fase do cartão no agendamento. */
export type SrsPhase = 'new' | 'learning' | 'review' | 'relearning';

/** Avaliação dada ao responder: 1 Errei · 2 Difícil · 3 Bom · 4 Fácil. */
export type Rating = 1 | 2 | 3 | 4;

/** Gabarito dos cartões "Certo ou Errado". */
export type TrueFalseAnswer = 'certo' | 'errado';

/** Estado de agendamento de uma face (ordinal) do cartão. */
export interface SrsState {
  phase: SrsPhase;
  /** Próxima apresentação (null para cartões novos). */
  due: string | null;
  /** Intervalo atual em dias (0 enquanto o cartão ainda está em aprendizagem). */
  interval: number;
  /** Fator de facilidade (2,5 = 250%). */
  ease: number;
  /** Etapa atual de aprendizagem/reaprendizagem. */
  step: number;
  reps: number;
  lapses: number;
  lastReviewedAt: string | null;
}

export type PaperStyle = 'pautado' | 'quadriculado' | 'pontilhado' | 'liso';
export type PaperTint = 'branco' | 'creme' | 'rosado' | 'lavanda' | 'menta' | 'azulado';
export type CardFont = 'moderna' | 'elegante' | 'classica' | 'caderno' | 'manuscrita';
export type HighlightColor = 'amarelo' | 'rosa' | 'verde' | 'azul' | 'lilas' | 'laranja';
export type TextSize = 'p' | 'm' | 'g';
export type DeckColor =
  | 'rosa'
  | 'pink'
  | 'coral'
  | 'pessego'
  | 'amarelo'
  | 'menta'
  | 'verde'
  | 'ceu'
  | 'azul'
  | 'lavanda'
  | 'roxo'
  | 'grafite';
export type CoverPattern = 'liso' | 'bolinhas' | 'listras' | 'xadrez' | 'quadriculado' | 'coracoes' | 'estrelas';

/** Baralho (um "caderno" de flashcards). */
export interface Deck {
  id: string;
  name: string;
  description: string;
  /** Matéria vinculada (opcional) — usada para gerar cartões a partir dos erros. */
  subjectId: string | null;
  emoji: string;
  color: DeckColor;
  pattern: CoverPattern;
  /** Foto de capa (data URL) — substitui cor/estampa quando definida. */
  coverImage: string | null;
  /** Elástico na capa, como nos cadernos de verdade. */
  elastic: boolean;
  /** Estilo dos cartões deste baralho (null = usar o padrão da Personalização). */
  paper: PaperStyle | null;
  paperTint: PaperTint | null;
  font: CardFont | null;
  /** Limite diário de cartões novos. */
  newPerDay: number;
  /** Limite diário de revisões. */
  reviewsPerDay: number;
  createdAt: string;
  updatedAt: string;
}

/** Cartão (nota). Um cartão pode gerar várias "faces" estudadas separadamente. */
export interface Flashcard {
  id: string;
  deckId: string;
  type: CardType;
  /** Frente / pergunta / afirmação / texto com lacunas. */
  front: string;
  /** Verso / resposta (basic) ou justificativa (Certo ou Errado). */
  back: string;
  /** Informação extra exibida no verso (ex.: "como evitar", fundamento legal). */
  extra: string;
  /** Gabarito dos cartões Certo ou Errado. */
  answer: TrueFalseAnswer | null;
  /** Cartões frente-e-verso: também estudar no sentido inverso. */
  reverse: boolean;
  frontImage: string | null;
  backImage: string | null;
  tags: string[];
  /** Erro do caderno que originou o cartão (se houver). */
  sourceErrorId: string | null;
  suspended: boolean;
  /** Agendamento por face: "0" (frente), "1" (inverso) ou o número da lacuna. */
  srs: Record<string, SrsState>;
  createdAt: string;
  updatedAt: string;
}

/** Registro de cada resposta dada no estudo. */
export interface CardReview {
  id: string;
  cardId: string;
  deckId: string;
  ord: string;
  reviewedAt: string;
  rating: Rating;
  phaseBefore: SrsPhase;
  intervalBefore: number;
  intervalAfter: number;
  easeAfter: number;
  /** Tempo de resposta (ms). */
  durationMs: number;
}

/** Dados do formulário de cartão. */
export interface CardInput {
  deckId: string;
  type: CardType;
  front: string;
  back: string;
  extra: string;
  answer: TrueFalseAnswer | '';
  reverse: boolean;
  frontImage: string | null;
  backImage: string | null;
  tags: string[];
  sourceErrorId: string | null;
}

export interface DeckInput {
  name: string;
  description: string;
  subjectId: string | null;
  emoji: string;
  color: DeckColor;
  pattern: CoverPattern;
  coverImage: string | null;
  elastic: boolean;
  paper: PaperStyle | null;
  paperTint: PaperTint | null;
  font: CardFont | null;
  newPerDay: number;
  reviewsPerDay: number;
}
