import type { CardReview, Deck, Flashcard, SrsState } from '@/types';
import { nextStudyDayStart, SRS_CONFIG, studyDayStart } from './scheduler';
import { DEFAULT_NEW_PER_DAY, DEFAULT_REVIEWS_PER_DAY } from './cardModel';

export type StudyKind = 'new' | 'learning' | 'review';

export interface StudyItem {
  card: Flashcard;
  ord: string;
  state: SrsState;
  kind: StudyKind;
}

export interface StudyQueue {
  /** Próxima face a estudar (null quando não há nada para agora). */
  next: StudyItem | null;
  counts: { new: number; learning: number; review: number };
  /** Cartões em aprendizagem que voltam ainda hoje, mais tarde. */
  laterToday: number;
  /** Momento em que o próximo cartão em aprendizagem fica disponível. */
  nextDueAt: string | null;
}

interface BuildOptions {
  cards: Flashcard[];
  decks: Deck[];
  /** Respostas dadas desde o início do dia de estudo (para limites diários e irmãos). */
  reviewsToday: CardReview[];
  now: Date;
  /** Restringe a estes baralhos (vazio/indefinido = todos). */
  deckIds?: string[];
}

const byDue = (a: StudyItem, b: StudyItem) => (a.state.due ?? '').localeCompare(b.state.due ?? '');

/**
 * Monta a fila do dia, como no Anki:
 * 1. cartões em aprendizagem já vencidos;  2. revisões do dia;  3. cartões novos.
 * Respeita os limites diários de cada baralho e "enterra" faces irmãs (inverso/outras
 * lacunas) já estudadas hoje, para não responder a mesma informação duas vezes.
 */
export function buildStudyQueue({ cards, decks, reviewsToday, now, deckIds }: BuildOptions): StudyQueue {
  const scope = deckIds && deckIds.length ? new Set(deckIds) : null;
  const deckMap = new Map(decks.map((d) => [d.id, d]));
  const nowIso = now.toISOString();
  const dayEnd = nextStudyDayStart(now).toISOString();
  const learnAhead = new Date(now.getTime() + SRS_CONFIG.learnAheadMinutes * 60_000).toISOString();

  const dayStartIso = studyDayStart(now).toISOString();
  const todays = reviewsToday.filter((r) => r.reviewedAt >= dayStartIso);
  const newDone = new Map<string, number>();
  const reviewDone = new Map<string, number>();
  const touchedToday = new Set<string>();
  for (const r of todays) {
    touchedToday.add(r.cardId);
    if (r.phaseBefore === 'new') newDone.set(r.deckId, (newDone.get(r.deckId) ?? 0) + 1);
    if (r.phaseBefore === 'review') reviewDone.set(r.deckId, (reviewDone.get(r.deckId) ?? 0) + 1);
  }

  const learningDue: StudyItem[] = [];
  const learningSoon: StudyItem[] = [];
  const learningLater: StudyItem[] = [];
  const reviewsByDeck = new Map<string, StudyItem[]>();
  const newByDeck = new Map<string, StudyItem[]>();

  const sorted = [...cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const card of sorted) {
    if (card.suspended || !deckMap.has(card.deckId)) continue;
    if (scope && !scope.has(card.deckId)) continue;
    let siblingTaken = touchedToday.has(card.id);
    const ords = Object.keys(card.srs).sort((a, b) => Number(a) - Number(b));
    for (const ord of ords) {
      const state = card.srs[ord];
      if (state.phase === 'learning' || state.phase === 'relearning') {
        const item: StudyItem = { card, ord, state, kind: 'learning' };
        if (!state.due || state.due <= nowIso) learningDue.push(item);
        else if (state.due <= learnAhead) learningSoon.push(item);
        else if (state.due < dayEnd) learningLater.push(item);
        continue;
      }
      if (siblingTaken) continue;
      if (state.phase === 'review' && state.due && state.due < dayEnd) {
        const list = reviewsByDeck.get(card.deckId) ?? [];
        list.push({ card, ord, state, kind: 'review' });
        reviewsByDeck.set(card.deckId, list);
        siblingTaken = true;
      } else if (state.phase === 'new') {
        const list = newByDeck.get(card.deckId) ?? [];
        list.push({ card, ord, state, kind: 'new' });
        newByDeck.set(card.deckId, list);
        siblingTaken = true;
      }
    }
  }

  const reviews: StudyItem[] = [];
  for (const [deckId, list] of reviewsByDeck) {
    const deck = deckMap.get(deckId)!;
    const left = Math.max(0, (deck.reviewsPerDay ?? DEFAULT_REVIEWS_PER_DAY) - (reviewDone.get(deckId) ?? 0));
    reviews.push(...list.sort(byDue).slice(0, left));
  }
  reviews.sort(byDue);

  const fresh: StudyItem[] = [];
  for (const [deckId, list] of newByDeck) {
    const deck = deckMap.get(deckId)!;
    const left = Math.max(0, (deck.newPerDay ?? DEFAULT_NEW_PER_DAY) - (newDone.get(deckId) ?? 0));
    fresh.push(...list.slice(0, left));
  }
  fresh.sort((a, b) => a.card.createdAt.localeCompare(b.card.createdAt) || Number(a.ord) - Number(b.ord));

  learningDue.sort(byDue);
  learningSoon.sort(byDue);
  learningLater.sort(byDue);

  const next = learningDue[0] ?? reviews[0] ?? fresh[0] ?? learningSoon[0] ?? null;
  const pendingLearning = [...learningSoon, ...learningLater];
  return {
    next,
    counts: { new: fresh.length, learning: learningDue.length + learningSoon.length, review: reviews.length },
    laterToday: learningLater.length,
    nextDueAt: next ? null : (pendingLearning[0]?.state.due ?? null),
  };
}

/** Totais por baralho para as capas e o painel. */
export function deckDueCounts(options: Omit<BuildOptions, 'deckIds'>): Map<string, StudyQueue['counts']> {
  const out = new Map<string, StudyQueue['counts']>();
  for (const deck of options.decks) {
    out.set(deck.id, buildStudyQueue({ ...options, deckIds: [deck.id] }).counts);
  }
  return out;
}
