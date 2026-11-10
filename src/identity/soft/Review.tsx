import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Eye, PenLine, Undo2, X } from 'lucide-react';
import type { Rating } from '@/types';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { KIND_LABEL, RATING_LABELS, useRevealScroll, useReviewSession, type ReviewSession } from '../model/review';
import { useFaceParts } from '../model/CardContent';
import { describeReturn } from '../model/home';
import { Chip, Ring, SF_ICON, SfButton, SfEmpty, SfLinkButton, Surface, type Tone } from './ui';

const path = (s = '') => identityPath('soft', s);
const RATING_STYLE: Record<Rating, string> = {
  1: 'bg-sf-rose text-sf-rose-ink hover:ring-sf-rose-ink/40',
  2: 'bg-sf-peach text-sf-peach-ink hover:ring-sf-peach-ink/40',
  3: 'bg-sf-mint text-sf-mint-ink hover:ring-sf-mint-ink/40',
  4: 'bg-sf-sky text-sf-sky-ink hover:ring-sf-sky-ink/40',
};
const KIND_TONE: Record<string, Tone> = { new: 'sky', learning: 'peach', review: 'violet' };

function CardSheet({ s }: { s: ReviewSession }) {
  const item = s.item!;
  const f = useFaceParts(item.card, item.ord, s.revealed);
  const answerRef = useRevealScroll(s.revealed);
  return (
    <article key={s.key} className="sf-card sf-in relative rounded-[28px] bg-white px-6 pb-8 pt-6 shadow-[0_1px_2px_rgb(43_37_64/0.04),0_24px_60px_-30px_rgb(78_55_174/0.45)] sm:px-10 sm:pb-10 sm:pt-8" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</Chip>
        {s.faceLabel && <Chip tone="violet">{s.faceLabel}</Chip>}
        {s.all && s.deck && <span className="truncate text-[12.5px] font-medium text-sf-muted">{s.deck.name}</span>}
      </div>
      <div className="mt-6 whitespace-pre-wrap break-words text-[21px] font-medium leading-[1.5] tracking-[-0.01em] sm:text-[25px]">{f.question}</div>
      {f.questionImage && <img src={f.questionImage} alt="Imagem da pergunta" className="mt-4 max-h-72 max-w-full rounded-2xl object-contain" />}
      {s.revealed && (
        <div ref={answerRef} className="sf-flip mt-6 scroll-mb-[180px] rounded-[20px] bg-sf-mist p-5 sm:scroll-mb-8 sm:p-6">
          {f.verdict && (
            <p className={cn('mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold', f.verdict === 'certo' ? 'bg-sf-mint text-sf-mint-ink' : 'bg-sf-rose text-sf-rose-ink')}>
              {f.verdict === 'certo' ? <Check {...SF_ICON} className="h-4 w-4" /> : <X {...SF_ICON} className="h-4 w-4" />}
              Gabarito: {f.verdict === 'certo' ? 'Certo' : 'Errado'}
            </p>
          )}
          {f.kind === 'basic' && <p className="text-[12.5px] font-semibold text-sf-violet">Resposta</p>}
          {f.answer && <div className="mt-1 whitespace-pre-wrap break-words text-[17px] leading-relaxed sm:text-[18.5px]">{f.answer}</div>}
          {f.answerImage && <img src={f.answerImage} alt="Imagem da resposta" className="mt-3 max-h-72 max-w-full rounded-2xl object-contain" />}
          {f.extra && (
            <div className="mt-4 border-t border-sf-line pt-3">
              <p className="text-[12.5px] font-semibold text-sf-muted">Anotação</p>
              <div className="mt-1 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-sf-muted">{f.extra}</div>
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
      <div className="grid grid-cols-2 gap-2.5">
        <SfButton size="lg" variant="outline" icon={Check} onClick={() => s.chooseTrueFalse('certo')} className="h-14 text-sf-mint-ink">
          Certo
        </SfButton>
        <SfButton size="lg" variant="outline" icon={X} onClick={() => s.chooseTrueFalse('errado')} className="h-14 text-sf-rose-ink">
          Errado
        </SfButton>
      </div>
    ) : (
      <SfButton size="lg" block icon={Eye} onClick={s.reveal} className="h-14">
        Mostrar resposta <kbd className="ml-1 hidden rounded-md bg-white/20 px-1.5 text-[11px] font-medium sm:inline">espaço</kbd>
      </SfButton>
    );
  }
  return (
    <div>
      <p className="mb-2.5 text-center text-[13.5px] font-medium text-sf-muted" role="status">
        {s.trueFalseCorrect === true ? 'Você acertou! Quão fácil foi?' : s.trueFalseCorrect === false ? 'Tudo bem — ele volta daqui a pouco.' : 'Como foi lembrar?'}
      </p>
      <div className={cn('grid gap-2', s.allowed.length === 4 ? 'grid-cols-4' : s.allowed.length === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
        {s.allowed.map((r) => (
          <button
            key={r}
            type="button"
            disabled={s.saving}
            onClick={() => void s.rate(r)}
            className={cn('sf-press flex h-[64px] flex-col items-center justify-center rounded-2xl ring-1 ring-transparent transition-all duration-200 disabled:opacity-50', RATING_STYLE[r])}
          >
            <span className="text-[14.5px] font-bold">{s.trueFalseCorrect === false ? 'Continuar' : RATING_LABELS[r]}</span>
            <span className="sf-num text-[12px] font-medium opacity-80">{s.intervals?.[r]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SoftReview() {
  const { deckId } = useParams();
  const s = useReviewSession(deckId);
  const backTo = s.all ? path() : path(`baralhos/${deckId}`);
  if (s.loading) return <div className="h-[60vh]" aria-busy="true" />;
  if (s.notFound) {
    return (
      <Surface>
        <SfEmpty icon={X} title="Baralho não encontrado" action={<SfLinkButton to={path('baralhos')} variant="soft">Voltar</SfLinkButton>} />
      </Surface>
    );
  }
  if (!s.item) {
    const pct = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 100;
    const back = describeReturn(s.nextDueAt);
    return (
      <div className="mx-auto max-w-lg pt-4">
        <Surface className="sf-in flex flex-col items-center px-6 py-10 text-center !rounded-[28px]">
          <Ring value={pct} size={150} stroke={12} label={`${pct}% lembrados`} color="#2E7A61" track="#DFF3EA">
            <span className="sf-num text-[34px] font-semibold leading-none">{s.stats.answered ? `${pct}%` : <Check {...SF_ICON} className="h-9 w-9 text-sf-mint-ink" />}</span>
            {s.stats.answered > 0 && <span className="mt-1 text-[12px] text-sf-muted">lembrados</span>}
          </Ring>
          <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">{s.stats.answered ? 'Sessão concluída' : 'Tudo em dia'}</h1>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-sf-muted">
            {s.stats.answered
              ? `${s.stats.answered} ${s.stats.answered === 1 ? 'cartão' : 'cartões'} em ${Math.max(1, Math.round(s.stats.ms / 60_000))} min. Sua memória agradece — faça uma pausa antes do próximo bloco.`
              : `Nenhum cartão de “${s.title}” vence agora. Os próximos aparecem no dia certo.`}
          </p>
          {back && (
            <p className="mt-4 rounded-2xl bg-sf-lav-50 px-4 py-2.5 text-[13.5px] text-sf-violet-deep">
              {s.laterToday + 1} em aprendizagem {s.laterToday ? 'voltam' : 'volta'} {back}.
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <SfLinkButton to={backTo} size="lg">
              {s.all ? 'Voltar ao início' : 'Voltar ao baralho'}
            </SfLinkButton>
            <SfLinkButton to={path('estatisticas')} variant="soft" size="lg">
              Ver estatísticas
            </SfLinkButton>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-2xl flex-col lg:min-h-[calc(100dvh-4rem)]">
      <div className="flex items-center gap-3">
        <Link to={backTo} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sf-muted shadow-[0_1px_3px_rgb(43_37_64/0.08)] hover:text-sf-plum" aria-label={`Sair para ${s.title}`}>
          <ArrowLeft {...SF_ICON} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-sf-muted">
            <span className="truncate">{s.title}</span>
            <span className="sf-num shrink-0 pl-2">
              {s.stats.answered} de {s.stats.answered + s.counts.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sf-lav" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da sessão">
            <div className="h-full rounded-full bg-sf-violet transition-[width] duration-700 ease-out" style={{ width: `${Math.max(3, s.progress)}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => void s.undo()} disabled={!s.canUndo} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sf-muted transition-colors hover:bg-white hover:text-sf-plum disabled:opacity-35" aria-label="Desfazer última resposta (Ctrl+Z)">
          <Undo2 {...SF_ICON} />
        </button>
        <button type="button" onClick={s.edit} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sf-muted transition-colors hover:bg-white hover:text-sf-plum" aria-label="Editar cartão (E)">
          <PenLine {...SF_ICON} />
        </button>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Chip tone="sky">{s.counts.new} novos</Chip>
        <Chip tone="peach">{s.counts.learning} aprendendo</Chip>
        <Chip>{s.counts.review} revisões</Chip>
      </div>

      <div className="flex-1 py-6 sm:py-8">
        <CardSheet s={s} />
      </div>

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-sf-mist from-70% to-transparent px-4 pb-[calc(1rem+var(--safe-bottom))] pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
        <Controls s={s} />
        <p className="mt-3 hidden text-center text-[11.5px] text-sf-soft sm:block">espaço · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil · E editar · Ctrl+Z desfazer</p>
      </div>
    </div>
  );
}
