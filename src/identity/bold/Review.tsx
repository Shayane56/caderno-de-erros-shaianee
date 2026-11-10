import { Link, useParams } from 'react-router-dom';
import type { Rating } from '@/types';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { KIND_LABEL, RATING_LABELS, useRevealScroll, useReviewSession, type ReviewSession } from '../model/review';
import { useFaceParts } from '../model/CardContent';
import { describeReturn } from '../model/home';
import { BIcon } from './icons';
import { BdButton, BdEmpty, BdLinkButton, Big, Label, pad } from './ui';

const path = (s = '') => identityPath('bold', s);
const RATING_HOVER: Record<Rating, string> = {
  1: 'hover:bg-bd-signal',
  2: 'hover:bg-bd-ink hover:text-bd-bone',
  3: 'hover:bg-bd-uv hover:text-white',
  4: 'hover:bg-bd-lav',
};
const RATING_MARK: Record<Rating, string> = { 1: 'bg-bd-signal', 2: 'bg-bd-ink', 3: 'bg-bd-uv', 4: 'bg-bd-lav' };

function Sheet({ s }: { s: ReviewSession }) {
  const item = s.item!;
  const f = useFaceParts(item.card, item.ord, s.revealed);
  const answerRef = useRevealScroll(s.revealed);
  return (
    <article key={s.key} className="bd-card bd-slide border-2 border-bd-ink bg-bd-paper shadow-[6px_6px_0_#0E0E10]" aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b-2 border-bd-ink px-4 py-2.5 sm:px-6">
        <span className="bd-mono truncate">{[KIND_LABEL[item.kind], s.faceLabel || null, s.all && s.deck ? s.deck.name : null].filter(Boolean).join(' / ')}</span>
        <span className={cn('h-3 w-3 shrink-0', item.kind === 'new' ? 'bg-bd-lav' : item.kind === 'learning' ? 'bg-bd-signal' : 'bg-bd-uv')} aria-hidden />
      </div>
      <div className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="whitespace-pre-wrap break-words text-[24px] font-semibold leading-[1.25] tracking-[-0.01em] [font-stretch:105%] sm:text-[32px]">{f.question}</div>
        {f.questionImage && <img src={f.questionImage} alt="Imagem da pergunta" className="mt-5 max-h-72 max-w-full border-2 border-bd-ink object-contain" />}
      </div>
      {s.revealed && (
        <div ref={answerRef} className="bd-wipe scroll-mb-[220px] border-t-2 border-bd-ink bg-bd-ink sm:scroll-mb-8 px-4 py-6 text-bd-bone sm:px-8 sm:py-8">
          {f.verdict && <p className={cn('bd-wide mb-3 inline-block px-2 py-1 text-[16px] uppercase', f.verdict === 'certo' ? 'bg-bd-uv text-white' : 'bg-bd-signal text-bd-ink')}>{f.verdict === 'certo' ? 'Certo' : 'Errado'}</p>}
          {f.kind === 'basic' && <Label className="text-bd-bone/60">Resposta</Label>}
          {f.answer && <div className="mt-2 whitespace-pre-wrap break-words text-[18px] leading-relaxed sm:text-[21px]">{f.answer}</div>}
          {f.answerImage && <img src={f.answerImage} alt="Imagem da resposta" className="mt-4 max-h-72 max-w-full object-contain" />}
          {f.extra && (
            <div className="mt-5 border-t-2 border-bd-bone/20 pt-4">
              <Label className="text-bd-bone/60">Nota</Label>
              <div className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-bd-bone/80">{f.extra}</div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Controls({ s }: { s: ReviewSession }) {
  if (!s.revealed) {
    return s.isTrueFalse ? (
      <div className="grid grid-cols-2 gap-3">
        <BdButton size="lg" variant="uv" icon="check" onClick={() => s.chooseTrueFalse('certo')} className="h-16">
          Certo <kbd className="bd-mono hidden opacity-60 sm:inline">C</kbd>
        </BdButton>
        <BdButton size="lg" variant="signal" icon="cross" onClick={() => s.chooseTrueFalse('errado')} className="h-16">
          Errado <kbd className="bd-mono hidden opacity-60 sm:inline">E</kbd>
        </BdButton>
      </div>
    ) : (
      <BdButton size="lg" variant="ink" block icon="eye" onClick={s.reveal} className="h-16">
        Revelar <kbd className="bd-mono hidden opacity-60 sm:inline">[espaço]</kbd>
      </BdButton>
    );
  }
  return (
    <div>
      {s.trueFalseCorrect !== null && (
        <p className={cn('bd-wide mb-3 px-3 py-2 text-center text-[15px] uppercase', s.trueFalseCorrect ? 'bg-bd-uv text-white' : 'bg-bd-signal')} role="status">
          {s.trueFalseCorrect ? 'Acertou. Quão fácil?' : 'Errou. Volta em instantes.'}
        </p>
      )}
      <div className={cn('grid border-2 border-bd-ink bg-bd-paper', s.allowed.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : s.allowed.length === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
        {s.allowed.map((r, i) => (
          <button
            key={r}
            type="button"
            disabled={s.saving}
            onClick={() => void s.rate(r)}
            className={cn(
              'group relative flex h-[84px] flex-col justify-between p-3 text-left transition-colors duration-100 disabled:opacity-40 sm:h-28',
              RATING_HOVER[r],
              s.allowed.length === 4 ? cn(i % 2 === 1 && 'border-l-2 border-bd-ink', i >= 2 && 'border-t-2 border-bd-ink sm:border-t-0', i === 2 && 'sm:border-l-2') : i > 0 && 'border-l-2 border-bd-ink',
            )}
          >
            <span className="flex items-start justify-between">
              <span className="bd-black text-[30px] leading-none sm:text-[36px]">{s.allowed.length === 1 ? '→' : r}</span>
              <span className={cn('h-3 w-3', RATING_MARK[r])} aria-hidden />
            </span>
            <span>
              <span className="bd-wide block text-[15px] uppercase">{s.trueFalseCorrect === false ? 'Continuar' : RATING_LABELS[r]}</span>
              <span className="bd-mono opacity-70">{s.intervals?.[r]}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BoldReview() {
  const { deckId } = useParams();
  const s = useReviewSession(deckId);
  const backTo = s.all ? path() : path(`baralhos/${deckId}`);
  if (s.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (s.notFound) return <BdEmpty title="Baralho não encontrado" action={<BdLinkButton to={path('baralhos')} icon="back">Baralhos</BdLinkButton>} />;

  if (!s.item) {
    const pct = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : null;
    const back = describeReturn(s.nextDueAt);
    return (
      <div className="bd-up space-y-8">
        <Label>Sessão encerrada / {s.title}</Label>
        <p className="bd-black text-[120px] text-bd-uv sm:text-[220px]">{pct === null ? 'OK' : `${pct}%`}</p>
        <p className="bd-wide max-w-3xl text-[26px] uppercase sm:text-[40px]">{s.stats.answered ? 'lembrados nesta sessão.' : 'Nada vence agora.'}</p>
        {s.stats.answered > 0 && (
          <div className="grid max-w-2xl grid-cols-2 border-2 border-bd-ink">
            <div className="p-5">
              <Big value={pad(s.stats.answered)} label="Respondidos" size="md" />
            </div>
            <div className="border-l-2 border-bd-ink p-5">
              <Big value={Math.max(1, Math.round(s.stats.ms / 60_000))} label="Minutos" size="md" />
            </div>
          </div>
        )}
        {back && (
          <p className="bd-mono inline-block bg-bd-signal px-2 py-1 normal-case tracking-normal">
            {s.laterToday + 1} em aprendizagem {s.laterToday ? 'voltam' : 'volta'} {back}.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <BdLinkButton to={backTo} variant="uv" size="lg" iconRight="arrow">
            {s.all ? 'Início' : 'Baralho'}
          </BdLinkButton>
          <BdLinkButton to={path('estatisticas')} variant="line" size="lg">
            Dados
          </BdLinkButton>
        </div>
      </div>
    );
  }

  const total = s.stats.answered + s.counts.total;
  const segments = Math.min(total, 40);
  const done = total ? Math.round((s.stats.answered / total) * segments) : 0;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col lg:min-h-[calc(100dvh-10rem)]">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link to={backTo} className="bd-mono inline-flex items-center gap-2 hover:text-bd-uv">
            <BIcon name="back" size={16} /> <span className="truncate">{s.title}</span>
          </Link>
          <p className="bd-black mt-2 text-[48px] sm:text-[64px]">
            {pad(s.stats.answered + 1)}
            <span className="text-bd-line">/{pad(total)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void s.undo()} disabled={!s.canUndo} className="bd-hit flex h-11 w-11 items-center justify-center border-2 border-bd-ink bg-bd-paper disabled:pointer-events-none disabled:opacity-30" aria-label="Desfazer última resposta (Ctrl+Z)">
            <BIcon name="undo" />
          </button>
          <button type="button" onClick={s.edit} className="bd-hit flex h-11 w-11 items-center justify-center border-2 border-bd-ink bg-bd-paper" aria-label="Editar cartão (E)">
            <BIcon name="edit" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-[3px]" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da revisão">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={cn('h-2.5 flex-1 transition-colors duration-200', i < done ? 'bg-bd-uv' : 'bg-bd-line')} />
        ))}
      </div>
      <div className="bd-mono mt-2 flex gap-4 text-bd-grey">
        <span>
          <b className="text-bd-ink">{pad(s.counts.new)}</b> novos
        </span>
        <span>
          <b className="text-bd-signal">{pad(s.counts.learning)}</b> aprendendo
        </span>
        <span>
          <b className="text-bd-uv">{pad(s.counts.review)}</b> revisões
        </span>
      </div>

      <div className="flex-1 py-7 sm:py-10">
        <Sheet s={s} />
      </div>

      <div className="sticky bottom-0 -mx-4 bg-bd-bone px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 sm:static sm:mx-0 sm:p-0">
        <Controls s={s} />
        <p className="bd-mono mt-3 hidden text-center text-bd-grey sm:block">[espaço] revela · [1–4] avalia · [E] edita · [Ctrl+Z] desfaz</p>
      </div>
    </div>
  );
}
