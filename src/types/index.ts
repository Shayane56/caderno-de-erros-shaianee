/**
 * Tipos centrais do domínio do Caderno de Erros.
 * Todas as datas são armazenadas como strings ISO 8601 (UTC).
 */
import type { CardReview, Deck, Flashcard } from './flashcards';

export * from './flashcards';

/** Classificação de prioridade (exatamente três). */
export type Priority = 'alta' | 'media' | 'superado';

/** Origem do erro — independente da prioridade. */
export type OriginId = 'desconhecimento' | 'confusao' | 'esquecimento' | 'interpretacao';

/**
 * Origem armazenada. `null` representa registros antigos/importados sem
 * origem, exibidos como "Não classificado" (nunca recebem categoria automática).
 */
export type StoredOrigin = OriginId | null;

/** Valor usado em filtros para selecionar registros sem origem. */
export const UNCLASSIFIED = 'nao_classificado' as const;
export type OriginFilterValue = OriginId | typeof UNCLASSIFIED;

export interface Subject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorRecord {
  id: string;
  subjectId: string;
  topicId: string;
  description: string;
  correction: string;
  prevention: string;
  priority: Priority;
  origin: StoredOrigin;
  reference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Data da última revisão no Segundo Ciclo (null = nunca revisado). */
  lastReviewedAt: string | null;
  reviewCount: number;
  /** Momento em que o erro passou a "superado" (null se não superado). */
  resolvedAt: string | null;
}

export type HistoryEventType =
  | 'created'
  | 'updated'
  | 'priority_changed'
  | 'origin_changed'
  | 'reviewed'
  | 'imported'
  | 'moved';

export interface HistoryEntry {
  id: string;
  errorId: string;
  type: HistoryEventType;
  timestamp: string;
  /** Campos alterados (para `updated`). */
  fields?: string[];
  from?: string | null;
  to?: string | null;
  summary: string;
}

export interface ReviewEntry {
  id: string;
  errorId: string;
  reviewedAt: string;
  priorityBefore: Priority;
  priorityAfter: Priority;
}

/** Entidades sincronizáveis/exportáveis. */
export type EntityName = 'subjects' | 'topics' | 'errors' | 'history' | 'reviews' | 'decks' | 'cards' | 'cardReviews';

/** Todas as entidades, na ordem de dependência (pais antes dos filhos). */
export const ENTITY_NAMES: EntityName[] = ['subjects', 'topics', 'errors', 'history', 'reviews', 'decks', 'cards', 'cardReviews'];

/** Registro de exclusão (necessário para propagar exclusões na sincronização). */
export interface Tombstone {
  key: string; // `${entity}:${id}`
  entity: EntityName;
  entityId: string;
  deletedAt: string;
}

/** Alteração local pendente de envio para a nuvem. */
export interface PendingChange {
  key: string; // `${entity}:${id}`
  entity: EntityName;
  entityId: string;
  changedAt: string;
}

export interface SettingEntry {
  key: string;
  value: unknown;
}

/** Ponto de restauração local (criado automaticamente antes de operações destrutivas). */
export interface Snapshot {
  id: string;
  createdAt: string;
  reason: string;
  counts: { subjects: number; topics: number; errors: number; decks?: number; cards?: number };
  data: BackupData;
}

/** Dados de entrada do formulário de erro. */
export interface ErrorInput {
  subjectId: string;
  topicId: string;
  description: string;
  correction: string;
  prevention: string;
  priority: Priority | '';
  origin: OriginId | '';
  reference: string;
  notes: string;
}

/** Estrutura do arquivo de backup (JSON). */
export interface BackupData {
  subjects: Subject[];
  topics: Topic[];
  errors: ErrorRecord[];
  history: HistoryEntry[];
  reviews: ReviewEntry[];
  decks: Deck[];
  cards: Flashcard[];
  cardReviews: CardReview[];
}

export interface BackupFile extends BackupData {
  app: 'caderno-de-erros';
  formatVersion: number;
  exportedAt: string;
  owner: string;
}

export interface ErrorFilters {
  search: string;
  subjectId: string;
  topicId: string;
  priorities: Priority[];
  origins: OriginFilterValue[];
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
}
