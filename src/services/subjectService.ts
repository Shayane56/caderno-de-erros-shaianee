import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { HistoryEntry, Subject, Topic } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { cleanName, sameName } from '@/utils/text';
import { validateName } from '@/utils/validation';
import { DuplicateError, NotFoundError, ValidationError } from './errors';
import { createSnapshot } from './snapshotService';
import { deleteErrorsCascade } from './cascade';

export interface SubjectImpact {
  topics: number;
  errors: number;
  superados: number;
  pending: number;
}

export type SubjectDeleteOptions =
  | { mode: 'cascade' }
  | { mode: 'move'; targetSubjectId: string };

async function assertUniqueSubjectName(name: string, ignoreId?: string): Promise<void> {
  const all = await db.subjects.toArray();
  const duplicate = all.find((s) => s.id !== ignoreId && sameName(s.name, name));
  if (duplicate) throw new DuplicateError(`A matéria "${duplicate.name}" já existe.`);
}

export async function listSubjects(): Promise<Subject[]> {
  const subjects = await db.subjects.toArray();
  return subjects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function createSubject(rawName: string): Promise<Subject> {
  const problem = validateName(rawName, 'matéria');
  if (problem) throw new ValidationError(problem, { name: problem });
  const name = cleanName(rawName);
  return db.transaction('rw', [db.subjects, db.pendingChanges], async () => {
    await assertUniqueSubjectName(name);
    const now = nowIso();
    const subject: Subject = { id: createId(), name, createdAt: now, updatedAt: now };
    await db.subjects.add(subject);
    await trackChange('subjects', subject.id, now);
    return subject;
  });
}

export async function renameSubject(id: string, rawName: string): Promise<Subject> {
  const problem = validateName(rawName, 'matéria');
  if (problem) throw new ValidationError(problem, { name: problem });
  const name = cleanName(rawName);
  return db.transaction('rw', [db.subjects, db.pendingChanges], async () => {
    const subject = await db.subjects.get(id);
    if (!subject) throw new NotFoundError('Matéria não encontrada.');
    await assertUniqueSubjectName(name, id);
    const updated: Subject = { ...subject, name, updatedAt: nowIso() };
    await db.subjects.put(updated);
    await trackChange('subjects', id, updated.updatedAt);
    return updated;
  });
}

export async function getSubjectImpact(id: string): Promise<SubjectImpact> {
  const [topics, errors] = await Promise.all([
    db.topics.where('subjectId').equals(id).count(),
    db.errors.where('subjectId').equals(id).toArray(),
  ]);
  const superados = errors.filter((e) => e.priority === 'superado').length;
  return { topics, errors: errors.length, superados, pending: errors.length - superados };
}

/**
 * Exclui uma matéria.
 * - `cascade`: remove a matéria, seus tópicos e todos os registros vinculados
 *   (um ponto de restauração é criado antes).
 * - `move`: transfere tópicos e registros para outra matéria (tópicos com o mesmo
 *   nome são unificados) e depois remove a matéria vazia.
 */
export async function deleteSubject(id: string, options: SubjectDeleteOptions): Promise<void> {
  const subject = await db.subjects.get(id);
  if (!subject) throw new NotFoundError('Matéria não encontrada.');
  const impact = await getSubjectImpact(id);

  if (options.mode === 'move') {
    if (options.targetSubjectId === id) throw new ValidationError('Escolha uma matéria diferente para receber os registros.');
    const target = await db.subjects.get(options.targetSubjectId);
    if (!target) throw new NotFoundError('Matéria de destino não encontrada.');
    await db.transaction('rw', [db.subjects, db.topics, db.errors, db.history, db.tombstones, db.pendingChanges], async () => {
      await moveSubjectContents(subject, target);
      await db.subjects.delete(id);
      await trackDeletion('subjects', id);
    });
    return;
  }

  if (impact.errors > 0 || impact.topics > 0) {
    await createSnapshot(`Antes de excluir a matéria "${subject.name}"`);
  }
  await db.transaction(
    'rw',
    [db.subjects, db.topics, db.errors, db.history, db.reviews, db.tombstones, db.pendingChanges],
    async () => {
      const errorIds = (await db.errors.where('subjectId').equals(id).primaryKeys()) as string[];
      await deleteErrorsCascade(errorIds);
      const topicIds = (await db.topics.where('subjectId').equals(id).primaryKeys()) as string[];
      await db.topics.bulkDelete(topicIds);
      for (const topicId of topicIds) await trackDeletion('topics', topicId);
      await db.subjects.delete(id);
      await trackDeletion('subjects', id);
    },
  );
}

async function moveSubjectContents(source: Subject, target: Subject): Promise<void> {
  const now = nowIso();
  const sourceTopics = await db.topics.where('subjectId').equals(source.id).toArray();
  const targetTopics = await db.topics.where('subjectId').equals(target.id).toArray();

  for (const topic of sourceTopics) {
    const twin = targetTopics.find((t) => sameName(t.name, topic.name));
    let destinationTopicId = topic.id;
    if (twin) {
      destinationTopicId = twin.id;
      await db.topics.delete(topic.id);
      await trackDeletion('topics', topic.id, now);
    } else {
      const moved: Topic = { ...topic, subjectId: target.id, updatedAt: now };
      await db.topics.put(moved);
      await trackChange('topics', topic.id, now);
    }
    const errors = await db.errors.where('topicId').equals(topic.id).toArray();
    for (const error of errors) {
      await db.errors.put({ ...error, subjectId: target.id, topicId: destinationTopicId, updatedAt: now });
      await trackChange('errors', error.id, now);
      const entry: HistoryEntry = {
        id: createId(),
        errorId: error.id,
        type: 'moved',
        timestamp: now,
        from: source.name,
        to: target.name,
        summary: `Registro transferido de "${source.name}" para "${target.name}".`,
      };
      await db.history.add(entry);
      await trackChange('history', entry.id, now);
    }
  }
}
