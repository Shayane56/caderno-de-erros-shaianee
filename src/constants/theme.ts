/**
 * Cores do tema atual como valores CSS. Elas acompanham automaticamente a troca
 * de tema de cores e o modo escuro (ver src/styles/themes.css).
 */
export const THEME = {
  pink: 'rgb(var(--c-rose-pink))',
  medium: 'rgb(var(--c-rose-medium))',
  antique: 'rgb(var(--c-rose-antique))',
  ink: 'rgb(var(--c-ink))',
  surface: 'rgb(var(--c-surface))',
} as const;

/** Versão translúcida de qualquer cor CSS (hex, rgb ou variável). */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export type ThemeId = 'rosa' | 'lavanda' | 'pessego' | 'menta' | 'ceu';
export type ColorMode = 'claro' | 'escuro' | 'sistema';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  /** Amostras para o seletor: [fundo suave, destaque, ação principal]. */
  swatches: [string, string, string];
  /** Cor da barra do navegador/PWA (meta theme-color). */
  browserColor: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'rosa', label: 'Rosa Premium', description: 'O clássico do caderno', swatches: ['#FCE7F3', '#E879A9', '#DB2777'], browserColor: '#DB2777' },
  { id: 'lavanda', label: 'Lavanda', description: 'Calmo e delicado', swatches: ['#F3E8FF', '#A78BFA', '#7C3AED'], browserColor: '#7C3AED' },
  { id: 'pessego', label: 'Pêssego', description: 'Quentinho e acolhedor', swatches: ['#FFEDE3', '#F59E6B', '#C2410C'], browserColor: '#C2410C' },
  { id: 'menta', label: 'Menta', description: 'Fresco e focado', swatches: ['#E3F7EE', '#4FB389', '#0D7A55'], browserColor: '#0D7A55' },
  { id: 'ceu', label: 'Céu', description: 'Leve e sereno', swatches: ['#E3F0FF', '#60A5FA', '#2563EB'], browserColor: '#2563EB' },
];

export const COLOR_MODES: Array<{ id: ColorMode; label: string }> = [
  { id: 'claro', label: 'Claro' },
  { id: 'escuro', label: 'Escuro' },
  { id: 'sistema', label: 'Automático' },
];

export function getThemeMeta(id: string | undefined): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
