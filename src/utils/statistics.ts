import type { ErrorRecord, OriginId, Priority, ReviewEntry, Subject, Topic } from '@/types';
import { ORIGIN_ORDER, ORIGINS } from '@/constants/origins';
import { PRIORITIES, PRIORITY_ORDER } from '@/constants/priorities';

export interface Overview {
  total: number;
  subjects: number;
  topics: number;
  alta: number;
  media: number;
  superado: number;
  pending: number;
  /** Percentual (0–100) de erros superados, arredondado a 1 casa. */
  superadoPct: number;
  reviews: number;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function computeOverview(
  errors: ErrorRecord[],
  subjects: Subject[],
  topics: Topic[] = [],
  reviews: ReviewEntry[] = [],
): Overview {
  const counts = countByPriority(errors);
  return {
    total: errors.length,
    subjects: subjects.length,
    topics: topics.length,
    alta: counts.alta,
    media: counts.media,
    superado: counts.superado,
    pending: counts.alta + counts.media,
    superadoPct: percent(counts.superado, errors.length),
    reviews: reviews.length,
  };
}

export function countByPriority(errors: ErrorRecord[]): Record<Priority, number> {
  const result: Record<Priority, number> = { alta: 0, media: 0, superado: 0 };
  for (const e of errors) result[e.priority] += 1;
  return result;
}

export interface PrioritySlice {
  id: Priority;
  label: string;
  value: number;
  color: string;
  pct: number;
}

export function priorityDistribution(errors: ErrorRecord[]): PrioritySlice[] {
  const counts = countByPriority(errors);
  return PRIORITY_ORDER.map((id) => ({
    id,
    label: PRIORITIES[id].label,
    value: counts[id],
    color: PRIORITIES[id].color,
    pct: percent(counts[id], errors.length),
  }));
}

export interface GroupCount {
  id: string;
  name: string;
  subjectName?: string;
  total: number;
  alta: number;
  media: number;
  superado: number;
  pending: number;
}

function emptyGroup(id: string, name: string, subjectName?: string): GroupCount {
  return { id, name, subjectName, total: 0, alta: 0, media: 0, superado: 0, pending: 0 };
}

function addTo(group: GroupCount, e: ErrorRecord) {
  group.total += 1;
  group[e.priority] += 1;
  if (e.priority !== 'superado') group.pending += 1;
}

/** Contagem por matéria, ordenada pelo total (desc). Inclui matérias sem registros. */
export function countBySubject(errors: ErrorRecord[], subjects: Subject[]): GroupCount[] {
  const map = new Map<string, GroupCount>();
  for (const s of subjects) map.set(s.id, emptyGroup(s.id, s.name));
  for (const e of errors) {
    let group = map.get(e.subjectId);
    if (!group) {
      group = emptyGroup(e.subjectId, 'Matéria removida');
      map.set(e.subjectId, group);
    }
    addTo(group, e);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
}

export function countByTopic(errors: ErrorRecord[], topics: Topic[], subjects: Subject[]): GroupCount[] {
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));
  const map = new Map<string, GroupCount>();
  for (const t of topics) map.set(t.id, emptyGroup(t.id, t.name, subjectNames.get(t.subjectId)));
  for (const e of errors) {
    let group = map.get(e.topicId);
    if (!group) {
      group = emptyGroup(e.topicId, 'Tópico removido', subjectNames.get(e.subjectId));
      map.set(e.topicId, group);
    }
    addTo(group, e);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Ranking de dificuldades: grupos com erros ainda não superados,
 * ordenados por pendências (prioridade alta pesa mais).
 */
export function rankDifficulties(groups: GroupCount[], limit = 5): GroupCount[] {
  return groups
    .filter((g) => g.pending > 0)
    .sort((a, b) => b.alta * 2 + b.media - (a.alta * 2 + a.media) || b.alta - a.alta || b.pending - a.pending)
    .slice(0, limit);
}

export interface OriginStat {
  id: OriginId;
  label: string;
  color: string;
  count: number;
  /** Percentual em relação ao total de registros classificados. */
  pct: number;
  pending: number;
  superado: number;
}

export interface OriginAnalysis {
  stats: OriginStat[];
  classified: number;
  unclassified: number;
  /** Origens mais frequentes (mais de uma em caso de empate). Vazio se não houver dados. */
  mostFrequent: OriginStat[];
}

export function analyzeOrigins(errors: ErrorRecord[]): OriginAnalysis {
  const counts = new Map<OriginId, { count: number; pending: number; superado: number }>();
  for (const id of ORIGIN_ORDER) counts.set(id, { count: 0, pending: 0, superado: 0 });
  let unclassified = 0;
  for (const e of errors) {
    if (!e.origin) {
      unclassified += 1;
      continue;
    }
    const c = counts.get(e.origin);
    if (!c) {
      unclassified += 1;
      continue;
    }
    c.count += 1;
    if (e.priority === 'superado') c.superado += 1;
    else c.pending += 1;
  }
  const classified = errors.length - unclassified;
  const stats: OriginStat[] = ORIGIN_ORDER.map((id) => {
    const c = counts.get(id)!;
    return {
      id,
      label: ORIGINS[id].label,
      color: ORIGINS[id].color,
      count: c.count,
      pct: percent(c.count, classified),
      pending: c.pending,
      superado: c.superado,
    };
  });
  const max = Math.max(0, ...stats.map((s) => s.count));
  const mostFrequent = max > 0 ? stats.filter((s) => s.count === max) : [];
  return { stats, classified, unclassified, mostFrequent };
}

export type Granularity = 'day' | 'week' | 'month';

export interface TimelinePoint {
  key: string;
  label: string;
  /** Erros registrados no período. */
  created: number;
  /** Erros superados no período (pela data em que foram superados). */
  resolved: number;
  /** Total acumulado de dificuldades identificadas. */
  cumulativeCreated: number;
  /** Total acumulado de dificuldades superadas. */
  cumulativeResolved: number;
}

function startOfBucket(date: Date, granularity: Granularity): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (granularity === 'week') {
    const weekday = (d.getDay() + 6) % 7; // segunda-feira = 0
    d.setDate(d.getDate() - weekday);
  } else if (granularity === 'month') {
    d.setDate(1);
  }
  return d;
}

function nextBucket(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  if (granularity === 'day') d.setDate(d.getDate() + 1);
  else if (granularity === 'week') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function bucketLabel(d: Date, granularity: Granularity): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (granularity === 'month') return `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
  return `${dd}/${mm}`;
}

function bucketKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Escolhe a granularidade conforme a extensão do período. */
export function autoGranularity(errors: ErrorRecord[], now = new Date()): Granularity {
  if (errors.length === 0) return 'day';
  const first = Math.min(...errors.map((e) => new Date(e.createdAt).getTime()));
  const days = (now.getTime() - first) / 86_400_000;
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

/** Série temporal de dificuldades identificadas e superadas. */
export function buildTimeline(
  errors: ErrorRecord[],
  granularity: Granularity = autoGranularity(errors),
  now = new Date(),
): TimelinePoint[] {
  if (errors.length === 0) return [];
  const created = new Map<string, number>();
  const resolved = new Map<string, number>();
  let first = now;
  for (const e of errors) {
    const c = new Date(e.createdAt);
    if (c < first) first = c;
    const ck = bucketKey(startOfBucket(c, granularity));
    created.set(ck, (created.get(ck) ?? 0) + 1);
    if (e.priority === 'superado' && e.resolvedAt) {
      const r = new Date(e.resolvedAt);
      const rk = bucketKey(startOfBucket(r, granularity));
      resolved.set(rk, (resolved.get(rk) ?? 0) + 1);
    }
  }
  const points: TimelinePoint[] = [];
  let cursor = startOfBucket(first, granularity);
  const end = startOfBucket(now, granularity);
  let cumC = 0;
  let cumR = 0;
  let guard = 0;
  while (cursor <= end && guard < 1000) {
    const key = bucketKey(cursor);
    const c = created.get(key) ?? 0;
    const r = resolved.get(key) ?? 0;
    cumC += c;
    cumR += r;
    points.push({
      key,
      label: bucketLabel(cursor, granularity),
      created: c,
      resolved: r,
      cumulativeCreated: cumC,
      cumulativeResolved: cumR,
    });
    cursor = nextBucket(cursor, granularity);
    guard += 1;
  }
  return points;
}

/** Erros pendentes (não superados) ordenados para revisão: alta primeiro, depois os mais antigos sem revisão. */
export function buildReviewQueue(errors: ErrorRecord[]): ErrorRecord[] {
  const weight: Record<Priority, number> = { alta: 0, media: 1, superado: 2 };
  return errors
    .filter((e) => e.priority !== 'superado')
    .sort(
      (a, b) =>
        weight[a.priority] - weight[b.priority] ||
        lastTouch(a).localeCompare(lastTouch(b)),
    );
}

/** Data de referência para "tempo sem revisão": última revisão ou, se nunca revisado, o cadastro. */
export function lastTouch(e: ErrorRecord): string {
  return e.lastReviewedAt ?? e.createdAt;
}

/** Erros pendentes há mais tempo sem revisão. */
export function staleErrors(errors: ErrorRecord[], limit = 5): ErrorRecord[] {
  return errors
    .filter((e) => e.priority !== 'superado')
    .sort((a, b) => lastTouch(a).localeCompare(lastTouch(b)))
    .slice(0, limit);
}

export function recentErrors(errors: ErrorRecord[], limit = 5): ErrorRecord[] {
  return [...errors].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
