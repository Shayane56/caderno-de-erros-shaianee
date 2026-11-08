import { describe, expect, it } from 'vitest';
import { loadQuestionBank } from '@/data/questionBank';
import { normalizeQuestion } from '../questionModel';

describe('banco de questões embutido', () => {
  it('todas as questões são válidas, com id único, gabarito coerente e comentário', async () => {
    const bank = await loadQuestionBank();
    expect(bank.length).toBeGreaterThanOrEqual(150);
    const ids = new Set<string>();
    for (const q of bank) {
      expect(ids.has(q.id), `id repetido: ${q.id}`).toBe(false);
      ids.add(q.id);
      expect(normalizeQuestion(q), `questão inválida: ${q.id}`).not.toBeNull();
      expect(q.origin).toBe('banco');
      expect(q.explanation.length, `sem comentário: ${q.id}`).toBeGreaterThan(20);
      expect(q.topic, `sem assunto: ${q.id}`).not.toBe('');
      if (q.format === 'multipla') {
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(4);
        expect(new Set(q.options).size, `alternativas repetidas: ${q.id}`).toBe(q.options.length);
        expect(typeof q.answer).toBe('number');
      } else {
        expect(q.options).toEqual([]);
        expect(['C', 'E']).toContain(q.answer);
      }
    }
  });

  it('cobre várias bancas, os dois formatos e as quatro matérias', async () => {
    const bank = await loadQuestionBank();
    expect(new Set(bank.map((q) => q.banca)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(bank.map((q) => q.subject))).toEqual(new Set(['Língua Portuguesa', 'Informática', 'Raciocínio Lógico-Matemático', 'Saúde Pública']));
    expect(bank.some((q) => q.format === 'certo_errado')).toBe(true);
    expect(bank.some((q) => q.format === 'multipla')).toBe(true);
    // Gabaritos de múltipla escolha bem distribuídos (não concentrados numa letra).
    const letters = new Map<number, number>();
    for (const q of bank) if (typeof q.answer === 'number') letters.set(q.answer, (letters.get(q.answer) ?? 0) + 1);
    expect(letters.size).toBeGreaterThanOrEqual(4);
  });
});
