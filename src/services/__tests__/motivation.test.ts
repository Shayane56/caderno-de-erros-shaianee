import { describe, expect, it } from 'vitest';
import { MOTIVATIONAL_MESSAGES } from '@/constants/motivationalMessages';
import { pickMotivationalMessage } from '@/services/motivationService';

describe('mensagens motivacionais', () => {
  it('possui pelo menos 30 mensagens únicas', () => {
    expect(MOTIVATIONAL_MESSAGES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(MOTIVATIONAL_MESSAGES.map((m) => m.id)).size).toBe(MOTIVATIONAL_MESSAGES.length);
    expect(new Set(MOTIVATIONAL_MESSAGES.map((m) => m.text)).size).toBe(MOTIVATIONAL_MESSAGES.length);
  });

  it('nunca repete a mensagem da abertura anterior, mesmo após recarregar', () => {
    let previous = pickMotivationalMessage(() => 0);
    for (let i = 0; i < 50; i++) {
      // random fixo em 0 tentaria sempre a primeira mensagem — o filtro impede repetição.
      const next = pickMotivationalMessage(() => 0);
      expect(next.id).not.toBe(previous.id);
      previous = next;
    }
    const stored = JSON.parse(localStorage.getItem('caderno-erros:last-motivational-message')!);
    expect(stored).toBe(previous.id);
  });
});
