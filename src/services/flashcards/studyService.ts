import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { CardReview, Flashcard, Rating, SrsState } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { NotFoundError } from '../errors';
import { scheduleAnswer } from './scheduler';

/** Informações para desfazer a última resposta. */
export interface UndoInfo {
  cardId: string;
  ord: string;
  previous: SrsState;
  previousUpdatedAt: string;
  reviewId: string;
}

export interface AnswerResult {
  card: Flashcard;
  review: CardReview;
  undo: UndoInfo;
}

/** Registra a resposta de uma face e reagenda o cartão. */
export async function answerCard(cardId: string, ord: string, rating: Rating, durationMs = 0, now = new Date()): Promise<AnswerResult> {
  return db.transaction('rw', [db.cards, db.cardReviews, db.pendingChanges], async () => {
    const card = await db.cards.get(cardId);
    if (!card) throw new NotFoundError('Cartão não encontrado.');
    const previous = card.srs[ord];
    if (!previous) throw new NotFoundError('Esta face do cartão não existe mais.');
    const nextState = scheduleAnswer(previous, rating, now);
    const stamp = now.toISOString();
    const updated: Flashcard = { ...card, srs: { ...card.srs, [ord]: nextState }, updatedAt: stamp };
    await db.cards.put(updated);
    await trackChange('cards', cardId, stamp);
    const review: CardReview = {
      id: createId(),
      cardId,
      deckId: card.deckId,
      ord,
      reviewedAt: stamp,
      rating,
      phaseBefore: previous.phase,
      intervalBefore: previous.interval,
      intervalAfter: nextState.interval,
      easeAfter: nextState.ease,
      durationMs: Math.max(0, Math.min(3_600_000, Math.round(durationMs))),
    };
    await db.cardReviews.add(review);
    await trackChange('cardReviews', review.id, stamp);
    return { card: updated, review, undo: { cardId, ord, previous, previousUpdatedAt: card.updatedAt, reviewId: review.id } };
  });
}

/** Desfaz a última resposta: restaura o agendamento anterior e apaga o registro. */
export async function undoAnswer(undo: UndoInfo): Promise<void> {
  await db.transaction('rw', [db.cards, db.cardReviews, db.tombstones, db.pendingChanges], async () => {
    const card = await db.cards.get(undo.cardId);
    const now = nowIso();
    if (card) {
      await db.cards.put({ ...card, srs: { ...card.srs, [undo.ord]: undo.previous }, updatedAt: now });
      await trackChange('cards', card.id, now);
    }
    if (await db.cardReviews.get(undo.reviewId)) {
      await db.cardReviews.delete(undo.reviewId);
      await trackDeletion('cardReviews', undo.reviewId, now);
    }
  });
}
