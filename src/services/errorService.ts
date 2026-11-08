import { db } from '@/database/db';
import { trackChange } from '@/database/changeTracker';
import { PRIORITIES } from '@/constants/priorities';
import { getOriginMeta } from '@/constants/origins';
import type { ErrorInput, ErrorRecord, HistoryEntry, OriginId, Priority, StoredOrigin } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { hasValidationErrors, validateErrorInput } from '@/utils/validation';
import { NotFoundError, ValidationError } from './errors';
import { deleteErrorsCascade } from './cascade';

export const FIELD_LABELS: Record<string, string> = {
  subjectId: 'Matéria',
  topicId: 'Tópico',
  description: 'Descrição do erro',
  correction: 'Correção',
  prevention: 'Como evitar',
  reference: 'Questão de referência',
  notes: 'Observações',
};

const EDITABLE_TEXT_FIELDS = ['subjectId', 'topicId', 'description', 'correction', 'prevention', 'reference', 'notes'] as const;

export function emptyErrorInput(): ErrorInput {
  return {
    subjectId: '',
    topicId: '',
    description: '',
    correction: '',
    prevention: '',
    priority: '',
    origin: '',
    reference: '',
    notes: '',
  };
}

export function inputFromRecord(record: ErrorRecord): ErrorInput {
  return {
    subjectId: record.subjectId,
    topicId: record.topicId,
    description: record.description,
    correction: record.correction,
    prevention: record.prevention,
    priority: record.priority,
    origin: record.origin ?? '',
    reference: record.reference,
    notes: record.notes,
  };
}

function priorityHistory(errorId: string, from: Priority, to: Priority, at: string, viaReview = false): HistoryEntry {
  return {
    id: createId(),
    errorId,
    type: viaReview ? 'reviewed' : 'priority_changed',
    timestamp: at,
    from,
    to,
    summary: viaReview
      ? from === to
        ? `Revisado no Segundo Ciclo — mantido como ${PRIORITIES[to].label.toLowerCase()}.`
        : `Revisado no Segundo Ciclo — de ${PRIORITIES[from].label.toLowerCase()} para ${PRIORITIES[to].label.toLowerCase()}.`
      : `Classificação alterada de ${PRIORITIES[from].label.toLowerCase()} para ${PRIORITIES[to].label.toLowerCase()}.`,
  };
}

function originHistory(errorId: string, from: StoredOrigin, to: StoredOrigin, at: string): HistoryEntry {
  return {
    id: createId(),
    errorId,
    type: 'origin_changed',
    timestamp: at,
    from,
    to,
    summary: `Origem alterada de "${getOriginMeta(from).label}" para "${getOriginMeta(to).label}".`,
  };
}

async function addHistory(entries: HistoryEntry[]): Promise<void> {
  for (const entry of entries) {
    await db.history.add(entry);
    await trackChange('history', entry.id, entry.timestamp);
  }
}

async function assertSubjectTopic(subjectId: string, topicId: string): Promise<void> {
  const [subject, topic] = await Promise.all([db.subjects.get(subjectId), db.topics.get(topicId)]);
  if (!subject) throw new ValidationError('A matéria selecionada não existe mais.', { subjectId: 'Matéria inválida.' });
  if (!topic || topic.subjectId !== subjectId) {
    throw new ValidationError('O tópico selecionado não pertence à matéria.', { topicId: 'Tópico inválido.' });
  }
}

function validateOrThrow(input: ErrorInput): asserts input is ErrorInput & { priority: Priority; origin: OriginId } {
  const errors = validateErrorInput(input);
  if (hasValidationErrors(errors)) {
    throw new ValidationError('Preencha os campos obrigatórios.', errors as Record<string, string>);
  }
}

const TX_TABLES = () => [db.subjects, db.topics, db.errors, db.history, db.pendingChanges];

export async function createError(input: ErrorInput): Promise<ErrorRecord> {
  validateOrThrow(input);
  return db.transaction('rw', TX_TABLES(), async () => {
    await assertSubjectTopic(input.subjectId, input.topicId);
    const now = nowIso();
    const record: ErrorRecord = {
      id: createId(),
      subjectId: input.subjectId,
      topicId: input.topicId,
      description: input.description.trim(),
      correction: input.correction.trim(),
      prevention: input.prevention.trim(),
      priority: input.priority,
      origin: input.origin,
      reference: input.reference.trim(),
      notes: input.notes.trim(),
      createdAt: now,
      updatedAt: now,
      lastReviewedAt: null,
      reviewCount: 0,
      resolvedAt: input.priority === 'superado' ? now : null,
    };
    await db.errors.add(record);
    await trackChange('errors', record.id, now);
    await addHistory([
      {
        id: createId(),
        errorId: record.id,
        type: 'created',
        timestamp: now,
        to: record.priority,
        summary: `Erro registrado como ${PRIORITIES[record.priority].label.toLowerCase()}.`,
      },
    ]);
    return record;
  });
}

