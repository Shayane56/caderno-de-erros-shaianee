export const APP_NAME = 'Caderno de Erros';
export const MAIN_PHRASE = 'Transformando dificuldades em aprendizado e erros em acertos.';
export const SECONDARY_PHRASE =
  'A aprovação também é construída a partir dos erros que você aprende a não repetir.';

/** Versão do formato do arquivo de backup. */
export const BACKUP_FORMAT_VERSION = 3;

/** Quantidade máxima de pontos de restauração automáticos mantidos. */
export const MAX_SNAPSHOTS = 5;

/**
 * Cores de gráficos (validadas para daltonismo com o validador de paleta):
 * série principal na cor do tema; "superados" sempre em verde.
 */
export const CHART_COLORS = {
  // Variáveis CSS: acompanham o tema de cores e o modo escuro.
  primary: 'rgb(var(--c-rose-pink))',
  primarySoft: 'rgb(var(--c-petal))',
  resolved: '#15803D',
  grid: 'rgb(var(--c-line))',
  axis: 'rgb(var(--c-ink-soft))',
  text: 'rgb(var(--c-ink))',
  muted: 'rgb(var(--c-ink-muted))',
} as const;
