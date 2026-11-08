import type { CardFont, CoverPattern, DeckColor, HighlightColor, PaperStyle, PaperTint, TextSize } from '@/types';

export interface Option<T extends string> {
  id: T;
  label: string;
}

export const PAPERS: Array<Option<PaperStyle> & { description: string }> = [
  { id: 'pautado', label: 'Pautado', description: 'Linhas e margem, como folha de caderno' },
  { id: 'quadriculado', label: 'Quadriculado', description: 'Ótimo para esquemas e cálculos' },
  { id: 'pontilhado', label: 'Pontilhado', description: 'Estilo bullet journal' },
  { id: 'liso', label: 'Liso', description: 'Folha em branco, sem distrações' },
];

export const PAPER_TINTS: Array<Option<PaperTint> & { color: string }> = [
  { id: 'branco', label: 'Branco', color: '#FFFFFF' },
  { id: 'creme', label: 'Creme', color: '#FFFAEE' },
  { id: 'rosado', label: 'Rosado', color: '#FFF3F8' },
  { id: 'lavanda', label: 'Lavanda', color: '#F7F3FF' },
  { id: 'menta', label: 'Menta', color: '#F1FAF5' },
  { id: 'azulado', label: 'Azulado', color: '#F2F7FF' },
];

export const CARD_FONTS: Array<Option<CardFont> & { family: string; scale: number; sample: string }> = [
  { id: 'moderna', label: 'Moderna', family: '"Plus Jakarta Sans Variable", system-ui, sans-serif', scale: 1, sample: 'Aa' },
  { id: 'elegante', label: 'Elegante', family: '"Playfair Display Variable", Georgia, serif', scale: 1.04, sample: 'Aa' },
  { id: 'classica', label: 'Clássica', family: '"Lora Variable", Georgia, serif', scale: 1.02, sample: 'Aa' },
  { id: 'caderno', label: 'Caderno', family: '"Patrick Hand", "Comic Sans MS", cursive', scale: 1.12, sample: 'Aa' },
  { id: 'manuscrita', label: 'Manuscrita', family: '"Caveat Variable", "Patrick Hand", cursive', scale: 1.38, sample: 'Aa' },
];

export const HIGHLIGHTS: Array<Option<HighlightColor> & { color: string }> = [
  { id: 'amarelo', label: 'Amarelo', color: '#FFF27A' },
  { id: 'rosa', label: 'Rosa', color: '#FFC2DD' },
  { id: 'verde', label: 'Verde', color: '#BDF2C4' },
  { id: 'azul', label: 'Azul', color: '#BFE0FF' },
  { id: 'lilas', label: 'Lilás', color: '#DCCBFF' },
  { id: 'laranja', label: 'Laranja', color: '#FFD3A8' },
];

export const TEXT_SIZES: Array<Option<TextSize> & { px: number }> = [
  { id: 'p', label: 'Pequeno', px: 16 },
  { id: 'm', label: 'Médio', px: 18 },
  { id: 'g', label: 'Grande', px: 21 },
];

export const DECK_COLORS: Array<Option<DeckColor> & { color: string; deep: string }> = [
  { id: 'rosa', label: 'Rosa', color: '#F9A8D4', deep: '#BE185D' },
  { id: 'pink', label: 'Pink', color: '#EC4899', deep: '#9D174D' },
  { id: 'coral', label: 'Coral', color: '#FB7185', deep: '#BE123C' },
  { id: 'pessego', label: 'Pêssego', color: '#FDBA74', deep: '#C2410C' },
  { id: 'amarelo', label: 'Amarelo', color: '#FDE68A', deep: '#A16207' },
  { id: 'menta', label: 'Menta', color: '#A7F3D0', deep: '#047857' },
  { id: 'verde', label: 'Verde', color: '#34D399', deep: '#065F46' },
  { id: 'ceu', label: 'Céu', color: '#BAE6FD', deep: '#0369A1' },
  { id: 'azul', label: 'Azul', color: '#60A5FA', deep: '#1D4ED8' },
  { id: 'lavanda', label: 'Lavanda', color: '#DDD6FE', deep: '#6D28D9' },
  { id: 'roxo', label: 'Roxo', color: '#A78BFA', deep: '#5B21B6' },
  { id: 'grafite', label: 'Grafite', color: '#71717A', deep: '#3F3F46' },
];

export const COVER_PATTERNS: Array<Option<CoverPattern>> = [
  { id: 'liso', label: 'Lisa' },
  { id: 'bolinhas', label: 'Bolinhas' },
  { id: 'listras', label: 'Listras' },
  { id: 'xadrez', label: 'Xadrez' },
  { id: 'quadriculado', label: 'Quadriculada' },
  { id: 'coracoes', label: 'Corações' },
  { id: 'estrelas', label: 'Estrelas' },
];

export const DECK_EMOJIS = ['📒', '📘', '📗', '📕', '📙', '📓', '⚖️', '🏛️', '📜', '🧮', '💡', '🧠', '🌸', '💗', '⭐', '🎯', '🔥', '🍀', '☕', '🦋', '🌷', '💼', '🗂️', '✏️'];

const find = <T extends { id: string }>(list: T[], id: string | null | undefined): T => list.find((o) => o.id === id) ?? list[0];

export const getPaper = (id: string | null | undefined) => find(PAPERS, id);
export const getPaperTint = (id: string | null | undefined) => find(PAPER_TINTS, id);
export const getCardFont = (id: string | null | undefined) => find(CARD_FONTS, id);
export const getHighlight = (id: string | null | undefined) => find(HIGHLIGHTS, id);
export const getTextSize = (id: string | null | undefined) => TEXT_SIZES.find((t) => t.id === id) ?? TEXT_SIZES[1];
export const getDeckColor = (id: string | null | undefined) => find(DECK_COLORS, id);

export const isOneOf = <T extends string>(list: Array<Option<T>>, value: unknown): value is T =>
  typeof value === 'string' && list.some((o) => o.id === value);
