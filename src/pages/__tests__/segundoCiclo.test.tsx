import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';
import { seedError } from '@/test/factories';

describe('Meu Segundo Ciclo (interface)', () => {
  it('separa prioridades, oculta a correção até revelar e marca como superado preservando o registro', async () => {
    const { record } = await seedError({ priority: 'alta', correction: 'Resposta correta secreta' });
    const { user } = renderApp('/segundo-ciclo');

    const alta = await screen.findByRole('region', { name: 'Prioridade alta' });
    expect(within(alta).getByText(record.description)).toBeInTheDocument();
    await user.click(within(alta).getByRole('button', { name: 'Revisar erro' }));

    await screen.findByRole('button', { name: 'Revelar correção' });
    expect(screen.queryByText('Resposta correta secreta')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como superado' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revelar correção' }));
    expect(screen.getByText('Resposta correta secreta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manter como prioridade alta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar para prioridade média' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marcar como superado' }));
    expect(await screen.findByText('Revisão concluída!')).toBeInTheDocument();

    const stored = await db.errors.get(record.id);
    expect(stored).toMatchObject({ priority: 'superado', reviewCount: 1 });
    expect(await db.reviews.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Voltar ao Segundo Ciclo' }));
    await screen.findByText('Nenhum erro pendente de revisão');
  });

  it('mantém prioridade alta e registra a revisão no histórico', async () => {
    const { record } = await seedError({ priority: 'alta' });
    const { user } = renderApp(`/segundo-ciclo/revisar/${record.id}`);
    await user.click(await screen.findByRole('button', { name: 'Revelar correção' }));
    await user.click(screen.getByRole('button', { name: 'Manter como prioridade alta' }));
    await screen.findByText('Revisão concluída!');
    await waitFor(async () => {
      const history = await db.history.where('errorId').equals(record.id).toArray();
      expect(history.some((h) => h.type === 'reviewed')).toBe(true);
    });
    expect((await db.errors.get(record.id))!.priority).toBe('alta');
  });
});
