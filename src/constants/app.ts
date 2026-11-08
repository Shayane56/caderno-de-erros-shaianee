export const APP_NAME = 'Caderno de Erros';
export const OWNER_NAME = 'Shaiane Carvalho';
export const APP_FULL_NAME = `${APP_NAME} — ${OWNER_NAME}`;
export const MAIN_PHRASE = 'Transformando dificuldades em aprendizado e erros em acertos.';
export const SECONDARY_PHRASE =
  'A aprovação também é construída a partir dos erros que você aprende a não repetir.';

/** Versão do formato do arquivo de backup. */
export const BACKUP_FORMAT_VERSION = 2;

/** Quantidade máxima de pontos de restauração automáticos mantidos. */
export const MAX_SNAPSHOTS = 5;

/**
 * Cores de gráficos (validadas para daltonismo com o validador de paleta):
 * série principal em rosa pink; "superados" sempre em verde.
 */
export const CHART_COLORS = {
  primary: '#DB2777',
  primarySoft: '#F9D5E5',
  resolved: '#15803D',
  grid: '#F1E4EB',
  axis: '#A3949D',
  text: '#51434B',
  muted: '#7A6871',
} as const;
