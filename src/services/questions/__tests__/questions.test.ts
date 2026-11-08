import { describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { exportBackup, importBackup, parseBackupText } from '@/services/backupService';
import { runSync } from '@/services/sync/syncEngine';
import { MemoryRemote } from '@/services/sync/__tests__/memoryAdapter';
import { applyAnswerKey, parseAnswerKey, parseExamText } from '../examParser';
import { emptyQuestionInput, validateQuestionInput } from '../questionModel';
import { answerQuestion, createQuestion, createQuestions, deleteQuestion, errorPrefillFromQuestion } from '../questionService';
import { filterQuestions, filtersFromParams, filtersToParams, emptyQuestionFilters } from '../filters';
import { exportMyQuestions, importQuestionsFile } from '../questionShare';
import { loadQuestionBank } from '@/data/questionBank';

const mc = () => ({
  ...emptyQuestionInput('multipla'),
  banca: 'FGV',
  subject: 'Saúde Pública',
  topic: 'Lei 8.080',
  statement: 'A Lei 8.080/1990 dispõe sobre:',
  options: ['a participação da comunidade', 'as condições para promoção, proteção e recuperação da saúde', 'a PNAB', 'o COAP'],
  answer: 1,
  explanation: 'É a ementa da Lei Orgânica da Saúde.',
});

describe('leitor de provas coladas', () => {
  const prova = `CONHECIMENTOS GERAIS
1. Assinale a alternativa correta quanto
à crase.
(A) Vou à Brasília.
(B) Entreguei à diretora.
(C) Começou à chover.
(D) Fiquei frente à frente.
(E) Refiro-me à todos.
2. Questão com prazo de 10 dias no texto.
A) Primeira
B) Segunda
C) Terceira
D) Quarta
Questão 3 O SUS é universal.
4. Item anulado.`;

  it('separa questões, junta linhas quebradas e reconhece alternativas e itens C/E', () => {
    const qs = parseExamText(prova);
    expect(qs.map((q) => q.number)).toEqual([1, 2, 3, 4]);
    expect(qs[0].statement).toBe('Assinale a alternativa correta quanto à crase.');
    expect(qs[0].options).toHaveLength(5);
    expect(qs[0].options[1]).toBe('Entreguei à diretora.');
    expect(qs[1].statement).toContain('10 dias');
    expect(qs[1].options).toEqual(['Primeira', 'Segunda', 'Terceira', 'Quarta']);
    expect(qs[2]).toMatchObject({ format: 'certo_errado', statement: 'O SUS é universal.' });
  });

  it('aplica o gabarito: letras na múltipla escolha, C/E nos itens e X para anulada', () => {
    const key = parseAnswerKey('1-B; 2 D, 3 C\n4 X');
    const qs = applyAnswerKey(parseExamText(prova), key);
    expect(qs.map((q) => q.answer)).toEqual([1, 3, 'C', null]);
    expect(qs[3].annulled).toBe(true);
    expect(parseAnswerKey('01) certo 02) errado').get(2)).toBe('E');
  });
});

describe('questões próprias e respostas', () => {
  it('valida o cadastro', () => {
    expect(validateQuestionInput(emptyQuestionInput('multipla'))).toMatchObject({ banca: expect.any(String), statement: expect.any(String), options: expect.any(String), answer: expect.any(String) });
    expect(validateQuestionInput({ ...emptyQuestionInput('certo_errado'), banca: 'Cebraspe', subject: 'X', statement: 'Item', answer: 'C' })).toEqual({});
    expect(validateQuestionInput(mc())).toEqual({});
  });

  it('registra respostas e filtra por situação (nunca, errei, acertei)', async () => {
    const q = await createQuestion(mc());
    const other = await createQuestion({ ...mc(), statement: 'Outra' });
    const wrong = await answerQuestion(q, 0);
    expect(wrong.correct).toBe(false);
    const attempts = await db.questionAttempts.toArray();
    const f = (status: 'nunca' | 'errei' | 'acertei') => filterQuestions([q, other], attempts, { ...emptyQuestionFilters(), status }).map((x) => x.id);
    expect(f('errei')).toEqual([q.id]);
    expect(f('nunca')).toEqual([other.id]);
    await answerQuestion(q, 1);
    expect(filterQuestions([q], await db.questionAttempts.toArray(), { ...emptyQuestionFilters(), status: 'acertei' })).toHaveLength(1);
    await deleteQuestion(q.id);
    expect(await db.questionAttempts.where('questionId').equals(q.id).count()).toBe(0);
  });

  it('prepara o registro do caderno de erros criando matéria e tópico se preciso', async () => {
    const q = await createQuestion(mc());
    const prefill = await errorPrefillFromQuestion(q, 0);
    const subject = await db.subjects.get(prefill.subjectId!);
    const topic = await db.topics.get(prefill.topicId!);
    expect(subject?.name).toBe('Saúde Pública');
    expect(topic?.name).toBe('Lei 8.080');
    expect(prefill.description).toContain('marquei A; gabarito B');
    expect(prefill.description).toContain('(B) as condições');
    expect(prefill.correction).toContain('Gabarito: B');
    expect(prefill.correction).toContain('ementa');
    // Não duplica matéria/tópico na segunda vez.
    await errorPrefillFromQuestion(q, 2);
    expect(await db.subjects.count()).toBe(1);
  });

  it('filtros vão e voltam da URL', () => {
    const f = { ...emptyQuestionFilters(), subject: 'Informática', bancas: ['FCC', 'FGV'], status: 'errei' as const, difficulty: 2 as const };
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
  });
});

describe('compartilhar, backup e sincronização', () => {
  it('exporta e importa questões próprias sem duplicar', async () => {
    await createQuestions([mc(), { ...mc(), statement: 'Segunda' }]);
    const { content, count } = await exportMyQuestions();
    expect(count).toBe(2);
    await db.questions.clear();
    expect(await importQuestionsFile(content)).toEqual({ created: 2, skipped: 0 });
    expect(await importQuestionsFile(content)).toEqual({ created: 0, skipped: 2 });
    await expect(importQuestionsFile('{"x":1}')).rejects.toThrow(/não contém questões/);
  });

  it('o backup inclui questões próprias e respostas (inclusive às do banco do app)', async () => {
    const bankQuestion = (await loadQuestionBank())[0];
    await answerQuestion(bankQuestion, bankQuestion.answer);
    await createQuestion(mc());
    const { content } = await exportBackup();
    await db.questions.clear();
    await db.questionAttempts.clear();
    const parsed = parseBackupText(content);
    expect(parsed.data.questions).toHaveLength(1);
    expect(parsed.data.questionAttempts).toHaveLength(1);
    await importBackup(parsed, 'merge');
    expect(await db.questions.count()).toBe(1);
    expect((await db.questionAttempts.toArray())[0]).toMatchObject({ questionId: bankQuestion.id, correct: true });
  });

  it('sincroniza questões e respostas entre aparelhos', async () => {
    const q = await createQuestion(mc());
    await answerQuestion(q, 1);
    const remote = new MemoryRemote();
    await runSync(remote.adapter(), 'u1');
    expect(remote.rows.has(`questions:${q.id}`)).toBe(true);
    await db.delete();
    await db.open();
    await runSync(remote.adapter(), 'u1');
    expect(await db.questions.get(q.id)).toMatchObject({ statement: q.statement, origin: 'minha' });
    expect(await db.questionAttempts.count()).toBe(1);
  });
});
