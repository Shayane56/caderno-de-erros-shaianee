import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import { normalizeErrorRecord, normalizePriority } from '@/database/migrations';
import { APP_FULL_NAME, BACKUP_FORMAT_VERSION } from '@/constants/app';
import type {
  BackupData,
  BackupFile,
  CardReview,
  Deck,
  EntityName,
  Flashcard,
  ErrorRecord,
  HistoryEntry,
  HistoryEventType,
  ReviewEntry,
  Subject,
  Topic,
} from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { cleanName, normalizeText } from '@/utils/text';
import { isValidIsoDate, formatDate } from '@/utils/dates';
import { AppError, NotFoundError } from './errors';
import { completeBackupData, createSnapshot, readAllData } from './snapshotService';
import { normalizeCard, normalizeCardReview, normalizeDeck } from './flashcards/cardModel';
import { writePreference } from './preferences';

export const LAST_BACKUP_PREF = 'last-backup-at';

/* ============================== Exportação ============================== */

export async function buildBackupFile(): Promise<BackupFile> {
  const data = await readAllData();
  return {
    app: 'caderno-de-erros',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: nowIso(),
    owner: APP_FULL_NAME,
    ...data,
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2);
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `caderno-de-erros-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}.json`;
}

/** Gera o JSON completo e registra a data do último backup. */
export async function exportBackup(): Promise<{ fileName: string; content: string; file: BackupFile }> {
  const file = await buildBackupFile();
  const content = serializeBackup(file);
  writePreference(LAST_BACKUP_PREF, file.exportedAt);
  return { fileName: backupFileName(new Date(file.exportedAt)), content, file };
}

/* ============================== Validação ============================== */

export class BackupParseError extends AppError {
  constructor(message: string) {
    super('invalid_backup', message);
    this.name = 'BackupParseError';
  }
}

export interface InvalidItem {
  entity: EntityName;
  index: number;
  reason: string;
}

export interface ParsedBackup {
  formatVersion: number;
  exportedAt: string | null;
  data: BackupData;
  invalid: InvalidItem[];
  warnings: string[];
  /** Registros sem origem (serão "Não classificado"). */
  unclassified: number;
}

type Raw = Record<string, unknown>;

const HISTORY_TYPES: HistoryEventType[] = [
  'created',
  'updated',
  'priority_changed',
  'origin_changed',
  'reviewed',
  'imported',
  'moved',
];

