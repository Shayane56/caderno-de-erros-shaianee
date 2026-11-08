import type {
  CardInput,
  CardReview,
  CardType,
  Deck,
  DeckInput,
  Flashcard,
  Rating,
  SrsPhase,
  SrsState,
} from '@/types';
import {
  CARD_FONTS,
  COVER_PATTERNS,
  DECK_COLORS,
  PAPER_TINTS,
  PAPERS,
  isOneOf,
} from '@/constants/cardStyles';
import { clozeNumbers, clozeToPlain } from '@/utils/cloze';
import { stripRichText } from '@/utils/richText';
import { isValidIsoDate } from '@/utils/dates';
import { cleanName } from '@/utils/text';
import { newSrsState } from './scheduler';

export const CARD_TYPES: Array<{ id: CardType; label: string; description: string }> = [
  { id: 'basic', label: 'Frente e verso', description: 'Pergunta na frente, resposta no verso.' },
  { id: 'cloze', label: 'Lacunas', description: 'Esconda trechos do texto: lei seca, súmulas, conceitos.' },
  { id: 'truefalse', label: 'Certo ou Errado', description: 'Afirmação no estilo Cebraspe, com gabarito e justificativa.' },
];

export const DEFAULT_NEW_PER_DAY = 20;
export const DEFAULT_REVIEWS_PER_DAY = 200;
export const MAX_DAILY_LIMIT = 9999;

/** Faces (ordinais) estudadas de um cartão. */
export function cardOrds(card: Pick<Flashcard, 'type' | 'front' | 'reverse'>): string[] {
  if (card.type === 'cloze') return clozeNumbers(card.front).map(String);
  if (card.type === 'basic' && card.reverse) return ['0', '1'];
  return ['0'];
}

/** Mantém o progresso das faces que continuam existindo e cria as novas. */
export function syncSrs(card: Pick<Flashcard, 'type' | 'front' | 'reverse'>, current: Record<string, SrsState> = {}): Record<string, SrsState> {
  const next: Record<string, SrsState> = {};
  for (const ord of cardOrds(card)) next[ord] = current[ord] ?? newSrsState();
  return next;
}

/** Descrição curta de uma face (ex.: "Lacuna 2", "Inverso"). */
export function ordLabel(card: Pick<Flashcard, 'type'>, ord: string): string {
  if (card.type === 'cloze') return `Lacuna ${ord}`;
  if (card.type === 'basic' && ord === '1') return 'Inverso';
  return '';
}

/** Texto sem marcação, para listas e buscas. */
export function cardPlainFront(card: Pick<Flashcard, 'type' | 'front'>): string {
  const text = card.type === 'cloze' ? clozeToPlain(card.front) : card.front;
  return stripRichText(text).trim();
}

export function emptyCardInput(deckId = '', type: CardType = 'basic'): CardInput {
  return {
    deckId,
    type,
    front: '',
    back: '',
    extra: '',
    answer: '',
    reverse: false,
    frontImage: null,
    backImage: null,
    tags: [],
    sourceErrorId: null,
  };
}

export function inputFromCard(card: Flashcard): CardInput {
  return {
    deckId: card.deckId,
    type: card.type,
    front: card.front,
    back: card.back,
    extra: card.extra,
    answer: card.answer ?? '',
    reverse: card.reverse,
    frontImage: card.frontImage,
    backImage: card.backImage,
    tags: [...card.tags],
    sourceErrorId: card.sourceErrorId,
  };
}

export type CardInputErrors = Partial<Record<'deckId' | 'front' | 'back' | 'answer', string>>;

export function validateCardInput(input: CardInput): CardInputErrors {
  const errors: CardInputErrors = {};
  if (!input.deckId) errors.deckId = 'Escolha um baralho.';
  const hasFront = !!input.front.trim() || !!input.frontImage;
  if (input.type === 'cloze') {
    if (!input.front.trim()) errors.front = 'Escreva o texto e marque pelo menos uma lacuna.';
    else if (clozeNumbers(input.front).length === 0) errors.front = 'Selecione um trecho e use o botão "Lacuna" para escondê-lo.';
  } else if (!hasFront) {
    errors.front = input.type === 'truefalse' ? 'Escreva a afirmação.' : 'Escreva a frente do cartão.';
  }
  if (input.type === 'basic' && !input.back.trim() && !input.backImage) errors.back = 'Escreva a resposta do verso.';
  if (input.type === 'truefalse' && input.answer !== 'certo' && input.answer !== 'errado') errors.answer = 'Marque o gabarito: Certo ou Errado.';
  if (input.front.length > 20_000 || input.back.length > 20_000 || input.extra.length > 20_000) errors.front = 'Texto muito longo (máximo de 20.000 caracteres por campo).';
  return errors;
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/^#/, '').trim().replace(/\s+/g, '-').slice(0, 40);
    const key = tag.toLocaleLowerCase('pt-BR');
    if (tag && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out.slice(0, 20);
}

export function defaultDeckInput(overrides: Partial<DeckInput> = {}): DeckInput {
  return {
    name: '',
    description: '',
    subjectId: null,
    emoji: '📒',
    color: 'rosa',
    pattern: 'bolinhas',
    coverImage: null,
    elastic: true,
    paper: null,
    paperTint: null,
    font: null,
    newPerDay: DEFAULT_NEW_PER_DAY,
    reviewsPerDay: DEFAULT_REVIEWS_PER_DAY,
    ...overrides,
  };
}

export function inputFromDeck(deck: Deck): DeckInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = deck;
  return { ...rest };
}

