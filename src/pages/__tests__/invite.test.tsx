import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';
import { inviteMessage, inviteUrl } from '@/services/invite';

describe('convidar alguém', () => {
  it('monta a mensagem com o nome de quem convida e o endereço do app', () => {
    const msg = inviteMessage('Shaiane Carvalho');
    expect(msg).toContain('Aqui é Shaiane.');
    expect(msg).toContain(inviteUrl());
    expect(inviteUrl()).not.toContain('#');
    expect(inviteMessage('')).toMatch(/^Oi! Estou estudando com o Mimo/);
  });

  it('no computador, abre a janela com WhatsApp, e-mail e copiar link', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('heading', { name: /Olá, Shaiane!/ });
    await user.click(screen.getAllByRole('button', { name: /Convidar alguém/ })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Convidar alguém/ });
    const whats = within(dialog).getByRole('link', { name: /Enviar no WhatsApp/ });
    expect(whats.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=Oi!/);
    expect(decodeURIComponent(whats.getAttribute('href')!)).toContain('Aqui é Shaiane.');
    expect(within(dialog).getByRole('link', { name: /Enviar por e-mail/ }).getAttribute('href')).toMatch(/^mailto:\?subject=/);
    expect(within(dialog).getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
  });
});
