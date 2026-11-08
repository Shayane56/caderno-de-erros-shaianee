import type { ErrorFilters, ErrorRecord, OriginFilterValue, Priority, Subject, Topic } from '@/types';
import { UNCLASSIFIED } from '@/types';
import { isPriority } from '@/constants/priorities';
import { isOriginId } from '@/constants/origins';
import { normalizeText, tokenizeSearch } from './text';
import { toLocalDateKey } from './dates';

export function emptyFilters(): ErrorFilters {
  return { search: '', subjectId: '', topicId: '', priorities: [], origins: [], dateFrom: '', dateTo: '' };
}

export function countActiveFilters(f: ErrorFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.subjectId) n++;
  if (f.topicId) n++;
  if (f.priorities.length) n++;
  if (f.origins.length) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

export interface LookupMaps {
  subjects: Map<string, Subject>;
  topics: Map<string, Topic>;
}

export function buildLookup(subjects: Subject[], topics: Topic[]): LookupMaps {
  return {
    subjects: new Map(subjects.map((s) => [s.id, s])),
    topics: new Map(topics.map((t) => [t.id, t])),
  };
}

/** Texto pesquisável: descrição, correção, como evitar, tópico, matéria, observações e referência. */
export function searchableText(e: ErrorRecord, lookup: LookupMaps): string {
  return normalizeText(
    [
      e.description,
      e.correction,
      e.prevention,
      e.notes,
      e.reference,
      lookup.topics.get(e.topicId)?.name ?? '',
      lookup.subjects.get(e.subjectId)?.name ?? '',
    ].join(' \n '),
  );
}

/** Todos os termos (ou expressões entre aspas) precisam estar presentes. */
export function matchesSearch(e: ErrorRecord, query: string, lookup: LookupMaps): boolean {
  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return true;
  const haystack = searchableText(e, lookup);
  return tokens.every((t) => haystack.includes(t));
}

/** Aplica todos os filtros simultaneamente (lógica E entre filtros; OU dentro de cada grupo). */
export function applyFilters(errors: ErrorRecord[], filters: ErrorFilters, lookup: LookupMaps): ErrorRecord[] {
  return errors.filter((e) => {
    if (filters.subjectId && e.subjectId !== filters.subjectId) return false;
    if (filters.topicId && e.topicId !== filters.topicId) return false;
    if (filters.priorities.length && !filters.priorities.includes(e.priority)) return false;
    if (filters.origins.length) {
      const value: OriginFilterValue = e.origin ?? UNCLASSIFIED;
      if (!filters.origins.includes(value)) return false;
    }
    if (filters.dateFrom || filters.dateTo) {
      const day = toLocalDateKey(e.createdAt);
      if (filters.dateFrom && day < filters.dateFrom) return false;
      if (filters.dateTo && day > filters.dateTo) return false;
    }
    if (filters.search.trim() && !matchesSearch(e, filters.search, lookup)) return false;
    return true;
  });
}

export interface TopicGroup {
  topic: Topic;
  records: ErrorRecord[];
}

export interface SubjectGroup {
  subject: Subject;
  total: number;
  pending: number;
  topics: TopicGroup[];
}

/** Organiza os registros hierarquicamente: MATÉRIA → TÓPICO → REGISTROS. */
export function groupHierarchy(errors: ErrorRecord[], lookup: LookupMaps): SubjectGroup[] {
  const bySubject = new Map<string, Map<string, ErrorRecord[]>>();
  for (const e of errors) {
    let topics = bySubject.get(e.subjectId);
    if (!topics) {
      topics = new Map();
      bySubject.set(e.subjectId, topics);
    }
    const list = topics.get(e.topicId) ?? [];
    list.push(e);
    topics.set(e.topicId, list);
  }
  const groups: SubjectGroup[] = [];
  for (const [subjectId, topics] of bySubject) {
    const subject: Subject = lookup.subjects.get(subjectId) ?? {
      id: subjectId,
      name: 'Matéria removida',
      createdAt: '',
      updatedAt: '',
    };
    const topicGroups: TopicGroup[] = [];
    let total = 0;
    let pending = 0;
    for (const [topicId, records] of topics) {
      const topic: Topic = lookup.topics.get(topicId) ?? {
        id: topicId,
        subjectId,
        name: 'Tópico removido',
        createdAt: '',
        updatedAt: '',
      };
      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      total += records.length;
      pending += records.filter((r) => r.priority !== 'superado').length;
      topicGroups.push({ topic, records });
    }
    topicGroups.sort((a, b) => a.topic.name.localeCompare(b.topic.name, 'pt-BR'));
    groups.push({ subject, total, pending, topics: topicGroups });
  }
  return groups.sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'pt-BR'));
}

/* ---------- Sincronização dos filtros com a URL ---------- */

export function filtersFromSearchParams(params: URLSearchParams): ErrorFilters {
  const priorities = (params.get('prioridade') ?? '')
    .split(',')
    .filter(isPriority) as Priority[];
  const origins = (params.get('origem') ?? '')
    .split(',')
    .filter((o): o is OriginFilterValue => isOriginId(o) || o === UNCLASSIFIED);
  return {
    search: params.get('q') ?? '',
    subjectId: params.get('materia') ?? '',
    topicId: params.get('topico') ?? '',
    priorities,
    origins,
    dateFrom: params.get('de') ?? '',
    dateTo: params.get('ate') ?? '',
  };
}

export function filtersToSearchParams(f: ErrorFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.search) params.set('q', f.search);
  if (f.subjectId) params.set('materia', f.subjectId);
  if (f.topicId) params.set('topico', f.topicId);
  if (f.priorities.length) params.set('prioridade', f.priorities.join(','));
  if (f.origins.length) params.set('origem', f.origins.join(','));
  if (f.dateFrom) params.set('de', f.dateFrom);
  if (f.dateTo) params.set('ate', f.dateTo);
  return params;
}