function isObject(v: unknown): v is Raw {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Lê e valida o conteúdo de um arquivo de backup. Erros estruturais graves lançam
 * `BackupParseError`; itens individuais inválidos são listados em `invalid`.
 */
export function parseBackupText(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupParseError('O arquivo selecionado não é um JSON válido.');
  }
  if (!isObject(json)) throw new BackupParseError('A estrutura do arquivo é inválida.');
  if (json.app !== undefined && json.app !== 'caderno-de-erros') {
    throw new BackupParseError('Este arquivo não é um backup do Caderno de Erros.');
  }
  for (const key of ['subjects', 'topics', 'errors'] as const) {
    if (!Array.isArray(json[key])) {
      throw new BackupParseError(`Estrutura inválida: a lista "${key}" está ausente ou corrompida.`);
    }
  }

  const warnings: string[] = [];
  let formatVersion = typeof json.formatVersion === 'number' ? json.formatVersion : 1;
  if (typeof json.formatVersion !== 'number') {
    warnings.push('Arquivo sem versão de formato — tratado como formato antigo (v1).');
    formatVersion = 1;
  }
  if (formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupParseError(
      'Este backup foi gerado por uma versão mais nova do aplicativo. Atualize a aplicação antes de importar.',
    );
  }

  const invalid: InvalidItem[] = [];
  const now = nowIso();

  // ---- Matérias
  const subjects: Subject[] = [];
  const subjectIdMap = new Map<string, string>(); // id no arquivo -> id final (deduplicação)
  const subjectByName = new Map<string, string>();
  (json.subjects as unknown[]).forEach((item, index) => {
    if (!isObject(item) || !str(item.id) || !cleanName(str(item.name))) {
      invalid.push({ entity: 'subjects', index, reason: 'Matéria sem identificador ou nome.' });
      return;
    }
    const id = str(item.id);
    if (subjectIdMap.has(id)) {
      invalid.push({ entity: 'subjects', index, reason: 'Identificador de matéria repetido no arquivo.' });
      return;
    }
    const name = cleanName(str(item.name));
    const key = normalizeText(name);
    const twin = subjectByName.get(key);
    if (twin) {
      subjectIdMap.set(id, twin);
      warnings.push(`Matéria duplicada no arquivo ("${name}") foi unificada.`);
      return;
    }
    const createdAt = isValidIsoDate(item.createdAt) ? item.createdAt : now;
    const updatedAt = isValidIsoDate(item.updatedAt) ? item.updatedAt : createdAt;
    subjects.push({ id, name, createdAt, updatedAt });
    subjectIdMap.set(id, id);
    subjectByName.set(key, id);
  });

  // ---- Tópicos
  const topics: Topic[] = [];
  const topicIdMap = new Map<string, string>();
  const topicByName = new Map<string, string>();
  const topicSubject = new Map<string, string>();
  (json.topics as unknown[]).forEach((item, index) => {
    if (!isObject(item) || !str(item.id) || !cleanName(str(item.name))) {
      invalid.push({ entity: 'topics', index, reason: 'Tópico sem identificador ou nome.' });
      return;
    }
    const id = str(item.id);
    const subjectId = subjectIdMap.get(str(item.subjectId));
    if (!subjectId) {
      invalid.push({ entity: 'topics', index, reason: 'Tópico vinculado a uma matéria inexistente.' });
      return;
    }
    if (topicIdMap.has(id)) {
      invalid.push({ entity: 'topics', index, reason: 'Identificador de tópico repetido no arquivo.' });
      return;
    }
    const name = cleanName(str(item.name));
    const key = `${subjectId}::${normalizeText(name)}`;
    const twin = topicByName.get(key);
    if (twin) {
      topicIdMap.set(id, twin);
      warnings.push(`Tópico duplicado no arquivo ("${name}") foi unificado.`);
      return;
    }
    const createdAt = isValidIsoDate(item.createdAt) ? item.createdAt : now;
    const updatedAt = isValidIsoDate(item.updatedAt) ? item.updatedAt : createdAt;
    topics.push({ id, subjectId, name, createdAt, updatedAt });
    topicIdMap.set(id, id);
    topicByName.set(key, id);
    topicSubject.set(id, subjectId);
  });

  // ---- Erros
  const errors: ErrorRecord[] = [];
  const errorIds = new Set<string>();
  let unclassified = 0;
  (json.errors as unknown[]).forEach((item, index) => {
    if (!isObject(item)) {
      invalid.push({ entity: 'errors', index, reason: 'Registro com formato inválido.' });
      return;
    }
    const subjectId = subjectIdMap.get(str(item.subjectId));
    const topicId = topicIdMap.get(str(item.topicId));
    const record = normalizeErrorRecord({ ...item, subjectId, topicId });
    if (!record) {
      const reason = !subjectId
        ? 'Registro vinculado a uma matéria inexistente.'
        : !topicId
          ? 'Registro vinculado a um tópico inexistente.'
          : !str(item.description).trim()
            ? 'Registro sem descrição do erro.'
            : !normalizePriority(item.priority)
              ? 'Registro com prioridade inválida.'
              : 'Registro sem identificador.';
      invalid.push({ entity: 'errors', index, reason });
      return;
    }
    if (topicSubject.get(record.topicId) !== record.subjectId) {
      invalid.push({ entity: 'errors', index, reason: 'O tópico do registro não pertence à matéria informada.' });
      return;
    }
    if (errorIds.has(record.id)) {
      invalid.push({ entity: 'errors', index, reason: 'Identificador de registro repetido no arquivo.' });
      return;
    }
    if (!record.origin) unclassified += 1;
    errorIds.add(record.id);
    errors.push(record);
  });

  // ---- Histórico (opcional em backups antigos)
  const history: HistoryEntry[] = [];
  if (json.history !== undefined && !Array.isArray(json.history)) {
    warnings.push('Histórico de alterações corrompido — ignorado.');
  }
  (Array.isArray(json.history) ? (json.history as unknown[]) : []).forEach((item, index) => {
    if (
      !isObject(item) ||
      !str(item.id) ||
      !errorIds.has(str(item.errorId)) ||
      !HISTORY_TYPES.includes(item.type as HistoryEventType) ||
      !isValidIsoDate(item.timestamp)
    ) {
      invalid.push({ entity: 'history', index, reason: 'Entrada de histórico inválida ou órfã.' });
      return;
    }
    history.push({
      id: str(item.id),
      errorId: str(item.errorId),
      type: item.type as HistoryEventType,
      timestamp: item.timestamp,
      fields: Array.isArray(item.fields) ? item.fields.filter((f): f is string => typeof f === 'string') : undefined,
      from: typeof item.from === 'string' ? item.from : null,
      to: typeof item.to === 'string' ? item.to : null,
      summary: str(item.summary) || 'Alteração registrada.',
    });
  });

  // ---- Revisões (opcional)
  const reviews: ReviewEntry[] = [];
  if (json.reviews !== undefined && !Array.isArray(json.reviews)) {
    warnings.push('Histórico de revisões corrompido — ignorado.');
  }
  (Array.isArray(json.reviews) ? (json.reviews as unknown[]) : []).forEach((item, index) => {
    const before = isObject(item) ? normalizePriority(item.priorityBefore) : null;
    const after = isObject(item) ? normalizePriority(item.priorityAfter) : null;
    if (
      !isObject(item) ||
      !str(item.id) ||
      !errorIds.has(str(item.errorId)) ||
      !isValidIsoDate(item.reviewedAt) ||
      !before ||
      !after
    ) {
      invalid.push({ entity: 'reviews', index, reason: 'Revisão inválida ou órfã.' });
      return;
    }
    reviews.push({ id: str(item.id), errorId: str(item.errorId), reviewedAt: item.reviewedAt, priorityBefore: before, priorityAfter: after });
  });

  // ---- Flashcards (opcional: backups anteriores à versão 3 não têm baralhos)
  const decks: Deck[] = [];
  const deckIds = new Set<string>();
  for (const key of ['decks', 'cards', 'cardReviews'] as const) {
    if (json[key] !== undefined && !Array.isArray(json[key])) warnings.push(`Lista "${key}" corrompida — ignorada.`);
  }
  (Array.isArray(json.decks) ? (json.decks as unknown[]) : []).forEach((item, index) => {
    const deck = normalizeDeck(item);
    if (!deck) {
      invalid.push({ entity: 'decks', index, reason: 'Baralho sem identificador ou nome.' });
      return;
    }
    if (deckIds.has(deck.id)) {
      invalid.push({ entity: 'decks', index, reason: 'Identificador de baralho repetido no arquivo.' });
      return;
    }
    if (deck.subjectId) deck.subjectId = subjectIdMap.get(deck.subjectId) ?? deck.subjectId;
    deckIds.add(deck.id);
    decks.push(deck);
  });

  const cards: Flashcard[] = [];
  const cardIds = new Set<string>();
  (Array.isArray(json.cards) ? (json.cards as unknown[]) : []).forEach((item, index) => {
    const card = normalizeCard(item);
    if (!card) {
      invalid.push({ entity: 'cards', index, reason: 'Cartão incompleto (sem frente, tipo ou lacunas).' });
      return;
    }
    if (!deckIds.has(card.deckId)) {
      invalid.push({ entity: 'cards', index, reason: 'Cartão vinculado a um baralho inexistente.' });
      return;
    }
    if (cardIds.has(card.id)) {
      invalid.push({ entity: 'cards', index, reason: 'Identificador de cartão repetido no arquivo.' });
      return;
    }
    cardIds.add(card.id);
    cards.push(card);
  });

  const cardReviews: CardReview[] = [];
  const cardReviewIds = new Set<string>();
  (Array.isArray(json.cardReviews) ? (json.cardReviews as unknown[]) : []).forEach((item, index) => {
    const review = normalizeCardReview(item);
    if (!review || !cardIds.has(review.cardId) || cardReviewIds.has(review.id)) {
      invalid.push({ entity: 'cardReviews', index, reason: 'Resposta de estudo inválida ou órfã.' });
      return;
    }
    cardReviewIds.add(review.id);
    cardReviews.push(review);
  });

  if (unclassified > 0) {
    warnings.push(
      `${unclassified} registro(s) sem origem do erro serão mantidos como "Não classificado" (nenhuma categoria é atribuída automaticamente).`,
    );
  }

  return {
    formatVersion,
    exportedAt: isValidIsoDate(json.exportedAt) ? json.exportedAt : null,
    data: { subjects, topics, errors, history, reviews, decks, cards, cardReviews },
    invalid,
    warnings,
    unclassified,
  };
}

