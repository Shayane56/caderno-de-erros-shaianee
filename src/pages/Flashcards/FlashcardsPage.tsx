import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, Flame, Layers, Palette, Play, Plus, Sparkles, Target, Trash2, Zap } from 'lucide-react';
import type { Deck } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { StatCard } from '@/components/cards/StatCard';
import { DeckCover } from '@/components/flashcards/DeckCover';
import { DeckFormModal } from '@/components/flashcards/DeckFormModal';
import { ErrorsToCardsModal } from '@/components/flashcards/ErrorsToCardsModal';
import { DueCounts, totalDue } from '@/components/flashcards/DueCounts';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import { useAllCardReviews, useFlashcardData } from '@/hooks/useFlashcards';
import { useErrors } from '@/hooks/useData';
import { deckDueCounts, buildStudyQueue } from '@/services/flashcards/queue';
import { deleteDeck } from '@/services/flashcards/deckService';
import { retentionRate, reviewsPerDay, studyStreak } from '@/services/flashcards/stats';
import { errorMessage } from '@/services/errors';
import { THEME } from '@/constants/theme';
import { cn } from '@/utils/cn';

function ConsistencyStrip({ days }: { days: Array<{ key: string; count: number }> }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex items-end gap-[3px]" aria-hidden>
      {days.map((d) => (
        <span
          key={d.key}
          title={`${d.key.split('-').reverse().join('/')}: ${d.count} resposta(s)`}
          className={cn('h-6 flex-1 rounded-[4px]', d.count === 0 && 'bg-canvas ring-1 ring-inset ring-line')}
          style={d.count ? { backgroundColor: THEME.pink, opacity: 0.25 + 0.75 * (d.count / max) } : undefined}
        />
      ))}
    </div>
  );
}

