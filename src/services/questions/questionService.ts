import { db } from '@/database/db';
import { trackChange, trackDeletion } from '@/database/changeTracker';
import type { ErrorInput, Question, QuestionAnswer, QuestionAttempt } from '@/types';
import { createId, nowIso } from '@/utils/ids';
import { cleanName, sameName, truncate } from '@/utils/text';
import { NotFoundError, ValidationError } from '../errors';
import { createSubject } from '../subjectService';
import { createTopic } from '../topicService';
import { answerLabel, isCorrect, LETTERS, validateQuestionInput, type QuestionInput } from './questionModel';

function buildQuestion(input: QuestionInput): Omit<Question, 'id' | 'origin' | 'createdAt' | 'updatedAt'> {
  const errors = validateQuestionInput(input);
  if (Object.keys(errors).length) throw new ValidationError('Revise os campos da questão.', errors as Record<string, string>);
  return {
    format: input.format,
    banca: cleanName(input.banca),
    subject: cleanName(input.subject),
    topic: cleanName(input.topic),
    difficulty: input.difficulty,
    support: input.support.trim(),
    statement: input.statement.trim(),
    options: input.format === 'multipla' ? input.options.map((o) => o.trim()) : [],
    answer: input.answer as QuestionAnswer,
    explanation: input.explanation.trim(),
    year: input.year,
    orgao: cleanName(input.orgao),
    cargo: cleanName(input.cargo),
  };
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const content = buildQuestion(input);
  return db.transaction('rw', [db.questions, db.pendingChanges], async () => {
    const now = nowIso();
    const question: Question = { id: createId(), origin: 'minha', ...content, createdAt: now, updatedAt: now };
    await db.questions.add(question);
    await trackChange('questions', question.id, now);
    return question;
  });
}

/** Cria várias questões de uma vez (ex.: prova colada). */
export async function createQuestions(inputs: QuestionInput[]): Promise<number> {
  const contents = inputs.map(buildQuestion);
  return db.transaction('rw', [db.questions, db.pendingChanges], async () => {
    const now = nowIso();
    for (const content of contents) {
      const question: Question = { id: createId(), origin: 'minha', ...content, createdAt: now, updatedAt: now };
      await db.questions.add(question);
      await trackChange('questions', question.id, now);
    }
    return contents.length;
  });
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<Question> {
  const content = buildQuestion(input);
  return db.transaction('rw', [db.questions, db.pendingChanges], async () => {
    const current = await db.questions.get(id);
    if (!current) throw new NotFoundError('Questão não encontrada (as do banco do app não podem ser editadas).');
    const next: Question = { ...current, ...content, updatedAt: nowIso() };
    await db.questions.put(next);
    await trackChange('questions', id, next.updatedAt);
    return next;
  });
}

/** Exclui uma questão própria e as respostas dadas a ela. */
export async function deleteQuestion(id: string): Promise<void> {
  await db.transaction('rw', [db.questions, db.questionAttempts, db.tombstones, db.pendingChanges], async () => {
    const attempts = (await db.questionAttempts.where('questionId').equals(id).primaryKeys()) as string[];
    await db.questionAttempts.bulkDelete(attempts);
    await db.questions.delete(id);
    const now = nowIso();
    for (const a of attempts) await trackDeletion('questionAttempts', a, now);
    await trackDeletion('questions', id, now);
  });
}

/** Registra a resposta a uma questão (do banco embutido ou própria). */
export async function answerQuestion(question: Question, chosen: QuestionAnswer): Promise<QuestionAttempt> {
  const attempt: QuestionAttempt = {
    id: createId(),
    questionId: question.id,
    answeredAt: nowIso(),
    chosen,
    correct: isCorrect(question, chosen),
    subject: question.subject,
    topic: question.topic,
    banca: question.banca,
  };
  await db.transaction('rw', [db.questionAttempts, db.pendingChanges], async () => {
    await db.questionAttempts.add(attempt);
    await trackChange('questionAttempts', attempt.id, attempt.answeredAt);
  });
  return attempt;
}

/** Zera o histórico de respostas (todas ou de uma matéria). */
export async function clearAttempts(subject?: string): Promise<number> {
  return db.transaction('rw', [db.questionAttempts, db.tombstones, db.pendingChanges], async () => {
    const all = await db.questionAttempts.toArray();
    const target = subject ? all.filter((a) => a.subject === subject) : all;
    await db.questionAttempts.bulkDelete(target.map((a) => a.id));
    const now = nowIso();
    for (const a of target) await trackDeletion('questionAttempts', a.id, now);
    return target.length;
  });
}

/* ============================== Caderno de erros ============================== */

/** Matéria e tópico do caderno com o mesmo nome da questão (criados se ainda não existirem). */
export async function ensureSubjectTopic(subjectName: string, topicName: string): Promise<{ subjectId: string; topicId: string }> {
  const subjects = await db.subjects.toArray();
  const subject = subjects.find((s) => sameName(s.name, subjectName)) ?? (await createSubject(subjectName));
  const name = cleanName(topicName) || 'Geral';
  const topics = await db.topics.where('subjectId').equals(subject.id).toArray();
  const topic = topics.find((t) => sameName(t.name, name)) ?? (await createTopic(subject.id, name));
  return { subjectId: subject.id, topicId: topic.id };
}

/** Texto da questão para registros e flashcards. */
export function questionAsText(q: Question): string {
  const lines = [q.support ? `${truncate(q.support, 600)}\n` : '', q.statement];
  if (q.format === 'multipla') q.options.forEach((o, i) => lines.push(`(${LETTERS[i]}) ${o}`));
  return lines.filter(Boolean).join('\n');
}

export function questionReference(q: Question): string {
  const parts = [q.origin === 'banco' ? `Banco de questões — inédita estilo ${q.banca}` : `Questão ${q.banca}`, q.orgao, q.year ? String(q.year) : '', q.cargo];
  return parts.filter(Boolean).join(' · ');
}

/** Formulário do caderno de erros já preenchido a partir de uma questão errada. */
export async function errorPrefillFromQuestion(q: Question, chosen: QuestionAnswer): Promise<Partial<ErrorInput>> {
  const ids = await ensureSubjectTopic(q.subject, q.topic);
  return {
    ...ids,
    description: `Errei esta questão (marquei ${answerLabel(chosen)}; gabarito ${answerLabel(q.answer)}):\n\n${questionAsText(q)}`,
    correction: `Gabarito: ${answerLabel(q.answer)}.${q.explanation ? `\n${q.explanation}` : ''}`,
    reference: questionReference(q),
  };
}
