import type { CSSProperties } from 'react';
import type { CardFont, Deck, HighlightColor, PaperStyle, PaperTint, TextSize } from '@/types';
import { getCardFont, getDeckColor, getPaperTint, getTextSize } from '@/constants/cardStyles';
import { useAppearance, type Appearance } from '@/services/appearance';

export interface ResolvedCardStyle {
  paper: PaperStyle;
  paperTint: PaperTint;
  font: CardFont;
  textSize: TextSize;
  highlight: HighlightColor;
  /** Cor forte do baralho (lacunas, destaques). */
  deep: string;
}

/** Estilo efetivo do cartão: preferências do baralho, senão as da Personalização. */
export function resolveCardStyle(deck: Pick<Deck, 'paper' | 'paperTint' | 'font' | 'color'> | null | undefined, appearance: Appearance): ResolvedCardStyle {
  return {
    paper: deck?.paper ?? appearance.paper,
    paperTint: deck?.paperTint ?? appearance.paperTint,
    font: deck?.font ?? appearance.cardFont,
    textSize: appearance.textSize,
    highlight: appearance.highlight,
    deep: getDeckColor(deck?.color).deep,
  };
}

export function useCardStyle(deck: Pick<Deck, 'paper' | 'paperTint' | 'font' | 'color'> | null | undefined): ResolvedCardStyle {
  return resolveCardStyle(deck, useAppearance());
}

const LINE_BY_SIZE: Record<TextSize, number> = { p: 28, m: 32, g: 36 };

/** Variáveis CSS e tipografia da folha. */
export function paperVars(style: ResolvedCardStyle): CSSProperties {
  const font = getCardFont(style.font);
  const size = getTextSize(style.textSize).px * font.scale;
  return {
    '--paper-bg': getPaperTint(style.paperTint).color,
    '--paper-line': `${LINE_BY_SIZE[style.textSize]}px`,
    '--deck-deep': style.deep,
    fontFamily: font.family,
    fontSize: `${Math.round(size)}px`,
    lineHeight: `${LINE_BY_SIZE[style.textSize]}px`,
  } as CSSProperties;
}