export default function FlashcardsPage() {
  const data = useFlashcardData();
  const allReviews = useAllCardReviews();
  const errors = useErrors();
  const navigate = useNavigate();
  const toast = useToast();
  const { openCreate } = useCardEditor();
  const [deckForm, setDeckForm] = useState<{ deck: Deck | null } | null>(null);
  const [fromErrors, setFromErrors] = useState(false);
  const [toDelete, setToDelete] = useState<Deck | null>(null);
  const [deleting, setDeleting] = useState(false);

  const view = useMemo(() => {
    const opts = { cards: data.cards, decks: data.decks, reviewsToday: data.reviewsToday, now: data.now };
    const all = buildStudyQueue(opts);
    const reviews = allReviews ?? [];
    const cardsPerDeck = new Map<string, number>();
    for (const c of data.cards) cardsPerDeck.set(c.deckId, (cardsPerDeck.get(c.deckId) ?? 0) + 1);
    return {
      all,
      perDeck: deckDueCounts(opts),
      cardsPerDeck,
      streak: studyStreak(reviews, data.now),
      retention: retentionRate(reviews, 30, data.now),
      doneToday: data.reviewsToday.length,
      days: reviewsPerDay(reviews, 28, data.now),
    };
  }, [data, allReviews]);

  if (data.loading) return <PageLoader />;

  const due = totalDue(view.all.counts);
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDeck(toDelete.id);
      toast.success('Baralho excluído', 'Um ponto de restauração foi criado em Backup e Configurações.');
      setToDelete(null);
    } catch (error) {
      toast.error('Não foi possível excluir', errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Flashcards"
        eyebrow="Repetição espaçada"
        icon={Layers}
        subtitle="Seus cadernos de cartões: o aplicativo calcula o melhor dia para revisar cada um, como o Anki."
        actions={
          <>
            <Button variant="outline" icon={Plus} onClick={() => setDeckForm({ deck: null })}>
              Novo baralho
            </Button>
            <Button variant="secondary" icon={Plus} onClick={() => openCreate()} disabled={data.decks.length === 0}>
              Novo cartão
            </Button>
            <Button icon={Play} onClick={() => navigate('/flashcards/estudar/todos')} disabled={due === 0}>
              Estudar tudo ({due})
            </Button>
          </>
        }
      />

      {data.decks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Layers}
            title="Seu primeiro caderno de flashcards"
            description="Crie um baralho para cada matéria (ou assunto) e escreva cartões de frente e verso, lacunas ou certo/errado. Você também pode transformar os erros que já registrou em cartões."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={Plus} onClick={() => setDeckForm({ deck: null })}>
                  Criar baralho
                </Button>
                {(errors?.length ?? 0) > 0 && (
                  <Button variant="secondary" icon={Sparkles} onClick={() => setFromErrors(true)}>
                    Transformar meus erros em cartões
                  </Button>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Para estudar hoje" value={due} icon={CalendarCheck} hint={<DueCounts counts={view.all.counts} compact />} />
            <StatCard label="Respondidos hoje" value={view.doneToday} icon={Zap} accent={THEME.antique} hint={view.all.next ? 'continue firme!' : 'meta do dia cumprida 💗'} />
            <StatCard label="Dias seguidos" value={view.streak} icon={Flame} accent="#EA580C" hint={view.streak ? 'sequência de estudo' : 'comece hoje a sua sequência'} />
            <StatCard label="Acerto nas revisões" value={view.retention === null ? '—' : `${view.retention}%`} icon={Target} accent="#15803D" hint="últimos 30 dias" />
          </div>

          <section className="card p-4 sm:p-5" aria-label="Constância">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Constância — últimas 4 semanas</span>
              {(errors?.length ?? 0) > 0 && (
                <button type="button" onClick={() => setFromErrors(true)} className="inline-flex items-center gap-1 text-rose-pink hover:text-rose-deep">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Transformar erros em cartões
                </button>
              )}
            </div>
            <ConsistencyStrip days={view.days} />
          </section>

          <section aria-label="Baralhos">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {data.decks.map((deck) => {
                const counts = view.perDeck.get(deck.id) ?? { new: 0, learning: 0, review: 0 };
                const total = view.cardsPerDeck.get(deck.id) ?? 0;
                const deckDue = totalDue(counts);
                return (
                  <li key={deck.id} className="group min-w-0">
                    <Link to={`/flashcards/baralho/${deck.id}`} className="block pl-2 transition duration-200 hover:-translate-y-1 focus-visible:-translate-y-1" aria-label={`Abrir baralho ${deck.name}`}>
                      <DeckCover {...deck} subtitle={`${total} ${total === 1 ? 'cartão' : 'cartões'}`} />
                    </Link>
                    <div className="mt-2.5 space-y-2 pl-2">
                      <DueCounts counts={counts} compact />
                      <div className="flex items-center gap-1">
                        <Button size="sm" icon={Play} className="flex-1" disabled={deckDue === 0} onClick={() => navigate(`/flashcards/estudar/${deck.id}`)}>
                          {deckDue ? 'Estudar' : 'Em dia'}
                        </Button>
                        <IconButton size="sm" icon={Palette} label={`Personalizar ${deck.name}`} onClick={() => setDeckForm({ deck })} />
                        <IconButton size="sm" icon={Trash2} tone="danger" label={`Excluir ${deck.name}`} onClick={() => setToDelete(deck)} />
                      </div>
                    </div>
                  </li>
                );
              })}
              <li className="min-w-0 pl-2">
                <button
                  type="button"
                  onClick={() => setDeckForm({ deck: null })}
                  className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-[0.6rem_1.15rem_1.15rem_0.6rem] border-2 border-dashed border-petal bg-blush/20 text-sm font-semibold text-rose-ink transition hover:border-rose-medium hover:bg-blush/40"
                >
                  <Plus className="h-7 w-7" aria-hidden />
                  Novo baralho
                </button>
              </li>
            </ul>
          </section>
        </>
      )}

      <DeckFormModal open={!!deckForm} deck={deckForm?.deck} onClose={() => setDeckForm(null)} />
      <ErrorsToCardsModal open={fromErrors} onClose={() => setFromErrors(false)} />
      <ConfirmDialog
        open={!!toDelete}
        title={`Excluir o baralho "${toDelete?.name ?? ''}"?`}
        description={`Os ${view.cardsPerDeck.get(toDelete?.id ?? '') ?? 0} cartão(ões) e o histórico de estudo deste baralho serão apagados. Um ponto de restauração é criado antes. Os erros do caderno não são afetados.`}
        confirmLabel="Excluir baralho"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
