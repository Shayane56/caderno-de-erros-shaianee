import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { identityPath } from '../registry';
import { describeReturn, useHomeModel } from '../model/home';
import { useLibraryActions } from '../shared/actions';
import { Delta, EdButton, EdEmpty, EdLinkButton, Figure, Kicker, Meter, SectionHead, inWords } from './ui';
import { WeekColumns } from './charts';

const path = (screen = '') => identityPath('editorial', screen);

export function EditorialHome() {
  const m = useHomeModel();
  const actions = useLibraryActions('editorial');
  if (m.loading) return <div className="h-[60vh]" aria-busy="true" />;

  const today = m.now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const parts = [
    m.due.review && `${inWords(m.due.review)} ${m.due.review === 1 ? 'revisão' : 'revisões'}`,
    m.due.learning && `${inWords(m.due.learning)} em aprendizagem`,
    m.due.new && `${inWords(m.due.new)} ${m.due.new === 1 ? 'cartão novo' : 'cartões novos'}`,
  ].filter(Boolean) as string[];
  const joined = parts.join(', ');
  const lede = parts.length ? `${joined.charAt(0).toUpperCase()}${joined.slice(1).replace(/, ([^,]*)$/, ' e $1')}. Leva cerca de ${m.etaMinutes} ${m.etaMinutes === 1 ? 'minuto' : 'minutos'}.` : null;
  const back = describeReturn(m.nextDueAt, m.now);

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Manchete */}
      <section className="grid gap-8 lg:grid-cols-12 ed-rise" aria-labelledby="ed-manchete">
        <div className="lg:col-span-8">
          <Kicker className="first-letter:uppercase">{today}</Kicker>
          <h1 id="ed-manchete" className="ed-serif mt-4 text-[44px] font-light leading-[0.98] tracking-[-0.025em] text-ed-ink sm:text-[72px] lg:text-[84px]">
            {m.greeting}
            {m.firstName ? `, ${m.firstName}` : ''}.
            <br />
            <em className="font-normal text-ed-accent">
              {m.due.total > 0
                ? `${m.due.total === 1 ? 'Um cartão espera' : `${m.due.total.toLocaleString('pt-BR')} cartões esperam`} por você.`
                : m.totals.cards
                  ? 'Tudo revisado por hoje.'
                  : 'Comece seu primeiro baralho.'}
            </em>
          </h1>
          <p className="ed-serif mt-6 max-w-[34rem] text-[19px] leading-[1.5] text-ed-graphite sm:text-[21px]">
            {lede ??
              (m.totals.cards
                ? `${m.doneToday ? `Você respondeu ${m.doneToday} ${m.doneToday === 1 ? 'cartão' : 'cartões'} hoje.` : 'Nada vence hoje.'} ${back ? `O próximo cartão em aprendizagem volta ${back}.` : 'Os próximos aparecem sozinhos, no dia certo.'}`
                : 'Um baralho é um caderno de perguntas. Escreva o que precisa lembrar; o Mimo decide quando perguntar de novo.')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {m.due.total > 0 ? (
              <EdLinkButton to={path('revisar/todos')} iconRight={ArrowRight}>
                Começar a revisão
              </EdLinkButton>
            ) : (
              <EdButton icon={Plus} onClick={() => (m.totals.decks ? actions.newCard() : actions.newDeck())}>
                {m.totals.decks ? 'Escrever um cartão' : 'Criar baralho'}
              </EdButton>
            )}
            <Link to={path('baralhos')} className="ed-link font-ed-sans text-[13px] font-semibold text-ed-ink">
              Ver o sumário de baralhos
            </Link>
          </div>
        </div>

        {/* Coluna de apoio: o dia em números */}
        <aside className="border-t border-ed-ink pt-4 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1" aria-label="Hoje em números">
          <Kicker>Hoje</Kicker>
          <div className="mt-4 grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-7">
            <Figure value={m.due.total} label="Pendentes" accent={m.due.total > 0} size="md" />
            <Figure value={m.doneToday} label="Respondidos" size="md" note={m.doneToday ? `${Math.round((m.correctToday / m.doneToday) * 100)}% lembrados` : undefined} />
            <Figure value={m.streak} label={m.streak === 1 ? 'Dia seguido' : 'Dias seguidos'} size="md" />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="ed-kicker text-ed-graphite">Progresso do dia</span>
              <span className="ed-num font-ed-sans text-[12px] font-semibold text-ed-ink">{m.dayProgress}%</span>
            </div>
            <Meter value={m.dayProgress} label="Progresso do dia" tone="accent" />
          </div>
        </aside>
      </section>

      {/* Sumário de hoje */}
      <section className="grid gap-10 lg:grid-cols-12" aria-labelledby="ed-sumario">
        <div className="lg:col-span-8">
          <SectionHead number="01" title="Sumário de hoje" id="ed-sumario" aside={<Link to={path('baralhos')} className="ed-link ed-kicker text-ed-ink">Todos os baralhos</Link>} />
          {m.decks.length === 0 ? (
            <EdEmpty kicker="Sem baralhos" title="A primeira página está em branco." action={<EdButton icon={Plus} onClick={actions.newDeck}>Criar baralho</EdButton>}>
              Crie um baralho por disciplina — Direito Constitucional, Português, Informática — e escreva os cartões a partir dos seus erros.
            </EdEmpty>
          ) : (
            <ol className="divide-y divide-ed-rule border-b border-ed-rule">
              {(m.dueDecks.length ? m.dueDecks : m.decks).slice(0, 6).map((d, i) => (
                <li key={d.deck.id}>
                  <Link to={path(`baralhos/${d.deck.id}`)} className="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 py-4 sm:grid-cols-[2.5rem_1fr_auto]">
                    <span className="ed-kicker ed-num text-ed-graphite">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="min-w-0">
                        <span className="ed-serif block truncate text-[22px] leading-tight text-ed-ink transition-colors group-hover:text-ed-accent sm:text-[26px]">{d.deck.name}</span>
                        <span className="mt-0.5 block font-ed-sans text-[12.5px] text-ed-graphite">
                          {d.subjectName ?? 'Sem disciplina'} · {d.cards} {d.cards === 1 ? 'cartão' : 'cartões'} · domínio {d.mastery}%
                        </span>
                      </span>
                      <span className="ed-leader hidden sm:block" aria-hidden />
                    </span>
                    <span className="text-right">
                      <span className={`ed-serif ed-num block text-[28px] leading-none ${d.due.total ? 'text-ed-accent' : 'text-ed-stone'}`}>{d.due.total}</span>
                      <span className="ed-kicker text-[9.5px] text-ed-graphite">para hoje</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="lg:col-span-4">
          <SectionHead number="02" title="A semana" />
          <WeekColumns days={m.last7} />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ed-rule pt-5">
            <div>
              <dt className="ed-kicker text-ed-graphite">Cartões</dt>
              <dd className="ed-serif ed-num mt-1 text-[30px] leading-none">
                {m.week.cards} <Delta value={m.week.deltaCards} suffix="%" />
              </dd>
            </div>
            <div>
              <dt className="ed-kicker text-ed-graphite">Retenção</dt>
              <dd className="ed-serif ed-num mt-1 text-[30px] leading-none">{m.retention === null ? '—' : `${m.retention}%`}</dd>
            </div>
            <div>
              <dt className="ed-kicker text-ed-graphite">Questões</dt>
              <dd className="ed-serif ed-num mt-1 text-[30px] leading-none">
                {m.week.answered}
                {m.week.pct !== null && <span className="ml-1.5 font-ed-sans text-[12px] font-semibold text-ed-graphite">{m.week.pct}% certas</span>}
              </dd>
            </div>
            <div>
              <dt className="ed-kicker text-ed-graphite">Foco</dt>
              <dd className="ed-serif ed-num mt-1 text-[30px] leading-none">
                {m.week.focusMin}
                <span className="ml-1 font-ed-sans text-[12px] font-semibold text-ed-graphite">min</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Nota do dia */}
      <section className="grid gap-8 lg:grid-cols-12" aria-labelledby="ed-nota">
        <div className="lg:col-span-4">
          <SectionHead number="03" title="Nota do dia" id="ed-nota" />
          <p className="font-ed-sans text-[13px] leading-relaxed text-ed-graphite">
            Uma leitura curta dos seus números, com o próximo passo sugerido. Ela muda conforme você estuda.
          </p>
        </div>
        <blockquote className="border-l-2 border-ed-accent pl-6 lg:col-span-8 lg:pl-10">
          {m.weakest ? (
            <>
              <p className="ed-serif text-[26px] font-light italic leading-[1.25] text-ed-ink sm:text-[34px]">
                “{m.weakest.topic}”, em {m.weakest.subject}, tem {m.weakest.pct}% de acerto em {m.weakest.answered} questões. É o melhor lugar para investir os próximos vinte minutos.
              </p>
              <Link to="/questoes" className="ed-link mt-5 inline-block font-ed-sans text-[13px] font-semibold text-ed-ink">
                Treinar no Banco de Questões
              </Link>
            </>
          ) : m.pendingErrors > 0 ? (
            <>
              <p className="ed-serif text-[26px] font-light italic leading-[1.25] text-ed-ink sm:text-[34px]">
                Há {m.pendingErrors} {m.pendingErrors === 1 ? 'erro' : 'erros'} de prioridade alta ou média no caderno. Transformá-los em cartões é o jeito mais curto de não repeti-los.
              </p>
              <Link to="/erros" className="ed-link mt-5 inline-block font-ed-sans text-[13px] font-semibold text-ed-ink">
                Abrir o Caderno de Erros
              </Link>
            </>
          ) : (
            <p className="ed-serif text-[26px] font-light italic leading-[1.25] text-ed-ink sm:text-[34px]">
              {m.streak > 1
                ? `${m.streak} dias seguidos. A constância rende mais que a intensidade — mantenha a sequência com uma revisão curta.`
                : 'Revisar um pouco todos os dias rende mais do que estudar muito de uma vez. O Mimo cuida do calendário.'}
            </p>
          )}
        </blockquote>
      </section>
      {actions.modal}
    </div>
  );
}
