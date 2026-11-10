import { useMemo } from 'react';
import type { CardReview, Deck, Flashcard, Subject } from '@/types';
import { getDeckColor } from '@/constants/cardStyles';
import { deckDueCounts } from '@/services/flashcards/queue';
import { cardBreakdown, cardStatus, describeNextDue, type CardStatus } from '@/services/flashcards/stats';
import { cardPlainFront } from '@/services/flashcards/cardModel';
import { useAllCardReviews, useFlashcardData } from '@/hooks/useFlashcards';
import { useSubjects } from '@/hooks/useData';

export interface DueCountsView {
  new: number;
  learning: number;
  review: number;
  total: number;
}

export interface DeckSummary {
  deck: Deck;
  subjectName: string | null;
  cards: number;
  faces: number;
  due: DueCountsView;
  /** Percentual de faces maduras (intervalo ≥ 21 dias). */
  mastery: number;
  /** Faces já vistas ao menos uma vez. */
  seen: number;
  lastStudiedAt: string | null;
  /** Cor do baralho (escolhida pela pessoa) — cada identidade decide como usá-la. */
  tone: { color: string; deep: string };
  /** Monograma (duas letras) — as identidades usam no lugar dos emojis. */
  monogram: string;
}

export interface SubjectGroup {
  id: string;
  name: string;
  decks: DeckSummary[];
  due: number;
  cards: number;
}

export function monogramOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /\d/.test(w));
  const picked = words.length ? words : name.split(/\s+/).filter(Boolean);
  const letters = picked.length >= 2 ? picked[0][0] + picked[1][0] : (picked[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

const withTotal = (c: { new: number; learning: number; review: number }): DueCountsView => ({ ...c, total: c.new + c.learning + c.review });

export function summarizeDecks(decks: Deck[], cards: Flashcard[], reviewsToday: CardReview[], allReviews: CardReview[], subjects: Subject[], now: Date): DeckSummary[] {
  const perDeck = deckDueCounts({ cards, decks, reviewsToday, now });
  const cardsByDeck = new Map<string, Flashcard[]>();
  for (const c of cards) {
    const list = cardsByDeck.get(c.deckId) ?? [];
    list.push(c);
    cardsByDeck.set(c.deckId, list);
  }
  const lastByDeck = new Map<string, string>();
  for (const r of allReviews) {
    const prev = lastByDeck.get(r.deckId);
    if (!prev || r.reviewedAt > prev) lastByDeck.set(r.deckId, r.reviewedAt);
  }
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  return decks.map((deck) => {
    const list = cardsByDeck.get(deck.id) ?? [];
    const b = cardBreakdown(list);
    const tone = getDeckColor(deck.color);
    return {
      deck,
      subjectName: deck.subjectId ? (subjectName.get(deck.subjectId) ?? null) : null,
      cards: list.length,
      faces: b.faces,
      due: withTotal(perDeck.get(deck.id) ?? { new: 0, learning: 0, review: 0 }),
      mastery: b.faces ? Math.round((b.mature / b.faces) * 100) : 0,
      seen: b.faces - b.new,
      lastStudiedAt: lastByDeck.get(deck.id) ?? null,
      tone: { color: tone.color, deep: tone.deep },
      monogram: monogramOf(deck.name),
    };
  });
}

export function groupBySubject(summaries: DeckSummary[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  for (const s of summaries) {
    const id = s.deck.subjectId && s.subjectName ? s.deck.subjectId : 'sem-disciplina';
    const g = groups.get(id) ?? { id, name: s.subjectName ?? 'Sem disciplina', decks: [], due: 0, cards: 0 };
    g.decks.push(s);
    g.due += s.due.total;
    g.cards += s.cards;
    groups.set(id, g);
  }
  return [...groups.values()].sort((a, b) => (a.id === 'sem-disciplina' ? 1 : b.id === 'sem-disciplina' ? -1 : a.name.localeCompare(b.name, 'pt-BR')));
}

export interface DecksModel {
  loading: boolean;
  decks: DeckSummary[];
  groups: SubjectGroup[];
  totals: { decks: number; cards: number; due: number; mastery: number };
}

/** Baralhos com contagens do dia, maturidade e agrupamento por disciplina. */
export function useDecksModel(): DecksModel {
  const data = useFlashcardData();
  const allReviews = useAllCardReviews();
  const subjects = useSubjects();
  return useMemo(() => {
    const decks = summarizeDecks(data.decks, data.cards, data.reviewsToday, allReviews ?? [], subjects ?? [], data.now);
    const faces = decks.reduce((s, d) => s + d.faces, 0);
    const mature = decks.reduce((s, d) => s + (d.mastery * d.faces) / 100, 0);
    return {
      loading: data.loading || allReviews === undefined || subjects === undefined,
      decks,
      groups: groupBySubject(decks),
      totals: {
        decks: decks.length,
        cards: data.cards.length,
        due: decks.reduce((s, d) => s + d.due.total, 0),
        mastery: faces ? Math.round((mature / faces) * 100) : 0,
      },
    };
  }, [data, allReviews, subjects]);
}

export interface CardRow {
  card: Flashcard;
  text: string;
  status: CardStatus;
  next: string;
}

export interface DeckDetailModel {
  loading: boolean;
  summary: DeckSummary | null;
  rows: CardRow[];
  breakdown: ReturnType<typeof cardBreakdown>;
}

export const STATUS_LABEL: Record<CardStatus, string> = { new: 'Novo', learning: 'Aprendendo', review: 'Em revisão', suspended: 'Suspenso' };

/** Um baralho com a lista de cartões (texto da frente, situação e próxima revisão). */
export function useDeckDetail(deckId: string | undefined): DeckDetailModel {
  const data = useFlashcardData();
  const allReviews = useAllCardReviews();
  const subjects = useSubjects();
  return useMemo(() => {
    const deck = data.decks.find((d) => d.id === deckId) ?? null;
    const cards = data.cards.filter((c) => c.deckId === deckId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const summary = deck ? summarizeDecks([deck], cards, data.reviewsToday, allReviews ?? [], subjects ?? [], data.now)[0] : null;
    return {
      loading: data.loading || allReviews === undefined,
      summary,
      rows: cards.map((card) => ({ card, text: cardPlainFront(card), status: cardStatus(card), next: describeNextDue(card, data.now) })),
      breakdown: cardBreakdown(cards),
    };
  }, [data, allReviews, subjects, deckId]);
}
