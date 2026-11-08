import { describe, expect, it } from 'vitest';
import { hasValidationErrors, validateErrorInput, validateName } from '@/utils/validation';
import { emptyErrorInput } from '@/services/errorService';

describe('validação de formulários', () => {
  it('exige todos os campos obrigatórios', () => {
    const errors = validateErrorInput(emptyErrorInput());
    expect(Object.keys(errors).sort()).toEqual(
      ['correction', 'description', 'origin', 'prevention', 'priority', 'subjectId', 'topicId'].sort(),
    );
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it('aceita formulário completo; referência e observações são opcionais', () => {
    const errors = validateErrorInput({
      ...emptyErrorInput(),
      subjectId: 's',
      topicId: 't',
      description: 'd',
      correction: 'c',
      prevention: 'p',
      priority: 'media',
      origin: 'interpretacao',
    });
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('considera espaços em branco como vazio e rejeita valores desconhecidos', () => {
    const errors = validateErrorInput({
      ...emptyErrorInput(),
      subjectId: 's',
      topicId: 't',
      description: '   ',
      correction: 'c',
      prevention: 'p',
      priority: 'urgente' as never,
      origin: 'sorte' as never,
    });
    expect(errors.description).toBeTruthy();
    expect(errors.priority).toBeTruthy();
    expect(errors.origin).toBeTruthy();
  });

  it('valida nomes de matérias e tópicos', () => {
    expect(validateName('  ', 'matéria')).toBe('Informe o nome da matéria.');
    expect(validateName('', 'tópico')).toBe('Informe o nome do tópico.');
    expect(validateName('x'.repeat(200), 'tópico')).toMatch(/no máximo/);
    expect(validateName('Crase', 'tópico')).toBeNull();
  });
});
