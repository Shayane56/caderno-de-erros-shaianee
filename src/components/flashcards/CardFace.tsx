import type { ReactNode } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import type { Flashcard } from '@/types';
import { cn } from '@/utils/cn';
import { ClozeText, RichText } from './RichText';
import { paperVars, type ResolvedCardStyle } from './cardStyle';

interface CardFaceProps {
  card: Pick<Flashcard, 'type' | 'front' | 'back' | 'extra' | 'answer' | 'frontImage' | 'backImage'>;
  ord: string;
  revealed: boolean;
  style: ResolvedCardStyle;
  /** Rótulo no canto da folha (ex.: nome do baralho). */
  caption?: ReactNode;
  onImageClick?: (src: string) => void;
  className?: string;
  /** Altura mínima da folha (o estudo usa uma folha maior). */
  minHeight?: number;
}

function CardImage({ src, onClick, alt }: { src: string; onClick?: (src: string) => void; alt: string }) {
  const img = <img src={src} alt={alt} className="max-h-72 w-auto max-w-full rounded-xl object-contain shadow-sm ring-1 ring-black/5" />;
  if (!onClick) return <div className="my-2">{img}</div>;
  return (
    <button type="button" onClick={() => onClick(src)} className="my-2 block max-w-full cursor-zoom-in rounded-xl" aria-label="Ampliar imagem">
      {img}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="paper-muted font-sans text-[11px] font-bold uppercase leading-[inherit] tracking-[0.14em]">{children}</p>;
}

function Divider() {
  return <div className="my-[calc(var(--paper-line)/2-1px)] border-t-2 border-dashed" style={{ borderColor: 'color-mix(in srgb, var(--deck-deep) 35%, transparent)' }} aria-hidden />;
}

/** Folha de caderno com o conteúdo de uma face do cartão. */
export function CardFace({ card, ord, revealed, style, caption, onImageClick, className, minHeight = 220 }: CardFaceProps) {
  const reverse = card.type === 'basic' && ord === '1';
  const question = reverse ? card.back : card.front;
  const questionImage = reverse ? card.backImage : card.frontImage;
  const answer = reverse ? card.front : card.back;
  const answerImage = reverse ? card.frontImage : card.backImage;
  const hl = style.highlight;

  let body: ReactNode;
  if (card.type === 'cloze') {
    body = (
      <>
        <div className="whitespace-pre-wrap break-words">
          <ClozeText text={card.front} active={Number(ord)} revealed={revealed} highlight={hl} />
        </div>
        {card.frontImage && <CardImage src={card.frontImage} onClick={onImageClick} alt="Imagem do cartão" />}
        {revealed && (card.back || card.backImage) && (
          <div className="animate-card-flip">
            <Divider />
            {card.back && (
              <div className="whitespace-pre-wrap break-words">
                <RichText text={card.back} highlight={hl} />
              </div>
            )}
            {card.backImage && <CardImage src={card.backImage} onClick={onImageClick} alt="Imagem do verso" />}
          </div>
        )}
      </>
    );
  } else if (card.type === 'truefalse') {
    const certo = card.answer === 'certo';
    body = (
      <>
        <div className="whitespace-pre-wrap break-words">
          <RichText text={card.front} highlight={hl} />
        </div>
        {card.frontImage && <CardImage src={card.frontImage} onClick={onImageClick} alt="Imagem da afirmação" />}
        {revealed && (
          <div className="animate-card-flip">
            <Divider />
            <p className="flex items-center gap-2 font-sans text-[15px] font-extrabold uppercase tracking-wider" style={{ lineHeight: 'inherit', color: certo ? '#047857' : '#B91C1C' }}>
              {certo ? <CircleCheck className="h-5 w-5" aria-hidden /> : <CircleX className="h-5 w-5" aria-hidden />}
              Gabarito: {certo ? 'Certo' : 'Errado'}
            </p>
            {card.back && (
              <div className="whitespace-pre-wrap break-words">
                <RichText text={card.back} highlight={hl} />
              </div>
            )}
            {card.backImage && <CardImage src={card.backImage} onClick={onImageClick} alt="Imagem da justificativa" />}
          </div>
        )}
      </>
    );
  } else {
    body = (
      <>
        <div className="whitespace-pre-wrap break-words">
          <RichText text={question} highlight={hl} />
        </div>
        {questionImage && <CardImage src={questionImage} onClick={onImageClick} alt="Imagem da pergunta" />}
        {revealed && (
          <div className="animate-card-flip">
            <Divider />
            <SectionLabel>Resposta</SectionLabel>
            {answer && (
              <div className="whitespace-pre-wrap break-words">
                <RichText text={answer} highlight={hl} />
              </div>
            )}
            {answerImage && <CardImage src={answerImage} onClick={onImageClick} alt="Imagem da resposta" />}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={cn('paper overflow-hidden', `paper-${style.paper}`, className)}
      style={{ ...paperVars(style), minHeight }}
    >
      <div className={cn('relative pb-[var(--paper-line)] pr-5 pt-[var(--paper-line)] sm:pr-8', style.paper === 'pautado' ? 'pl-[3.4rem]' : 'pl-5 sm:pl-8')}>
        {caption && <div className="paper-muted absolute right-4 top-1.5 font-sans text-[11px] font-semibold leading-5">{caption}</div>}
        {body}
        {revealed && card.extra && (
          <div className="animate-card-flip">
            <Divider />
            <SectionLabel>Anotação</SectionLabel>
            <div className="paper-muted whitespace-pre-wrap break-words">
              <RichText text={card.extra} highlight={hl} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