/* ============================== Normalização (backup / sincronização) ============================== */

type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const PHASES: SrsPhase[] = ['new', 'learning', 'review', 'relearning'];
const CARD_TYPE_IDS: CardType[] = ['basic', 'cloze', 'truefalse'];

function limit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(MAX_DAILY_LIMIT, Math.floor(v)) : fallback;
}

function image(v: unknown): string | null {
  return typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) ? v : null;
}

export function normalizeSrsState(raw: unknown): SrsState {
  const base = newSrsState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Raw;
  const phase = PHASES.includes(r.phase as SrsPhase) ? (r.phase as SrsPhase) : 'new';
  const num = (v: unknown, fallback: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback);
  const due = isValidIsoDate(r.due) ? r.due : null;
  if (phase !== 'new' && !due) return base;
  return {
    phase,
    due: phase === 'new' ? null : due,
    interval: Math.floor(num(r.interval, 0)),
    ease: Math.max(1.3, num(r.ease, base.ease, 1)),
    step: Math.floor(num(r.step, 0)),
    reps: Math.floor(num(r.reps, 0)),
    lapses: Math.floor(num(r.lapses, 0)),
    lastReviewedAt: isValidIsoDate(r.lastReviewedAt) ? r.lastReviewedAt : null,
  };
}

export function normalizeDeck(raw: unknown): Deck | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const name = cleanName(str(r.name));
  if (!id || !name) return null;
  const createdAt = isValidIsoDate(r.createdAt) ? r.createdAt : new Date().toISOString();
  return {
    id,
    name,
    description: str(r.description),
    subjectId: str(r.subjectId) || null,
    emoji: str(r.emoji, '📒').slice(0, 8) || '📒',
    color: isOneOf(DECK_COLORS, r.color) ? r.color : 'rosa',
    pattern: isOneOf(COVER_PATTERNS, r.pattern) ? r.pattern : 'liso',
    coverImage: image(r.coverImage),
    elastic: r.elastic === true,
    paper: isOneOf(PAPERS, r.paper) ? r.paper : null,
    paperTint: isOneOf(PAPER_TINTS, r.paperTint) ? r.paperTint : null,
    font: isOneOf(CARD_FONTS, r.font) ? r.font : null,
    newPerDay: limit(r.newPerDay, DEFAULT_NEW_PER_DAY),
    reviewsPerDay: limit(r.reviewsPerDay, DEFAULT_REVIEWS_PER_DAY),
    createdAt,
    updatedAt: isValidIsoDate(r.updatedAt) ? r.updatedAt : createdAt,
  };
}

export function normalizeCard(raw: unknown): Flashcard | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const deckId = str(r.deckId);
  const type = CARD_TYPE_IDS.includes(r.type as CardType) ? (r.type as CardType) : null;
  if (!id || !deckId || !type) return null;
  const front = str(r.front);
  const frontImage = image(r.frontImage);
  if (!front.trim() && !frontImage) return null;
  const createdAt = isValidIsoDate(r.createdAt) ? r.createdAt : new Date().toISOString();
  const rawSrs = r.srs && typeof r.srs === 'object' ? (r.srs as Raw) : {};
  const currentSrs: Record<string, SrsState> = {};
  for (const [ord, state] of Object.entries(rawSrs)) currentSrs[ord] = normalizeSrsState(state);
  const reverse = r.reverse === true;
  const card: Flashcard = {
    id,
    deckId,
    type,
    front,
    back: str(r.back),
    extra: str(r.extra),
    answer: r.answer === 'certo' || r.answer === 'errado' ? r.answer : null,
    reverse,
    frontImage,
    backImage: image(r.backImage),
    tags: Array.isArray(r.tags) ? normalizeTags(r.tags.filter((t): t is string => typeof t === 'string')) : [],
    sourceErrorId: str(r.sourceErrorId) || null,
    suspended: r.suspended === true,
    srs: {},
    createdAt,
    updatedAt: isValidIsoDate(r.updatedAt) ? r.updatedAt : createdAt,
  };
  card.srs = syncSrs(card, currentSrs);
  if (Object.keys(card.srs).length === 0) return null;
  return card;
}

export function normalizeCardReview(raw: unknown): CardReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const id = str(r.id);
  const cardId = str(r.cardId);
  const rating = r.rating;
  if (!id || !cardId || !isValidIsoDate(r.reviewedAt) || ![1, 2, 3, 4].includes(rating as number)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    id,
    cardId,
    deckId: str(r.deckId),
    ord: str(r.ord, '0') || '0',
    reviewedAt: r.reviewedAt,
    rating: rating as Rating,
    phaseBefore: PHASES.includes(r.phaseBefore as SrsPhase) ? (r.phaseBefore as SrsPhase) : 'review',
    intervalBefore: num(r.intervalBefore),
    intervalAfter: num(r.intervalAfter),
    easeAfter: num(r.easeAfter) || 2.5,
    durationMs: Math.min(3_600_000, num(r.durationMs)),
  };
}
