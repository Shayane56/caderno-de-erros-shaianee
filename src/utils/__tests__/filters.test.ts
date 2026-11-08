import { describe, expect, it } from 'vitest';
import type { ErrorRecord, Subject, Topic } from '@/types';
import {
  applyFilters,
  buildLookup,
  countActiveFilters,
  emptyFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  groupHierarchy,
} from '@/utils/filters';

const subjects: Subject[] = [
  { id: 'adm', name: 'Direito Administrativo', createdAt: '', updatedAt: '' },
  { id: 'port', name: 'Língua Portuguesa', createdAt: '', updatedAt: '' },
];
const topics: Topic[] = [
  { id: 'atos', subjectId: 'adm', name: 'Atos administrativos', createdAt: '', updatedAt: '' },
  { id: 'lic', subjectId: 'adm', name: 'Licitações', createdAt: '', updatedAt: '' },
  { id: 'crase', subjectId: 'port', name: 'Crase', createdAt: '', updatedAt: '' },
];

function rec(partial: Partial<ErrorRecord> & Pick<ErrorRecord, 'id' | 'subjectId' | 'topicId'>): ErrorRecord {
  return {
    description: '',
    correction: '',
    prevention: '',
    priority: 'alta',
    origin: 'confusao',
    reference: '',
    notes: '',
    createdAt: '2024-03-10T12:00:00.000Z',
    updatedAt: '2024-03-10T12:00:00.000Z',
    lastReviewedAt: null,
    reviewCount: 0,
    resolvedAt: null,
    ...partial,
  };
}

const errors: ErrorRecord[] = [
  rec({ id: '1', subjectId: 'adm', topicId: 'atos', description: 'Confundi anulação com revogação', priority: 'alta', origin: 'confusao' }),
  rec({
    id: '2',
    subjectId: 'adm',
    topicId: 'lic',
    description: 'Prazo do pregão',
    correction: 'Mínimo de 8 dias úteis',
    priority: 'media',
    origin: 'esquecimento',
    createdAt: '2024-04-01T12:00:00.000Z',
  }),
  rec({
    id: '3',
    subjectId: 'port',
    topicId: 'crase',
    description: 'Crase antes de palavra masculina',
    notes: 'Cuidado com "à moda de"',
    priority: 'superado',
    origin: null,
    createdAt: '2024-05-20T12:00:00.000Z',
  }),
  rec({ id: '4', subjectId: 'adm', topicId: 'atos', description: 'Atributos do ato: presunção de legitimidade', priority: 'media', origin: 'desconhecimento' }),
];

const lookup = buildLookup(subjects, topics);
const ids = (list: ErrorRecord[]) => list.map((e) => e.id).sort();

describe('pesquisa', () => {
  it('encontra termos na descrição, correção, tópico, matéria e observações (sem acentos)', () => {
    const f = emptyFilters();
    expect(ids(applyFilters(errors, { ...f, search: 'revogacao' }, lookup))).toEqual(['1']);
    expect(ids(applyFilters(errors, { ...f, search: 'dias úteis' }, lookup))).toEqual(['2']);
    expect(ids(applyFilters(errors, { ...f, search: 'licitações' }, lookup))).toEqual(['2']);
    expect(ids(applyFilters(errors, { ...f, search: 'português' }, lookup))).toEqual(['3']);
    expect(ids(applyFilters(errors, { ...f, search: 'moda' }, lookup))).toEqual(['3']);
    expect(ids(applyFilters(errors, { ...f, search: 'ADMINISTRATIVO' }, lookup))).toEqual(['1', '2', '4']);
  });

  it('exige todos os termos e respeita expressões entre aspas', () => {
    const f = emptyFilters();
    expect(ids(applyFilters(errors, { ...f, search: 'ato presunção' }, lookup))).toEqual(['4']);
    expect(ids(applyFilters(errors, { ...f, search: '"anulação com revogação"' }, lookup))).toEqual(['1']);
    expect(ids(applyFilters(errors, { ...f, search: '"revogação com anulação"' }, lookup))).toEqual([]);
  });
});

describe('filtros combinados', () => {
  it('aplica matéria, tópico, prioridade, origem e período simultaneamente', () => {
    const f = emptyFilters();
    expect(ids(applyFilters(errors, { ...f, subjectId: 'adm' }, lookup))).toEqual(['1', '2', '4']);
    expect(ids(applyFilters(errors, { ...f, subjectId: 'adm', topicId: 'atos' }, lookup))).toEqual(['1', '4']);
    expect(ids(applyFilters(errors, { ...f, subjectId: 'adm', priorities: ['media'] }, lookup))).toEqual(['2', '4']);
    expect(
      ids(applyFilters(errors, { ...f, subjectId: 'adm', priorities: ['media'], origins: ['desconhecimento'] }, lookup)),
    ).toEqual(['4']);
    expect(ids(applyFilters(errors, { ...f, priorities: ['alta', 'superado'] }, lookup))).toEqual(['1', '3']);
    expect(ids(applyFilters(errors, { ...f, origins: ['nao_classificado'] }, lookup))).toEqual(['3']);
    expect(ids(applyFilters(errors, { ...f, dateFrom: '2024-04-01', dateTo: '2024-05-31' }, lookup))).toEqual(['2', '3']);
    expect(
      ids(applyFilters(errors, { ...f, dateFrom: '2024-04-01', priorities: ['superado'], search: 'crase' }, lookup)),
    ).toEqual(['3']);
  });

  it('limpar filtros devolve todos os registros', () => {
    const active = { ...emptyFilters(), subjectId: 'adm', priorities: ['alta' as const], search: 'x' };
    expect(countActiveFilters(active)).toBe(3);
    const cleared = emptyFilters();
    expect(countActiveFilters(cleared)).toBe(0);
    expect(applyFilters(errors, cleared, lookup)).toHaveLength(4);
  });

  it('serializa os filtros na URL e lê de volta', () => {
    const f = { ...emptyFilters(), search: 'ato', subjectId: 'adm', priorities: ['alta' as const, 'media' as const], origins: ['nao_classificado' as const], dateFrom: '2024-01-01' };
    const params = filtersToSearchParams(f);
    expect(filtersFromSearchParams(params)).toEqual(f);
    expect(filtersFromSearchParams(new URLSearchParams('prioridade=alta,xpto&origem=foo'))).toMatchObject({ priorities: ['alta'], origins: [] });
  });
});

describe('organização hierárquica', () => {
  it('agrupa MATÉRIA → TÓPICO → REGISTROS', () => {
    const groups = groupHierarchy(errors, lookup);
    expect(groups.map((g) => g.subject.name)).toEqual(['Direito Administrativo', 'Língua Portuguesa']);
    expect(groups[0].total).toBe(3);
    expect(groups[0].topics.map((t) => [t.topic.name, t.records.length])).toEqual([
      ['Atos administrativos', 2],
      ['Licitações', 1],
    ]);
    expect(groups[1].pending).toBe(0);
  });
});
