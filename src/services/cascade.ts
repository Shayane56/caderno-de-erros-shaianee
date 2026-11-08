import { db } from '@/database/db';
import { trackDeletion } from '@/database/changeTracker';
import { nowIso } from '@/utils/ids';

/** Remove erros e seus históricos/revisões, registrando as exclusões. Usar dentro de transação. */
export async function deleteErrorsCascade(errorIds: string[]): Promise<void> {
  if (errorIds.length === 0) return;
  const historyIds = (await db.history.where('errorId').anyOf(errorIds).primaryKeys()) as string[];
  const reviewIds = (await db.reviews.where('errorId').anyOf(errorIds).primaryKeys()) as string[];
  await db.history.bulkDelete(historyIds);
  await db.reviews.bulkDelete(reviewIds);
  await db.errors.bulkDelete(errorIds);
  const now = nowIso();
  for (const hid of historyIds) await trackDeletion('history', hid, now);
  for (const rid of reviewIds) await trackDeletion('reviews', rid, now);
  for (const eid of errorIds) await trackDeletion('errors', eid, now);
}
