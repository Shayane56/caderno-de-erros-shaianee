import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { Deck, DeckInput } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { cleanName, sameName } from '@/utils/text';
import { validateName } from '@/utils/validation';
import { DuplicateError, NotFoundError, ValidationError } from '../errors';
import { createSnapshot } from '../snapshotService';
import { defaultDeckInput, MAX_DAILY_LIMIT } from './cardModel';
import { deleteCardsCascade } from './cardService';

const DECK_TX = () => [db.decks, db.pendingChanges];

function clampLimit(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.min(MAX_DAILY_LIMIT, Math.floor(value)) : fallback;
}

function validateDeck(input: DeckInput): string {
  const problem = validateName(input.name, 'baralho');
  if (problem) throw new ValidationError(problem, { name: problem });
  return cleanName(input.name);
}

async function assertUniqueDeckName(name: string, ignoreId?: string): Promise<void> {
  const all = await db.decks.toArray();
  const duplicate = all.find((d) => d.id !== ignoreId && sameName(d.name, name));
  if (duplicate) throw new DuplicateError(`O baralho "${duplicate.name}" já existe.`);
}

function buildDeck(input: DeckInput, name: string): Omit<Deck, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...input,
    name,
    description: input.description.trim(),
    emoji: input.emoji.trim().slice(0, 8) || '📒',
    newPerDay: clampLimit(input.newPerDay, 20),
    reviewsPerDay: clampLimit(input.reviewsPerDay, 200),
  };
}

export async function createDeck(input: DeckInput): Promise<Deck> {
  const name = validateDeck(input);
  return db.transaction('rw', DECK_TX(), async () => {
    await assertUniqueDeckName(name);
    const now = nowIso();
    const deck: Deck = { id: createId(), ...buildDeck(input, name), createdAt: now, updatedAt: now };
    await db.decks.add(deck);
    await trackChange('decks', deck.id, now);
    return deck;
  });
}

export async function updateDeck(id: string, input: DeckInput): Promise<Deck> {
  const name = validateDeck(input);
  return db.transaction('rw', DECK_TX(), async () => {
    const current = await db.decks.get(id);
    if (!current) throw new NotFoundError('Baralho não encontrado.');
    await assertUniqueDeckName(name, id);
    const next: Deck = { ...current, ...buildDeck(input, name), updatedAt: nowIso() };
    await db.decks.put(next);
    await trackChange('decks', id, next.updatedAt);
    return next;
  });
}

/** Exclui o baralho e todos os seus cartões (com ponto de restauração quando houver cartões). */
export async function deleteDeck(id: string): Promise<void> {
  const deck = await db.decks.get(id);
  if (!deck) throw new NotFoundError('Baralho não encontrado.');
  const count = await db.cards.where('deckId').equals(id).count();
  if (count > 0) await createSnapshot(`Antes de excluir o baralho "${deck.name}"`);
  await db.transaction('rw', [db.decks, db.cards, db.cardReviews, db.tombstones, db.pendingChanges], async () => {
    const cardIds = (await db.cards.where('deckId').equals(id).primaryKeys()) as string[];
    await deleteCardsCascade(cardIds);
    await db.decks.delete(id);
    await trackDeletion('decks', id);
  });
}

/** Baralho vinculado à matéria — criado automaticamente na primeira vez. */
export async function findOrCreateDeckForSubject(subjectId: string): Promise<Deck> {
  const subject = await db.subjects.get(subjectId);
  if (!subject) throw new NotFoundError('Matéria não encontrada.');
  const linked = (await db.decks.where('subjectId').equals(subjectId).toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (linked) return linked;
  const byName = (await db.decks.toArray()).find((d) => sameName(d.name, subject.name));
  if (byName) return byName;
  const palette = ['rosa', 'lavanda', 'pessego', 'menta', 'ceu', 'coral', 'amarelo', 'roxo'] as const;
  const total = await db.decks.count();
  return createDeck(defaultDeckInput({ name: subject.name, subjectId, color: palette[total % palette.length], emoji: '📒' }));
}
