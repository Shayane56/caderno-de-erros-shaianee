/**
 * Lacunas (cloze) no formato do Anki:
 *   "O prazo é de {{c1::15 dias}}"            → lacuna 1
 *   "{{c2::Lei 8.112::estatuto}}"              → lacuna 2 com dica "estatuto"
 * Cada número de lacuna vira uma face estudada separadamente.
 */
export type ClozeSegment = { t: 'text'; v: string } | { t: 'cloze'; n: number; answer: string; hint: string | null };

const CLOZE_RE = /\{\{c(\d{1,2})::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;

export function parseCloze(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(CLOZE_RE)) {
    const index = m.index ?? 0;
    if (index > last) segments.push({ t: 'text', v: text.slice(last, index) });
    segments.push({ t: 'cloze', n: Number(m[1]), answer: m[2], hint: m[3]?.trim() ? m[3].trim() : null });
    last = index + m[0].length;
  }
  if (last < text.length) segments.push({ t: 'text', v: text.slice(last) });
  return segments;
}

/** Números de lacuna presentes no texto, em ordem crescente e sem repetição. */
export function clozeNumbers(text: string): number[] {
  const numbers = new Set<number>();
  for (const s of parseCloze(text)) if (s.t === 'cloze' && s.n > 0 && s.answer.trim()) numbers.add(s.n);
  return [...numbers].sort((a, b) => a - b);
}

export function nextClozeNumber(text: string): number {
  const numbers = clozeNumbers(text);
  return numbers.length ? numbers[numbers.length - 1] + 1 : 1;
}

/** Texto com as lacunas preenchidas (para listas e buscas). */
export function clozeToPlain(text: string): string {
  return text.replace(CLOZE_RE, (_m, _n, answer: string) => answer);
}

/** Envolve a seleção em uma lacuna. `same` reutiliza o último número (lacunas estudadas juntas). */
export function insertCloze(value: string, start: number, end: number, same = false): { value: string; selectionStart: number; selectionEnd: number } {
  const numbers = clozeNumbers(value);
  const n = same && numbers.length ? numbers[numbers.length - 1] : nextClozeNumber(value);
  const selected = value.slice(start, end) || 'resposta';
  const before = `{{c${n}::`;
  const next = value.slice(0, start) + before + selected + '}}' + value.slice(end);
  const selectionStart = start + before.length;
  return { value: next, selectionStart, selectionEnd: selectionStart + selected.length };
}
