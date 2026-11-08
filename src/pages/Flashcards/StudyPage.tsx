import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Dumbbell, Eye, PartyPopper, Pencil, RotateCcw, Shuffle, ThumbsDown, ThumbsUp, Undo2 } from 'lucide-react';
import type { Deck, Flashcard, Rating } from '@/types';
import { Button, IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { PageLoader } from '@/components/common/Spinner';
import { useToast } from '@/components/common/Toast';
import { CardFace } from '@/components/flashcards/CardFace';
import { DueCounts } from '@/components/flashcards/DueCounts';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import { resolveCardStyle } from '@/components/flashcards/cardStyle';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { useAppearance } from '@/services/appearance';
import { ordLabel } from '@/services/flashcards/cardModel';
import { previewIntervals, RATING_LABELS, formatWait } from '@/services/flashcards/scheduler';
import { answerCard, undoAnswer, type UndoInfo } from '@/services/flashcards/studyService';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';

const RATING_STYLE: Record<Rating, string> = {
  1: 'border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50',
  2: 'border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50',
  3: 'border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50',
  4: 'border-sky-200 text-sky-700 hover:border-sky-300 hover:bg-sky-50',
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!document.querySelector('[role="dialog"]');
}

interface SessionStats {
  answered: number;
  correct: number;
  ms: number;
}

function Summary({ stats, deckName, laterToday, nextDueAt, onBack, onTrain }: { stats: SessionStats; deckName: string; laterToday: number; nextDueAt: string | null; onBack: () => void; onTrain?: () => void }) {
  const minutes = Math.max(1, Math.round(stats.ms / 60_000));
  const pct = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal text-rose-pink">
          <PartyPopper className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold">{stats.answered ? 'Estudo de hoje concluído!' : 'Tudo em dia por aqui!'}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {stats.answered
            ? `Você respondeu ${stats.answered} ${stats.answered === 1 ? 'cartão' : 'cartões'} de “${deckName}”. A memória agradece — e o dia da prova também.`
            : `Não há cartões de “${deckName}” para estudar agora. Os próximos aparecem sozinhos nos dias certos.`}
        </p>
        {stats.answered > 0 && (
          <dl className="mt-6 grid grid-cols-3 gap-2">
            {(
              [
                ['Respondidos', stats.answered],
                ['Acertos', `${pct}%`],
                ['Tempo', `${minutes} min`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-canvas p-3">
                <dt className="text-[11px] font-semibold text-ink-muted">{label}</dt>
                <dd className="text-2xl font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {nextDueAt && (
          <p className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-blush/50 p-3 text-sm text-rose-ink">
            <Clock className="h-4 w-4" aria-hidden />
            {laterToday + 1} cartão(ões) em aprendizagem volta(m) em {formatWait(new Date(nextDueAt).getTime() - Date.now())}. Deixe esta tela aberta ou volte depois.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onBack}>Voltar aos baralhos</Button>
          {onTrain && (
            <Button variant="outline" icon={Dumbbell} onClick={onTrain}>
              Treino livre
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ Treino livre (não altera o agendamento) */

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function TrainingSession({ cards, decks, title, onExit }: { cards: Flashcard[]; decks: Deck[]; title: string; onExit: () => void }) {
  const appearance = useAppearance();
  const [queue, setQueue] = useState(() => shuffle(cards.filter((c) => !c.suspended).flatMap((card) => Object.keys(card.srs).map((ord) => ({ card, ord })))));
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const total = useRef(queue.length);
  const current = queue[0];
  const deck = decks.find((d) => d.id === current?.card.deckId);

  const answer = useCallback(
    (ok: boolean) => {
      setQueue((q) => (ok ? q.slice(1) : [...q.slice(1), q[0]]));
      if (ok) setKnown((k) => k + 1);
      setRevealed(false);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else answer(true);
      } else if (revealed && e.key === '1') answer(false);
      else if (revealed && (e.key === '2' || e.key === '3' || e.key === '4')) answer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, answer]);

  if (!current) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal text-rose-pink">
            <Dumbbell className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-semibold">Treino concluído!</h1>
          <p className="mt-2 text-sm text-ink-muted">Você passou por {total.current} face(s) de cartão. O agendamento das revisões não foi alterado.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={onExit}>Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const style = resolveCardStyle(deck, appearance);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> {title}
        </button>
        <span className="chip bg-blush text-rose-ink ring-petal">
          <Dumbbell className="h-3.5 w-3.5" aria-hidden /> Treino livre · {known}/{total.current}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-line" role="progressbar" aria-valuenow={known} aria-valuemin={0} aria-valuemax={total.current} aria-label="Progresso do treino">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-medium to-rose-pink transition-all" style={{ width: `${(known / Math.max(1, total.current)) * 100}%` }} />
      </div>
      <CardFace key={`${current.card.id}:${current.ord}`} card={current.card} ord={current.ord} revealed={revealed} style={style} minHeight={300} onImageClick={setZoom} caption={deck ? `${deck.emoji} ${deck.name}` : undefined} />
      <div className="card p-4">
        {revealed ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon={ThumbsDown} className={cn('h-12', RATING_STYLE[1])} onClick={() => answer(false)}>
              Ainda não sei
            </Button>
            <Button variant="outline" icon={ThumbsUp} className={cn('h-12', RATING_STYLE[3])} onClick={() => answer(true)}>
              Já sei
            </Button>
          </div>
        ) : (
          <Button block size="lg" icon={Eye} onClick={() => setRevealed(true)}>
            Mostrar resposta
          </Button>
        )}
      </div>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Imagem" size="xl">
        {zoom && <img src={zoom} alt="Imagem ampliada do cartão" className="mx-auto max-h-[75dvh] w-auto rounded-xl" />}
      </Modal>
    </div>
  );
}

/* ================================================================ Estudo com repetição espaçada */

export default function StudyPage() {
  const { deckId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const appearance = useAppearance();
  const { openEdit } = useCardEditor();
  // Atualiza a cada 10 s para liberar logo os cartões em aprendizagem (etapas de 1 e 10 min).
  const data = useFlashcardData(10_000);
  const all = deckId === 'todos' || !deckId;
  const scope = useMemo(() => (all ? undefined : [deckId!]), [all, deckId]);
  const queue = useStudyQueue(data, scope);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [tfChoice, setTfChoice] = useState<{ key: string; value: 'certo' | 'errado' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState<UndoInfo | null>(null);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0, ms: 0 });
  const [zoom, setZoom] = useState<string | null>(null);
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

  const rate = useCallback(
    async (rating: Rating) => {
      if (!item || saving) return;
      setSaving(true);
      const duration = Date.now() - shownAt.current;
      try {
        const result = await answerCard(item.card.id, item.ord, rating, duration);
        setUndo(result.undo);
        setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (rating > 1 ? 1 : 0), ms: s.ms + Math.min(duration, 300_000) }));
      } catch (error) {
        toast.error('Não foi possível registrar a resposta', errorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [item, saving, toast],
  );

  const doUndo = useCallback(async () => {
    if (!undo) return;
    try {
      await undoAnswer(undo);
      setUndo(null);
      setStats((s) => ({ ...s, answered: Math.max(0, s.answered - 1) }));
      toast.info('Resposta desfeita');
    } catch (error) {
      toast.error('Não foi possível desfazer', errorMessage(error));
    }
  }, [undo, toast]);

  const isTF = item?.card.type === 'truefalse';
  const tf = tfChoice && tfChoice.key === key ? tfChoice.value : null;
  const tfCorrect = isTF && tf ? tf === item!.card.answer : null;

  const reveal = useCallback(() => key && setRevealedKey(key), [key]);
  const chooseTF = useCallback(
    (value: 'certo' | 'errado') => {
      if (!key) return;
      setTfChoice({ key, value });
      setRevealedKey(key);
    },
    [key],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || !item) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void doUndo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!revealed) {
        if (isTF && (e.key === 'c' || e.key === 'C')) chooseTF('certo');
        else if (isTF && (e.key === 'e' || e.key === 'E' || e.key === 'x')) chooseTF('errado');
        else if (!isTF && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          reveal();
        }
        return;
      }
      const allowed: Rating[] = tfCorrect === false ? [1] : tfCorrect === true ? [2, 3, 4] : [1, 2, 3, 4];
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        void rate(allowed.includes(3) ? 3 : 1);
      } else if (['1', '2', '3', '4'].includes(e.key) && allowed.includes(Number(e.key) as Rating)) {
        void rate(Number(e.key) as Rating);
      } else if (e.key.toLowerCase() === 'e') openEdit(item.card);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, revealed, isTF, tfCorrect, rate, reveal, chooseTF, doUndo, openEdit]);

  if (data.loading) return <PageLoader />;
  if (!all && !data.decks.some((d) => d.id === deckId)) {
    return (
      <div className="card">
        <EmptyState icon={RotateCcw} title="Baralho não encontrado" action={<Link to="/flashcards" className="font-semibold text-rose-pink">Voltar para Meus Flashcards</Link>} />
      </div>
    );
  }

  if (params.get('modo') === 'treino') {
    const cards = data.cards.filter((c) => all || c.deckId === deckId);
    return <TrainingSession key={deckId} cards={cards} decks={data.decks} title={title} onExit={() => navigate(all ? '/flashcards' : `/flashcards/baralho/${deckId}`)} />;
  }

  if (!item) {
    return (
      <Summary
        stats={stats}
        deckName={title}
        laterToday={queue.laterToday}
        nextDueAt={queue.nextDueAt}
        onBack={() => navigate(all ? '/flashcards' : `/flashcards/baralho/${deckId}`)}
        onTrain={data.cards.some((c) => all || c.deckId === deckId) ? () => navigate(`/flashcards/estudar/${deckId ?? 'todos'}?modo=treino`) : undefined}
      />
    );
  }

  const style = resolveCardStyle(deck, appearance);
  const face = ordLabel(item.card, item.ord);
  const allowed: Rating[] = tfCorrect === false ? [1] : tfCorrect === true ? [2, 3, 4] : [1, 2, 3, 4];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to={all ? '/flashcards' : `/flashcards/baralho/${deckId}`} className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{title}</span>
        </Link>
        <div className="flex items-center gap-1">
          <IconButton icon={Undo2} label="Desfazer última resposta (Ctrl+Z)" disabled={!undo || saving} onClick={() => void doUndo()} />
          <IconButton icon={Pencil} label="Editar cartão (E)" onClick={() => openEdit(item.card)} />
          <IconButton icon={Shuffle} label="Treino livre (sem alterar o agendamento)" onClick={() => navigate(`/flashcards/estudar/${deckId ?? 'todos'}?modo=treino`)} />
        </div>
      </div>
      <DueCounts counts={queue.counts} active={item.kind} className="justify-center" />

      <CardFace
        key={key}
        card={item.card}
        ord={item.ord}
        revealed={revealed}
        style={style}
        minHeight={300}
        onImageClick={setZoom}
        caption={[deck && all ? `${deck.emoji} ${deck.name}` : null, face || null].filter(Boolean).join(' · ') || undefined}
        className="animate-card-flip"
      />

      <div className="card p-4 sm:p-5">
        {!revealed ? (
          isTF ? (
            <div>
              <p className="mb-3 text-center text-sm font-semibold text-ink">Certo ou errado?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" icon={ThumbsUp} className={RATING_STYLE[3]} onClick={() => chooseTF('certo')}>
                  Certo <kbd className="ml-1 hidden text-[11px] opacity-60 sm:inline">C</kbd>
                </Button>
                <Button variant="outline" size="lg" icon={ThumbsDown} className={RATING_STYLE[1]} onClick={() => chooseTF('errado')}>
                  Errado <kbd className="ml-1 hidden text-[11px] opacity-60 sm:inline">E</kbd>
                </Button>
              </div>
            </div>
          ) : (
            <Button block size="lg" icon={Eye} onClick={reveal}>
              Mostrar resposta <kbd className="ml-1 hidden text-xs opacity-70 sm:inline">espaço</kbd>
            </Button>
          )
        ) : (
          <div>
            {tfCorrect !== null && (
              <p className={cn('mb-3 rounded-2xl p-3 text-center text-sm font-semibold', tfCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')} role="status">
                {tfCorrect ? 'Você acertou! Quão fácil foi?' : 'Você errou — o cartão volta daqui a pouco para fixar.'}
              </p>
            )}
            {tfCorrect === null && <p className="mb-3 text-center text-sm font-semibold text-ink">Como foi lembrar?</p>}
            <div className={cn('grid gap-2', allowed.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : allowed.length === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
              {allowed.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={saving}
                  onClick={() => void rate(r)}
                  className={cn('flex flex-col items-center justify-center rounded-2xl border bg-surface px-2 py-2.5 transition disabled:opacity-50', RATING_STYLE[r])}
                >
                  <span className="text-[15px] font-bold">{tfCorrect === false ? 'Continuar' : RATING_LABELS[r]}</span>
                  <span className="text-xs font-medium opacity-80">
                    {intervals?.[r]} <kbd className="ml-0.5 hidden opacity-60 sm:inline">{r}</kbd>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-[11px] text-ink-soft">
        Atalhos: espaço revela/“Bom” · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil · E editar · Ctrl+Z desfazer
      </p>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Imagem" size="xl">
        {zoom && <img src={zoom} alt="Imagem ampliada do cartão" className="mx-auto max-h-[75dvh] w-auto rounded-xl" />}
      </Modal>
    </div>
  );
}
