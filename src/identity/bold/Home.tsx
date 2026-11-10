import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { describeReturn, useHomeModel } from '../model/home';
import { useLibraryActions } from '../shared/actions';
import { BIcon } from './icons';
import { BdButton, BdEmpty, BdLinkButton, Big, Dot, Label, SectionBar, Thick, pad } from './ui';

const path = (s = '') => identityPath('bold', s);

export function BoldHome() {
  const m = useHomeModel();
  const actions = useLibraryActions('bold');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const back = describeReturn(m.nextDueAt, m.now);
  const max7 = Math.max(1, ...m.last7.map((d) => d.count));

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="bd-up" aria-labelledby="bd-hello">
        <Label>{m.now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Label>
        <h1 id="bd-hello" className="bd-wide mt-3 text-[30px] uppercase sm:text-[44px]">
          {m.greeting}
          {m.firstName ? `, ${m.firstName}` : ''}.
        </h1>
      </section>

      {/* Bloco principal: o número do dia */}
      <section className="grid border-2 border-bd-ink lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" aria-label="Para hoje">
        <div className="relative overflow-hidden bg-bd-paper p-5 sm:p-8">
          <span className="bd-orbit pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full border-2 border-dashed border-bd-line sm:h-96 sm:w-96" aria-hidden />
          <span className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 rounded-tl-full bg-bd-lav sm:h-40 sm:w-40" aria-hidden />
          <div className="relative">
            <Label>Para hoje</Label>
            <p className={cn('bd-black mt-3 text-[132px] sm:text-[200px]', m.due.total ? 'text-bd-ink' : 'text-bd-line')}>{m.due.total}</p>
            <p className="bd-wide mt-2 text-[18px] uppercase sm:text-[22px]">
              {m.due.total === 1 ? 'cartão' : 'cartões'} {m.due.total ? `· ~${m.etaMinutes} min` : '· tudo em dia'}
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {(
                [
                  ['Novos', m.due.new, 'bg-bd-lav'],
                  ['Aprendendo', m.due.learning, 'bg-bd-signal'],
                  ['Revisões', m.due.review, 'bg-bd-uv'],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={cn('h-3.5 w-3.5 border-2 border-bd-ink', color)} aria-hidden />
                  <dt className="bd-mono text-bd-grey">{label}</dt>
                  <dd className="bd-mono font-bold text-bd-ink">{pad(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {m.due.total > 0 ? (
          <Link to={path('revisar/todos')} className="group relative flex min-h-[180px] flex-col justify-between overflow-hidden border-t-2 border-bd-ink bg-bd-uv p-5 text-white transition-colors hover:bg-bd-uv-deep sm:p-8 lg:border-l-2 lg:border-t-0">
            <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" aria-hidden />
            <span className="bd-mono relative text-white/70">Começar</span>
            <span className="relative flex items-end justify-between gap-4">
              <span className="bd-black text-[44px] uppercase sm:text-[56px]">
                Revisar
                <br />
                agora
              </span>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-bd-uv transition-transform duration-300 group-hover:translate-x-1">
                <BIcon name="arrow" size={24} />
              </span>
            </span>
          </Link>
        ) : (
          <div className="flex min-h-[180px] flex-col justify-between border-t-2 border-bd-ink bg-bd-ink p-5 text-bd-bone sm:p-8 lg:border-l-2 lg:border-t-0">
            <span className="bd-mono text-bd-bone/60">{m.totals.cards ? 'Próximo' : 'Começar'}</span>
            <p className="bd-wide text-[24px] uppercase sm:text-[30px]">{m.totals.cards ? (back ? `Volta ${back}` : 'Nada vence hoje') : 'Crie o primeiro baralho'}</p>
            <BdButton variant="uv" icon="plus" onClick={() => (m.totals.decks ? actions.newCard() : actions.newDeck())} className="self-start border-bd-bone">
              {m.totals.decks ? 'Novo cartão' : 'Novo baralho'}
            </BdButton>
          </div>
        )}
      </section>

      {/* Faixa de métricas */}
      <section className="grid grid-cols-2 border-2 border-bd-ink bg-bd-ink text-bd-bone md:grid-cols-4" aria-label="Indicadores">
        {(
          [
            ['Sequência', `${m.streak}`, m.streak === 1 ? 'dia' : 'dias'],
            ['Retenção 30d', m.retention === null ? '—' : `${m.retention}%`, 'lembrados'],
            ['Semana', `${m.week.cards}`, m.week.deltaCards !== null ? `${m.week.deltaCards > 0 ? '+' : ''}${m.week.deltaCards}% vs. anterior` : 'cartões'],
            ['Hoje', `${m.dayProgress}%`, `${m.doneToday} feitos`],
          ] as const
        ).map(([label, value, note], i) => (
          <div key={label} className={cn('p-4 sm:p-6', i % 2 === 1 && 'border-l-2 border-bd-bone/15', i >= 2 && 'border-t-2 border-bd-bone/15 md:border-t-0', i === 2 && 'md:border-l-2')}>
            <Big value={value} label={label} tone={i === 1 ? 'bone' : 'bone'} size="md" note={note} />
          </div>
        ))}
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="bd-decks">
          <SectionBar label="Baralhos" id="bd-decks" aside={<Link to={path('baralhos')} className="bd-mono flex items-center gap-1.5 hover:text-bd-uv">Todos <BIcon name="arrow" size={14} /></Link>} />
          {m.decks.length === 0 ? (
            <BdEmpty title="Nenhum baralho" action={<BdButton variant="uv" icon="plus" onClick={actions.newDeck}>Criar baralho</BdButton>}>
              Um baralho por disciplina. Comece por onde você mais erra.
            </BdEmpty>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {(m.dueDecks.length ? m.dueDecks : m.decks).slice(0, 4).map((d, i) => (
                <li key={d.deck.id} className="bd-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <Link to={path(`baralhos/${d.deck.id}`)} className="bd-block bd-hit flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="bd-black text-[44px] text-bd-uv">{d.monogram}</span>
                      <Dot value={d.due.total} active={d.due.total > 0} />
                    </div>
                    <p className="bd-wide mt-4 text-[17px] uppercase leading-[1.05]">{d.deck.name}</p>
                    <p className="bd-mono mt-1 normal-case tracking-normal text-bd-grey">{d.subjectName ?? 'Sem disciplina'}</p>
                    <div className="mt-auto pt-4">
                      <div className="mb-1 flex justify-between">
                        <span className="bd-mono text-bd-grey">Domínio</span>
                        <span className="bd-mono font-bold">{d.mastery}%</span>
                      </div>
                      <Thick value={d.mastery} label={`Domínio de ${d.deck.name}`} color="#4A2BFF" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="bd-semana">
          <SectionBar label="Semana" id="bd-semana" aside={<span className="bd-mono text-bd-grey">{m.week.cards} cartões</span>} />
          <div className="flex h-48 items-end gap-2" role="img" aria-label={`Cartões por dia: ${m.last7.map((d) => `${d.label} ${d.count}`).join(', ')}`}>
            {m.last7.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col justify-end">
                <span className="bd-mono mb-1 text-center text-[10px] font-bold">{d.count || ''}</span>
                <div className={cn('bd-up w-full', d.isToday ? 'bg-bd-uv' : 'bg-bd-ink')} style={{ height: `${d.count ? Math.max(4, (d.count / max7) * 100) : 2}%`, opacity: d.count ? 1 : 0.2 }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 border-t-2 border-bd-ink pt-1.5">
            {m.last7.map((d) => (
              <span key={d.key} className={cn('bd-mono flex-1 text-center text-[10px]', d.isToday ? 'font-bold text-bd-uv' : 'text-bd-grey')}>
                {d.label}
              </span>
            ))}
          </div>

          <div className="mt-8 border-2 border-bd-ink bg-bd-signal p-5">
            <Label className="text-bd-ink">{m.weakest ? 'Ponto fraco' : m.pendingErrors ? 'Caderno de erros' : 'Regra do dia'}</Label>
            <p className="bd-wide mt-2 text-[20px] uppercase leading-[1.05]">
              {m.weakest ? `${m.weakest.topic}: ${m.weakest.pct}% de acerto` : m.pendingErrors ? `${m.pendingErrors} erros pedem revisão` : 'Pouco todo dia > muito de vez em quando'}
            </p>
            {(m.weakest || m.pendingErrors > 0) && (
              <Link to={m.weakest ? '/questoes' : '/erros'} className="bd-mono mt-4 inline-flex items-center gap-1.5 border-b-2 border-bd-ink pb-0.5">
                {m.weakest ? 'Treinar questões' : 'Abrir o caderno'} <BIcon name="out" size={14} />
              </Link>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BdButton variant="line" icon="plus" onClick={() => actions.newCard()} disabled={!m.totals.decks}>
              Cartão
            </BdButton>
            <BdLinkButton to="/foco" variant="line" iconRight="out">
              Foco
            </BdLinkButton>
          </div>
        </section>
      </div>
      {actions.modal}
    </div>
  );
}
