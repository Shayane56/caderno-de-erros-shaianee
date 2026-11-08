import { describe, expect, it } from 'vitest';
import type { ErrorRecord, Subject, Topic } from '@/types';
import {
  analyzeOrigins,
  buildReviewQueue,
  buildTimeline,
  computeOverview,
  countBySubject,
  countByTopic,
  percent,
  priorityDistribution,
  rankDifficulties,
  staleErrors,
} from '@/utils/statistics';

function rec(id: string, partial: Partial<ErrorRecord>): ErrorRecord {
  return {
    id,
    subjectId: 'a',
    topicId: 'ta',
    description: id,
    correction: '',
    prevention: '',
    priority: 'alta',
    origin: null,
    reference: '',
    notes: '',
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z',
    lastReviewedAt: null,
    reviewCount: 0,
    resolvedAt: null,
    ...partial,
  };
}

const subjects: Subject[] = [
  { id: 'a', name: 'Administrativo', createdAt: '', updatedAt: '' },
  { id: 'b', name: 'Constitucional', createdAt: '', updatedAt: '' },
  { id: 'c', name: 'Sem registros', createdAt: '', updatedAt: '' },
];
const topics: Topic[] = [
  { id: 'ta', subjectId: 'a', name: 'Atos', createdAt: '', updatedAt: '' },
  { id: 'tb', subjectId: 'b', name: 'Direitos fundamentais', createdAt: '', updatedAt: '' },
];

const errors: ErrorRecord[] = [
  rec('1', { priority: 'alta', origin: 'confusao' }),
  rec('2', { priority: 'alta', origin: 'confusao', createdAt: '2024-01-05T12:00:00.000Z' }),
  rec('3', { priority: 'media', origin: 'esquecimento', subjectId: 'b', topicId: 'tb' }),
  rec('4', { priority: 'superado', origin: 'desconhecimento', resolvedAt: '2024-01-03T12:00:00.000Z' }),
  rec('5', { priority: 'superado', origin: null, subjectId: 'b', topicId: 'tb', resolvedAt: '2024-01-04T12:00:00.000Z' }),
];

describe('cálculos estatísticos', () => {
  it('calcula os indicadores gerais', () => {
    const o = computeOverview(errors, subjects, topics, [
      { id: 'r', errorId: '4', reviewedAt: '', priorityBefore: 'alta', priorityAfter: 'superado' },
    ]);
    expect(o).toEqual({
      total: 5,
      subjects: 3,
      topics: 2,
      alta: 2,
      media: 1,
      superado: 2,
      pending: 3,
      superadoPct: 40,
      reviews: 1,
    });
  });

  it('percentual seguro com zero registros', () => {
    expect(percent(1, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33.3);
    expect(computeOverview([], []).superadoPct).toBe(0);
  });

  it('distribui por prioridade, matéria e tópico', () => {
    expect(priorityDistribution(errors).map((p) => [p.id, p.value])).toEqual([
      ['alta', 2],
      ['media', 1],
      ['superado', 2],
    ]);
    const bySubject = countBySubject(errors, subjects);
    expect(bySubject.map((s) => [s.name, s.total, s.pending])).toEqual([
      ['Administrativo', 3, 2],
      ['Constitucional', 2, 1],
      ['Sem registros', 0, 0],
    ]);
    const byTopic = countByTopic(errors, topics, subjects);
    expect(byTopic[0]).toMatchObject({ name: 'Atos', subjectName: 'Administrativo', total: 3 });
    expect(rankDifficulties(bySubject).map((g) => g.name)).toEqual(['Administrativo', 'Constitucional']);
  });

  it('analisa as origens sobre o total classificado e destaca a mais frequente', () => {
    const analysis = analyzeOrigins(errors);
    expect(analysis.classified).toBe(4);
    expect(analysis.unclassified).toBe(1);
    const confusao = analysis.stats.find((s) => s.id === 'confusao')!;
    expect(confusao).toMatchObject({ count: 2, pct: 50, pending: 2, superado: 0 });
    expect(analysis.mostFrequent.map((s) => s.id)).toEqual(['confusao']);
    expect(analyzeOrigins([]).mostFrequent).toEqual([]);
  });

  it('identifica empates na origem mais frequente', () => {
    const tie = analyzeOrigins([rec('a', { origin: 'confusao' }), rec('b', { origin: 'interpretacao' })]);
    expect(tie.mostFrequent.map((s) => s.id).sort()).toEqual(['confusao', 'interpretacao']);
  });

  it('gera a linha do tempo de identificados × superados', () => {
    const timeline = buildTimeline(errors, 'day', new Date('2024-01-06T12:00:00.000Z'));
    expect(timeline).toHaveLength(6);
    expect(timeline[0]).toMatchObject({ created: 4, resolved: 0, cumulativeCreated: 4 });
    expect(timeline[2]).toMatchObject({ resolved: 1, cumulativeResolved: 1 });
    const last = timeline[timeline.length - 1];
    expect(last).toMatchObject({ cumulativeCreated: 5, cumulativeResolved: 2 });
    expect(buildTimeline([], 'day')).toEqual([]);
    const monthly = buildTimeline(errors, 'month', new Date('2024-03-15T12:00:00.000Z'));
    expect(monthly.map((p) => p.label)).toEqual(['jan/24', 'fev/24', 'mar/24']);
  });
});

describe('segundo ciclo', () => {
  it('separa pendentes e ordena: prioridade alta primeiro, depois o mais antigo sem revisão', () => {
    const list = [
      rec('m-old', { priority: 'media', createdAt: '2023-01-01T00:00:00.000Z' }),
      rec('a-reviewed', { priority: 'alta', createdAt: '2023-01-01T00:00:00.000Z', lastReviewedAt: '2024-02-01T00:00:00.000Z' }),
      rec('a-never', { priority: 'alta', createdAt: '2023-06-01T00:00:00.000Z' }),
      rec('done', { priority: 'superado' }),
    ];
    expect(buildReviewQueue(list).map((e) => e.id)).toEqual(['a-never', 'a-reviewed', 'm-old']);
    expect(staleErrors(list).map((e) => e.id)).toEqual(['m-old', 'a-never', 'a-reviewed']);
  });
});
