import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';

describe('Mimo (interface)', () => {
  it('Início mostra a saudação, o progresso da semana e o acesso rápido', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Olá, Shaiane!/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Seu progresso da semana' })).toBeInTheDocument();
    const quick = screen.getByRole('region', { name: 'Acesso rápido' });
    expect(within(quick).getByRole('link', { name: /Criar simulado/ })).toHaveAttribute('href', '/questoes/simulado');
  });

  it('Modo Foco: inicia, mostra o cronômetro e pausa guardando o estado', async () => {
    const { user } = renderApp('/foco');
    await user.type(await screen.findByLabelText(/O que você vai estudar/), 'Saúde Pública');
    await user.click(screen.getByRole('button', { name: '25 min' }));
    await user.click(screen.getByRole('button', { name: /Iniciar Modo Foco/ }));
    expect(await screen.findByText('Focando em: Saúde Pública')).toBeInTheDocument();
    expect(screen.getByText(/2[45]:\d\d/)).toBeInTheDocument();
    // Simula 2 minutos já focados.
    const stored = JSON.parse(localStorage.getItem('caderno-erros:focus-timer')!);
    expect(stored.plannedMs).toBe(25 * 60_000);
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    const paused = JSON.parse(localStorage.getItem('caderno-erros:focus-timer')!);
    expect(paused.runningSince).toBeNull();
    localStorage.setItem('caderno-erros:focus-timer', JSON.stringify({ ...paused, accumulatedMs: 120_000 }));
  });

  it('simulado: monta, responde sem gabarito e mostra o resultado ao finalizar', async () => {
    const { user } = renderApp('/questoes/simulado');
    await user.click(await screen.findByRole('button', { name: '10' }));
    await user.click(screen.getByRole('button', { name: /Começar simulado/ }));
    await screen.findByRole('button', { name: /^Ir para a questão 1$/ });
    expect(screen.queryByText(/Você acertou|Resposta errada/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Finalizar simulado' }));
    await user.click(await screen.findByRole('button', { name: 'Finalizar e ver resultado' }));
    expect(await screen.findByRole('region', { name: 'Gabarito comentado' })).toBeInTheDocument();
    await waitFor(async () => expect((await db.simulados.toArray())[0].finishedAt).not.toBeNull());
  });

  it('Estatísticas abre com os períodos e o convite para começar', async () => {
    renderApp('/estatisticas');
    expect(await screen.findByRole('heading', { name: /Suas Estatísticas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ainda sem respostas neste período')).toBeInTheDocument();
  });
});
