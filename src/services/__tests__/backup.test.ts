import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import {
  analyzeImport,
  BackupParseError,
  exportBackup,
  importBackup,
  parseBackupText,
  restoreSnapshot,
} from '@/services/backupService';
import { registerReview } from '@/services/errorService';
import { createSubject } from '@/services/subjectService';
import { seedError } from '@/test/factories';

async function exportedText() {
  const { content } = await exportBackup();
  return content;
}

describe('exportação JSON', () => {
  it('inclui matérias, tópicos, erros, origens, prioridades, datas e históricos', async () => {
    const { record, subject, topic } = await seedError({ origin: 'esquecimento', priority: 'media' });
    await registerReview(record.id, 'superado');
    const { content, fileName, file } = await exportBackup();
    expect(fileName).toMatch(/^caderno-de-erros-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    const json = JSON.parse(content);
    expect(json.app).toBe('caderno-de-erros');
    expect(json.formatVersion).toBe(2);
    expect(json.subjects[0]).toMatchObject({ id: subject.id, name: subject.name });
    expect(json.topics[0]).toMatchObject({ id: topic.id, subjectId: subject.id });
    expect(json.errors[0]).toMatchObject({ id: record.id, origin: 'esquecimento', priority: 'superado' });
    expect(json.errors[0].createdAt).toBe(record.createdAt);
    expect(json.history.length).toBeGreaterThanOrEqual(2);
    expect(json.reviews).toHaveLength(1);
    expect(file.exportedAt).toBeTruthy();
  });
});

describe('importação JSON', () => {
  it('mesclar preserva registros existentes e ignora duplicações', async () => {
    await seedError();
    const text = await exportedText();
    const parsed = parseBackupText(text);
    const plan = await analyzeImport(parsed, 'merge');
    expect(plan.errors).toEqual({ new: 0, updated: 0, duplicates: 1 });
    expect(plan.subjects.duplicates).toBe(1);
    await importBackup(parsed, 'merge');
    expect(await db.errors.count()).toBe(1);
    expect(await db.subjects.count()).toBe(1);
  });

  it('mesclar adiciona novos registros e unifica matérias com o mesmo nome', async () => {
    const { record } = await seedError();
    const text = await exportedText();
    // Simula outro aparelho: limpa e cria a mesma matéria com outro id.
    await db.delete();
    await db.open();
    await createSubject('direito administrativo');
    const parsed = parseBackupText(text);
    const result = await importBackup(parsed, 'merge');
    expect(result.plan.subjects.duplicates).toBe(1);
    expect(await db.subjects.count()).toBe(1);
    const errors = await db.errors.toArray();
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe(record.id);
    const subject = (await db.subjects.toArray())[0];
    expect(errors[0].subjectId).toBe(subject.id);
    const history = await db.history.where('errorId').equals(record.id).toArray();
    expect(history.some((h) => h.type === 'imported')).toBe(true);
  });

  it('substituir troca os dados e cria ponto de restauração recuperável', async () => {
    await seedError({}, ['Matemática', 'Frações']);
    const backupText = await exportedText();
    await seedError({}, ['Física', 'Cinemática']);
    expect(await db.errors.count()).toBe(2);

    const parsed = parseBackupText(backupText);
    const plan = await analyzeImport(parsed, 'replace');
    expect(plan.toRemove.errors).toBe(2);
    const result = await importBackup(parsed, 'replace');
    expect(result.snapshotCreated).toBe(true);
    expect(await db.errors.count()).toBe(1);
    expect((await db.subjects.toArray()).map((s) => s.name)).toEqual(['Matemática']);

    const [snapshot] = await db.snapshots.toArray();
    await restoreSnapshot(snapshot.id);
    expect(await db.errors.count()).toBe(2);
  });
});

describe('tratamento de dados inválidos', () => {
  it('rejeita arquivos que não são JSON ou não são backups do caderno', () => {
    expect(() => parseBackupText('isto não é json')).toThrow(BackupParseError);
    expect(() => parseBackupText('[]')).toThrow(/estrutura/i);
    expect(() => parseBackupText(JSON.stringify({ app: 'outro-app', subjects: [], topics: [], errors: [] }))).toThrow(
      /não é um backup/,
    );
    expect(() => parseBackupText(JSON.stringify({ subjects: [], topics: [] }))).toThrow(/errors/);
    expect(() =>
      parseBackupText(JSON.stringify({ app: 'caderno-de-erros', formatVersion: 99, subjects: [], topics: [], errors: [] })),
    ).toThrow(/versão mais nova/);
  });

  it('separa registros inválidos e importa apenas os válidos', () => {
    const parsed = parseBackupText(
      JSON.stringify({
        app: 'caderno-de-erros',
        formatVersion: 2,
        subjects: [{ id: 's1', name: 'Português' }, { name: 'Sem id' }],
        topics: [
          { id: 't1', subjectId: 's1', name: 'Crase' },
          { id: 't2', subjectId: 'nao-existe', name: 'Órfão' },
        ],
        errors: [
          { id: 'e1', subjectId: 's1', topicId: 't1', description: 'Crase antes de verbo', priority: 'alta', origin: 'esquecimento' },
          { id: 'e2', subjectId: 's1', topicId: 't1', description: '', priority: 'alta' },
          { id: 'e3', subjectId: 's1', topicId: 't1', description: 'Prioridade estranha', priority: 'urgente' },
          { id: 'e4', subjectId: 's1', topicId: 't2', description: 'Tópico inválido', priority: 'media' },
          'lixo',
        ],
        history: [{ id: 'h1', errorId: 'e2', type: 'created', timestamp: '2024-01-01T00:00:00.000Z' }],
      }),
    );
    expect(parsed.data.subjects).toHaveLength(1);
    expect(parsed.data.topics).toHaveLength(1);
    expect(parsed.data.errors.map((e) => e.id)).toEqual(['e1']);
    expect(parsed.invalid.map((i) => i.entity)).toEqual(['subjects', 'topics', 'errors', 'errors', 'errors', 'errors', 'history']);
    expect(parsed.invalid.find((i) => i.index === 2 && i.entity === 'errors')!.reason).toMatch(/prioridade/);
  });
});

describe('migração de backups antigos sem origem', () => {
  it('importa registros sem origem como "Não classificado" sem atribuir categoria', async () => {
    const legacy = {
      subjects: [{ id: 's1', name: 'Direito Penal', createdAt: '2023-05-01T10:00:00.000Z' }],
      topics: [{ id: 't1', subjectId: 's1', name: 'Dolo e culpa' }],
      errors: [
        {
          id: 'old-1',
          subjectId: 's1',
          topicId: 't1',
          description: 'Confundi dolo eventual com culpa consciente',
          correction: 'No dolo eventual o agente assume o risco.',
          priority: 'alta',
          createdAt: '2023-05-02T10:00:00.000Z',
        },
      ],
    };
    const parsed = parseBackupText(JSON.stringify(legacy));
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.unclassified).toBe(1);
    expect(parsed.warnings.join(' ')).toMatch(/Não classificado/);
    await importBackup(parsed, 'merge');
    const stored = await db.errors.get('old-1');
    expect(stored).toMatchObject({ origin: null, priority: 'alta', prevention: '', reviewCount: 0 });
    expect(stored!.createdAt).toBe('2023-05-02T10:00:00.000Z');
  });
});
