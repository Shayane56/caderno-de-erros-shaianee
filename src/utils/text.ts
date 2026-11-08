/** Normaliza texto para comparação/pesquisa: minúsculas, sem acentos e espaços extras. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Limpa espaços extras mantendo a grafia original. */
export function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Compara nomes ignorando maiúsculas, acentos e espaços. */
export function sameName(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Divide uma busca em termos. Expressões entre aspas são mantidas juntas.
 * Ex.: `ato "poder de polícia"` → ["ato", "poder de policia"]
 */
export function tokenizeSearch(query: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(query)) !== null) {
    const token = normalizeText(match[1] ?? match[2] ?? '');
    if (token) tokens.push(token);
  }
  return tokens;
}
