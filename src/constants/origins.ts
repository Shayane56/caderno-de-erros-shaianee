import { CircleHelp, Shuffle, Brain, ScanSearch, CircleDashed, type LucideIcon } from 'lucide-react';
import type { OriginFilterValue, OriginId, StoredOrigin } from '@/types';
import { UNCLASSIFIED } from '@/types';

export interface OriginMeta {
  id: OriginFilterValue;
  label: string;
  question: string;
  description: string;
  example: string;
  /** Recomendação de estudo para quando esta for a origem predominante. */
  strategy: string;
  icon: LucideIcon;
  color: string;
  badgeClass: string;
  softBg: string;
}

export const ORIGINS: Record<OriginId, OriginMeta> = {
  desconhecimento: {
    id: 'desconhecimento',
    label: 'Desconhecimento',
    question: 'Nunca havia estudado esse conteúdo?',
    description: 'Nunca havia estudado ou conhecido determinado conceito, termo ou conteúdo.',
    example: 'Desconhecer um instituto jurídico ou determinado conceito de uma disciplina.',
    strategy:
      'Priorize a teoria: estude o conteúdo base (aulas, PDF, lei seca) antes de voltar às questões e crie resumos dos conceitos novos.',
    icon: CircleHelp,
    color: '#6250D6',
    badgeClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    softBg: 'bg-violet-50',
  },
  confusao: {
    id: 'confusao',
    label: 'Confusão entre conceitos',
    question: 'Conhecia, mas confundiu um conceito com outro?',
    description: 'Conhecia os conceitos, mas confundi um com o outro.',
    example: 'Confundir anulação com revogação.',
    strategy:
      'Monte quadros comparativos e tabelas de diferenças entre os institutos parecidos; resolva questões que cobrem os dois lado a lado.',
    icon: Shuffle,
    color: '#0EA5E9',
    badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    softBg: 'bg-sky-50',
  },
  esquecimento: {
    id: 'esquecimento',
    label: 'Esquecimento',
    question: 'Já estudou, mas não lembrou na hora?',
    description: 'Já havia estudado o conteúdo, mas não consegui recuperar a informação no momento da questão.',
    example: 'Esquecer um prazo, uma exceção ou uma regra.',
    strategy:
      'Aumente a frequência das revisões espaçadas, use flashcards para prazos e exceções e revise o Segundo Ciclo com regularidade.',
    icon: Brain,
    color: '#1BAF7A',
    badgeClass: 'bg-teal-50 text-teal-700 ring-teal-200',
    softBg: 'bg-teal-50',
  },
  interpretacao: {
    id: 'interpretacao',
    label: 'Erro de interpretação',
    question: 'Sabia o conteúdo, mas interpretou mal a questão?',
    description: 'Conhecia o conteúdo, mas interpretei incorretamente o enunciado ou as alternativas.',
    example: 'Não perceber que a questão solicitava a alternativa incorreta.',
    strategy:
      'Treine leitura ativa: sublinhe o comando da questão (correta/incorreta, exceto), atenção a palavras restritivas e releia antes de marcar.',
    icon: ScanSearch,
    color: '#EB6834',
    badgeClass: 'bg-orange-50 text-orange-700 ring-orange-200',
    softBg: 'bg-orange-50',
  },
};

export const UNCLASSIFIED_META: OriginMeta = {
  id: UNCLASSIFIED,
  label: 'Não classificado',
  question: 'Origem ainda não informada',
  description: 'Registro antigo ou importado sem origem definida.',
  example: '',
  strategy: 'Edite o registro para informar a origem do erro.',
  icon: CircleDashed,
  color: '#A3949D',
  badgeClass: 'bg-stone-50 text-stone-600 ring-stone-200',
  softBg: 'bg-stone-50',
};

export const ORIGIN_ORDER: OriginId[] = ['desconhecimento', 'confusao', 'esquecimento', 'interpretacao'];

export function isOriginId(value: unknown): value is OriginId {
  return typeof value === 'string' && (ORIGIN_ORDER as string[]).includes(value);
}

export function getOriginMeta(origin: StoredOrigin | OriginFilterValue): OriginMeta {
  if (origin && origin !== UNCLASSIFIED) return ORIGINS[origin];
  return UNCLASSIFIED_META;
}
