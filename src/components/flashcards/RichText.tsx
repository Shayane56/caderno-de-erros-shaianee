import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { HighlightColor } from '@/types';
import { getHighlight } from '@/constants/cardStyles';
import { parseRichText, type RichNode } from '@/utils/richText';
import { parseCloze } from '@/utils/cloze';

function renderNodes(nodes: RichNode[], defaultHighlight: HighlightColor, keyPrefix = ''): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    switch (node.t) {
      case 'text':
        return <Fragment key={key}>{node.v}</Fragment>;
      case 'b':
        return <strong key={key} className="font-bold">{renderNodes(node.c, defaultHighlight, `${key}-`)}</strong>;
      case 'i':
        return <em key={key}>{renderNodes(node.c, defaultHighlight, `${key}-`)}</em>;
      case 'u':
        return (
          <span key={key} className="underline decoration-2 underline-offset-[3px]">
            {renderNodes(node.c, defaultHighlight, `${key}-`)}
          </span>
        );
      case 'hl':
        return (
          <mark key={key} className="hl" style={{ '--hl': getHighlight(node.color ?? defaultHighlight).color } as CSSProperties}>
            {renderNodes(node.c, defaultHighlight, `${key}-`)}
          </mark>
        );
    }
  });
}

interface RichTextProps {
  text: string;
  highlight?: HighlightColor;
  className?: string;
}

/** Texto com negrito, itálico, sublinhado e marca-texto (sem HTML). */
export function RichText({ text, highlight = 'amarelo', className }: RichTextProps) {
  return <span className={className}>{renderNodes(parseRichText(text), highlight)}</span>;
}

interface ClozeTextProps {
  text: string;
  /** Número da lacuna estudada (as demais aparecem preenchidas). */
  active: number;
  revealed: boolean;
  highlight?: HighlightColor;
}

export function ClozeText({ text, active, revealed, highlight = 'amarelo' }: ClozeTextProps) {
  return (
    <>
      {parseCloze(text).map((segment, i) => {
        if (segment.t === 'text') return <Fragment key={i}>{renderNodes(parseRichText(segment.v), highlight, `${i}-`)}</Fragment>;
        if (segment.n !== active) return <Fragment key={i}>{renderNodes(parseRichText(segment.answer), highlight, `${i}-`)}</Fragment>;
        if (!revealed) {
          return (
            <span key={i} className="cloze-blank" aria-label={segment.hint ? `lacuna: ${segment.hint}` : 'lacuna'}>
              {segment.hint ? segment.hint : '[…]'}
            </span>
          );
        }
        return (
          <span key={i} className="cloze-answer">
            {renderNodes(parseRichText(segment.answer), highlight, `${i}-`)}
          </span>
        );
      })}
    </>
  );
}
