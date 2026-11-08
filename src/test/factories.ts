import { createSubject } from '@/services/subjectService';
import { createTopic } from '@/services/topicService';
import { createError, emptyErrorInput } from '@/services/errorService';
import type { ErrorInput } from '@/types';

export async function seedSubjectTopic(subjectName = 'Direito Administrativo', topicName = 'Atos administrativos') {
  const subject = await createSubject(subjectName);
  const topic = await createTopic(subject.id, topicName);
  return { subject, topic };
}

export function makeInput(
  subjectId: string,
  topicId: string,
  overrides: Partial<ErrorInput> = {},
): ErrorInput {
  return {
    ...emptyErrorInput(),
    subjectId,
    topicId,
    description: 'Confundi anulação com revogação do ato administrativo.',
    correction: 'Anulação decorre de ilegalidade; revogação, de conveniência e oportunidade.',
    prevention: 'Criar quadro comparativo entre anulação e revogação.',
    priority: 'alta',
    origin: 'confusao',
    ...overrides,
  };
}

export async function seedError(overrides: Partial<ErrorInput> = {}, names?: [string, string]) {
  const { subject, topic } = await seedSubjectTopic(...(names ?? []));
  const record = await createError(makeInput(subject.id, topic.id, overrides));
  return { subject, topic, record };
}
