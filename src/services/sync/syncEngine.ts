import { db } from '@/database/db';
import { entityKey, trackChange, trackDeletion } from '@/database/changeTracker';
import { normalizeErrorRecord, normalizePriority } from '@/database/migrations';
import type { EntityName, ErrorRecord, HistoryEntry, ReviewEntry, Subject, Topic } from '@/types';
import { isValidIsoDate } from '@/utils/dates';
import { cleanName, normalizeText } from '@/utils/text';
import { nowIso } from '@/utils/ids';
import { getSetting, setSetting } from '../settingsService';
import type { RemoteAdapter, RemoteRow, SyncResult, SyncState } from './types';

const SYNC_STATE_KEY = 'sync-state';
const PUSH_BATCH = 400;
/** Margem de segurança ao puxar alterações (compensa transações concorrentes no servidor). */
const PULL_OVERLAP_MS = 60_000;

type AnyRecord = Subject | Topic | ErrorRecord | HistoryEntry | ReviewEntry;

function table(entity: EntityName) {
  switch (entity) {
    case 'subjects':
      return db.subjects;
    case 'topics':
      return db.topics;
    case 'errors':
      return db.errors;
    case 'history':
      return db.history;
    case 'reviews':
      return db.reviews;
  }
}

/** Data de modificação usada no controle de conflitos. */
export function recordTimestamp(entity: EntityName, record: AnyRecord): string {
  if (entity === 'history') return (record as HistoryEntry).timestamp;
  if (entity === 'reviews') return (record as ReviewEntry).reviewedAt;
  return (record as Subject).updatedAt;
}

/** Valida dados vindos do servidor antes de gravá-los localmente. */
export function sanitizeRemote(entity: EntityName, data: unknown): AnyRecord | null {
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  switch (entity) {
    case 'subjects': {
      const name = cleanName(String(r.name ?? ''));
      if (!name || !isValidIsoDate(r.updatedAt)) return null;
      return { id, name, createdAt: isValidIsoDate(r.createdAt) ? r.createdAt : r.updatedAt, updatedAt: r.updatedAt };
    }
    case 'topics': {
      const name = cleanName(String(r.name ?? ''));
      if (!name || typeof r.subjectId !== 'string' || !isValidIsoDate(r.updatedAt)) return null;
      return {
        id,
        subjectId: r.subjectId,
        name,
        createdAt: isValidIsoDate(r.createdAt) ? r.createdAt : r.updatedAt,
        updatedAt: r.updatedAt,
      };
    }
    case 'errors':
      return normalizeErrorRecord(r);
    case 'history':
      if (typeof r.errorId !== 'string' || !isValidIsoDate(r.timestamp) || typeof r.type !== 'string') return null;
      return r as unknown as HistoryEntry;
    case 'reviews': {
      const before = normalizePriority(r.priorityBefore);
      const after = normalizePriority(r.priorityAfter);
      if (typeof r.errorId !== 'string' || !isValidIsoDate(r.reviewedAt) || !before || !after) return null;
      return { id, errorId: r.errorId, reviewedAt: r.reviewedAt, priorityBefore: before, priorityAfter: after };
    }
  }
}

export async function loadSyncState(userId: string): Promise<SyncState> {
  const state = await getSetting<SyncState>(SYNC_STATE_KEY);
  if (state && state.userId === userId) return state;
  return { userId, cursor: null, lastSyncedAt: null, bootstrapped: false };
}

async function saveSyncState(state: SyncState): Promise<void> {
  await setSetting(SYNC_STATE_KEY, state);
}

export async function clearSyncState(): Promise<void> {
  await db.settings.delete(SYNC_STATE_KEY);
}

/** Marca todos os dados locais como pendentes (primeira sincronização de uma conta). */
async function markEverythingPending(): Promise<void> {
  await db.transaction('rw', [db.subjects, db.topics, db.errors, db.history, db.reviews, db.tombstones, db.pendingChanges], async () => {
    const entities: EntityName[] = ['subjects', 'topics', 'errors', 'history', 'reviews'];
    for (const entity of entities) {
      const records = (await table(entity).toArray()) as AnyRecord[];
      for (const r of records) await trackChange(entity, r.id, recordTimestamp(entity, r));
    }
    const tombs = await db.tombstones.toArray();
    for (const t of tombs) await db.pendingChanges.put({ key: t.key, entity: t.entity, entityId: t.entityId, changedAt: t.deletedAt });
  });
}

/** Aplica alterações remotas usando "a última alteração vence". Retorna quantas foram aplicadas. */
export async function applyRemoteRows(rows: RemoteRow[]): Promise<number> {
  let applied = 0;
  await db.transaction('rw', [db.subjects, db.topics, db.errors, db.history, db.reviews, db.tombstones, db.pendingChanges], async () => {
    for (const row of rows) {
      const key = entityKey(row.entity, row.id);
      const t = table(row.entity);
      const local = (await t.get(row.id)) as AnyRecord | undefined;
      const tomb = await db.tombstones.get(key);
      const localStamp = local ? recordTimestamp(row.entity, local) : (tomb?.deletedAt ?? null);
      if (localStamp && localStamp >= row.updated_at) continue; // versão local é igual ou mais nova

      if (row.deleted) {
        if (local) await t.delete(row.id);
        await db.tombstones.put({ key, entity: row.entity, entityId: row.id, deletedAt: row.updated_at });
      } else {
        const clean = sanitizeRemote(row.entity, row.data);
        if (!clean) continue;
        // `put` com tipo amplo: cada tabela recebe apenas o seu próprio tipo de registro.
        await (t as unknown as { put(v: AnyRecord): Promise<unknown> }).put(clean);
        if (tomb) await db.tombstones.delete(key);
      }
      const pending = await db.pendingChanges.get(key);
      if (pending && pending.changedAt <= row.updated_at) await db.pendingChanges.delete(key);
      applied++;
    }
  });
  return applied;
}

