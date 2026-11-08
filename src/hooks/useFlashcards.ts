import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import type { CardReview, Deck, Flashcard } from '@/types';
import { useNow } from './useNow';
import { buildStudyQueue, type StudyQueue } from '@/services/flashcards/queue';
import { studyDayStart } from '@/services/flashcards/scheduler';

const byName = (list: Deck[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export function useDecks(): Deck[] | undefined {
  return useLiveQuery(async () => byName(await db.decks.toArray()), []);
}

/** `null` quando não existe; `undefined` enquanto carrega. */
export function useDeck(id: string | undefined): Deck | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.decks.get(id)) ?? null) : null), [id]);
}

export function useCards(deckId?: string): Flashcard[] | undefined {
  return useLiveQuery(() => (deckId ? db.cards.where('deckId').equals(deckId).toArray() : db.cards.toArray()), [deckId]);
}

export function useCard(id: string | undefined): Flashcard | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.cards.get(id)) ?? null) : null), [id]);
}

/** Cartões criados a partir de um erro do caderno. */
export function useCardsFromError(errorId: string | undefined): Flashcard[] | undefined {
  return useLiveQuery(async () => (errorId ? db.cards.where('sourceErrorId').equals(errorId).toArray() : []), [errorId]);
}

export function useCardReviewsSince(sinceIso: string): CardReview[] | undefined {
  return useLiveQuery(() => db.cardReviews.where('reviewedAt').aboveOrEqual(sinceIso).toArray(), [sinceIso]);
}

export function useAllCardReviews(): CardReview[] | undefined {
  return useLiveQuery(() => db.cardReviews.toArray(), []);
}

export interface FlashcardData {
  decks: Deck[];
  cards: Flashcard[];
  reviewsToday: CardReview[];
  loading: boolean;
}

/** Baralhos, cartões e respostas do dia (atualiza a cada minuto para liberar cartões em aprendizagem). */
export function useFlashcardData(): FlashcardData & { now: Date } {
  const now = useNow(30_000);
  const dayStart = studyDayStart(now).toISOString();
  const decks = useDecks();
  const cards = useCards();
  const reviewsToday = useCardReviewsSince(dayStart);
  return useMemo(
    () => ({
      decks: decks ?? [],
      cards: cards ?? [],
      reviewsToday: reviewsToday ?? [],
      loading: decks === undefined || cards === undefined || reviewsToday === undefined,
      now,
    }),
    [decks, cards, reviewsToday, now],
  );
}

/** Fila de estudo de um conjunto de baralhos. */
export function useStudyQueue(data: FlashcardData & { now: Date }, deckIds?: string[]): StudyQueue {
  const key = deckIds?.join(',') ?? '';
  return useMemo(
    () => buildStudyQueue({ cards: data.cards, decks: data.decks, reviewsToday: data.reviewsToday, now: data.now, deckIds: key ? key.split(',') : undefined }),
    [data, key],
  );
}
