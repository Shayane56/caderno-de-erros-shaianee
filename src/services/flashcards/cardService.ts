import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { CardInput, ErrorRecord, Flashcard } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { NotFoundError, ValidationError } from '../errors';
import { normalizeTags, syncSrs, validateCardInput } from './cardModel';
import { newSrsState } from './scheduler';

const CARD_TX = () => [db.decks, db.cards, db.pendingChanges];

function validateOrThrow(input: CardInput): void {
  const errors = validateCardInput(input);
  if (Object.keys(errors).length) throw new ValidationError('Revise os campos do cartão.', errors as Record<string, string>);
}

function contentFromInput(input: CardInput): Omit<Flashcard, 'id' | 'srs' | 'suspended' | 'createdAt' | 'updatedAt'> {
  const isBasic = input.type === 'basic';
  return {
    deckId: input.deckId,
    type: input.type,
    front: input.front.trim(),
    back: input.back.trim(),
    extra: input.extra.trim(),
    answer: input.type === 'truefalse' ? (input.answer as 'certo' | 'errado') : null,
    reverse: isBasic && input.reverse,
    frontImage: input.frontImage,
    backImage: input.backImage,
    tags: normalizeTags(input.tags),
    sourceErrorId: input.sourceErrorId,
  };
}

async function assertDeck(deckId: string): Promise<void> {
  if (!(await db.decks.get(deckId))) throw new ValidationError('O baralho selecionado não existe mais.', { deckId: 'Baralho inválido.' });
}

export async function createCard(input: CardInput): Promise<Flashcard> {
  validateOrThrow(input);
  return db.transaction('rw', CARD_TX(), async () => {
    await assertDeck(input.deckId);
    const now = nowIso();
    const content = contentFromInput(input);
    const card: Flashcard = { id: createId(), ...content, suspended: false, srs: syncSrs(content), createdAt: now, updatedAt: now };
    await db.cards.add(card);
    await trackChange('cards', card.id, now);
    return card;
  });
}

export async function updateCard(id: string, input: CardInput): Promise<Flashcard> {
  validateOrThrow(input);
  return db.transaction('rw', CARD_TX(), async () => {
    const current = await db.cards.get(id);
    if (!current) throw new NotFoundError('Cartão não encontrado.');
    await assertDeck(input.deckId);
    const content = contentFromInput(input);
    // Mudar o tipo recomeça o agendamento; editar o texto preserva o progresso das faces que continuam existindo.
    const srs = syncSrs(content, content.type === current.type ? current.srs : {});
    const next: Flashcard = { ...current, ...content, srs, updatedAt: nowIso() };
    await db.cards.put(next);
    await trackChange('cards', id, next.updatedAt);
    return next;
  });
}

/** Remove cartões e suas respostas, registrando as exclusões. Usar dentro de transação. */
export async function deleteCardsCascade(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return;
  const reviewIds = (await db.cardReviews.where('cardId').anyOf(cardIds).primaryKeys()) as string[];
  await db.cardReviews.bulkDelete(reviewIds);
  await db.cards.bulkDelete(cardIds);
  const now = nowIso();
  for (const id of reviewIds) await trackDeletion('cardReviews', id, now);
  for (const id of cardIds) await trackDeletion('cards', id, now);
}

export async function deleteCards(ids: string[]): Promise<void> {
  await db.transaction('rw', [db.cards, db.cardReviews, db.tombstones, db.pendingChanges], async () => {
    await deleteCardsCascade(ids);
  });
}

async function patchCards(ids: string[], patch: (card: Flashcard) => Partial<Flashcard> | null): Promise<number> {
  return db.transaction('rw', [db.cards, db.decks, db.pendingChanges], async () => {
    const now = nowIso();
    let changed = 0;
    for (const id of ids) {
      const card = await db.cards.get(id);
      if (!card) continue;
      const delta = patch(card);
      if (!delta) continue;
      await db.cards.put({ ...card, ...delta, updatedAt: now });
      await trackChange('cards', id, now);
      changed++;
    }
    return changed;
  });
}

export function setSuspended(ids: string[], suspended: boolean): Promise<number> {
  return patchCards(ids, (card) => (card.suspended === suspended ? null : { suspended }));
}

export async function moveCards(ids: string[], deckId: string): Promise<number> {
  await assertDeck(deckId);
  return patchCards(ids, (card) => (card.deckId === deckId ? null : { deckId }));
}

/** "Esquecer": o cartão volta a ser novo (o histórico de respostas é mantido). */
export function resetCards(ids: string[]): Promise<number> {
  return patchCards(ids, (card) => ({ srs: Object.fromEntries(Object.keys(card.srs).map((ord) => [ord, newSrsState()])) }));
}

/* ============================== A partir do Caderno de Erros ============================== */

/** Converte um erro registrado em um cartão frente-e-verso. */
export function cardInputFromError(error: ErrorRecord, deckId: string, topicName?: string): CardInput {
  const front = [error.description.trim(), error.reference.trim() ? `\nQuestão: ${error.reference.trim()}` : ''].join('');
  const back = error.correction.trim() || 'Revise a correção deste erro no caderno.';
  const extraParts = [error.prevention.trim() ? `Como evitar: ${error.prevention.trim()}` : '', error.notes.trim()].filter(Boolean);
  return {
    deckId,
    type: 'basic',
    front,
    back,
    extra: extraParts.join('\n\n'),
    answer: '',
    reverse: false,
    frontImage: null,
    backImage: null,
    tags: normalizeTags(['caderno-de-erros', ...(topicName ? [topicName] : [])]),
    sourceErrorId: error.id,
  };
}

/** Cria cartões para vários erros de uma vez (ignora os que já viraram cartão). */
export async function createCardsFromErrors(deckId: string, errorIds: string[]): Promise<{ created: number; skipped: number }> {
  await assertDeck(deckId);
  const existing = new Set(
    ((await db.cards.where('sourceErrorId').anyOf(errorIds).toArray()) as Flashcard[]).map((c) => c.sourceErrorId),
  );
  let created = 0;
  let skipped = 0;
  for (const id of errorIds) {
    const error = await db.errors.get(id);
    if (!error || existing.has(id)) {
      skipped++;
      continue;
    }
    const topic = await db.topics.get(error.topicId);
    await createCard(cardInputFromError(error, deckId, topic?.name));
    created++;
  }
  return { created, skipped };
}
