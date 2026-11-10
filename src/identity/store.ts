import { useEffect } from 'react';
import { readPreference, writePreference } from '@/services/preferences';
import { getIdentity, isIdentityId, type IdentityId } from './registry';

const PREF = 'identity:last';

/** Última identidade visitada (para "Continuar de onde parei" na página de comparação). */
export function readLastIdentity(): IdentityId | null {
  const value = readPreference<string | null>(PREF, null);
  return isIdentityId(value) ? value : null;
}

export function writeLastIdentity(id: IdentityId): void {
  writePreference(PREF, id);
}

/**
 * Ativa os tokens da identidade no documento inteiro enquanto ela está aberta.
 * O atributo data-identity no <html> também alcança o que é renderizado em portais
 * (janelas de criar/editar cartão, avisos), que herdam paleta, fontes e raios.
 */
export function useDocumentIdentity(id: IdentityId): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.identity = id;
    writeLastIdentity(id);
    const meta = document.querySelector('meta[name="theme-color"]');
    const previousColor = meta?.getAttribute('content') ?? null;
    meta?.setAttribute('content', getIdentity(id).browserColor);
    return () => {
      delete root.dataset.identity;
      if (meta && previousColor) meta.setAttribute('content', previousColor);
    };
  }, [id]);
}
