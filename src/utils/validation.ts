import type { ErrorInput } from '@/types';
import { isPriority } from '@/constants/priorities';
import { isOriginId } from '@/constants/origins';
import { cleanName } from './text';

export type ErrorInputField = keyof ErrorInput;
export type ValidationErrors<F extends string = string> = Partial<Record<F, string>>;

export const NAME_MAX_LENGTH = 120;
export const TEXT_MAX_LENGTH = 10_000;

/** Valida os campos do formulário de registro de erro. */
export function validateErrorInput(input: ErrorInput): ValidationErrors<ErrorInputField> {
  const errors: ValidationErrors<ErrorInputField> = {};
  if (!input.subjectId) errors.subjectId = 'Selecione ou crie a matéria.';
  if (!input.topicId) errors.topicId = 'Selecione ou crie o tópico.';
  if (!input.description.trim()) errors.description = 'Descreva o erro cometido.';
  if (!input.correction.trim()) errors.correction = 'Informe a correção ou o entendimento correto.';
  if (!input.prevention.trim()) errors.prevention = 'Explique como evitar esse erro novamente.';
  if (!isPriority(input.priority)) errors.priority = 'Escolha a prioridade.';
  if (!isOriginId(input.origin)) errors.origin = 'Escolha a origem do erro.';

  const longFields: ErrorInputField[] = ['description', 'correction', 'prevention', 'notes', 'reference'];
  for (const field of longFields) {
    const value = input[field];
    if (typeof value === 'string' && value.length > TEXT_MAX_LENGTH) {
      errors[field] = `Limite de ${TEXT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres.`;
    }
  }
  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Valida o nome de uma matéria ou tópico. Retorna a mensagem de erro ou null. */
export function validateName(name: string, kind: 'matéria' | 'tópico'): string | null {
  const clean = cleanName(name);
  if (!clean) return kind === 'matéria' ? 'Informe o nome da matéria.' : 'Informe o nome do tópico.';
  if (clean.length > NAME_MAX_LENGTH) return `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  return null;
}
