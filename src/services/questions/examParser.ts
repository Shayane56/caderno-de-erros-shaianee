import type { QuestionAnswer, QuestionFormat } from '@/types';

/**
 * Leitor de provas coladas (texto copiado de um PDF).
 * Separa as questões pela numeração, identifica as alternativas (A) … (E) e
 * aplica o gabarito colado à parte. O resultado é revisado antes de salvar.
 */
export interface ParsedQuestion {
  number: number;
  statement: string;
  options: string[];
  format: QuestionFormat;
  answer: QuestionAnswer | null;
  /** Gabarito informado como anulado. */
  annulled: boolean;
}

const QUESTION_START = /^\s*(?:quest[ãa]o\s*)?(\d{1,3})\s*(?:[.)\-–:]|\s(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(]))\s*/i;
const OPTION_START = /^\s*(?:\(([A-Ea-e])\)|([A-Ea-e])\s*[).\-–])\s+/;

function clean(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/(\S)-\n(\S)/g, '$1$2') // hifenização de quebra de linha do PDF
    .replace(/([^.!?:;\n])\n(?=[a-zà-ú0-9(])/g, '$1 ') // junta linhas quebradas no meio da frase
    .trim();
}

/** Divide o texto da prova em questões. */
export function parseExamText(text: string): ParsedQuestion[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Array<{ number: number; lines: string[] }> = [];
  let current: { number: number; lines: string[] } | null = null;
  let expected = 1;

  for (const line of lines) {
    const m = QUESTION_START.exec(line);
    const n = m ? Number(m[1]) : NaN;
    // Aceita a próxima numeração esperada (evita confundir "10 dias" no meio do texto com a questão 10).
    if (m && (n === expected || (!current && n >= 1) || (current && n === current.number + 1))) {
      current = { number: n, lines: [line.slice(m[0].length)] };
      blocks.push(current);
      expected = n + 1;
    } else if (current) {
      current.lines.push(line);
    }
  }

  return blocks
    .map((block) => {
      const statementLines: string[] = [];
      const options: string[] = [];
      for (const line of block.lines) {
        const opt = OPTION_START.exec(line);
        const letter = (opt?.[1] ?? opt?.[2])?.toUpperCase();
        if (opt && letter && letter.charCodeAt(0) - 65 === options.length) options.push(line.slice(opt[0].length));
        else if (options.length) options[options.length - 1] += `\n${line}`;
        else statementLines.push(line);
      }
      const multiple = options.length >= 2;
      return {
        number: block.number,
        statement: clean(statementLines.join('\n')),
        options: multiple ? options.map(clean) : [],
        format: (multiple ? 'multipla' : 'certo_errado') as QuestionFormat,
        answer: null,
        annulled: false,
      };
    })
    .filter((q) => q.statement || q.options.length);
}

/**
 * Lê o gabarito colado. Aceita formatos como "1-C 2-E", "1 A, 2 B", "01) D",
 * tabelas "1 2 3 / C E C" não são suportadas — use um número por resposta.
 */
export function parseAnswerKey(text: string): Map<number, string> {
  const map = new Map<number, string>();
  const re = /(\d{1,3})\s*[-–.:=)]?\s*(certo|errado|anulada|[A-Ea-eX*])(?![a-zà-ú])/gi;
  for (const m of text.matchAll(re)) {
    const value = m[2].toLowerCase();
    map.set(Number(m[1]), value === 'certo' ? 'C' : value === 'errado' ? 'E' : value === 'anulada' || value === 'x' || value === '*' ? 'X' : value.toUpperCase());
  }
  return map;
}

/** Aplica o gabarito: C/E nas questões Certo/Errado; letras nas de múltipla escolha. */
export function applyAnswerKey(questions: ParsedQuestion[], key: Map<number, string>): ParsedQuestion[] {
  return questions.map((q) => {
    const value = key.get(q.number);
    if (!value) return { ...q, answer: null, annulled: false };
    if (value === 'X') return { ...q, answer: null, annulled: true };
    if (q.format === 'certo_errado') return { ...q, answer: value === 'C' || value === 'E' ? value : null, annulled: false };
    const index = value.charCodeAt(0) - 65;
    return { ...q, answer: index >= 0 && index < q.options.length ? index : null, annulled: false };
  });
}
