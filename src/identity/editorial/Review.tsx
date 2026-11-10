import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PenLine, Undo2 } from 'lucide-react';
import type { Rating } from '@/types';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { KIND_LABEL, RATING_LABELS, useRevealScroll, useReviewSession, type ReviewSession } from '../model/review';
import { useFaceParts } from '../model/CardContent';
import { describeReturn } from '../model/home';
import { ED_ICON, EdButton, EdEmpty, EdLinkButton, Figure, Kicker } from './ui';

const path = (screen = '') => identityPath('editorial', screen);

function Image({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="my-5 max-h-72 w-auto max-w-full border border-ed-rule object-contain" />;
}

function Page({ s }: { s: ReviewSession }) {
  const item = s.item!;
  const f = useFaceParts(item.card, item.ord, s.revealed);
  const answerRef = useRevealScroll(s.revealed);
  const caption = [s.all && s.deck ? s.deck.name : null, KIND_LABEL[item.kind], s.faceLabel || null].filter(Boolean).join(' · ');
  return (
    <article key={s.key} className="ed-card ed-rise" aria-live="polite">
      <Kicker>
        <span className="text-ed-accent">{f.kind === 'truefalse' ? 'Afirmação' : f.kind === 'cloze' ? 'Complete' : 'Pergunta'}</span> · {caption}
      </Kicker>
      <div className="ed-serif mt-5 whitespace-pre-wrap break-words text-[27px] font-normal leading-[1.28] tracking-[-0.01em] text-ed-ink sm:text-[36px]">{f.question}</div>
      {f.questionImage && <Image src={f.questionImage} alt="Imagem da pergunta" />}
      {s.revealed && (
        <div ref={answerRef} className="ed-rise mt-10 scroll-mb-[200px] sm:scroll-mb-8">
          <div className="h-px w-16 bg-ed-accent ed-draw" aria-hidden />
          {f.verdict && (
            <p className={cn('ed-kicker mt-5', f.verdict === 'certo' ? 'text-ed-moss' : 'text-ed-accent')}>Gabarito: {f.verdict === 'certo' ? 'Certo' : 'Errado'}</p>
          )}
          {f.answer && (
            <>
              {f.kind === 'basic' && <Kicker className="mt-5">Resposta</Kicker>}
              <div className="ed-serif mt-3 whitespace-pre-wrap break-words text-[21px] leading-[1.5] text-ed-ink sm:text-[24px]">{f.answer}</div>
            </>
          )}
          {f.answerImage && <Image src={f.answerImage} alt="Imagem da resposta" />}
          {f.extra && (
            <aside className="mt-8 border-l border-ed-rule pl-5">
              <Kicker>Nota</Kicker>
              <div className="ed-serif mt-2 whitespace-pre-wrap break-words text-[17px] italic leading-relaxed text-ed-graphite">{f.extra}</div>
            </aside>
          )}
        </div>
      )}
    </article>
  );
}

function Answers({ s }: { s: ReviewSession }) {
  if (!s.revealed) {
    if (s.isTrueFalse) {
      return (
        <div>
          <p className="ed-kicker mb-3 text-center text-ed-graphite">Certo ou errado?</p>
          <div className="grid grid-cols-2 border-y border-ed-ink">
            {(['certo', 'errado'] as const).map((v, i) => (
              <button key={v} type="button" onClick={() => s.chooseTrueFalse(v)} className={cn('group flex h-16 items-center justify-center gap-3 transition-colors hover:bg-ed-ink hover:text-ed-paper', i > 0 && 'border-l border-ed-ink')}>
                <span className="ed-serif text-[24px] italic">{v === 'certo' ? 'Certo' : 'Errado'}</span>
                <kbd className="hidden font-ed-sans text-[10px] text-ed-stone group-hover:text-ed-paper/70 sm:inline">{v === 'certo' ? 'C' : 'E'}</kbd>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <EdButton block onClick={s.reveal} className="h-14 text-[13.5px]">
        Mostrar a resposta <kbd className="ml-2 hidden font-ed-sans text-[10.5px] font-medium opacity-60 sm:inline">espaço</kbd>
      </EdButton>
    );
  }
  return (
    <div>
      {s.trueFalseCorrect !== null ? (
        <p className={cn('ed-serif mb-3 text-center text-[18px] italic', s.trueFalseCorrect ? 'text-ed-moss' : 'text-ed-accent')} role="status">
          {s.trueFalseCorrect ? 'Você acertou. Quão fácil foi?' : 'Não desta vez — o cartão volta daqui a pouco.'}
        </p>
      ) : (
        <p className="ed-kicker mb-3 text-center text-ed-graphite">Como foi lembrar?</p>
      )}
      <div className={cn('grid border-y border-ed-ink', s.allowed.length === 4 ? 'grid-cols-4' : s.allowed.length === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
        {s.allowed.map((r: Rating, i) => (
          <button
            key={r}
            type="button"
            disabled={s.saving}
            onClick={() => void s.rate(r)}
            className={cn(
              'group flex h-[76px] flex-col items-center justify-center gap-1 transition-colors disabled:opacity-40',
              i > 0 && 'border-l border-ed-rule',
              r === 1 ? 'hover:bg-ed-accent hover:text-ed-paper' : 'hover:bg-ed-ink hover:text-ed-paper',
            )}
          >
            <span className={cn('ed-serif text-[20px] italic leading-none sm:text-[24px]', r === 1 && 'text-ed-accent group-hover:text-ed-paper')}>
              {s.trueFalseCorrect === false ? 'Continuar' : RATING_LABELS[r]}
            </span>
            <span className="ed-num font-ed-sans text-[11px] font-semibold text-ed-graphite group-hover:text-ed-paper/75">
              {s.intervals?.[r]} <kbd className="ml-0.5 hidden opacity-60 sm:inline">{r}</kbd>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EditorialReview() {
  const { deckId } = useParams();
  const s = useReviewSession(deckId);
  const backTo = s.all ? path() : path(`baralhos/${deckId}`);
  if (s.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (s.notFound) return <EdEmpty kicker="Revisão" title="Este baralho não existe mais." action={<EdLinkButton to={path('baralhos')} icon={ArrowLeft}>Voltar ao sumário</EdLinkButton>} />;

  if (!s.item) {
    const pct = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0;
    const back = describeReturn(s.nextDueAt);
    return (
      <div className="mx-auto max-w-3xl py-6 ed-rise">
        <Kicker className="text-ed-accent">Fim da edição</Kicker>
        <h1 className="ed-serif mt-4 text-[44px] font-light leading-[1.02] tracking-[-0.02em] sm:text-[64px]">
          {s.stats.answered ? 'Revisão de hoje concluída.' : 'Nada a revisar por agora.'}
        </h1>
        <p className="ed-serif mt-5 text-[20px] leading-relaxed text-ed-graphite">
          {s.stats.answered
            ? `Você passou por ${s.stats.answered} ${s.stats.answered === 1 ? 'cartão' : 'cartões'} de “${s.title}”. Cada resposta ajustou a data da próxima pergunta.`
            : `Não há cartões de “${s.title}” vencendo agora. Os próximos aparecem sozinhos, no dia certo.`}
          {back && ` ${s.laterToday + 1} em aprendizagem ${s.laterToday ? 'voltam' : 'volta'} ${back}.`}
        </p>
        {s.stats.answered > 0 && (
          <div className="mt-10 grid grid-cols-3 gap-6 border-y border-ed-ink py-6">
            <Figure value={s.stats.answered} label="Respondidos" />
            <Figure value={`${pct}%`} label="Lembrados" accent />
            <Figure value={Math.max(1, Math.round(s.stats.ms / 60_000))} label="Minutos" />
          </div>
        )}
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <EdLinkButton to={backTo} iconRight={ArrowRight}>
            {s.all ? 'Voltar ao início' : 'Voltar ao baralho'}
          </EdLinkButton>
          <Link to={path('estatisticas')} className="ed-link font-ed-sans text-[13px] font-semibold">
            Ver o relatório
          </Link>
        </div>
      </div>
    );
  }

  const position = s.stats.answered + 1;
  const total = s.stats.answered + s.counts.total;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-3xl flex-col">
      <div className="flex items-center justify-between gap-4">
        <Link to={backTo} className="ed-link inline-flex min-w-0 items-center gap-2 font-ed-sans text-[13px] font-semibold text-ed-graphite hover:text-ed-ink">
          <ArrowLeft {...ED_ICON} className="h-4 w-4" /> <span className="truncate">{s.title}</span>
        </Link>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void s.undo()} disabled={!s.canUndo} className="flex h-10 w-10 items-center justify-center text-ed-ink transition-colors hover:text-ed-accent disabled:opacity-30" aria-label="Desfazer última resposta (Ctrl+Z)" title="Desfazer (Ctrl+Z)">
            <Undo2 {...ED_ICON} />
          </button>
          <button type="button" onClick={s.edit} className="flex h-10 w-10 items-center justify-center text-ed-ink transition-colors hover:text-ed-accent" aria-label="Editar cartão (E)" title="Editar (E)">
            <PenLine {...ED_ICON} />
          </button>
          <span className="ed-num ml-2 font-ed-sans text-[13px] font-semibold tabular-nums">
            <span className="text-ed-accent">{position}</span>
            <span className="text-ed-stone"> / {total}</span>
          </span>
        </div>
      </div>
      <div className="relative mt-3 h-px bg-ed-rule" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da revisão">
        <div className="absolute inset-y-0 left-0 bg-ed-accent transition-[width] duration-700" style={{ width: `${s.progress}%`, height: 2, top: -0.5 }} />
      </div>
      <div className="mt-3 flex gap-5 font-ed-sans text-[11.5px] text-ed-graphite">
        <span>
          <b className="ed-num font-semibold text-ed-ink">{s.counts.new}</b> novos
        </span>
        <span>
          <b className="ed-num font-semibold text-ed-accent">{s.counts.learning}</b> aprendendo
        </span>
        <span>
          <b className="ed-num font-semibold text-ed-ink">{s.counts.review}</b> revisões
        </span>
      </div>

      <div className="flex-1 py-10 sm:py-16">
        <Page s={s} />
      </div>

      <div className="sticky bottom-0 -mx-5 bg-ed-paper/95 px-5 pb-[calc(1rem+var(--safe-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
        <Answers s={s} />
        <p className="mt-3 hidden text-center font-ed-sans text-[11px] text-ed-stone sm:block">espaço revela · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil · E editar · Ctrl+Z desfazer</p>
      </div>
    </div>
  );
}
