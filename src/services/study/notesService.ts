import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import { nowIso } from '@/utils/ids';

/** Salva (ou apaga, se vazia) a anotação pessoal de uma questão. */
export async function saveQuestionNote(questionId: string, text: string): Promise<void> {
  const clean = text.slice(0, 20_000);
  await db.transaction('rw', [db.questionNotes, db.tombstones, db.pendingChanges], async () => {
    const now = nowIso();
    if (!clean.trim()) {
      if (await db.questionNotes.get(questionId)) {
        await db.questionNotes.delete(questionId);
        await trackDeletion('questionNotes', questionId, now);
      }
      return;
    }
    await db.questionNotes.put({ id: questionId, text: clean, updatedAt: now });
    await trackChange('questionNotes', questionId, now);
  });
}

export function useQuestionNote(questionId: string | undefined): string | undefined {
  return useLiveQuery(async () => (questionId ? ((await db.questionNotes.get(questionId))?.text ?? '') : ''), [questionId]);
}
