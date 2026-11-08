import { firstName, getProfile } from './profile';

/** Endereço público do app (sem a rota interna), para convidar outras pessoas. */
export function inviteUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export function inviteMessage(name = getProfile().name): string {
  const who = firstName(name);
  return [
    `Oi! ${who ? `Aqui é ${who}. ` : ''}Estou estudando com o Mimo 💗`,
    'Tem caderno de erros, banco de questões de várias bancas, simulados, flashcards e Modo Foco. É grátis, funciona até sem internet e cada pessoa tem o seu caderno, só dela.',
    `Experimenta: ${inviteUrl()}`,
  ].join('\n\n');
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

/** Abre o compartilhamento do aparelho (WhatsApp, Instagram…), quando disponível. */
export async function shareInvite(): Promise<ShareResult> {
  const data = { title: 'Mimo — Estude. Reveja. Conquiste.', text: inviteMessage(), url: inviteUrl() };
  // Só usa o compartilhamento nativo em telas de toque (no computador, a janela própria é mais útil).
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (!touch || typeof navigator.share !== 'function' || (navigator.canShare && !navigator.canShare(data))) return 'unsupported';
  try {
    // O link já vai no texto: alguns apps ignoram o campo url.
    await navigator.share({ title: data.title, text: data.text });
    return 'shared';
  } catch (error) {
    return (error as { name?: string })?.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

export function whatsappLink(): string {
  return `https://wa.me/?text=${encodeURIComponent(inviteMessage())}`;
}

export function emailLink(): string {
  return `mailto:?subject=${encodeURIComponent('Vem estudar comigo no Mimo 💗')}&body=${encodeURIComponent(inviteMessage())}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
