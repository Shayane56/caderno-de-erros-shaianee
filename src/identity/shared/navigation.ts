import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { IDENTITIES, switchIdentityPath, type IdentityId } from '../registry';

/** Telas principais — iguais nas três identidades (cada uma desenha a sua navegação). */
export const PRIMARY_NAV = [
  { screen: '', label: 'Início', short: 'Início', key: 'home' },
  { screen: 'baralhos', label: 'Baralhos', short: 'Baralhos', key: 'decks' },
  { screen: 'revisar/todos', label: 'Revisar', short: 'Revisar', key: 'review' },
  { screen: 'estatisticas', label: 'Estatísticas', short: 'Dados', key: 'stats' },
] as const;

export type PrimaryKey = (typeof PRIMARY_NAV)[number]['key'];

/** Demais áreas do Mimo — abrem no visual atual do aplicativo. */
export const MORE_NAV = [
  { to: '/foco', label: 'Modo Foco', key: 'focus' },
  { to: '/questoes', label: 'Banco de Questões', key: 'questions' },
  { to: '/erros', label: 'Caderno de Erros', key: 'errors' },
  { to: '/backup', label: 'Perfil e configurações', key: 'settings' },
] as const;

export type MoreKey = (typeof MORE_NAV)[number]['key'];

/** Qual item da navegação principal está ativo no caminho atual. */
export function activePrimary(pathname: string): PrimaryKey {
  const rest = pathname.replace(/^\/identidades\/[^/]+/, '');
  if (rest.startsWith('/baralhos')) return 'decks';
  if (rest.startsWith('/revisar')) return 'review';
  if (rest.startsWith('/estatisticas')) return 'stats';
  return 'home';
}

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

/**
 * Troca de identidade em tempo real, mantendo a tela atual (e os dados — eles
 * vivem no banco local, não na identidade). Usa View Transitions quando há.
 */
export function useIdentitySwitch(current: IdentityId) {
  const navigate = useNavigate();
  const location = useLocation();
  const switchTo = useCallback(
    (to: IdentityId) => {
      if (to === current) return;
      const target = switchIdentityPath(location.pathname, location.search, to);
      const doc = document as ViewTransitionDocument;
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(() => navigate(target)));
      else navigate(target);
    },
    [current, location.pathname, location.search, navigate],
  );
  return { options: IDENTITIES, current, switchTo };
}
