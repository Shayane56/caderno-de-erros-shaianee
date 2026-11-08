import type { EntityName } from '@/types';
import { nowIso } from '@/utils/ids';
import { db } from './db';

export function entityKey(entity: EntityName, id: string): string {
  return `${entity}:${id}`;
}

/** Marca uma entidade como alterada localmente (pendente de sincronização). */
export async function trackChange(entity: EntityName, id: string, at = nowIso()): Promise<void> {
  const key = entityKey(entity, id);
  await db.pendingChanges.put({ key, entity, entityId: id, changedAt: at });
}

/** Registra a exclusão de uma entidade para que ela seja propagada a outros dispositivos. */
export async function trackDeletion(entity: EntityName, id: string, at = nowIso()): Promise<void> {
  const key = entityKey(entity, id);
  await db.tombstones.put({ key, entity, entityId: id, deletedAt: at });
  await db.pendingChanges.put({ key, entity, entityId: id, changedAt: at });
}

/** Tabelas que participam de toda operação de escrita rastreada. */
export function writeTables() {
  return [db.subjects, db.topics, db.errors, db.history, db.reviews, db.decks, db.cards, db.cardReviews, db.questions, db.questionAttempts, db.questionNotes, db.simulados, db.focusSessions, db.tombstones, db.pendingChanges];
}
