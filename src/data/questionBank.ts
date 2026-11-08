import type { BankQuestionSeed, Question } from '@/types';
import { fromSeed } from '@/services/questions/questionModel';

/**
 * Banco de questões embutido no aplicativo: questões inéditas, escritas no
 * estilo de cada banca, com gabarito e comentário. Cada matéria fica em um
 * arquivo em src/data/questoes e é carregada sob demanda (fica disponível offline).
 *
 * Para acrescentar questões: inclua-as no arquivo da matéria (ou crie um novo
 * arquivo e registre-o abaixo) com um id único — o teste do banco confere tudo.
 */
const SOURCES: Array<() => Promise<{ default: unknown }>> = [
  () => import('./questoes/portugues.json'),
  () => import('./questoes/informatica.json'),
  () => import('./questoes/raciocinio.json'),
  () => import('./questoes/saude-publica.json'),
];

let cache: Promise<Question[]> | null = null;

export function loadQuestionBank(): Promise<Question[]> {
  cache ??= Promise.all(SOURCES.map((load) => load())).then((modules) =>
    modules.flatMap((m) => (m.default as BankQuestionSeed[]).map(fromSeed)),
  );
  return cache;
}
