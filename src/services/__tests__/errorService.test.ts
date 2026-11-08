import { describe, expect, it } from 'vitest';
import { db, CadernoDatabase, DB_NAME } from '@/database/db';
import {
  changeOrigin,
  changePriority,
  createError,
  deleteError,
  registerReview,
  updateError,
  inputFromRecord,
} from '@/services/errorService';
import { ValidationError } from '@/services/errors';
import { makeInput, seedError, seedSubjectTopic } from '@/test/factories';

describe('cadastro de erros', () => {
  it('persiste o registro com data automática, histórico e pendência de sincronização', async () => {
    const { subject, topic } = await seedSubjectTopic();
    const record = await createError(makeInput(subject.id, topic.id, { reference: 'Q123 — CEBRASPE 2024' }));

    const stored = await db.errors.get(record.id);
    expect(stored).toMatchObject({
      subjectId: subject.id,
      topicId: topic.id,
      priority: 'alta',
      origin: 'confusao',
      reference: 'Q123 — CEBRASPE 2024',
      reviewCount: 0,
      lastReviewedAt: null,
      resolvedAt: null,
    });
    expect(new Date(stored!.createdAt).getTime()).toBeGreaterThan(Date.now() - 5000);
    const history = await db.history.where('errorId').equals(record.id).toArray();
    expect(history.map((h) => h.type)).toEqual(['created']);
    expect(await db.pendingChanges.get(`errors:${record.id}`)).toBeTruthy();
  });

  it('rejeita registros com campos obrigatórios vazios', async () => {
    const { subject, topic } = await seedSubjectTopic();
    await expect(
      createError(makeInput(subject.id, topic.id, { description: '  ', origin: '' as never })),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await db.errors.count()).toBe(0);
  });

  it('rejeita tópico que não pertence à matéria', async () => {
    const a = await seedSubjectTopic('Português', 'Crase');
    const b = await seedSubjectTopic('Direito Penal', 'Dolo');
    await expect(createError(makeInput(a.subject.id, b.topic.id))).rejects.toThrow(/não pertence/);
  });

  it('registra superado já no cadastro com data de superação', async () => {
    const { record } = await seedError({ priority: 'superado' });
    expect(record.resolvedAt).toBe(record.createdAt);
  });
});

describe('edição de erros', () => {
  it('atualiza campos e registra o histórico de cada alteração', async () => {
    const { record } = await seedError();
    const input = { ...inputFromRecord(record), description: 'Nova descrição', priority: 'media' as const, origin: 'esquecimento' as const };
    const updated = await updateError(record.id, input);

    expect(updated.description).toBe('Nova descrição');
    expect(updated.priority).toBe('media');
    expect(updated.origin).toBe('esquecimento');
    expect(updated.createdAt).toBe(record.createdAt);
    const types = (await db.history.where('errorId').equals(record.id).toArray()).map((h) => h.type).sort();
    expect(types).toEqual(['created', 'origin_changed', 'priority_changed', 'updated']);
  });

  it('não gera histórico quando nada muda', async () => {
    const { record } = await seedError();
    await updateError(record.id, inputFromRecord(record));
    expect(await db.history.where('errorId').equals(record.id).count()).toBe(1);
  });
});

describe('exclusão de erros', () => {
  it('remove o registro, seu histórico e registra a exclusão para sincronização', async () => {
    const { record } = await seedError();
    await registerReview(record.id, 'media');
    await deleteError(record.id);
    expect(await db.errors.get(record.id)).toBeUndefined();
    expect(await db.history.where('errorId').equals(record.id).count()).toBe(0);
    expect(await db.reviews.where('errorId').equals(record.id).count()).toBe(0);
    expect(await db.tombstones.get(`errors:${record.id}`)).toBeTruthy();
  });
});

describe('alterações rápidas', () => {
  it('altera prioridade preservando o histórico', async () => {
    const { record } = await seedError();
    const updated = await changePriority(record.id, 'superado');
    expect(updated.priority).toBe('superado');
    expect(updated.resolvedAt).not.toBeNull();
    const back = await changePriority(record.id, 'alta');
    expect(back.resolvedAt).toBeNull();
    const entries = await db.history.where('errorId').equals(record.id).toArray();
    expect(entries.filter((h) => h.type === 'priority_changed').map((h) => [h.from, h.to])).toEqual(
      expect.arrayContaining([
        ['alta', 'superado'],
        ['superado', 'alta'],
      ]),
    );
  });

  it('altera origem independentemente da prioridade', async () => {
    const { record } = await seedError({ priority: 'media', origin: 'desconhecimento' });
    const updated = await changeOrigin(record.id, 'interpretacao');
    expect(updated.origin).toBe('interpretacao');
    expect(updated.priority).toBe('media');
    const entry = (await db.history.where('errorId').equals(record.id).toArray()).find((h) => h.type === 'origin_changed');
    expect(entry).toMatchObject({ from: 'desconhecimento', to: 'interpretacao' });
  });
});

describe('segundo ciclo — revisões', () => {
  it('marca como superado mantendo o registro salvo e registra a revisão', async () => {
    const { record } = await seedError();
    const reviewed = await registerReview(record.id, 'superado');
    expect(reviewed.priority).toBe('superado');
    expect(reviewed.reviewCount).toBe(1);
    expect(reviewed.lastReviewedAt).not.toBeNull();
    expect(reviewed.resolvedAt).not.toBeNull();
    expect(await db.errors.get(record.id)).toBeTruthy();
    const reviews = await db.reviews.where('errorId').equals(record.id).toArray();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ priorityBefore: 'alta', priorityAfter: 'superado' });
  });

  it('mantém prioridade alta contabilizando a revisão', async () => {
    const { record } = await seedError();
    const reviewed = await registerReview(record.id, 'alta');
    expect(reviewed.priority).toBe('alta');
    expect(reviewed.reviewCount).toBe(1);
    const history = await db.history.where('errorId').equals(record.id).toArray();
    expect(history.some((h) => h.type === 'reviewed' && h.summary.includes('mantido'))).toBe(true);
  });
});

describe('persistência no IndexedDB', () => {
  it('mantém os dados após fechar e reabrir o banco', async () => {
    const { record, subject } = await seedError();
    db.close();
    const reopened = new CadernoDatabase(DB_NAME);
    await reopened.open();
    expect(await reopened.errors.get(record.id)).toMatchObject({ description: record.description });
    expect(await reopened.subjects.get(subject.id)).toMatchObject({ name: subject.name });
    reopened.close();
    await db.open();
  });
});