export async function updateError(id: string, input: ErrorInput): Promise<ErrorRecord> {
  validateOrThrow(input);
  return db.transaction('rw', TX_TABLES(), async () => {
    const current = await db.errors.get(id);
    if (!current) throw new NotFoundError('Registro não encontrado.');
    await assertSubjectTopic(input.subjectId, input.topicId);
    const now = nowIso();
    const next: ErrorRecord = {
      ...current,
      subjectId: input.subjectId,
      topicId: input.topicId,
      description: input.description.trim(),
      correction: input.correction.trim(),
      prevention: input.prevention.trim(),
      reference: input.reference.trim(),
      notes: input.notes.trim(),
      priority: input.priority,
      origin: input.origin,
    };

    const changed = EDITABLE_TEXT_FIELDS.filter((f) => current[f] !== next[f]);
    const entries: HistoryEntry[] = [];
    if (changed.length) {
      entries.push({
        id: createId(),
        errorId: id,
        type: 'updated',
        timestamp: now,
        fields: changed,
        summary: `Registro editado: ${changed.map((f) => FIELD_LABELS[f]).join(', ')}.`,
      });
    }
    if (current.priority !== next.priority) {
      entries.push(priorityHistory(id, current.priority, next.priority, now));
      next.resolvedAt = next.priority === 'superado' ? now : null;
    }
    if (current.origin !== next.origin) entries.push(originHistory(id, current.origin, next.origin, now));
    if (entries.length === 0) return current;

    next.updatedAt = now;
    await db.errors.put(next);
    await trackChange('errors', id, now);
    await addHistory(entries);
    return next;
  });
}

/** Alteração rápida de prioridade (listagem/visualização). Preserva o histórico. */
export async function changePriority(id: string, priority: Priority): Promise<ErrorRecord> {
  return db.transaction('rw', [db.errors, db.history, db.pendingChanges], async () => {
    const current = await db.errors.get(id);
    if (!current) throw new NotFoundError('Registro não encontrado.');
    if (current.priority === priority) return current;
    const now = nowIso();
    const next: ErrorRecord = {
      ...current,
      priority,
      resolvedAt: priority === 'superado' ? now : null,
      updatedAt: now,
    };
    await db.errors.put(next);
    await trackChange('errors', id, now);
    await addHistory([priorityHistory(id, current.priority, priority, now)]);
    return next;
  });
}

/** Alteração rápida da origem do erro. Preserva o histórico. */
export async function changeOrigin(id: string, origin: OriginId): Promise<ErrorRecord> {
  return db.transaction('rw', [db.errors, db.history, db.pendingChanges], async () => {
    const current = await db.errors.get(id);
    if (!current) throw new NotFoundError('Registro não encontrado.');
    if (current.origin === origin) return current;
    const now = nowIso();
    const next: ErrorRecord = { ...current, origin, updatedAt: now };
    await db.errors.put(next);
    await trackChange('errors', id, now);
    await addHistory([originHistory(id, current.origin, origin, now)]);
    return next;
  });
}

/** Exclui definitivamente um registro (e seu histórico). Exige confirmação na interface. */
export async function deleteError(id: string): Promise<void> {
  await db.transaction('rw', [db.errors, db.history, db.reviews, db.tombstones, db.pendingChanges], async () => {
    const current = await db.errors.get(id);
    if (!current) throw new NotFoundError('Registro não encontrado.');
    await deleteErrorsCascade([id]);
  });
}

/**
 * Registra uma revisão do Segundo Ciclo e atualiza a classificação.
 * Erros marcados como superados permanecem salvos permanentemente.
 */
export async function registerReview(id: string, priorityAfter: Priority): Promise<ErrorRecord> {
  return db.transaction('rw', [db.errors, db.history, db.reviews, db.pendingChanges], async () => {
    const current = await db.errors.get(id);
    if (!current) throw new NotFoundError('Registro não encontrado.');
    const now = nowIso();
    const next: ErrorRecord = {
      ...current,
      priority: priorityAfter,
      lastReviewedAt: now,
      reviewCount: current.reviewCount + 1,
      resolvedAt: priorityAfter === 'superado' ? (current.priority === 'superado' ? current.resolvedAt : now) : null,
      updatedAt: now,
    };
    await db.errors.put(next);
    await trackChange('errors', id, now);
    const review = {
      id: createId(),
      errorId: id,
      reviewedAt: now,
      priorityBefore: current.priority,
      priorityAfter,
    };
    await db.reviews.add(review);
    await trackChange('reviews', review.id, now);
    await addHistory([priorityHistory(id, current.priority, priorityAfter, now, true)]);
    return next;
  });
}