/* ============================== Planejamento ============================== */

export type ImportMode = 'merge' | 'replace';

export interface EntityPlanCounts {
  new: number;
  updated: number;
  duplicates: number;
}

export interface ImportPlan {
  mode: ImportMode;
  subjects: EntityPlanCounts;
  topics: EntityPlanCounts;
  errors: EntityPlanCounts;
  history: EntityPlanCounts;
  reviews: EntityPlanCounts;
  decks: EntityPlanCounts;
  cards: EntityPlanCounts;
  cardReviews: EntityPlanCounts;
  invalid: number;
  unclassified: number;
  /** Quantidades atuais que serão removidas (apenas no modo substituir). */
  toRemove: { subjects: number; topics: number; errors: number; decks: number; cards: number };
  /** Dados finais a gravar. */
  write: BackupData;
}

function counts(): EntityPlanCounts {
  return { new: 0, updated: 0, duplicates: 0 };
}

/** Calcula o que será feito, sem alterar nada. */
export async function analyzeImport(parsed: ParsedBackup, mode: ImportMode): Promise<ImportPlan> {
  const current = await readAllData();
  const base = {
    mode,
    invalid: parsed.invalid.length,
    unclassified: parsed.unclassified,
  };

  if (mode === 'replace') {
    const d = parsed.data;
    const all = (n: number): EntityPlanCounts => ({ new: n, updated: 0, duplicates: 0 });
    return {
      ...base,
      subjects: all(d.subjects.length),
      topics: all(d.topics.length),
      errors: all(d.errors.length),
      history: all(d.history.length),
      reviews: all(d.reviews.length),
      decks: all(d.decks.length),
      cards: all(d.cards.length),
      cardReviews: all(d.cardReviews.length),
      toRemove: {
        subjects: current.subjects.length,
        topics: current.topics.length,
        errors: current.errors.length,
        decks: current.decks.length,
        cards: current.cards.length,
      },
      write: d,
    };
  }

  const plan: ImportPlan = {
    ...base,
    subjects: counts(),
    topics: counts(),
    errors: counts(),
    history: counts(),
    reviews: counts(),
    decks: counts(),
    cards: counts(),
    cardReviews: counts(),
    toRemove: { subjects: 0, topics: 0, errors: 0, decks: 0, cards: 0 },
    write: { subjects: [], topics: [], errors: [], history: [], reviews: [], decks: [], cards: [], cardReviews: [] },
  };

  // Matérias: por id; senão, por nome (evita duplicar matérias).
  const subjectsById = new Map(current.subjects.map((s) => [s.id, s]));
  const subjectsByName = new Map(current.subjects.map((s) => [normalizeText(s.name), s]));
  const subjectMap = new Map<string, string>();
  for (const s of parsed.data.subjects) {
    const existing = subjectsById.get(s.id);
    if (existing) {
      subjectMap.set(s.id, existing.id);
      const nameOwner = subjectsByName.get(normalizeText(s.name));
      const canRename = !nameOwner || nameOwner.id === existing.id;
      if (s.updatedAt > existing.updatedAt && s.name !== existing.name && canRename) {
        plan.subjects.updated++;
        plan.write.subjects.push({ ...existing, name: s.name, updatedAt: s.updatedAt });
      } else plan.subjects.duplicates++;
      continue;
    }
    const twin = subjectsByName.get(normalizeText(s.name));
    if (twin) {
      subjectMap.set(s.id, twin.id);
      plan.subjects.duplicates++;
      continue;
    }
    subjectMap.set(s.id, s.id);
    subjectsByName.set(normalizeText(s.name), s);
    plan.subjects.new++;
    plan.write.subjects.push(s);
  }

  // Tópicos: por id; senão, por (matéria, nome).
  const topicsById = new Map(current.topics.map((t) => [t.id, t]));
  const topicKey = (subjectId: string, name: string) => `${subjectId}::${normalizeText(name)}`;
  const topicsByName = new Map(current.topics.map((t) => [topicKey(t.subjectId, t.name), t]));
  const topicMap = new Map<string, string>();
  const topicSubjectFinal = new Map<string, string>(current.topics.map((t) => [t.id, t.subjectId]));
  for (const t of parsed.data.topics) {
    const subjectId = subjectMap.get(t.subjectId)!;
    const existing = topicsById.get(t.id);
    if (existing) {
      topicMap.set(t.id, existing.id);
      const nameOwner = topicsByName.get(topicKey(existing.subjectId, t.name));
      const canRename = !nameOwner || nameOwner.id === existing.id;
      if (t.updatedAt > existing.updatedAt && t.name !== existing.name && canRename) {
        plan.topics.updated++;
        plan.write.topics.push({ ...existing, name: t.name, updatedAt: t.updatedAt });
      } else plan.topics.duplicates++;
      continue;
    }
    const twin = topicsByName.get(topicKey(subjectId, t.name));
    if (twin) {
      topicMap.set(t.id, twin.id);
      plan.topics.duplicates++;
      continue;
    }
    const topic: Topic = { ...t, subjectId };
    topicMap.set(t.id, t.id);
    topicsByName.set(topicKey(subjectId, t.name), topic);
    topicSubjectFinal.set(t.id, subjectId);
    plan.topics.new++;
    plan.write.topics.push(topic);
  }

  // Erros: por id (mantém a versão mais recente); senão, detecta conteúdo duplicado.
  const errorsById = new Map(current.errors.map((e) => [e.id, e]));
  const contentKey = (topicId: string, description: string) => `${topicId}::${normalizeText(description)}`;
  const errorsByContent = new Set(current.errors.map((e) => contentKey(e.topicId, e.description)));
  const acceptedErrors = new Set<string>(current.errors.map((e) => e.id));
  for (const e of parsed.data.errors) {
    const topicId = topicMap.get(e.topicId)!;
    const subjectId = topicSubjectFinal.get(topicId) ?? subjectMap.get(e.subjectId)!;
    const mapped: ErrorRecord = { ...e, subjectId, topicId };
    const existing = errorsById.get(e.id);
    if (existing) {
      if (e.updatedAt > existing.updatedAt) {
        plan.errors.updated++;
        plan.write.errors.push(mapped);
      } else plan.errors.duplicates++;
      continue;
    }
    const key = contentKey(topicId, e.description);
    if (errorsByContent.has(key)) {
      plan.errors.duplicates++;
      continue;
    }
    errorsByContent.add(key);
    acceptedErrors.add(e.id);
    plan.errors.new++;
    plan.write.errors.push(mapped);
  }

  const historyIds = new Set(current.history.map((h) => h.id));
  for (const h of parsed.data.history) {
    if (historyIds.has(h.id)) plan.history.duplicates++;
    else if (acceptedErrors.has(h.errorId)) {
      plan.history.new++;
      plan.write.history.push(h);
    }
  }
  const reviewIds = new Set(current.reviews.map((r) => r.id));
  for (const r of parsed.data.reviews) {
    if (reviewIds.has(r.id)) plan.reviews.duplicates++;
    else if (acceptedErrors.has(r.errorId)) {
      plan.reviews.new++;
      plan.write.reviews.push(r);
    }
  }

  // Baralhos: por id (versão mais recente vence); senão, por nome (evita duplicar baralhos).
  const decksById = new Map(current.decks.map((d) => [d.id, d]));
  const decksByName = new Map(current.decks.map((d) => [normalizeText(d.name), d]));
  const deckMap = new Map<string, string>();
  for (const d of parsed.data.decks) {
    const deck: Deck = { ...d, subjectId: d.subjectId ? (subjectMap.get(d.subjectId) ?? d.subjectId) : null };
    const existing = decksById.get(d.id);
    if (existing) {
      deckMap.set(d.id, existing.id);
      const nameOwner = decksByName.get(normalizeText(d.name));
      if (d.updatedAt > existing.updatedAt && (!nameOwner || nameOwner.id === existing.id)) {
        plan.decks.updated++;
        plan.write.decks.push(deck);
      } else plan.decks.duplicates++;
      continue;
    }
    const twin = decksByName.get(normalizeText(d.name));
    if (twin) {
      deckMap.set(d.id, twin.id);
      plan.decks.duplicates++;
      continue;
    }
    deckMap.set(d.id, d.id);
    decksByName.set(normalizeText(d.name), deck);
    plan.decks.new++;
    plan.write.decks.push(deck);
  }

  // Cartões: por id (versão mais recente vence); senão, ignora conteúdo idêntico no mesmo baralho.
  const cardsById = new Map(current.cards.map((c) => [c.id, c]));
  const cardKey = (deckId: string, front: string) => `${deckId}::${normalizeText(front)}`;
  const cardsByContent = new Set(current.cards.map((c) => cardKey(c.deckId, c.front)));
  const acceptedCards = new Set(current.cards.map((c) => c.id));
  for (const c of parsed.data.cards) {
    const deckId = deckMap.get(c.deckId) ?? c.deckId;
    const mapped: Flashcard = { ...c, deckId };
    const existing = cardsById.get(c.id);
    if (existing) {
      if (c.updatedAt > existing.updatedAt) {
        plan.cards.updated++;
        plan.write.cards.push(mapped);
      } else plan.cards.duplicates++;
      continue;
    }
    const key = cardKey(deckId, c.front);
    if (c.front.trim() && cardsByContent.has(key)) {
      plan.cards.duplicates++;
      continue;
    }
    cardsByContent.add(key);
    acceptedCards.add(c.id);
    plan.cards.new++;
    plan.write.cards.push(mapped);
  }
  const cardDeck = new Map<string, string>([...current.cards, ...plan.write.cards].map((c) => [c.id, c.deckId]));
  const cardReviewIds = new Set(current.cardReviews.map((r) => r.id));
  for (const r of parsed.data.cardReviews) {
    if (cardReviewIds.has(r.id)) plan.cardReviews.duplicates++;
    else if (acceptedCards.has(r.cardId)) {
      plan.cardReviews.new++;
      plan.write.cardReviews.push({ ...r, deckId: cardDeck.get(r.cardId) ?? r.deckId });
    }
  }
  return plan;
}

