import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { runSync, mergeDuplicateNames } from '@/services/sync/syncEngine';
import { changePriority, deleteError } from '@/services/errorService';
import { createSubject } from '@/services/subjectService';
import { seedError } from '@/test/factories';
import { MemoryRemote } from './memoryAdapter';

const USER = 'user-1';

describe('sincronização', () => {
  it('envia todos os dados locais na primeira sincronização e limpa as pendências', async () => {
    const { record } = await seedError();
    const remote = new MemoryRemote();
    const result = await runSync(remote.adapter(), USER);
    expect(result.pushed).toBeGreaterThanOrEqual(4); // matéria, tópico, erro, histórico
    expect(remote.rows.get(`errors:${record.id}`)?.data).toMatchObject({ id: record.id });
    expect(await db.pendingChanges.count()).toBe(0);
  });

  it('recebe alterações de outro dispositivo e aplica "a última alteração vence"', async () => {
    const { record } = await seedError();
    const remote = new MemoryRemote();
    await runSync(remote.adapter(), USER);

    // Outro aparelho alterou o registro depois.
    const later = new Date(Date.now() + 60_000).toISOString();
    remote.write({
      entity: 'errors',
      id: record.id,
      data: { ...record, priority: 'superado', resolvedAt: later, updatedAt: later },
      updated_at: later,
      deleted: false,
    });
    const result = await runSync(remote.adapter(), USER);
    expect(result.applied).toBe(1);
    expect((await db.errors.get(record.id))!.priority).toBe('superado');
  });

  it('mantém a versão local quando ela é mais recente (conflito)', async () => {
    const { record } = await seedError();
    const remote = new MemoryRemote();
    await runSync(remote.adapter(), USER);
    const older = new Date(Date.parse(record.updatedAt) - 60_000).toISOString();
    remote.rows.set(`errors:${record.id}`, {
      entity: 'errors',
      id: record.id,
      data: { ...record, description: 'versão antiga', updatedAt: older },
      updated_at: older,
      deleted: false,
      server_updated_at: new Date(remote.clock + 5000).toISOString(),
    });
    remote.clock += 5000;
    await changePriority(record.id, 'media');
    await runSync(remote.adapter(), USER);
    const local = await db.errors.get(record.id);
    expect(local!.description).not.toBe('versão antiga');
    expect(local!.priority).toBe('media');
    expect((remote.rows.get(`errors:${record.id}`)!.data as { priority: string }).priority).toBe('media');
  });

  it('propaga exclusões', async () => {
    const { record } = await seedError();
    const remote = new MemoryRemote();
    await runSync(remote.adapter(), USER);
    await deleteError(record.id);
    await runSync(remote.adapter(), USER);
    expect(remote.rows.get(`errors:${record.id}`)).toMatchObject({ deleted: true, data: null });
  });

  it('em caso de falha de conexão mantém as pendências para a próxima tentativa', async () => {
    await seedError();
    const remote = new MemoryRemote();
    remote.failNextPush = true;
    await expect(runSync(remote.adapter(), USER)).rejects.toThrow(/conexão/);
    expect(await db.pendingChanges.count()).toBeGreaterThan(0);
    await runSync(remote.adapter(), USER);
    expect(await db.pendingChanges.count()).toBe(0);
  });

  it('unifica matérias com o mesmo nome criadas em dispositivos diferentes', async () => {
    const { subject, record } = await seedError();
    // Matéria homônima vinda de outro aparelho, criada depois.
    const twin = await createSubject('Temporária');
    await db.subjects.put({ ...twin, name: 'direito administrativo', createdAt: new Date(Date.now() + 1000).toISOString() });
    await db.errors.put({ ...record, id: 'outro', subjectId: twin.id });
    const merged = await mergeDuplicateNames();
    expect(merged).toBe(1);
    expect(await db.subjects.count()).toBe(1);
    expect((await db.errors.get('outro'))!.subjectId).toBe(subject.id);
  });
});
