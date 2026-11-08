import { MOTIVATIONAL_MESSAGES, type MotivationalMessage } from '@/constants/motivationalMessages';
import { readPreference, writePreference } from './preferences';

const LAST_MESSAGE_KEY = 'last-motivational-message';

/**
 * Sorteia uma mensagem diferente da exibida na abertura anterior.
 * O identificador anterior é persistido para evitar repetição após recarregar.
 */
export function pickMotivationalMessage(
  random: () => number = Math.random,
  messages: MotivationalMessage[] = MOTIVATIONAL_MESSAGES,
): MotivationalMessage {
  const lastId = readPreference<number | null>(LAST_MESSAGE_KEY, null);
  const candidates = messages.length > 1 ? messages.filter((m) => m.id !== lastId) : messages;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const chosen = candidates[index];
  writePreference(LAST_MESSAGE_KEY, chosen.id);
  return chosen;
}

let sessionMessage: MotivationalMessage | null = null;

/** Mensagem da abertura atual (sorteada uma única vez por carregamento). */
export function getSessionMessage(): MotivationalMessage {
  if (!sessionMessage) sessionMessage = pickMotivationalMessage();
  return sessionMessage;
}

/** Sorteia uma nova mensagem (botão "outra mensagem"). */
export function nextSessionMessage(): MotivationalMessage {
  sessionMessage = pickMotivationalMessage();
  return sessionMessage;
}
