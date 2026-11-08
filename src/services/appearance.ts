import { useSyncExternalStore } from 'react';
import type { CardFont, HighlightColor, PaperStyle, PaperTint, TextSize } from '@/types';
import { CARD_FONTS, HIGHLIGHTS, PAPER_TINTS, PAPERS, TEXT_SIZES, isOneOf } from '@/constants/cardStyles';
import { COLOR_MODES, THEMES, getThemeMeta, type ColorMode, type ThemeId } from '@/constants/theme';
import { readPreference, writePreference } from './preferences';

/**
 * Aparência do aplicativo (guardada neste dispositivo): tema de cores, modo
 * claro/escuro e o estilo padrão dos flashcards.
 */
export interface Appearance {
  theme: ThemeId;
  mode: ColorMode;
  paper: PaperStyle;
  paperTint: PaperTint;
  cardFont: CardFont;
  textSize: TextSize;
  highlight: HighlightColor;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'rosa',
  mode: 'claro',
  paper: 'pautado',
  paperTint: 'branco',
  cardFont: 'moderna',
  textSize: 'm',
  highlight: 'amarelo',
};

const PREF_KEY = 'appearance';
const listeners = new Set<() => void>();
let current: Appearance = load();

function load(): Appearance {
  const raw = readPreference<Partial<Appearance>>(PREF_KEY, {});
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    theme: THEMES.some((t) => t.id === r.theme) ? (r.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
    mode: COLOR_MODES.some((m) => m.id === r.mode) ? (r.mode as ColorMode) : DEFAULT_APPEARANCE.mode,
    paper: isOneOf(PAPERS, r.paper) ? r.paper : DEFAULT_APPEARANCE.paper,
    paperTint: isOneOf(PAPER_TINTS, r.paperTint) ? r.paperTint : DEFAULT_APPEARANCE.paperTint,
    cardFont: isOneOf(CARD_FONTS, r.cardFont) ? r.cardFont : DEFAULT_APPEARANCE.cardFont,
    textSize: TEXT_SIZES.some((t) => t.id === r.textSize) ? (r.textSize as TextSize) : DEFAULT_APPEARANCE.textSize,
    highlight: isOneOf(HIGHLIGHTS, r.highlight) ? r.highlight : DEFAULT_APPEARANCE.highlight,
  };
}

function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function isDarkMode(appearance: Appearance = current): boolean {
  return appearance.mode === 'escuro' || (appearance.mode === 'sistema' && systemPrefersDark());
}

/** Aplica tema e modo ao documento (atributo data-theme, classe dark e cor da barra). */
export function applyAppearance(appearance: Appearance = current): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  root.classList.toggle('dark', isDarkMode(appearance));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDarkMode(appearance) ? '#181417' : getThemeMeta(appearance.theme).browserColor);
}

export function getAppearance(): Appearance {
  return current;
}

export function updateAppearance(patch: Partial<Appearance>): Appearance {
  current = { ...current, ...patch };
  writePreference(PREF_KEY, current);
  applyAppearance(current);
  listeners.forEach((l) => l());
  return current;
}

export function resetAppearance(): Appearance {
  return updateAppearance(DEFAULT_APPEARANCE);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aparência atual, com atualização automática quando muda. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getAppearance, getAppearance);
}

/** Inicialização: aplica as preferências salvas e acompanha o tema do sistema (modo automático). */
export function initAppearance(): void {
  current = load();
  applyAppearance(current);
  try {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (current.mode === 'sistema') {
        applyAppearance(current);
        listeners.forEach((l) => l());
      }
    });
  } catch {
    /* navegadores antigos: o modo automático é aplicado ao abrir o app */
  }
}
