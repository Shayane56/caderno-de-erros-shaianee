import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';
import { exportBackup } from '@/services/backupService';
import { firstName, getProfile } from '@/services/profile';

describe('nome de quem usa o caderno (sem login)', () => {
  it('pergunta o nome na primeira abertura e usa na saudação e no menu', async () => {
    localStorage.removeItem('caderno-erros:profile');
    const { user } = renderApp('/');
    const dialog = await screen.findByRole('dialog', { name: /Boas-vindas/ });
    await user.type(within(dialog).getByLabelText('Qual é o seu nome?'), '  Maria   Souza ');
    await user.click(within(dialog).getByRole('button', { name: 'Começar' }));

    expect(screen.queryByRole('dialog', { name: /Boas-vindas/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: /(Bom dia|Boa tarde|Boa noite), Maria/ })).toBeInTheDocument();
    expect(screen.getAllByText('Maria Souza').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Shaiane/)).not.toBeInTheDocument();
    expect(document.title).toBe('Caderno de Erros — Maria Souza');
    expect((await exportBackup()).file.owner).toBe('Caderno de Erros — Maria Souza');
  });

  it('"Agora não" mantém a saudação sem nome e não pergunta de novo', async () => {
    localStorage.removeItem('caderno-erros:profile');
    const { user } = renderApp('/');
    const dialog = await screen.findByRole('dialog', { name: /Boas-vindas/ });
    await user.click(within(dialog).getByRole('button', { name: 'Agora não' }));
    expect(await screen.findByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite)/ })).not.toHaveTextContent(',');
    expect(getProfile()).toMatchObject({ name: '', skipped: true });
    expect(screen.getAllByText('Meu caderno').length).toBeGreaterThan(0);
  });

  it('troca o nome em Personalização', async () => {
    const { user } = renderApp('/backup');
    const input = await screen.findByLabelText('Seu nome');
    expect(input).toHaveValue('Shaiane Carvalho');
    await user.clear(input);
    await user.type(input, 'Ana');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(getProfile().name).toBe('Ana');
    expect(firstName('Ana Paula Lima')).toBe('Ana');
  });
});