/**
 * Resolve duplicidades criadas em dispositivos diferentes (mesma matéria ou tópico
 * criado offline em dois aparelhos). Mantém o mais antigo — critério determinístico,
 * para que todos os dispositivos cheguem ao mesmo resultado.
 */
export async function mergeDuplicateNames(): Promise<number> {
  let merged = 0;
  await db.transaction('rw', [db.subjects, db.topics, db.errors, db.tombstones, db.pendingChanges], async () => {
    const now = nowIso();
    const pickKeeper = <T extends { createdAt: string; id: string }>(list: T[]) =>
      [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];

    const subjects = await db.subjects.toArray();
    const byName = new Map<string, Subject[]>();
    for (const s of subjects) byName.set(normalizeText(s.name), [...(byName.get(normalizeText(s.name)) ?? []), s]);
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      const keeper = pickKeeper(group);
      for (const dup of group) {
        if (dup.id === keeper.id) continue;
        const topics = await db.topics.where('subjectId').equals(dup.id).toArray();
        for (const topic of topics) {
          await db.topics.put({ ...topic, subjectId: keeper.id, updatedAt: now });
          await trackChange('topics', topic.id, now);
        }
        const errors = await db.errors.where('subjectId').equals(dup.id).toArray();
        for (const e of errors) {
          await db.errors.put({ ...e, subjectId: keeper.id, updatedAt: now });
          await trackChange('errors', e.id, now);
        }
        await db.subjects.delete(dup.id);
        await trackDeletion('subjects', dup.id, now);
        merged++;
      }
    }

    const topics = await db.topics.toArray();
    const byTopic = new Map<string, Topic[]>();
    for (const t of topics) {
      const k = `${t.subjectId}::${normalizeText(t.name)}`;
      byTopic.set(k, [...(byTopic.get(k) ?? []), t]);
    }
    for (const group of byTopic.values()) {
      if (group.length < 2) continue;
      const keeper = pickKeeper(group);
      for (const dup of group) {
        if (dup.id === keeper.id) continue;
        const errors = await db.errors.where('topicId').equals(dup.id).toArray();
        for (const e of errors) {
          await db.errors.put({ ...e, topicId: keeper.id, subjectId: keeper.subjectId, updatedAt: now });
          await trackChange('errors', e.id, now);
        }
        await db.topics.delete(dup.id);
        await trackDeletion('topics', dup.id, now);
        merged++;
      }
    }
  });
  return merged;
}

/** Monta as linhas a enviar a partir das alterações pendentes. */
export async function collectPendingRows(): Promise<{ rows: RemoteRow[]; stamps: Map<string, string> }> {
  const pending = await db.pendingChanges.toArray();
  const rows: RemoteRow[] = [];
  const stamps = new Map<string, string>();
  for (const p of pending) {
    const record = (await table(p.entity).get(p.entityId)) as AnyRecord | undefined;
    stamps.set(p.key, p.changedAt);
    if (record) {
      rows.push({ entity: p.entity, id: p.entityId, data: record, updated_at: recordTimestamp(p.entity, record), deleted: false });
    } else {
      const tomb = await db.tombstones.get(p.key);
      rows.push({ entity: p.entity, id: p.entityId, data: null, updated_at: tomb?.deletedAt ?? p.changedAt, deleted: true });
    }
  }
  return { rows, stamps };
}

/** Executa um ciclo completo: receber → aplicar → resolver duplicidades → enviar. */
export async function runSync(adapter: RemoteAdapter, userId: string): Promise<SyncResult> {
  const state = await loadSyncState(userId);
  if (!state.bootstrapped) await markEverythingPending();

  const since = state.cursor ? new Date(new Date(state.cursor).getTime() - PULL_OVERLAP_MS).toISOString() : null;
  const pulled = await adapter.pull(since);
  const applied = await applyRemoteRows(pulled.rows);
  const merged = await mergeDuplicateNames();

  const { rows, stamps } = await collectPendingRows();
  for (let i = 0; i < rows.length; i += PUSH_BATCH) {
    await adapter.push(rows.slice(i, i + PUSH_BATCH));
  }
  // Remove apenas as pendências que não mudaram durante o envio.
  await db.transaction('rw', db.pendingChanges, async () => {
    for (const [key, stamp] of stamps) {
      const current = await db.pendingChanges.get(key);
      if (current && current.changedAt === stamp) await db.pendingChanges.delete(key);
    }
  });

  const finishedAt = nowIso();
  const cursor = [state.cursor, pulled.cursor].filter((c): c is string => !!c).sort().pop() ?? null;
  await saveSyncState({ userId, cursor, lastSyncedAt: finishedAt, bootstrapped: true });
  return { pulled: pulled.rows.length, applied, pushed: rows.length, merged, finishedAt };
}