/* ============================== Importação ============================== */

export interface ImportResult {
  plan: ImportPlan;
  snapshotCreated: boolean;
}

const ALL_TABLES = () => [
  db.subjects,
  db.topics,
  db.errors,
  db.history,
  db.reviews,
  db.decks,
  db.cards,
  db.cardReviews,
  db.tombstones,
  db.pendingChanges,
];

/**
 * Importa um backup validado.
 * - `merge`: preserva todos os registros existentes e adiciona/atualiza os do arquivo.
 * - `replace`: substitui os dados (um ponto de restauração é criado antes).
 */
export async function importBackup(parsed: ParsedBackup, mode: ImportMode): Promise<ImportResult> {
  let snapshotCreated = false;
  if (mode === 'replace') {
    snapshotCreated = !!(await createSnapshot('Antes de substituir os dados por um backup'));
  }
  const plan = await db.transaction('rw', ALL_TABLES(), async () => {
    const plan = await analyzeImport(parsed, mode);
    const now = nowIso();
    if (mode === 'replace') await replaceAllData(plan.write, now);
    else await writeMerged(plan, now);
    return plan;
  });
  return { plan, snapshotCreated };
}

async function writeMerged(plan: ImportPlan, now: string): Promise<void> {
  const { write } = plan;
  await db.subjects.bulkPut(write.subjects);
  await db.topics.bulkPut(write.topics);
  await db.errors.bulkPut(write.errors);
  await db.history.bulkPut(write.history);
  await db.reviews.bulkPut(write.reviews);
  await db.decks.bulkPut(write.decks);
  await db.cards.bulkPut(write.cards);
  await db.cardReviews.bulkPut(write.cardReviews);
  for (const d of write.decks) await trackChange('decks', d.id, now);
  for (const c of write.cards) await trackChange('cards', c.id, now);
  for (const r of write.cardReviews) await trackChange('cardReviews', r.id, now);
  for (const s of write.subjects) await trackChange('subjects', s.id, now);
  for (const t of write.topics) await trackChange('topics', t.id, now);
  for (const e of write.errors) await trackChange('errors', e.id, now);
  for (const h of write.history) await trackChange('history', h.id, now);
  for (const r of write.reviews) await trackChange('reviews', r.id, now);
  const dateLabel = formatDate(now);
  for (const e of write.errors) {
    const entry: HistoryEntry = {
      id: createId(),
      errorId: e.id,
      type: 'imported',
      timestamp: now,
      summary: `Registro importado de backup em ${dateLabel}.`,
    };
    await db.history.add(entry);
    await trackChange('history', entry.id, now);
  }
}

