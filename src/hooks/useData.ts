import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import type { ErrorRecord, HistoryEntry, ReviewEntry, Subject, Topic } from '@/types';
import { buildLookup, type LookupMaps } from '@/utils/filters';
import { SETTING_KEYS } from '@/services/settingsService';

const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

/** Consultas reativas: atualizam automaticamente quando o banco muda. */
export function useSubjects(): Subject[] | undefined {
  return useLiveQuery(async () => byName(await db.subjects.toArray()), []);
}

export function useTopics(): Topic[] | undefined {
  return useLiveQuery(async () => byName(await db.topics.toArray()), []);
}

export function useErrors(): ErrorRecord[] | undefined {
  return useLiveQuery(() => db.errors.toArray(), []);
}

export function useReviews(): ReviewEntry[] | undefined {
  return useLiveQuery(() => db.reviews.toArray(), []);
}

/** `null` quando o registro não existe; `undefined` enquanto carrega. */
export function useErrorRecord(id: string | undefined): ErrorRecord | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.errors.get(id)) ?? null) : null), [id]);
}

export function useErrorHistory(id: string | undefined): HistoryEntry[] | undefined {
  return useLiveQuery(
    async () => (id ? (await db.history.where('errorId').equals(id).toArray()).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : []),
    [id],
  );
}

export interface Catalog {
  subjects: Subject[];
  topics: Topic[];
  lookup: LookupMaps;
  loading: boolean;
}

export function useCatalog(): Catalog {
  const subjects = useSubjects();
  const topics = useTopics();
  return useMemo(
    () => ({
      subjects: subjects ?? [],
      topics: topics ?? [],
      lookup: buildLookup(subjects ?? [], topics ?? []),
      loading: subjects === undefined || topics === undefined,
    }),
    [subjects, topics],
  );
}

export interface AppData extends Catalog {
  errors: ErrorRecord[];
  reviews: ReviewEntry[];
}

export function useAppData(): AppData {
  const catalog = useCatalog();
  const errors = useErrors();
  const reviews = useReviews();
  return useMemo(
    () => ({
      ...catalog,
      errors: errors ?? [],
      reviews: reviews ?? [],
      loading: catalog.loading || errors === undefined || reviews === undefined,
    }),
    [catalog, errors, reviews],
  );
}

export function useAvatarPhoto(): string | null {
  const value = useLiveQuery(async () => (await db.settings.get(SETTING_KEYS.avatarPhoto))?.value as string | undefined, []);
  return value ?? null;
}

export function usePendingCount(): number {
  return useLiveQuery(() => db.pendingChanges.count(), []) ?? 0;
}
