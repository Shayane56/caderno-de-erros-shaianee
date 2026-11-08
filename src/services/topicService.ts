import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { HistoryEntry, Topic } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { cleanName, sameName } from '@/utils/text';
import { validateName } from '@/utils/validation';
import { DuplicateError, NotFoundError, ValidationError } from './errors';
import { createSnapshot } from './snapshotService';
import { deleteErrorsCascade } from './cascade';

export interface TopicImpact {
  errors: number;
  superados: number;
  pending: number;
}

export type TopicDeleteOptions = { mode: 'cascade' } | { mode: 'move'; targetTopicId: string };

async function assertUniqueTopicName(subjectId: string, name: string, ignoreId?: string): Promise<void> {
  const siblings = await db.topics.where('subjectId').equals(subjectId).toArray();
  const duplicate = siblings.find((t) => t.id !== ignoreId && sameName(t.name, name));
  if (duplicate) throw new DuplicateError(`O tópico "${duplicate.name}" já existe nesta matéria.`);
}

export async function listTopics(subjectId?: string): Promise<Topic[]> {
  const topics = subjectId
    ? await db.topics.where('subjectId').equals(subjectId).toArray()
    : await db.topics.toArray();
  return topics.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function createTopic(subjectId: string, rawName: string): Promise<Topic> {
  const problem = validateName(rawName, 'tópico');
  if (problem) throw new ValidationError(problem, { name: problem });
  const name = cleanName(rawName);
  return db.transaction('rw', [db.subjects, db.topics, db.pendingChanges], async () => {
    const subject = await db.subjects.get(subjectId);
    if (!subject) throw new NotFoundError('Selecione uma matéria válida antes de criar o tópico.');
    await assertUniqueTopicName(subjectId, name);
    const now = nowIso();
    const topic: Topic = { id: createId(), subjectId, name, createdAt: now, updatedAt: now };
    await db.topics.add(topic);
    await trackChange('topics', topic.id, now);
    return topic;
  });
}

export async function renameTopic(id: string, rawName: string): Promise<Topic> {
  const problem = validateName(rawName, 'tópico');
  if (problem) throw new ValidationError(problem, { name: problem });
  const name = cleanName(rawName);
  return db.transaction('rw', [db.topics, db.pendingChanges], async () => {
    const topic = await db.topics.get(id);
    if (!topic) throw new NotFoundError('Tópico não encontrado.');
    await assertUniqueTopicName(topic.subjectId, name, id);
    const updated: Topic = { ...topic, name, updatedAt: nowIso() };
    await db.topics.put(updated);
    await trackChange('topics', id, updated.updatedAt);
    return updated;
  });
}

export async function getTopicImpact(id: string): Promise<TopicImpact> {
  const errors = await db.errors.where('topicId').equals(id).toArray();
  const superados = errors.filter((e) => e.priority === 'superado').length;
  return { errors: errors.length, superados, pending: errors.length - superados };
}

/**
 * Exclui um tópico.
 * - `cascade`: remove o tópico e todos os registros vinculados (com ponto de restauração).
 * - `move`: transfere os registros para outro tópico antes de excluir.
 */
export async function deleteTopic(id: string, options: TopicDeleteOptions): Promise<void> {
  const topic = await db.topics.get(id);
  if (!topic) throw new NotFoundError('Tópico não encontrado.');

  if (options.mode === 'move') {
    if (options.targetTopicId === id) throw new ValidationError('Escolha um tópico diferente para receber os registros.');
    const target = await db.topics.get(options.targetTopicId);
    if (!target) throw new NotFoundError('Tópico de destino não encontrado.');
    await db.transaction('rw', [db.topics, db.errors, db.history, db.tombstones, db.pendingChanges], async () => {
      const now = nowIso();
      const errors = await db.errors.where('topicId').equals(id).toArray();
      for (const error of errors) {
        await db.errors.put({ ...error, topicId: target.id, subjectId: target.subjectId, updatedAt: now });
        await trackChange('errors', error.id, now);
        const entry: HistoryEntry = {
          id: createId(),
          errorId: error.id,
          type: 'moved',
          timestamp: now,
          from: topic.name,
          to: target.name,
          summary: `Registro transferido do tópico "${topic.name}" para "${target.name}".`,
        };
        await db.history.add(entry);
        await trackChange('history', entry.id, now);
      }
      await db.topics.delete(id);
      await trackDeletion('topics', id, now);
    });
    return;
  }

  const impact = await getTopicImpact(id);
  if (impact.errors > 0) await createSnapshot(`Antes de excluir o tópico "${topic.name}"`);
  await db.transaction('rw', [db.topics, db.errors, db.history, db.reviews, db.tombstones, db.pendingChanges], async () => {
    const errorIds = (await db.errors.where('topicId').equals(id).primaryKeys()) as string[];
    await deleteErrorsCascade(errorIds);
    await db.topics.delete(id);
    await trackDeletion('topics', id);
  });
}
