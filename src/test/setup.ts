import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { db } from '@/database/db';

// O primeiro carregamento de uma página (rotas sob demanda) pode passar de 1 s com a suíte inteira rodando em paralelo.
configure({ asyncUtilTimeout: 4000 });

// Recharts/ResponsiveContainer depende de ResizeObserver (ausente no jsdom).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver ??= ResizeObserverMock;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
// jsdom não implementa rolagem nem layout: evita ruído esperado nos testes.
window.scrollTo = (() => {}) as typeof window.scrollTo;
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('of chart should be greater than 0')) return;
  originalWarn(...args);
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  try {
    localStorage.clear();
    // Caderno já identificado: a tela de boas-vindas só aparece nos testes que a removem.
    localStorage.setItem('caderno-erros:profile', JSON.stringify({ name: 'Shaiane Carvalho', skipped: false }));
  } catch {
    /* ignorado */
  }
});

afterEach(() => {
  cleanup();
});
