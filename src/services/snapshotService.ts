import { db } from '@/database/db';
import { MAX_SNAPSHOTS } from '@/constants/app';
import type { BackupData, Snapshot } from '@/types';
import { createId, nowIso } from '@/utils/ids';

/** Lê todos os dados do caderno (matérias, tópicos, erros, históricos, revisões e flashcards). */
export async function readAllData(): Promise<BackupData> {
  const [subjects, topics, errors, history, reviews, decks, cards, cardReviews] = await Promise.all([
    db.subjects.toArray(),
    db.topics.toArray(),
    db.errors.toArray(),
    db.history.toArray(),
    db.reviews.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
    db.cardReviews.toArray(),
  ]);
  return { subjects, topics, errors, history, reviews, decks, cards, cardReviews };
}

/** Completa dados de versões anteriores (ex.: pontos de restauração criados antes dos flashcards). */
export function completeBackupData(data: Partial<BackupData>): BackupData {
  return {
    subjects: data.subjects ?? [],
    topics: data.topics ?? [],
    errors: data.errors ?? [],
    history: data.history ?? [],
    reviews: data.reviews ?? [],
    decks: data.decks ?? [],
    cards: data.cards ?? [],
    cardReviews: data.cardReviews ?? [],
  };
}

/**
 * Cria um ponto de restauração local. Usado automaticamente antes de operações
 * destrutivas (substituir dados, excluir matéria/tópico com registros, restaurar).
 * Retorna `null` quando não há dados a preservar.
 */
export async function createSnapshot(reason: string): Promise<Snapshot | null> {
  const data = await readAllData();
  if (data.subjects.length === 0 && data.topics.length === 0 && data.errors.length === 0 && data.decks.length === 0 && data.cards.length === 0) {
    return null;
  }
  const snapshot: Snapshot = {
    id: createId(),
    createdAt: nowIso(),
    reason,
    counts: {
      subjects: data.subjects.length,
      topics: data.topics.length,
      errors: data.errors.length,
      decks: data.decks.length,
      cards: data.cards.length,
    },
    data,
  };
  await db.snapshots.add(snapshot);
  await pruneSnapshots();
  return snapshot;
}

async function pruneSnapshots(): Promise<void> {
  const all = await db.snapshots.orderBy('createdAt').reverse().primaryKeys();
  const excess = all.slice(MAX_SNAPSHOTS);
  if (excess.length) await db.snapshots.bulkDelete(excess);
}

export async function listSnapshots(): Promise<Snapshot[]> {
  return db.snapshots.orderBy('createdAt').reverse().toArray();
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}
