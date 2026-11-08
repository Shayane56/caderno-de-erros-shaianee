import { Link, useNavigate } from 'react-router-dom';
import { Layers, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { DueCounts, totalDue } from '@/components/flashcards/DueCounts';
import { DeckCover } from '@/components/flashcards/DeckCover';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';

/** Resumo dos flashcards do dia no Painel. */
export function FlashcardsTodayCard() {
  const data = useFlashcardData();
  const queue = useStudyQueue(data);
  const navigate = useNavigate();
  if (data.loading) return null;
  const due = totalDue(queue.counts);
  const decks = data.decks.slice(0, 3);

  return (
    <section className="card flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6" aria-label="Flashcards de hoje">
      {decks.length > 0 && (
        <div className="hidden shrink-0 -space-x-10 pl-2 sm:flex" aria-hidden>
          {decks.map((deck, i) => (
            <div key={deck.id} className="w-20" style={{ transform: `rotate(${(i - 1) * 6}deg)` }}>
              <DeckCover {...deck} size="sm" />
            </div>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="section-title flex items-center gap-2">
          <Layers className="h-[18px] w-[18px] text-rose-pink" aria-hidden /> Flashcards de hoje
        </h2>
        {data.decks.length === 0 ? (
          <p className="mt-1 text-sm text-ink-muted">Transforme seus erros em cartões e revise no momento certo, com repetição espaçada como no Anki.</p>
        ) : due > 0 ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {due} {due === 1 ? 'cartão' : 'cartões'} esperando por você · {data.reviewsToday.length} respondido(s) hoje
            </p>
            <DueCounts counts={queue.counts} className="mt-2" />
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">Tudo em dia! {data.reviewsToday.length ? `Você respondeu ${data.reviewsToday.length} cartão(ões) hoje. 💗` : 'Os próximos cartões aparecem nos dias certos.'}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {data.decks.length === 0 ? (
          <Button icon={Sparkles} onClick={() => navigate('/flashcards')}>
            Começar
          </Button>
        ) : (
          <>
            <Link to="/flashcards" className="inline-flex h-11 items-center rounded-2xl border border-line bg-surface px-4 text-[15px] font-semibold text-ink transition hover:border-rose-medium">
              Baralhos
            </Link>
            <Button icon={Play} disabled={due === 0} onClick={() => navigate('/flashcards/estudar/todos')}>
              Estudar
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
