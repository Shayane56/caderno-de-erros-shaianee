import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, PenLine, Play, Plus, Settings2 } from 'lucide-react';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import type { CardStatus } from '@/services/flashcards/stats';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { STATUS_LABEL, useDeckDetail, useDecksModel } from '../model/decks';
import { useLibraryActions } from '../shared/actions';
import { Bar, Chip, DeckMark, PageTitle, Ring, SF_ICON, SfButton, SfEmpty, SfLinkButton, Segmented, Surface, SurfaceTitle, type Tone } from './ui';
import { Donut, maturityParts } from './charts';

const path = (s = '') => identityPath('soft', s);

export function SoftDecks() {
  const m = useDecksModel();
  const actions = useLibraryActions('soft');
  const [subject, setSubject] = useState('todas');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const visible = subject === 'todas' ? m.decks : (m.groups.find((g) => g.id === subject)?.decks ?? []);

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow={`${m.totals.decks} ${m.totals.decks === 1 ? 'baralho' : 'baralhos'} · ${m.totals.cards} cartões`}
        title="Seus baralhos"
        actions={
          <>
            <SfButton variant="outline" icon={Plus} onClick={actions.newDeck}>
              Baralho
            </SfButton>
            <SfButton icon={PenLine} onClick={() => actions.newCard()} disabled={!m.totals.decks}>
              Novo cartão
            </SfButton>
          </>
        }
      >
        {m.totals.due ? `${m.totals.due} cartões esperam por você hoje.` : 'Tudo revisado por hoje.'}
      </PageTitle>

      {m.groups.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por disciplina">
          <div className="flex w-max gap-2">
            {[{ id: 'todas', name: 'Todas', due: m.totals.due }, ...m.groups].map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={subject === g.id}
                onClick={() => setSubject(g.id)}
                className={cn(
                  'sf-press flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors',
                  subject === g.id ? 'bg-sf-plum text-white' : 'bg-white text-sf-muted ring-1 ring-sf-line hover:text-sf-plum',
                )}
              >
                {g.name}
                {g.due > 0 && <span className={cn('sf-num rounded-full px-1.5 text-[11.5px]', subject === g.id ? 'bg-white/20' : 'bg-sf-lav text-sf-violet-deep')}>{g.due}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {m.decks.length === 0 ? (
        <Surface>
          <SfEmpty icon={Layers} title="Seu primeiro baralho começa aqui" action={<SfButton icon={Plus} onClick={actions.newDeck}>Criar baralho</SfButton>}>
            Crie um baralho por disciplina e escreva cartões a partir dos seus erros — é assim que eles não se repetem.
          </SfEmpty>
        </Surface>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((d, i) => (
            <li key={d.deck.id} className="sf-in" style={{ animationDelay: `${i * 40}ms` }}>
              <Link to={path(`baralhos/${d.deck.id}`)} className="sf-surface sf-raise flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <DeckMark text={d.monogram} color={d.tone.color} deep={d.tone.deep} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16.5px] font-semibold">{d.deck.name}</p>
                    <p className="truncate text-[13px] text-sf-muted">{d.subjectName ?? 'Sem disciplina'}</p>
                  </div>
                  <Ring value={d.mastery} size={46} stroke={5} label={`Domínio: ${d.mastery}%`}>
                    <span className="sf-num text-[11px] font-bold">{d.mastery}</span>
                  </Ring>
                </div>
                {d.deck.description && <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-sf-muted">{d.deck.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <div className="flex gap-1.5">
                    {d.due.new > 0 && <Chip tone="sky">{d.due.new} novos</Chip>}
                    {d.due.learning > 0 && <Chip tone="peach">{d.due.learning} aprendendo</Chip>}
                    {d.due.review > 0 && <Chip>{d.due.review} revisões</Chip>}
                    {d.due.total === 0 && <Chip tone="mint">Em dia</Chip>}
                  </div>
                  <span className="sf-num shrink-0 text-[12.5px] text-sf-muted">{d.cards} cartões</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {actions.modal}
    </div>
  );
}

const FILTERS: Array<{ id: CardStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'new', label: 'Novos' },
  { id: 'learning', label: 'Aprendendo' },
  { id: 'review', label: 'Em revisão' },
];
const STATUS_TONE: Record<CardStatus, Tone> = { new: 'sky', learning: 'peach', review: 'violet', suspended: 'rose' };

export function SoftDeck() {
  const { deckId } = useParams();
  const m = useDeckDetail(deckId);
  const actions = useLibraryActions('soft');
  const { openEdit } = useCardEditor();
  const [filter, setFilter] = useState<CardStatus | 'all'>('all');
  const rows = useMemo(() => (filter === 'all' ? m.rows : m.rows.filter((r) => r.status === filter)), [m.rows, filter]);
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (!m.summary) {
    return (
      <Surface>
        <SfEmpty icon={Layers} title="Baralho não encontrado" action={<SfLinkButton to={path('baralhos')} variant="soft" icon={ArrowLeft}>Voltar aos baralhos</SfLinkButton>} />
      </Surface>
    );
  }
  const s = m.summary;
  return (
    <div className="space-y-5">
      <Link to={path('baralhos')} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-sf-muted hover:text-sf-plum">
        <ArrowLeft {...SF_ICON} className="h-4 w-4" /> Baralhos
      </Link>
      <section className="sf-in relative overflow-hidden rounded-[28px] p-5 sm:p-7" style={{ background: `color-mix(in srgb, ${s.tone.color} 16%, white)` }}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <DeckMark text={s.monogram} color={s.tone.color} deep={s.tone.deep} size={60} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: s.tone.deep }}>
                {s.subjectName ?? 'Sem disciplina'}
              </p>
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">{s.deck.name}</h1>
              {s.deck.description && <p className="mt-1 max-w-lg text-[14.5px] text-sf-muted">{s.deck.description}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {s.due.total > 0 && (
              <SfLinkButton to={path(`revisar/${s.deck.id}`)} size="lg" icon={Play}>
                Revisar {s.due.total}
              </SfLinkButton>
            )}
            <SfButton variant="outline" size="lg" icon={Plus} onClick={() => actions.newCard(s.deck.id)}>
              Cartão
            </SfButton>
            <SfButton variant="ghost" size="lg" icon={Settings2} onClick={() => actions.editDeck(s.deck)} aria-label="Editar baralho" className="px-3.5">
              <span className="sr-only sm:not-sr-only">Editar</span>
            </SfButton>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Surface className="p-2 sm:p-3" aria-labelledby="sf-cards">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="sf-cards" className="text-[16.5px] font-semibold">
              Cartões <span className="sf-num text-sf-muted">· {m.rows.length}</span>
            </h2>
            <div className="-mx-1 overflow-x-auto px-1">
              <Segmented value={filter} options={FILTERS} onChange={setFilter} label="Filtrar cartões" />
            </div>
          </div>
          {rows.length === 0 ? (
            <SfEmpty icon={PenLine} title={m.rows.length ? 'Nenhum cartão neste filtro' : 'Ainda sem cartões'} action={!m.rows.length && <SfButton icon={Plus} onClick={() => actions.newCard(s.deck.id)}>Escrever o primeiro</SfButton>}>
              {m.rows.length ? 'Escolha outro filtro acima.' : 'Frente e verso, lacunas ou Certo ou Errado.'}
            </SfEmpty>
          ) : (
            <ul className="divide-y divide-sf-line/70">
              {rows.slice(0, 80).map((r) => (
                <li key={r.card.id}>
                  <button type="button" onClick={() => openEdit(r.card)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-sf-mist">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[14.5px] leading-snug">{r.text || 'Cartão com imagem'}</span>
                      <span className="mt-0.5 block text-[12.5px] text-sf-muted">{r.next}</span>
                    </span>
                    <Chip tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <div className="space-y-5">
          <Surface className="p-5" aria-labelledby="sf-mat">
            <SurfaceTitle id="sf-mat" title="Maturidade" hint="Maduro = intervalo de 21 dias ou mais" />
            <div className="flex items-center gap-5">
              <Donut parts={maturityParts(m.breakdown)} size={120} label="Maturidade dos cartões" center={<><span className="sf-num text-[22px] font-semibold">{s.mastery}%</span><span className="text-[11px] text-sf-muted">maduro</span></>} />
              <ul className="space-y-1.5 text-[13px]">
                {maturityParts(m.breakdown).map((p) => (
                  <li key={p.label} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                    <span className="text-sf-muted">{p.label}</span>
                    <span className="sf-num ml-auto pl-2 font-semibold">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
          <Surface className="space-y-3 p-5" aria-label="Limites diários">
            <p className="text-[15px] font-semibold">Ritmo diário</p>
            <div>
              <div className="mb-1 flex justify-between text-[13px] text-sf-muted">
                <span>Novos por dia</span>
                <span className="sf-num font-semibold text-sf-plum">{s.deck.newPerDay}</span>
              </div>
              <Bar value={(s.due.new / Math.max(1, s.deck.newPerDay)) * 100} label="Novos de hoje em relação ao limite" color="#3B66A6" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[13px] text-sf-muted">
                <span>Revisões por dia</span>
                <span className="sf-num font-semibold text-sf-plum">{s.deck.reviewsPerDay}</span>
              </div>
              <Bar value={(s.due.review / Math.max(1, s.deck.reviewsPerDay)) * 100} label="Revisões de hoje em relação ao limite" />
            </div>
          </Surface>
        </div>
      </div>
      {actions.modal}
    </div>
  );
}
