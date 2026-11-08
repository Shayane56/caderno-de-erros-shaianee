import { db } from '@/database/db';
import { MAX_SNAPSHOTS } from '@/constants/app';
import type { BackupData, Snapshot } from '@/types';
import { createId, nowIso } from '@/utils/ids';

/** Lê todos os dados do caderno (matérias, tópicos, erros, históricos e revisões). */
export async function readAllData(): Promise<BackupData> {
  const [subjects, topics, errors, history, reviews] = await Promise.all([
    db.subjects.toArray(),
    db.topics.toArray(),
    db.errors.toArray(),
    db.history.toArray(),
    db.reviews.toArray(),
  ]);
  return { subjects, topics, errors, history, reviews };
}

/**
 * Cria um ponto de restauração local. Usado automaticamente antes de operações
 * destrutivas (substituir dados, excluir matéria/tópico com registros, restaurar).
 * Retorna `null` quando não há dados a preservar.
 */
export async function createSnapshot(reason: string): Promise<Snapshot | null> {
  const data = await readAllData();
  if (data.subjects.length === 0 && data.topics.length === 0 && data.errors.length === 0) return null;
  const snapshot: Snapshot = {
    id: createId(),
    createdAt: nowIso(),
    reason,
    counts: { subjects: data.subjects.length, topics: data.topics.length, errors: data.errors.length },
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
