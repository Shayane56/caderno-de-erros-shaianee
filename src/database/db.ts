import Dexie, { type EntityTable } from 'dexie';
import type {
  CardReview,
  Deck,
  ErrorRecord,
  Flashcard,
  HistoryEntry,
  PendingChange,
  ReviewEntry,
  SettingEntry,
  Snapshot,
  Subject,
  Tombstone,
  Topic,
} from '@/types';
import { normalizeErrorRecord } from './migrations';

export const DB_NAME = 'caderno-de-erros-shaiane';

/**
 * Banco principal (IndexedDB via Dexie).
 *
 * Histórico de versões do esquema — NUNCA remova versões antigas:
 * a declaração de todas elas permite atualizar qualquer instalação existente
 * sem perda de dados.
 */
export class CadernoDatabase extends Dexie {
  subjects!: EntityTable<Subject, 'id'>;
  topics!: EntityTable<Topic, 'id'>;
  errors!: EntityTable<ErrorRecord, 'id'>;
  history!: EntityTable<HistoryEntry, 'id'>;
  reviews!: EntityTable<ReviewEntry, 'id'>;
  tombstones!: EntityTable<Tombstone, 'key'>;
  pendingChanges!: EntityTable<PendingChange, 'key'>;
  settings!: EntityTable<SettingEntry, 'key'>;
  snapshots!: EntityTable<Snapshot, 'id'>;
  decks!: EntityTable<Deck, 'id'>;
  cards!: EntityTable<Flashcard, 'id'>;
  cardReviews!: EntityTable<CardReview, 'id'>;

  constructor(name = DB_NAME) {
    super(name);

    // v1 — estrutura inicial: matérias, tópicos e erros (sem origem do erro).
    this.version(1).stores({
      subjects: 'id, name',
      topics: 'id, subjectId, name',
      errors: 'id, subjectId, topicId, priority, createdAt',
      settings: 'key',
    });

    // v2 — origem do erro, histórico, revisões, sincronização e pontos de restauração.
    this.version(2)
      .stores({
        subjects: 'id, name, updatedAt',
        topics: 'id, subjectId, name, updatedAt',
        errors: 'id, subjectId, topicId, priority, origin, createdAt, updatedAt, lastReviewedAt',
        history: 'id, errorId, timestamp, type',
        reviews: 'id, errorId, reviewedAt',
        tombstones: 'key, entity, deletedAt',
        pendingChanges: 'key, entity, changedAt',
        settings: 'key',
        snapshots: 'id, createdAt',
      })
      .upgrade(async (tx) => {
        // Registros antigos sem origem permanecem "Não classificado" (null).
        // Nenhum registro é descartado: se algo essencial faltar, mantemos o original
        // e apenas completamos campos ausentes com valores neutros.
        await tx
          .table('errors')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            const normalized = normalizeErrorRecord(record);
            if (normalized) {
              Object.assign(record, normalized);
            } else {
              record.origin = record.origin ?? null;
              record.reviewCount = record.reviewCount ?? 0;
              record.lastReviewedAt = record.lastReviewedAt ?? null;
              record.resolvedAt = record.resolvedAt ?? null;
              record.updatedAt = record.updatedAt ?? record.createdAt ?? new Date().toISOString();
            }
          });
        const now = new Date().toISOString();
        await tx
          .table('subjects')
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            s.createdAt = s.createdAt ?? now;
            s.updatedAt = s.updatedAt ?? s.createdAt;
          });
        await tx
          .table('topics')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            t.createdAt = t.createdAt ?? now;
            t.updatedAt = t.updatedAt ?? t.createdAt;
          });
      });

    // v3 — Flashcards: baralhos, cartões (com agendamento) e respostas de estudo.
    // Apenas tabelas novas: nenhum dado existente é alterado.
    this.version(3).stores({
      decks: 'id, name, subjectId, updatedAt',
      cards: 'id, deckId, type, sourceErrorId, createdAt, updatedAt',
      cardReviews: 'id, cardId, deckId, reviewedAt',
    });
  }
}

export const db = new CadernoDatabase();

export type DatabaseErrorKind = 'unsupported' | 'blocked' | 'quota' | 'version' | 'unknown';

export class DatabaseOpenError extends Error {
  kind: DatabaseErrorKind;
  constructor(kind: DatabaseErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseOpenError';
    this.kind = kind;
    (this as { cause?: unknown }).cause = cause;
  }
}

/** Traduz falhas de abertura do IndexedDB em mensagens compreensíveis. */
export function describeDatabaseError(error: unknown): DatabaseOpenError {
  const name = (error as { name?: string })?.name ?? '';
  const inner = (error as { inner?: { name?: string } })?.inner?.name ?? '';
  const all = `${name} ${inner}`;
  if (typeof indexedDB === 'undefined' || /MissingAPI|InvalidState/.test(all)) {
    return new DatabaseOpenError(
      'unsupported',
      'Este navegador não permite o armazenamento local (IndexedDB). Verifique se a navegação privada está desativada ou use outro navegador.',
      error,
    );
  }
  if (/QuotaExceeded/.test(all)) {
    return new DatabaseOpenError(
      'quota',
      'O espaço de armazenamento do dispositivo está cheio. Libere espaço e tente novamente.',
      error,
    );
  }
  if (/Version/.test(all)) {
    return new DatabaseOpenError(
      'version',
      'O banco de dados foi criado por uma versão mais nova do aplicativo. Atualize a página para carregar a versão mais recente.',
      error,
    );
  }
  if (/Blocked|DatabaseClosed/.test(all)) {
    return new DatabaseOpenError(
      'blocked',
      'O banco de dados está sendo atualizado em outra aba. Feche as outras abas do Caderno de Erros e tente novamente.',
      error,
    );
  }
  return new DatabaseOpenError(
    'unknown',
    'Não foi possível abrir o banco de dados local. Seus dados não foram apagados — tente recarregar a página.',
    error,
  );
}

/** Abre o banco com tratamento de falhas. */
export async function openDatabase(): Promise<CadernoDatabase> {
  try {
    if (!db.isOpen()) await db.open();
    return db;
  } catch (error) {
    throw describeDatabaseError(error);
  }
}

/** Solicita ao navegador armazenamento persistente (evita limpeza automática). */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
