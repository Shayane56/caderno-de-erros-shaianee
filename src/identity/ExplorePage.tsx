import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Database, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';
import { IDENTITIES, getIdentity, identityPath, type IdentityId } from './registry';
import { readLastIdentity } from './store';
import { useHomeModel } from './model/home';
import { createDemoLibrary, readDemo, removeDemoLibrary } from './demoData';
import { BoldPreview, EditorialPreview, SoftPreview, type PreviewData } from './previews';

const PREVIEWS: Record<IdentityId, (p: { d: PreviewData }) => React.JSX.Element> = { editorial: EditorialPreview, soft: SoftPreview, bold: BoldPreview };

const SCREENS = [
  { screen: '', label: 'Início' },
  { screen: 'baralhos', label: 'Baralhos' },
  { screen: 'revisar/todos', label: 'Revisão' },
  { screen: 'estatisticas', label: 'Estatísticas' },
];

const COMPARE: Array<{ topic: string; values: Record<IdentityId, string> }> = [
  {
    topic: 'Tipografia',
    values: {
      editorial: 'Newsreader (serifa com tamanho óptico) para conteúdo e números; Inter Tight em versaletes para rótulos.',
      soft: 'DM Sans em toda a interface; títulos semibold com espaçamento negativo; números tabulares.',
      bold: 'Archivo expandido (125%) em peso 800–900 para títulos e números; JetBrains Mono para dados.',
    },
  },
  {
    topic: 'Cor',
    values: {
      editorial: 'Papel quente, tinta quase preta e um único acento bordô para o que pede ação.',
      soft: 'Névoa lavanda, superfícies brancas, violeta para ação e quatro tons pastel para as respostas.',
      bold: 'Osso, preto e dois sinais: ultravioleta (ação) e laranja-sinal (urgência).',
    },
  },
  {
    topic: 'Forma',
    values: {
      editorial: 'Sem caixas: fios de 1 px, colunas assimétricas, sumário numerado.',
      soft: 'Superfícies com raios de 12/18/28 px e sombras de duas camadas.',
      bold: 'Bordas de 2 px, cantos retos, círculos e quadrados como elementos gráficos.',
    },
  },
  {
    topic: 'Movimento',
    values: {
      editorial: 'Lento e preciso: fios que se desenham, sublinhados que crescem.',
      soft: 'Suave: elevação no hover, cartão que "assenta" ao revelar, pulsação de respiro.',
      bold: 'Rápido e com encaixe: deslizes de 280 ms, revelação em cortina, sombra dura ao passar.',
    },
  },
  {
    topic: 'Navegação no celular',
    values: {
      editorial: 'Barra inferior de texto e ícones finos; índice em tela cheia.',
      soft: 'Barra flutuante com botão central de revisão; "Mais" em folha inferior.',
      bold: 'Barra preta de cinco células; item ativo em bloco ultravioleta.',
    },
  },
  {
    topic: 'Sensação',
    values: {
      editorial: 'Maduro, calmo e intelectual — uma revista de estudo.',
      soft: 'Acolhedor e organizado — bom para sessões longas.',
      bold: 'Confiante e memorável — energia de produto contemporâneo.',
    },
  },
];

