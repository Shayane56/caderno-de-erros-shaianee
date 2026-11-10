import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Deck, Rating } from '@/types';
import { useToast } from '@/components/common/Toast';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { ordLabel } from '@/services/flashcards/cardModel';
import { previewIntervals, RATING_LABELS } from '@/services/flashcards/scheduler';
import { answerCard, undoAnswer, type UndoInfo } from '@/services/flashcards/studyService';
import type { StudyItem } from '@/services/flashcards/queue';
import { errorMessage } from '@/services/errors';
import type { DueCountsView } from './decks';

export { RATING_LABELS };

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!document.querySelector('[role="dialog"]');
}

export interface SessionStats {
  answered: number;
  correct: number;
  ms: number;
}

export interface ReviewSession {
  loading: boolean;
  notFound: boolean;
  all: boolean;
  title: string;
  deck: Deck | null;
  item: StudyItem | null;
  /** Muda a cada face apresentada (use como `key` para animar a troca). */
  key: string | null;
  faceLabel: string;
  counts: DueCountsView;
  revealed: boolean;
  reveal: () => void;
  isTrueFalse: boolean;
  chooseTrueFalse: (value: 'certo' | 'errado') => void;
  /** Resultado do "Certo ou Errado" (null quando não se aplica ou ainda não respondeu). */
  trueFalseCorrect: boolean | null;
  allowed: Rating[];
  intervals: Record<Rating, string> | null;
  rate: (rating: Rating) => Promise<void>;
  saving: boolean;
  canUndo: boolean;
  undo: () => Promise<void>;
  edit: () => void;
  stats: SessionStats;
  /** Progresso da sessão (0–100): respondidos ÷ (respondidos + restantes). */
  progress: number;
  laterToday: number;
  nextDueAt: string | null;
}

/**
 * Sessão de revisão com repetição espaçada: a mesma lógica da tela de estudo
 * original (fila, limites diários, desfazer, atalhos de teclado), sem nenhuma
 * marcação visual — cada identidade desenha a sua.
 */
export function useReviewSession(deckId: string | undefined): ReviewSession {
  const toast = useToast();
  const { openEdit } = useCardEditor();
  const data = useFlashcardData(10_000);
  const all = !deckId || deckId === 'todos';
  const scope = useMemo(() => (all ? undefined : [deckId!]), [all, deckId]);
  const queue = useStudyQueue(data, scope);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [tfChoice, setTfChoice] = useState<{ key: string; value: 'certo' | 'errado' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [undoInfo, setUndoInfo] = useState<UndoInfo | null>(null);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0, ms: 0 });
  const shownAt = useRef(Date.now());

  const item = queue.next;
  const key = item ? `${item.card.id}:${item.ord}:${item.state.reps}` : null;
  const revealed = !!key && revealedKey === key;
  const deck = data.decks.find((d) => d.id === (item?.card.deckId ?? deckId)) ?? null;
  const title = all ? 'Todos os baralhos' : (data.decks.find((d) => d.id === deckId)?.name ?? 'Baralho');

  useEffect(() => {
    shownAt.current = Date.now();
  }, [key]);

  const intervals = useMemo(() => (item ? previewIntervals(item.state, new Date()) : null), [item]);
  const isTrueFalse = item?.card.type === 'truefalse';
  const tf = tfChoice && tfChoice.key === key ? tfChoice.value : null;
  const trueFalseCorrect = isTrueFalse && tf ? tf === item!.card.answer : null;
  const allowed: Rating[] = trueFalseCorrect === false ? [1] : trueFalseCorrect === true ? [2, 3, 4] : [1, 2, 3, 4];

  const rate = useCallback(
    async (rating: Rating) => {
      if (!item || saving) return;
      setSaving(true);
      const duration = Date.now() - shownAt.current;
      try {
        const result = await answerCard(item.card.id, item.ord, rating, duration);
        setUndoInfo(result.undo);
        setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (rating > 1 ? 1 : 0), ms: s.ms + Math.min(duration, 300_000) }));
      } catch (error) {
        toast.error('Não foi possível registrar a resposta', errorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [item, saving, toast],
  );

  const undo = useCallback(async () => {
    if (!undoInfo) return;
    try {
      await undoAnswer(undoInfo);
      setUndoInfo(null);
      setStats((s) => ({ ...s, answered: Math.max(0, s.answered - 1) }));
      toast.info('Resposta desfeita');
    } catch (error) {
      toast.error('Não foi possível desfazer', errorMessage(error));
    }
  }, [undoInfo, toast]);

  const reveal = useCallback(() => {
    if (key) setRevealedKey(key);
  }, [key]);

  const chooseTrueFalse = useCallback(
    (value: 'certo' | 'errado') => {
      if (!key) return;
      setTfChoice({ key, value });
      setRevealedKey(key);
    },
    [key],
  );

  const edit = useCallback(() => {
    if (item) openEdit(item.card);
  }, [item, openEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || !item) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!revealed) {
        if (isTrueFalse && (e.key === 'c' || e.key === 'C')) chooseTrueFalse('certo');
        else if (isTrueFalse && (e.key === 'e' || e.key === 'E' || e.key === 'x')) chooseTrueFalse('errado');
        else if (!isTrueFalse && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          reveal();
        }
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        void rate(allowed.includes(3) ? 3 : 1);
      } else if (['1', '2', '3', '4'].includes(e.key) && allowed.includes(Number(e.key) as Rating)) {
        void rate(Number(e.key) as Rating);
      } else if (e.key.toLowerCase() === 'e') edit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, revealed, isTrueFalse, allowed, rate, reveal, chooseTrueFalse, undo, edit]);

  const counts = { ...queue.counts, total: queue.counts.new + queue.counts.learning + queue.counts.review };
  const remaining = counts.total;
  return {
    loading: data.loading,
    notFound: !data.loading && !all && !data.decks.some((d) => d.id === deckId),
    all,
    title,
    deck,
    item,
    key,
    faceLabel: item ? ordLabel(item.card, item.ord) : '',
    counts,
    revealed,
    reveal,
    isTrueFalse: !!isTrueFalse,
    chooseTrueFalse,
    trueFalseCorrect,
    allowed,
    intervals,
    rate,
    saving,
    canUndo: !!undoInfo && !saving,
    undo,
    edit,
    stats,
    progress: stats.answered + remaining === 0 ? 0 : Math.round((stats.answered / (stats.answered + remaining)) * 100),
    laterToday: queue.laterToday,
    nextDueAt: queue.nextDueAt,
  };
}

export const KIND_LABEL = { new: 'Novo', learning: 'Aprendendo', review: 'Revisão' } as const;

/**
 * No celular os botões de resposta ficam fixos no rodapé: ao revelar, rola só o
 * necessário para a resposta aparecer acima deles (scroll-margin no elemento).
 */
export function useRevealScroll(revealed: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revealed || !ref.current) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [revealed]);
  return ref;
}