/** Substitui todo o conteúdo do caderno. Deve ser chamado dentro de uma transação. */
async function replaceAllData(input: BackupData, now: string): Promise<void> {
  const data = completeBackupData(input);
  const tables: [EntityName, { primaryKeys(): Promise<unknown[]> }][] = [
    ['subjects', db.subjects.toCollection()],
    ['topics', db.topics.toCollection()],
    ['errors', db.errors.toCollection()],
    ['history', db.history.toCollection()],
    ['reviews', db.reviews.toCollection()],
    ['decks', db.decks.toCollection()],
    ['cards', db.cards.toCollection()],
    ['cardReviews', db.cardReviews.toCollection()],
  ];
  const incoming: Record<EntityName, Set<string>> = {
    subjects: new Set(data.subjects.map((s) => s.id)),
    topics: new Set(data.topics.map((t) => t.id)),
    errors: new Set(data.errors.map((e) => e.id)),
    history: new Set(data.history.map((h) => h.id)),
    reviews: new Set(data.reviews.map((r) => r.id)),
    decks: new Set(data.decks.map((d) => d.id)),
    cards: new Set(data.cards.map((c) => c.id)),
    cardReviews: new Set(data.cardReviews.map((r) => r.id)),
  };
  for (const [entity, collection] of tables) {
    const ids = (await collection.primaryKeys()) as string[];
    for (const id of ids) if (!incoming[entity].has(id)) await trackDeletion(entity, id, now);
  }
  await Promise.all([
    db.subjects.clear(),
    db.topics.clear(),
    db.errors.clear(),
    db.history.clear(),
    db.reviews.clear(),
    db.decks.clear(),
    db.cards.clear(),
    db.cardReviews.clear(),
  ]);
  await db.subjects.bulkAdd(data.subjects);
  await db.topics.bulkAdd(data.topics);
  await db.errors.bulkAdd(data.errors);
  await db.history.bulkAdd(data.history);
  await db.reviews.bulkAdd(data.reviews);
  await db.decks.bulkAdd(data.decks);
  await db.cards.bulkAdd(data.cards);
  await db.cardReviews.bulkAdd(data.cardReviews);
  for (const entity of Object.keys(incoming) as EntityName[]) {
    for (const id of incoming[entity]) {
      await db.tombstones.delete(`${entity}:${id}`);
      await trackChange(entity, id, now);
    }
  }
}

/* ============================== Pontos de restauração ============================== */

export async function restoreSnapshot(id: string): Promise<void> {
  const snapshot = await db.snapshots.get(id);
  if (!snapshot) throw new NotFoundError('Ponto de restauração não encontrado.');
  await createSnapshot('Antes de restaurar um ponto de restauração');
  await db.transaction('rw', ALL_TABLES(), async () => {
    await replaceAllData(snapshot.data, nowIso());
  });
}
