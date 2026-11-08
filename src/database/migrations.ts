import type { ErrorRecord, Priority, StoredOrigin } from '@/types';
import { isPriority } from '@/constants/priorities';
import { isOriginId } from '@/constants/origins';
import { isValidIsoDate } from '@/utils/dates';

type UnknownRecord = Record<string, unknown>;

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Normaliza a origem: valores válidos são mantidos; ausentes ou desconhecidos
 * viram `null` ("Não classificado"). NUNCA atribui uma categoria automaticamente.
 */
export function normalizeOrigin(value: unknown): StoredOrigin {
  return isOriginId(value) ? value : null;
}

/** Converte prioridades de versões antigas/variações para o formato atual. */
export function normalizePriority(value: unknown): Priority | null {
  if (isPriority(value)) return value;
  if (typeof value !== 'string') return null;
  const v = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  if (v === 'alta' || v === 'high' || v === 'prioridade alta') return 'alta';
  if (v === 'media' || v === 'medium' || v === 'prioridade media') return 'media';
  if (v === 'superado' || v === 'resolvido' || v === 'resolved' || v === 'done') return 'superado';
  return null;
}

/**
 * Atualiza um registro de erro de qualquer versão anterior para a estrutura atual,
 * preservando todos os dados existentes. Retorna `null` se faltarem dados essenciais.
 */
export function normalizeErrorRecord(raw: unknown): ErrorRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as UnknownRecord;
  const id = str(r.id);
  const subjectId = str(r.subjectId);
  const topicId = str(r.topicId);
  const description = str(r.description).trim();
  const priority = normalizePriority(r.priority);
  if (!id || !subjectId || !topicId || !description || !priority) return null;

  const createdAt = isValidIsoDate(r.createdAt) ? r.createdAt : new Date().toISOString();
  const updatedAt = isValidIsoDate(r.updatedAt) ? r.updatedAt : createdAt;
  const lastReviewedAt = isValidIsoDate(r.lastReviewedAt) ? r.lastReviewedAt : null;
  const resolvedAt =
    priority === 'superado' ? (isValidIsoDate(r.resolvedAt) ? r.resolvedAt : updatedAt) : null;
  const reviewCount =
    typeof r.reviewCount === 'number' && Number.isFinite(r.reviewCount) && r.reviewCount >= 0
      ? Math.floor(r.reviewCount)
      : 0;

  return {
    id,
    subjectId,
    topicId,
    description,
    correction: str(r.correction),
    prevention: str(r.prevention),
    priority,
    origin: normalizeOrigin(r.origin),
    reference: str(r.reference),
    notes: str(r.notes),
    createdAt,
    updatedAt,
    lastReviewedAt,
    reviewCount,
    resolvedAt,
  };
}