function DemoPanel({ hasCards, deckIds }: { hasCards: boolean; deckIds: string[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [created, setDemo] = useState(() => !!readDemo());
  const demo = created && !!readDemo()?.deckIds.some((id) => deckIds.includes(id));
  const create = async () => {
    setBusy('Preparando…');
    try {
      await createDemoLibrary(setBusy);
      setDemo(true);
      toast.success('Baralhos de exemplo criados', 'Quatro baralhos com duas semanas de histórico, gerado pelo próprio agendador.');
    } catch (e) {
      toast.error('Não foi possível criar os exemplos', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy('Removendo…');
    try {
      await removeDemoLibrary();
      setDemo(false);
      toast.success('Exemplos removidos', 'Seus próprios baralhos não foram alterados.');
    } catch (e) {
      toast.error('Não foi possível remover', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6" aria-labelledby="xp-demo">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
        <Database className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="xp-demo" className="text-[15.5px] font-bold text-zinc-900">
          {demo ? 'Baralhos de exemplo ativos' : hasCards ? 'As prévias usam os seus dados' : 'Sem cartões para avaliar?'}
        </h2>
        <p className="mt-0.5 text-[14px] leading-relaxed text-zinc-600">
          {demo
            ? 'Quatro baralhos de concurso com histórico de revisões. Remova quando terminar a avaliação — nada mais é alterado.'
            : 'Crie quatro baralhos de concurso (Constitucional, Português, Informática e SUS) com duas semanas de revisões simuladas. Tudo pode ser removido com um clique.'}
        </p>
      </div>
      {busy ? (
        <span className="flex items-center gap-2 text-[14px] font-semibold text-zinc-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {busy}
        </span>
      ) : demo ? (
        <button type="button" onClick={() => void remove()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-[14px] font-semibold text-zinc-800 hover:bg-zinc-50">
          <Trash2 className="h-4 w-4" aria-hidden /> Remover exemplos
        </button>
      ) : (
        <button type="button" data-testid="demo" onClick={() => void create()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-[14px] font-semibold text-white hover:bg-zinc-700">
          Criar baralhos de exemplo
        </button>
      )}
    </section>
  );
}

/** /identidades — "Explorar identidades do Mimo". */
export default function ExplorePage() {
  const m = useHomeModel();
  const last = readLastIdentity();
  useEffect(() => {
    document.title = 'Explorar identidades do Mimo';
    window.scrollTo({ top: 0 });
  }, []);
  const preview: PreviewData = { name: m.firstName, due: m.due.total, streak: m.streak, retention: m.retention, week: m.last7.map((d) => d.count) };

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#F4F4F1] text-zinc-900">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-4 pb-2 pt-[calc(1rem+var(--safe-top))] sm:px-8">
        <Link to="/" className="inline-flex h-10 items-center gap-2 text-[14px] font-semibold text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao Mimo
        </Link>
        {last && (
          <Link to={identityPath(last)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:ring-zinc-400">
            Continuar em {getIdentity(last).name} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-8">
        <section className="pb-10 pt-8 sm:pt-14">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-zinc-500">Direção de arte · 3 propostas</p>
          <h1 className="mt-3 max-w-4xl text-zinc-900 text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">Explorar identidades do Mimo</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-zinc-600">
            Três direções completas, implementadas nas telas reais do aplicativo: Início, Baralhos, Revisão e Estatísticas, com navegação própria no computador e no celular. Todas leem e gravam os mesmos dados — troque de identidade a qualquer momento, inclusive no meio de uma revisão, pelo seletor <b className="font-bold text-zinc-800">A · B · C</b>.
          </p>
        </section>

        <ul className="grid gap-6 lg:grid-cols-3">
          {IDENTITIES.map((idt) => {
            const Preview = PREVIEWS[idt.id];
            return (
              <li key={idt.id} className="flex flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
                <Link to={identityPath(idt.id)} className="group relative block aspect-[4/3] overflow-hidden border-b border-zinc-200" aria-label={`Abrir a demonstração ${idt.name}`}>
                  <div className="h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                    <Preview d={preview} />
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[13px] font-bold text-zinc-400">Proposta {idt.letter}</span>
                  </div>
                  <h2 className="mt-1 text-[26px] font-extrabold text-zinc-900 tracking-[-0.02em]">{idt.name}</h2>
                  <p className="mt-1 text-[14.5px] font-semibold text-zinc-700">{idt.concept}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">{idt.summary}</p>

                  <div className="mt-5" aria-label="Paleta">
                    <div className="flex h-9 overflow-hidden rounded-xl ring-1 ring-zinc-200">
                      {idt.palette.map((c) => (
                        <span key={c.hex} className="flex-1" style={{ background: c.hex }} title={`${c.name} ${c.hex} — ${c.role}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-[12px] text-zinc-500">{idt.palette.map((c) => c.name).join(' · ')}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                    <div>
                      <dt className="text-zinc-500">Títulos</dt>
                      <dd className={cn('text-[18px] leading-tight text-zinc-900', idt.id === 'editorial' && 'ed-serif', idt.id === 'soft' && 'font-sf font-semibold', idt.id === 'bold' && 'font-bd bd-wide uppercase')}>{idt.fonts.display}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Dados e rótulos</dt>
                      <dd className={cn('text-[15px] leading-tight text-zinc-900', idt.id === 'editorial' && 'font-ed-sans font-semibold', idt.id === 'soft' && 'font-sf', idt.id === 'bold' && 'font-bd-mono')}>{idt.fonts.data}</dd>
                    </div>
                  </dl>
                  <ul className="mt-4 space-y-1.5 text-[13px] text-zinc-600">
                    {idt.principles.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Link to={identityPath(idt.id)} className="flex h-12 items-center justify-between rounded-2xl bg-zinc-900 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-zinc-700">
                      Entrar na demonstração <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <nav className="mt-3 flex flex-wrap gap-1.5" aria-label={`Telas da proposta ${idt.name}`}>
                      {SCREENS.map((s) => (
                        <Link key={s.label} to={identityPath(idt.id, s.screen)} className="rounded-full bg-zinc-100 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700 hover:bg-zinc-200">
                          {s.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <DemoPanel hasCards={m.totals.cards > 0} deckIds={m.decks.map((d) => d.deck.id)} />
        </div>

        <section className="mt-16" aria-labelledby="xp-lado">
          <h2 id="xp-lado" className="text-zinc-900 text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
            Lado a lado
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-zinc-600">O que muda de uma proposta para outra — e o que não muda: dados, agendamento das revisões, atalhos de teclado e todas as ações.</p>
          <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            <div className="hidden grid-cols-[11rem_repeat(3,minmax(0,1fr))] border-b border-zinc-200 bg-zinc-50 text-[13px] font-bold text-zinc-500 md:grid">
              <span className="px-5 py-3" />
              {IDENTITIES.map((i) => (
                <span key={i.id} className="px-5 py-3">
                  {i.letter} · {i.name}
                </span>
              ))}
            </div>
            {COMPARE.map((row) => (
              <div key={row.topic} className="grid border-b border-zinc-200 last:border-0 md:grid-cols-[11rem_repeat(3,minmax(0,1fr))]">
                <p className="bg-zinc-50 px-5 py-3 text-[14px] font-bold md:bg-transparent md:py-4">{row.topic}</p>
                {IDENTITIES.map((i) => (
                  <p key={i.id} className="px-5 py-2.5 text-[14px] leading-relaxed text-zinc-700 md:py-4">
                    <span className="mr-1.5 font-bold text-zinc-400 md:hidden">{i.letter}</span>
                    {row.values[i.id]}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl bg-zinc-900 p-6 text-zinc-100 sm:p-10 md:grid-cols-[1fr_1.4fr]" aria-labelledby="xp-arq">
          <h2 id="xp-arq" className="text-white text-[24px] font-extrabold tracking-[-0.02em] sm:text-[30px]">
            Como funciona por dentro
          </h2>
          <div className="space-y-3 text-[14.5px] leading-relaxed text-zinc-300">
            <p>
              Cada identidade é só apresentação. As telas consomem os mesmos <b className="text-white">modelos compartilhados</b> (Início, Baralhos, Revisão e Estatísticas), que por sua vez usam os serviços já existentes — banco local, agendamento, sincronização e regras de negócio não foram alterados.
            </p>
            <p>
              Os tokens de cada proposta (cores, fontes, raios) também alcançam as janelas compartilhadas, como criar e editar cartões. Para adotar uma direção como definitiva, basta trocar as telas atuais pelas da identidade escolhida.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
