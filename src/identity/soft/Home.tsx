import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ChevronRight, Flame, Layers, Leaf, Plus, Sparkles, Target, Timer } from 'lucide-react';
import { identityPath } from '../registry';
import { describeReturn, useHomeModel } from '../model/home';
import { useLibraryActions } from '../shared/actions';
import { Bar, Chip, DeckMark, IconTile, Ring, SF_ICON, SfButton, SfEmpty, SfLinkButton, Stat, Surface, SurfaceTitle } from './ui';
import { SoftBars } from './charts';

const path = (s = '') => identityPath('soft', s);

export function SoftHome() {
  const m = useHomeModel();
  const actions = useLibraryActions('soft');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;
  const back = describeReturn(m.nextDueAt, m.now);
  const list = (m.dueDecks.length ? m.dueDecks : m.decks).slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Boas-vindas + progresso do dia */}
      <section className="sf-in relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgb(43_37_64/0.04),0_16px_40px_-24px_rgb(78_55_174/0.45)] sm:p-7" aria-labelledby="sf-hello">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,#ECE6FC,transparent)]" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-sf-muted first-letter:uppercase">{m.now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 id="sf-hello" className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">
              {m.greeting}
              {m.firstName ? `, ${m.firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-md text-[15.5px] leading-relaxed text-sf-muted">
              {m.due.total > 0
                ? `Você tem ${m.due.total} ${m.due.total === 1 ? 'cartão' : 'cartões'} para hoje — cerca de ${m.etaMinutes} min. Vá no seu ritmo.`
                : m.totals.cards
                  ? `Tudo em dia. ${back ? `O próximo cartão volta ${back}.` : 'Aproveite para descansar ou criar cartões novos.'}`
                  : 'Vamos montar seu primeiro baralho? Leva menos de um minuto.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {m.due.total > 0 ? (
                <SfLinkButton to={path('revisar/todos')} size="lg" iconRight={ArrowRight}>
                  Começar revisão
                </SfLinkButton>
              ) : (
                <SfButton size="lg" icon={Plus} onClick={() => (m.totals.decks ? actions.newCard() : actions.newDeck())}>
                  {m.totals.decks ? 'Criar cartão' : 'Criar baralho'}
                </SfButton>
              )}
              <SfLinkButton to="/foco" variant="soft" size="lg" icon={Timer}>
                Modo Foco
              </SfLinkButton>
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-[22px] bg-sf-mist p-4 md:bg-transparent md:p-0">
            <Ring value={m.dayProgress} size={124} stroke={11} label={`Progresso do dia: ${m.dayProgress}%`}>
              <span className="sf-num text-[28px] font-semibold leading-none">{m.dayProgress}%</span>
              <span className="mt-1 text-[11.5px] font-medium text-sf-muted">do dia</span>
            </Ring>
            <dl className="space-y-2.5 text-[13.5px]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sf-violet" aria-hidden />
                <dt className="text-sf-muted">Feitos</dt>
                <dd className="sf-num ml-auto pl-3 font-semibold">{m.doneToday}</dd>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sf-lav ring-1 ring-sf-lilac" aria-hidden />
                <dt className="text-sf-muted">Faltam</dt>
                <dd className="sf-num ml-auto pl-3 font-semibold">{m.due.total}</dd>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sf-mint-ink/70" aria-hidden />
                <dt className="text-sf-muted">Lembrados</dt>
                <dd className="sf-num ml-auto pl-3 font-semibold">{m.doneToday ? `${Math.round((m.correctToday / m.doneToday) * 100)}%` : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} tone="peach" label="Sequência" value={`${m.streak} ${m.streak === 1 ? 'dia' : 'dias'}`} />
        <Stat icon={Target} tone="mint" label="Retenção (30 d)" value={m.retention === null ? '—' : `${m.retention}%`} />
        <Stat icon={CalendarCheck} tone="violet" label="Cartões na semana" value={m.week.cards} note={m.week.deltaCards !== null ? `${m.week.deltaCards > 0 ? '+' : ''}${m.week.deltaCards}% vs. anterior` : undefined} />
        <Stat icon={Timer} tone="sky" label="Foco na semana" value={`${m.week.focusMin} min`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Surface className="p-5 sm:p-6" aria-labelledby="sf-hoje">
          <SurfaceTitle
            id="sf-hoje"
            title={m.dueDecks.length ? 'Para hoje' : 'Seus baralhos'}
            hint={m.dueDecks.length ? 'Os baralhos com mais cartões esperando aparecem primeiro.' : undefined}
            action={
              <Link to={path('baralhos')} className="flex items-center gap-0.5 text-[13.5px] font-semibold text-sf-violet hover:text-sf-violet-deep">
                Ver todos <ChevronRight {...SF_ICON} className="h-4 w-4" />
              </Link>
            }
          />
          {list.length === 0 ? (
            <SfEmpty icon={Layers} title="Nenhum baralho ainda" action={<SfButton icon={Plus} onClick={actions.newDeck}>Criar baralho</SfButton>}>
              Um baralho por disciplina deixa tudo organizado desde o começo.
            </SfEmpty>
          ) : (
            <ul className="-mx-2 space-y-1">
              {list.map((d) => (
                <li key={d.deck.id}>
                  <Link to={path(`baralhos/${d.deck.id}`)} className="group flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-sf-mist">
                    <DeckMark text={d.monogram} color={d.tone.color} deep={d.tone.deep} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{d.deck.name}</p>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <Bar value={d.mastery} label={`Domínio de ${d.deck.name}`} className="w-24 sm:w-32" />
                        <span className="sf-num text-[12px] text-sf-muted">{d.mastery}% dominado</span>
                      </div>
                    </div>
                    {d.due.total > 0 ? <Chip>{d.due.total} hoje</Chip> : <Chip tone="mint">em dia</Chip>}
                    <ChevronRight {...SF_ICON} className="h-4 w-4 text-sf-soft transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <div className="space-y-5">
          <Surface className="p-5 sm:p-6" aria-labelledby="sf-semana">
            <SurfaceTitle id="sf-semana" title="Sua semana" hint={`${m.week.cards} cartões · ${m.week.answered} questões`} />
            <SoftBars data={m.last7} height={120} highlightLast />
          </Surface>
          <Surface className="flex gap-4 p-5" aria-label="Sugestão">
            <IconTile icon={m.weakest ? Sparkles : Leaf} tone={m.weakest ? 'rose' : 'mint'} className="h-11 w-11 rounded-2xl" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">{m.weakest ? 'Um ponto para carinho extra' : 'Respire entre as sessões'}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-sf-muted">
                {m.weakest
                  ? `${m.weakest.topic} (${m.weakest.subject}) está com ${m.weakest.pct}% de acerto. Que tal algumas questões hoje?`
                  : m.pendingErrors
                    ? `Há ${m.pendingErrors} ${m.pendingErrors === 1 ? 'erro pendente' : 'erros pendentes'} no caderno — virar cartões ajuda a fixar.`
                    : 'Sessões curtas, com pausas de cinco minutos, rendem mais do que uma maratona.'}
              </p>
              <Link to={m.weakest ? '/questoes' : m.pendingErrors ? '/erros' : '/foco'} className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-sf-violet hover:text-sf-violet-deep">
                {m.weakest ? 'Treinar questões' : m.pendingErrors ? 'Abrir o caderno' : 'Iniciar uma sessão de foco'} <ChevronRight {...SF_ICON} className="h-4 w-4" />
              </Link>
            </div>
          </Surface>
        </div>
      </div>
      {actions.modal}
    </div>
  );
}
