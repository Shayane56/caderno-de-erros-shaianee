import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CadernoDatabase } from '@/database/db';
import { normalizeErrorRecord, normalizeOrigin } from '@/database/migrations';

describe('migração do banco (v1 → atual)', () => {
  it('preserva registros antigos e marca os sem origem como "Não classificado"', async () => {
    const name = `legacy-test-${Math.random()}`;
    // Banco criado pela versão 1 do aplicativo (sem origem do erro).
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      subjects: 'id, name',
      topics: 'id, subjectId, name',
      errors: 'id, subjectId, topicId, priority, createdAt',
      settings: 'key',
    });
    await legacy.open();
    await legacy.table('subjects').add({ id: 's1', name: 'Direito Civil', createdAt: '2023-01-01T00:00:00.000Z' });
    await legacy.table('topics').add({ id: 't1', subjectId: 's1', name: 'Prescrição' });
    await legacy.table('errors').bulkAdd([
      {
        id: 'e1',
        subjectId: 's1',
        topicId: 't1',
        description: 'Esqueci o prazo prescricional',
        correction: 'Regra geral: 10 anos.',
        priority: 'alta',
        createdAt: '2023-01-02T00:00:00.000Z',
      },
      {
        id: 'e2',
        subjectId: 's1',
        topicId: 't1',
        description: 'Registro já resolvido',
        correction: '…',
        priority: 'superado',
        createdAt: '2023-01-03T00:00:00.000Z',
      },
    ]);
    legacy.close();

    const upgraded = new CadernoDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(4);
    expect(await upgraded.cards.count()).toBe(0);
    const errors = await upgraded.errors.orderBy('createdAt').toArray();
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({
      id: 'e1',
      origin: null,
      priority: 'alta',
      reviewCount: 0,
      lastReviewedAt: null,
      resolvedAt: null,
      prevention: '',
      updatedAt: '2023-01-02T00:00:00.000Z',
    });
    expect(errors[1].resolvedAt).toBe('2023-01-03T00:00:00.000Z');
    // Índice novo funciona sobre os dados migrados.
    expect(await upgraded.errors.where('priority').equals('alta').count()).toBe(1);
    const subject = await upgraded.subjects.get('s1');
    expect(subject!.updatedAt).toBe('2023-01-01T00:00:00.000Z');
    upgraded.close();
    await Dexie.delete(name);
  });

  it('nunca atribui origem automaticamente', () => {
    expect(normalizeOrigin(undefined)).toBeNull();
    expect(normalizeOrigin('qualquer')).toBeNull();
    expect(normalizeOrigin('confusao')).toBe('confusao');
    const record = normalizeErrorRecord({ id: 'x', subjectId: 's', topicId: 't', description: 'd', priority: 'Média' });
    expect(record).toMatchObject({ origin: null, priority: 'media' });
  });
});
