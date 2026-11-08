/**
 * Preferências simples (LocalStorage). Todo acesso é protegido: em navegação
 * privada ou com armazenamento bloqueado, a aplicação continua funcionando.
 */
const PREFIX = 'caderno-erros:';

export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePreference<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível — preferência não persistida */
  }
}

export function removePreference(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignorado */
  }
}
