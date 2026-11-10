import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PenLine, Plus } from 'lucide-react';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import { formatDate } from '@/utils/dates';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { STATUS_LABEL, useDeckDetail, useDecksModel } from '../model/decks';
import { useLibraryActions } from '../shared/actions';
import { ED_ICON, EdButton, EdEmpty, EdLinkButton, Figure, Kicker, Meter, SectionHead } from './ui';
import { MaturityStrip } from './charts';

const path = (screen = '') => identityPath('editorial', screen);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function EditorialDecks() {
  const m = useDecksModel();
  const actions = useLibraryActions('editorial');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  let n = 0;
  return (
    <div className="space-y-12">
      <header className="grid gap-6 border-b border-ed-ink pb-8 lg:grid-cols-12 ed-rise">
        <div className="lg:col-span-7">
          <Kicker>Baralhos</Kicker>
          <h1 className="ed-serif mt-3 text-[52px] font-light leading-none tracking-[-0.025em] sm:text-[80px]">Sumário</h1>
          <p className="ed-serif mt-4 max-w-xl text-[19px] leading-snug text-ed-graphite">
            {m.totals.decks
              ? `${m.totals.decks} ${m.totals.decks === 1 ? 'baralho' : 'baralhos'} em ${m.groups.length} ${m.groups.length === 1 ? 'disciplina' : 'disciplinas'}, ${m.totals.cards.toLocaleString('pt-BR')} cartões. ${m.totals.due ? `${m.totals.due} pedem revisão hoje.` : 'Nada pendente hoje.'}`
              : 'Seus baralhos, organizados por disciplina, aparecem aqui como um índice.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:col-span-5 lg:justify-end">
          <EdButton variant="secondary" icon={Plus} onClick={actions.newDeck}>
            Novo baralho
          </EdButton>
          <EdButton icon={PenLine} onClick={() => actions.newCard()} disabled={!m.totals.decks}>
            Novo cartão
          </EdButton>
        </div>
      </header>

      {m.decks.length === 0 ? (
        <EdEmpty kicker="Índice vazio" title="Nenhum baralho por enquanto." action={<EdButton icon={Plus} onClick={actions.newDeck}>Criar o primeiro baralho</EdButton>}>
          Comece pela disciplina em que você mais erra. Dez cartões bem escritos valem mais que cem copiados.
        </EdEmpty>
      ) : (
        m.groups.map((g, gi) => (
          <section key={g.id} aria-labelledby={`ed-g-${g.id}`} className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="ed-serif text-[40px] font-light italic leading-none text-ed-accent">{ROMAN[gi] ?? gi + 1}.</p>
              <h2 id={`ed-g-${g.id}`} className="ed-serif mt-2 text-[24px] leading-tight">
                {g.name}
              </h2>
              <p className="ed-num mt-1 font-ed-sans text-[12.5px] text-ed-graphite">
                {g.decks.length} {g.decks.length === 1 ? 'baralho' : 'baralhos'} · {g.cards} cartões
              </p>
            </div>
            <ol className="border-t border-ed-ink lg:col-span-9">
              {g.decks.map((d) => {
                n++;
                return (
                  <li key={d.deck.id} className="border-b border-ed-rule">
                    <Link to={path(`baralhos/${d.deck.id}`)} className="group grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-4 py-5 sm:grid-cols-[2.75rem_1fr_15rem] sm:items-center">
                      <span className="ed-kicker ed-num pt-2 text-ed-graphite sm:pt-0">{String(n).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <span className="ed-serif block text-[26px] leading-tight transition-colors group-hover:text-ed-accent sm:text-[30px]">{d.deck.name}</span>
                        {d.deck.description && <span className="mt-1 line-clamp-2 block max-w-xl font-ed-sans text-[13.5px] leading-relaxed text-ed-graphite">{d.deck.description}</span>}
                      </span>
                      <span className="col-start-2 grid grid-cols-3 gap-4 sm:col-start-3">
                        <span>
                          <span className="ed-kicker block text-[9.5px] text-ed-graphite">Hoje</span>
                          <span className={cn('ed-serif ed-num text-[24px] leading-none', d.due.total ? 'text-ed-accent' : 'text-ed-stone')}>{d.due.total}</span>
                        </span>
                        <span>
                          <span className="ed-kicker block text-[9.5px] text-ed-graphite">Cartões</span>
                          <span className="ed-serif ed-num text-[24px] leading-none">{d.cards}</span>
                        </span>
                        <span>
                          <span className="ed-kicker block text-[9.5px] text-ed-graphite">Domínio</span>
                          <span className="ed-serif ed-num text-[24px] leading-none">{d.mastery}%</span>
                          <Meter value={d.mastery} label={`Domínio de ${d.deck.name}`} tone="moss" className="mt-1.5" />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
      {actions.modal}
    </div>
  );
}

export function EditorialDeck() {
  const { deckId } = useParams();
  const m = useDeckDetail(deckId);
  const actions = useLibraryActions('editorial');
  const { openEdit } = useCardEditor();
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (!m.summary) {
    return (
      <EdEmpty kicker="Baralho" title="Este baralho não existe mais." action={<EdLinkButton to={path('baralhos')} icon={ArrowLeft}>Voltar ao sumário</EdLinkButton>} />
    );
  }
  const s = m.summary;
  return (
    <div className="space-y-12">
      <Link to={path('baralhos')} className="ed-link inline-flex items-center gap-2 font-ed-sans text-[13px] font-semibold text-ed-graphite hover:text-ed-ink">
        <ArrowLeft {...ED_ICON} className="h-4 w-4" /> Sumário
      </Link>
      <header className="grid gap-8 lg:grid-cols-12 ed-rise">
        <div className="lg:col-span-8">
          <Kicker>{s.subjectName ?? 'Sem disciplina'}</Kicker>
          <h1 className="ed-serif mt-3 text-[46px] font-light leading-[0.98] tracking-[-0.025em] sm:text-[72px]">{s.deck.name}</h1>
          {s.deck.description && <p className="ed-serif mt-4 max-w-2xl text-[19px] italic leading-snug text-ed-graphite">{s.deck.description}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {s.due.total > 0 ? (
              <EdLinkButton to={path(`revisar/${s.deck.id}`)} iconRight={ArrowRight}>
                Revisar {s.due.total} {s.due.total === 1 ? 'cartão' : 'cartões'}
              </EdLinkButton>
            ) : (
              <span className="inline-flex h-11 items-center border border-ed-rule px-5 font-ed-sans text-[13px] text-ed-graphite">Nada para revisar hoje</span>
            )}
            <EdButton variant="secondary" icon={Plus} onClick={() => actions.newCard(s.deck.id)}>
              Novo cartão
            </EdButton>
            <button type="button" onClick={() => actions.editDeck(s.deck)} className="ed-link ml-2 font-ed-sans text-[13px] font-semibold text-ed-ink">
              Editar baralho
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-ed-ink pt-4 lg:col-span-4 lg:grid-cols-1 lg:gap-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <Figure value={s.due.total} label="Para hoje" accent={s.due.total > 0} size="md" note={`${s.due.new} novos · ${s.due.review} revisões`} />
          <Figure value={s.cards} label="Cartões" size="md" />
          <Figure value={`${s.mastery}%`} label="Domínio" size="md" note={s.lastStudiedAt ? `Última revisão em ${formatDate(s.lastStudiedAt)}` : 'Ainda não revisado'} />
        </div>
      </header>

      <section aria-labelledby="ed-acervo">
        <SectionHead number="01" title="Acervo" id="ed-acervo" />
        <MaturityStrip b={m.breakdown} />
      </section>

      <section aria-labelledby="ed-cartoes">
        <SectionHead number="02" title={`Cartões (${m.rows.length})`} id="ed-cartoes" />
        {m.rows.length === 0 ? (
          <EdEmpty kicker="Sem cartões" title="Escreva a primeira pergunta." action={<EdButton icon={Plus} onClick={() => actions.newCard(s.deck.id)}>Novo cartão</EdButton>}>
            Frente e verso, lacunas ou Certo ou Errado no estilo Cebraspe.
          </EdEmpty>
        ) : (
          <ol className="border-b border-ed-rule">
            {m.rows.slice(0, 80).map((r, i) => (
              <li key={r.card.id} className="border-t border-ed-rule">
                <button type="button" onClick={() => openEdit(r.card)} className="group grid w-full grid-cols-[2.25rem_1fr] gap-x-3 gap-y-1 py-3.5 text-left sm:grid-cols-[2.75rem_1fr_8rem_8rem] sm:items-baseline">
                  <span className="ed-kicker ed-num text-ed-stone">{String(i + 1).padStart(3, '0')}</span>
                  <span className="ed-serif line-clamp-2 text-[18px] leading-snug transition-colors group-hover:text-ed-accent">{r.text || 'Cartão com imagem'}</span>
                  <span className={cn('ed-kicker col-start-2 text-[10px] sm:col-start-3', r.status === 'learning' ? 'text-ed-accent' : 'text-ed-graphite')}>{STATUS_LABEL[r.status]}</span>
                  <span className="col-start-2 font-ed-sans text-[12.5px] text-ed-graphite sm:col-start-4 sm:text-right">{r.next}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {m.rows.length > 80 && <p className="mt-3 font-ed-sans text-[12.5px] text-ed-graphite">Mostrando os 80 cartões mais recentes de {m.rows.length}.</p>}
      </section>
      {actions.modal}
    </div>
  );
}
