import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { createSubject, deleteSubject, getSubjectImpact, renameSubject } from '@/services/subjectService';
import { createTopic, deleteTopic, renameTopic } from '@/services/topicService';
import { createError } from '@/services/errorService';
import { DuplicateError, ValidationError } from '@/services/errors';
import { makeInput, seedSubjectTopic } from '@/test/factories';

describe('cadastro de matérias', () => {
  it('cria, renomeia e impede duplicações (ignorando acentos e maiúsculas)', async () => {
    const subject = await createSubject('  Língua   Portuguesa ');
    expect(subject.name).toBe('Língua Portuguesa');
    await expect(createSubject('lingua portuguesa')).rejects.toBeInstanceOf(DuplicateError);
    await expect(createSubject('   ')).rejects.toBeInstanceOf(ValidationError);

    const other = await createSubject('Direito Civil');
    await expect(renameSubject(other.id, 'LÍNGUA PORTUGUESA')).rejects.toBeInstanceOf(DuplicateError);
    const renamed = await renameSubject(other.id, 'Direito Civil e Processo Civil');
    expect(renamed.name).toBe('Direito Civil e Processo Civil');
    expect(await db.subjects.count()).toBe(2);
  });

  it('excluir em cascata remove registros vinculados e cria ponto de restauração', async () => {
    const { subject, topic } = await seedSubjectTopic();
    await createError(makeInput(subject.id, topic.id));
    await createError(makeInput(subject.id, topic.id, { description: 'Outro erro', priority: 'superado' }));
    expect(await getSubjectImpact(subject.id)).toEqual({ topics: 1, errors: 2, superados: 1, pending: 1 });

    await deleteSubject(subject.id, { mode: 'cascade' });
    expect(await db.subjects.count()).toBe(0);
    expect(await db.topics.count()).toBe(0);
    expect(await db.errors.count()).toBe(0);
    const snapshots = await db.snapshots.toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].counts.errors).toBe(2);
  });

  it('excluir movendo registros preserva todos os erros e unifica tópicos com o mesmo nome', async () => {
    const a = await seedSubjectTopic('Dir. Adm.', 'Atos administrativos');
    const extra = await createTopic(a.subject.id, 'Licitações');
    const b = await seedSubjectTopic('Direito Administrativo', 'Atos Administrativos');
    await createError(makeInput(a.subject.id, a.topic.id));
    await createError(makeInput(a.subject.id, extra.id, { description: 'Erro de licitação' }));

    await deleteSubject(a.subject.id, { mode: 'move', targetSubjectId: b.subject.id });

    const errors = await db.errors.toArray();
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.subjectId === b.subject.id)).toBe(true);
    const topics = await db.topics.where('subjectId').equals(b.subject.id).toArray();
    expect(topics.map((t) => t.name).sort()).toEqual(['Atos Administrativos', 'Licitações']);
    expect(errors.find((e) => e.description.startsWith('Confundi'))!.topicId).toBe(b.topic.id);
    expect(await db.subjects.get(a.subject.id)).toBeUndefined();
  });
});

describe('cadastro de tópicos', () => {
  it('cria tópicos vinculados à matéria e impede duplicação na mesma matéria', async () => {
    const s1 = await createSubject('Direito Constitucional');
    const s2 = await createSubject('Direito Administrativo');
    await createTopic(s1.id, 'Poder Legislativo');
    await expect(createTopic(s1.id, 'poder legislativo')).rejects.toBeInstanceOf(DuplicateError);
    // Mesmo nome em outra matéria é permitido.
    await expect(createTopic(s2.id, 'Poder Legislativo')).resolves.toBeTruthy();
    await expect(createTopic('inexistente', 'Algo')).rejects.toThrow(/matéria válida/);
  });

  it('renomeia e exclui tópicos movendo os registros', async () => {
    const { subject, topic } = await seedSubjectTopic();
    const target = await createTopic(subject.id, 'Poderes administrativos');
    await expect(renameTopic(topic.id, 'Poderes Administrativos')).rejects.toBeInstanceOf(DuplicateError);
    await createError(makeInput(subject.id, topic.id));
    await deleteTopic(topic.id, { mode: 'move', targetTopicId: target.id });
    const errors = await db.errors.toArray();
    expect(errors[0].topicId).toBe(target.id);
    const history = await db.history.where('errorId').equals(errors[0].id).toArray();
    expect(history.some((h) => h.type === 'moved')).toBe(true);
  });

  it('exclui tópico em cascata somente com o modo explícito', async () => {
    const { subject, topic } = await seedSubjectTopic();
    await createError(makeInput(subject.id, topic.id));
    await deleteTopic(topic.id, { mode: 'cascade' });
    expect(await db.errors.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(1);
  });
});
