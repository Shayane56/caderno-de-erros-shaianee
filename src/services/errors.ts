/** Erro de regra de negócio exibível ao usuário. */
export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class ValidationError extends AppError {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super('validation', message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class DuplicateError extends AppError {
  constructor(message: string) {
    super('duplicate', message);
    this.name = 'DuplicateError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('not_found', message);
    this.name = 'NotFoundError';
  }
}

/** Mensagem amigável para qualquer erro. */
export function errorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return `${fallback} (${error.message})`;
  return fallback;
}
