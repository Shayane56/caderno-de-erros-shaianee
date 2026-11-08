import type { HighlightColor } from '@/types';

/**
 * Marcação leve usada nos cartões (sem HTML, segura contra injeção):
 *   **negrito**   *itálico*   __sublinhado__
 *   ==marca-texto==   ==verde:marca-texto colorido==
 */
export type RichNode =
  | { t: 'text'; v: string }
  | { t: 'b' | 'i' | 'u'; c: RichNode[] }
  | { t: 'hl'; color: HighlightColor | null; c: RichNode[] };

export const HIGHLIGHT_IDS: HighlightColor[] = ['amarelo', 'rosa', 'verde', 'azul', 'lilas', 'laranja'];

const PATTERNS: Array<{ re: RegExp; build: (m: RegExpExecArray) => RichNode }> = [
  { re: /\*\*([\s\S]+?)\*\*/, build: (m) => ({ t: 'b', c: parseRichText(m[1]) }) },
  { re: /__([\s\S]+?)__/, build: (m) => ({ t: 'u', c: parseRichText(m[1]) }) },
  {
    re: /==(?:(amarelo|rosa|verde|azul|lilas|laranja):)?([\s\S]+?)==/,
    build: (m) => ({ t: 'hl', color: (m[1] as HighlightColor | undefined) ?? null, c: parseRichText(m[2]) }),
  },
  { re: /\*([^*\s](?:[^*]*?[^*\s])?)\*/, build: (m) => ({ t: 'i', c: parseRichText(m[1]) }) },
];

/** Converte o texto com marcação em uma árvore de nós. */
export function parseRichText(text: string): RichNode[] {
  const nodes: RichNode[] = [];
  let rest = text;
  while (rest) {
    let best: { index: number; length: number; node: RichNode } | null = null;
    for (const { re, build } of PATTERNS) {
      const m = re.exec(rest);
      if (m && (!best || m.index < best.index)) best = { index: m.index, length: m[0].length, node: build(m) };
    }
    if (!best) {
      nodes.push({ t: 'text', v: rest });
      break;
    }
    if (best.index > 0) nodes.push({ t: 'text', v: rest.slice(0, best.index) });
    nodes.push(best.node);
    rest = rest.slice(best.index + best.length);
  }
  return nodes;
}

/** Remove a marcação (para buscas, listas e leitura por voz). */
export function stripRichText(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/==(?:(?:amarelo|rosa|verde|azul|lilas|laranja):)?([\s\S]+?)==/g, '$1')
    .replace(/\*([^*\s](?:[^*]*?[^*\s])?)\*/g, '$1');
}

export interface WrapResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Envolve a seleção de um campo de texto com marcadores (usado pela barra de formatação). */
export function wrapSelection(value: string, start: number, end: number, before: string, after = before, placeholder = 'texto'): WrapResult {
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const selectionStart = start + before.length;
  return { value: next, selectionStart, selectionEnd: selectionStart + selected.length };
}
