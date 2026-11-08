import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCheck,
  Dumbbell,
  FileQuestion,
  Layers,
  NotebookText,
  Palette,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  TextCursorInput,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { CardType, Flashcard } from '@/types';
import { Button, IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { Select } from '@/components/forms/Fields';
import { DeckCover } from '@/components/flashcards/DeckCover';
import { DeckFormModal } from '@/components/flashcards/DeckFormModal';
import { ErrorsToCardsModal } from '@/components/flashcards/ErrorsToCardsModal';
import { DueCounts, totalDue } from '@/components/flashcards/DueCounts';
import { CardFace } from '@/components/flashcards/CardFace';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import { useCardStyle } from '@/components/flashcards/cardStyle';
import { useDeck, useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { useCatalog } from '@/hooks/useData';
import { CARD_TYPES, cardOrds, cardPlainFront } from '@/services/flashcards/cardModel';
import { deleteCards, resetCards, setSuspended } from '@/services/flashcards/cardService';
import { deleteDeck } from '@/services/flashcards/deckService';
import { cardBreakdown, cardStatus, describeNextDue, type CardStatus } from '@/services/flashcards/stats';
import { errorMessage } from '@/services/errors';
import { normalizeText, truncate } from '@/utils/text';
import { cn } from '@/utils/cn';

const TYPE_ICON: Record<CardType, LucideIcon> = { basic: Layers, cloze: TextCursorInput, truefalse: CheckCheck };
const STATUS_FILTERS: Array<{ id: CardStatus | ''; label: string }> = [
  { id: '', label: 'Todos' },
  { id: 'new', label: 'Novos' },
  { id: 'learning', label: 'Aprendendo' },
  { id: 'review', label: 'Em revisão' },
  { id: 'suspended', label: 'Suspensos' },
];
const STATUS_CLASS: Record<CardStatus, string> = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200',
  learning: 'bg-red-50 text-red-700 ring-red-200',
  review: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  suspended: 'bg-canvas text-ink-muted ring-line',
};

type PendingAction = { kind: 'delete' | 'reset'; card: Flashcard } | { kind: 'deleteDeck' };

export default function DeckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deck = useDeck(id);
  const data = useFlashcardData();
  const { lookup } = useCatalog();
  const { openCreate, openEdit } = useCardEditor();
  const queue = useStudyQueue(data, id ? [id] : undefined);
  const style = useCardStyle(deck);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<CardType | ''>('');
  const [status, setStatus] = useState<CardStatus | ''>('');
  const [editingDeck, setEditingDeck] = useState(false);
  const [fromErrors, setFromErrors] = useState(false);
  const [preview, setPreview] = useState<{ card: Flashcard; revealed: boolean } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const cards = useMemo(() => data.cards.filter((c) => c.deckId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.cards, id]);
  const breakdown = useMemo(() => cardBreakdown(cards), [cards]);
  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return cards.filter((c) => {
      if (type && c.type !== type) return false;
      if (status && cardStatus(c) !== status) return false;
      if (!q) return true;
      return normalizeText([c.front, c.back, c.extra, c.tags.join(' ')].join(' ')).includes(q);
    });
  }, [cards, search, type, status]);

  if (deck === undefined || data.loading) return <PageLoader />;
  if (deck === null) {
    return (
      <div className="card">
        <EmptyState icon={FileQuestion} title="Baralho não encontrado" description="Ele pode ter sido excluído." action={<Link to="/flashcards" className="font-semibold text-rose-pink">Voltar para Meus Flashcards</Link>} />
      </div>
    );
  }

  const due = totalDue(queue.counts);
  const subject = deck.subjectId ? lookup.subjects.get(deck.subjectId) : undefined;

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await deleteCards([pending.card.id]);
        toast.success('Cartão excluído');
        setPreview(null);
      } else if (pending.kind === 'reset') {
        await resetCards([pending.card.id]);
        toast.success('Progresso reiniciado', 'O cartão voltou a ser novo.');
      } else {
        await deleteDeck(deck.id);
        toast.success('Baralho excluído', 'Um ponto de restauração foi criado em Backup e Configurações.');
        navigate('/flashcards', { replace: true });
      }
      setPending(null);
    } catch (error) {
      toast.error('Não foi possível concluir', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async (card: Flashcard) => {
    try {
      await setSuspended([card.id], !card.suspended);
      toast.success(card.suspended ? 'Cartão reativado' : 'Cartão suspenso', card.suspended ? undefined : 'Ele não aparece nos estudos até ser reativado.');
    } catch (error) {
      toast.error('Não foi possível alterar', errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/flashcards" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Meus Flashcards
      </Link>

      <header className="card flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <div className="mx-auto w-36 shrink-0 pl-2 sm:mx-0 sm:w-40">
          <DeckCover {...deck} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-antique">Baralho</p>
          <h1 className="font-display text-[26px] font-semibold leading-tight text-ink sm:text-3xl">{deck.name}</h1>
          {deck.description && <p className="mt-1 text-sm text-ink-muted">{deck.description}</p>}
          {subject && (
            <Link to={`/erros?materia=${subject.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-pink hover:text-rose-deep">
              <NotebookText className="h-4 w-4" aria-hidden /> {subject.name} no caderno de erros
            </Link>
          )}
          <div className="mt-3">
            <DueCounts counts={queue.counts} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(
              [
                ['Cartões', breakdown.total],
                ['Novos', breakdown.new],
                ['Aprendendo', breakdown.learning],
                ['Jovens', breakdown.young],
                ['Maduros', breakdown.mature],
                ['Suspensos', breakdown.suspended],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-canvas p-2.5">
                <dt className="text-[11px] font-semibold text-ink-muted">{label}</dt>
                <dd className="text-lg font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={Play} disabled={due === 0} onClick={() => navigate(`/flashcards/estudar/${deck.id}`)}>
              {due ? `Estudar agora (${due})` : 'Tudo em dia'}
            </Button>
            <Button variant="secondary" icon={Plus} onClick={() => openCreate({ deckId: deck.id })}>
              Novo cartão
            </Button>
            <Button variant="outline" icon={Dumbbell} disabled={cards.length === 0} onClick={() => navigate(`/flashcards/estudar/${deck.id}?modo=treino`)} title="Revise todos os cartões sem alterar o agendamento">
              Treino livre
            </Button>
            <Button variant="outline" icon={Palette} onClick={() => setEditingDeck(true)}>
              Personalizar
            </Button>
            <Button variant="ghost" icon={Sparkles} onClick={() => setFromErrors(true)}>
              Gerar dos erros
            </Button>
            <Button variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setPending({ kind: 'deleteDeck' })}>
              Excluir baralho
            </Button>
          </div>
          {due === 0 && cards.length > 0 && <p className="mt-3 text-xs text-ink-muted">{deck.newPerDay} novos por dia · os próximos cartões aparecem automaticamente nos dias certos.</p>}
        </div>
      </header>

      <section className="card p-4 sm:p-5" aria-label="Cartões do baralho">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-antique" aria-hidden />
            <input className="input h-10 py-2 pl-10 text-sm" placeholder="Pesquisar nos cartões…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Pesquisar nos cartões" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Select aria-label="Tipo de cartão" className="h-10 py-2 text-sm" wrapperClassName="lg:w-44" value={type} onChange={(e) => setType(e.target.value as CardType | '')}>
              <option value="">Todos os tipos</option>
              {CARD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Situação" className="h-10 py-2 text-sm" wrapperClassName="lg:w-44" value={status} onChange={(e) => setStatus(e.target.value as CardStatus | '')}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Nenhum cartão ainda"
            description="Escreva o primeiro cartão ou gere cartões a partir dos erros registrados."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={Plus} onClick={() => openCreate({ deckId: deck.id })}>
                  Criar cartão
                </Button>
                <Button variant="secondary" icon={Sparkles} onClick={() => setFromErrors(true)}>
                  Gerar dos erros
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={Search} title="Nenhum cartão encontrado" description="Tente outra palavra ou limpe os filtros." />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((card) => {
              const Icon = TYPE_ICON[card.type];
              const st = cardStatus(card);
              const faces = cardOrds(card).length;
              return (
                <li key={card.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => setPreview({ card, revealed: false })} className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-1 text-left transition hover:bg-canvas">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blush text-rose-pink">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-medium text-ink', card.suspended && 'text-ink-muted line-through decoration-ink-soft')}>
                        {truncate(cardPlainFront(card) || '(imagem)', 140)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                        <span className={cn('chip px-2 py-0.5 text-[11px]', STATUS_CLASS[st])}>{describeNextDue(card, data.now)}</span>
                        {faces > 1 && <span>{faces} faces</span>}
                        {card.sourceErrorId && <span className="font-semibold text-rose-antique">do caderno de erros</span>}
                        {card.tags.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-full bg-canvas px-2 py-0.5">
                            #{t}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 justify-end gap-0.5">
                    <IconButton size="sm" icon={Pencil} label="Editar cartão" onClick={() => openEdit(card)} />
                    <IconButton size="sm" icon={card.suspended ? Play : Pause} label={card.suspended ? 'Reativar cartão' : 'Suspender cartão'} onClick={() => void toggleSuspend(card)} />
                    <IconButton size="sm" icon={RotateCcw} label="Reiniciar progresso" onClick={() => setPending({ kind: 'reset', card })} />
                    <IconButton size="sm" icon={Trash2} tone="danger" label="Excluir cartão" onClick={() => setPending({ kind: 'delete', card })} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title="Cartão"
        footer={
          preview && (
            <>
              <Button variant="outline" onClick={() => setPreview((p) => (p ? { ...p, revealed: !p.revealed } : p))}>
                {preview.revealed ? 'Ver frente' : 'Ver resposta'}
              </Button>
              <Button
                icon={Pencil}
                onClick={() => {
                  const card = preview.card;
                  setPreview(null);
                  openEdit(card);
                }}
              >
                Editar
              </Button>
            </>
          )
        }
      >
        {preview && (
          <div className="space-y-3">
            {cardOrds(preview.card).map((ord) => (
              <CardFace key={ord} card={preview.card} ord={ord} revealed={preview.revealed} style={style} caption={describeNextDue(preview.card, data.now)} minHeight={160} />
            ))}
          </div>
        )}
      </Modal>

      <DeckFormModal open={editingDeck} deck={deck} onClose={() => setEditingDeck(false)} />
      <ErrorsToCardsModal open={fromErrors} onClose={() => setFromErrors(false)} deck={deck} />
      <ConfirmDialog
        open={!!pending}
        title={pending?.kind === 'deleteDeck' ? `Excluir o baralho "${deck.name}"?` : pending?.kind === 'reset' ? 'Reiniciar o progresso deste cartão?' : 'Excluir este cartão?'}
        description={
          pending?.kind === 'deleteDeck'
            ? `Os ${cards.length} cartão(ões) e o histórico de estudo serão apagados. Um ponto de restauração é criado antes.`
            : pending?.kind === 'reset'
              ? 'Ele volta a ser um cartão novo. O histórico de respostas é mantido.'
              : 'O cartão e suas respostas serão apagados definitivamente.'
        }
        confirmLabel={pending?.kind === 'reset' ? 'Reiniciar' : 'Excluir'}
        tone={pending?.kind === 'reset' ? 'primary' : 'danger'}
        loading={busy}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
