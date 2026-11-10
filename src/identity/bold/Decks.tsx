import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import type { CardStatus } from '@/services/flashcards/stats';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { STATUS_LABEL, useDeckDetail, useDecksModel } from '../model/decks';
import { useLibraryActions } from '../shared/actions';
import { BIcon } from './icons';
import { BdButton, BdEmpty, BdLinkButton, BdTitle, Big, Dot, Label, SectionBar, Thick, Toggle, pad } from './ui';

const path = (s = '') => identityPath('bold', s);

export function BoldDecks() {
  const m = useDecksModel();
  const actions = useLibraryActions('bold');
  const [subject, setSubject] = useState('todas');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const visible = subject === 'todas' ? m.decks : (m.groups.find((g) => g.id === subject)?.decks ?? []);

  return (
    <div className="space-y-10">
      <BdTitle
        index={`${pad(m.totals.decks)} baralhos · ${m.totals.cards} cartões · ${m.totals.due} hoje`}
        title="Baralhos"
        actions={
          <>
            <BdButton variant="line" icon="plus" onClick={actions.newDeck}>
              Baralho
            </BdButton>
            <BdButton variant="uv" icon="edit" onClick={() => actions.newCard()} disabled={!m.totals.decks}>
              Cartão
            </BdButton>
          </>
        }
      />

      {m.groups.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Toggle value={subject} onChange={setSubject} label="Filtrar por disciplina" options={[{ id: 'todas', label: 'Todas' }, ...m.groups.map((g) => ({ id: g.id, label: g.name }))]} />
        </div>
      )}

      {m.decks.length === 0 ? (
        <BdEmpty title="Zero baralhos. Ainda." action={<BdButton variant="uv" icon="plus" onClick={actions.newDeck}>Criar o primeiro</BdButton>}>
          Organize por disciplina. Escreva cartões curtos: uma pergunta, uma resposta.
        </BdEmpty>
      ) : (
        <ol className="border-t-2 border-bd-ink">
          {visible.map((d, i) => (
            <li key={d.deck.id} className="bd-up border-b-2 border-bd-ink" style={{ animationDelay: `${i * 40}ms` }}>
              <Link to={path(`baralhos/${d.deck.id}`)} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-1 py-5 transition-colors hover:bg-bd-ink hover:text-bd-bone sm:grid-cols-[3rem_1fr_14rem_auto] sm:px-3">
                <span className="bd-mono text-bd-grey group-hover:text-bd-bone/60">{pad(i + 1)}</span>
                <span className="min-w-0">
                  <span className="bd-wide block break-words text-[22px] uppercase sm:text-[30px]">{d.deck.name}</span>
                  <span className="bd-mono mt-1 block normal-case tracking-normal text-bd-grey group-hover:text-bd-bone/60">
                    {d.subjectName ?? 'Sem disciplina'} · {d.cards} cartões
                  </span>
                </span>
                <span className="col-span-3 col-start-1 sm:col-span-1 sm:col-start-3">
                  <span className="mb-1 flex justify-between">
                    <span className="bd-mono text-bd-grey group-hover:text-bd-bone/60">Domínio</span>
                    <span className="bd-mono font-bold">{d.mastery}%</span>
                  </span>
                  <Thick value={d.mastery} label={`Domínio de ${d.deck.name}`} color="#4A2BFF" />
                </span>
                <span className="col-start-3 row-start-1 sm:col-start-4">
                  <Dot value={d.due.total} active={d.due.total > 0} size={56} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {actions.modal}
    </div>
  );
}

const FILTERS: Array<{ id: CardStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'new', label: 'Novos' },
  { id: 'learning', label: 'Aprendendo' },
  { id: 'review', label: 'Revisão' },
];

export function BoldDeck() {
  const { deckId } = useParams();
  const m = useDeckDetail(deckId);
  const actions = useLibraryActions('bold');
  const { openEdit } = useCardEditor();
  const [filter, setFilter] = useState<CardStatus | 'all'>('all');
  const rows = useMemo(() => (filter === 'all' ? m.rows : m.rows.filter((r) => r.status === filter)), [m.rows, filter]);
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (!m.summary) return <BdEmpty title="Baralho não encontrado" action={<BdLinkButton to={path('baralhos')} icon="back">Baralhos</BdLinkButton>} />;
  const s = m.summary;
  const b = m.breakdown;
  const total = Math.max(1, b.faces);

  return (
    <div className="space-y-10">
      <Link to={path('baralhos')} className="bd-mono inline-flex items-center gap-2 hover:text-bd-uv">
        <BIcon name="back" size={16} /> Baralhos
      </Link>
      <section className="bd-up border-2 border-bd-ink bg-bd-ink text-bd-bone">
        <div className="relative overflow-hidden p-5 sm:p-8">
          <span className="absolute -right-8 -top-8 h-36 w-36 rounded-full sm:h-52 sm:w-52" style={{ background: s.tone.color }} aria-hidden />
          <div className="relative">
            <Label className="text-bd-bone/60">{s.subjectName ?? 'Sem disciplina'}</Label>
            <h1 className="bd-black mt-3 max-w-3xl text-bd-bone break-words text-[44px] uppercase sm:text-[80px]">{s.deck.name}</h1>
            {s.deck.description && <p className="mt-4 max-w-xl text-[15px] text-bd-bone/80">{s.deck.description}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t-2 border-bd-bone/15">
          <div className="p-4 sm:p-6">
            <Big value={s.due.total} label="Hoje" tone="bone" size="md" />
          </div>
          <div className="border-l-2 border-bd-bone/15 p-4 sm:p-6">
            <Big value={s.cards} label="Cartões" tone="bone" size="md" />
          </div>
          <div className="border-l-2 border-bd-bone/15 p-4 sm:p-6">
            <Big value={`${s.mastery}%`} label="Domínio" tone="bone" size="md" />
          </div>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {s.due.total > 0 && (
          <BdLinkButton to={path(`revisar/${s.deck.id}`)} variant="uv" size="lg" iconRight="arrow">
            Revisar {s.due.total}
          </BdLinkButton>
        )}
        <BdButton variant="line" size="lg" icon="plus" onClick={() => actions.newCard(s.deck.id)}>
          Cartão
        </BdButton>
        <BdButton variant="line" size="lg" icon="edit" onClick={() => actions.editDeck(s.deck)}>
          Editar
        </BdButton>
      </div>

      <section aria-labelledby="bd-mat">
        <SectionBar label="Maturidade" id="bd-mat" />
        <div className="flex h-10 border-2 border-bd-ink" role="img" aria-label={`Maduros ${b.mature}, jovens ${b.young}, aprendendo ${b.learning}, novos ${b.new}`}>
          {(
            [
              ['Maduros', b.mature, 'bg-bd-ink text-bd-bone'],
              ['Jovens', b.young, 'bg-bd-uv text-white'],
              ['Aprendendo', b.learning, 'bg-bd-signal'],
              ['Novos', b.new, 'bg-bd-lav'],
            ] as const
          ).map(([label, value, c]) =>
            value ? (
              <div key={label} className={cn('bd-wipe bd-mono flex items-center overflow-hidden whitespace-nowrap px-2 font-bold', c)} style={{ width: `${(value / total) * 100}%` }} title={`${label}: ${value}`}>
                {value / total > 0.12 ? `${label} ${value}` : value}
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section aria-labelledby="bd-cards">
        <SectionBar label={`Cartões ${pad(m.rows.length)}`} id="bd-cards" aside={<Toggle value={filter} onChange={setFilter} options={FILTERS} label="Filtrar cartões" />} />
        {rows.length === 0 ? (
          <BdEmpty title={m.rows.length ? 'Nada neste filtro' : 'Sem cartões'} action={!m.rows.length && <BdButton variant="uv" icon="plus" onClick={() => actions.newCard(s.deck.id)}>Escrever o primeiro</BdButton>} />
        ) : (
          <ul>
            {rows.slice(0, 80).map((r, i) => (
              <li key={r.card.id} className="border-b-2 border-bd-line last:border-bd-ink">
                <button type="button" onClick={() => openEdit(r.card)} className="group grid w-full grid-cols-[2.5rem_1fr] items-baseline gap-x-3 gap-y-1 py-3.5 text-left sm:grid-cols-[3rem_1fr_9rem_9rem]">
                  <span className="bd-mono text-bd-grey">{pad(i + 1, 3)}</span>
                  <span className="line-clamp-2 text-[15.5px] font-medium leading-snug group-hover:text-bd-uv">{r.text || 'Cartão com imagem'}</span>
                  <span className={cn('bd-mono col-start-2 sm:col-start-3', r.status === 'learning' ? 'text-bd-signal' : r.status === 'new' ? 'text-bd-uv' : 'text-bd-ink')}>■ {STATUS_LABEL[r.status]}</span>
                  <span className="bd-mono col-start-2 normal-case tracking-normal text-bd-grey sm:col-start-4 sm:text-right">{r.next}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {actions.modal}
    </div>
  );
}
