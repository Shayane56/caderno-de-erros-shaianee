import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { createError } from '@/services/errorService';
import { createTopic } from '@/services/topicService';
import { renderApp } from '@/test/renderApp';
import { makeInput, seedSubjectTopic } from '@/test/factories';

async function seed() {
  const { subject, topic } = await seedSubjectTopic('Direito Administrativo', 'Atos administrativos');
  const lic = await createTopic(subject.id, 'Licitações');
  const port = await seedSubjectTopic('Língua Portuguesa', 'Crase');
  await createError(makeInput(subject.id, topic.id, { description: 'Confundi anulação com revogação', priority: 'alta', origin: 'confusao' }));
  await createError(makeInput(subject.id, lic.id, { description: 'Esqueci o prazo do pregão', priority: 'media', origin: 'esquecimento' }));
  await createError(
    makeInput(port.subject.id, port.topic.id, { description: 'Crase antes de palavra masculina', priority: 'superado', origin: 'interpretacao', notes: 'cuidado com à moda de' }),
  );
}

const articles = () => screen.queryAllByRole('article');

describe('Meus Erros — hierarquia, pesquisa e filtros (interface)', () => {
  it('organiza por matéria → tópico → registros', async () => {
    await seed();
    renderApp('/erros');
    const adm = await screen.findByRole('region', { name: 'Direito Administrativo' });
    expect(within(adm).getByRole('heading', { name: /Atos administrativos/ })).toBeInTheDocument();
    expect(within(adm).getByRole('heading', { name: /Licitações/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Língua Portuguesa' })).toBeInTheDocument();
    expect(articles()).toHaveLength(3);
  });

  it('pesquisa em observações e combina filtros; limpar restaura tudo', async () => {
    await seed();
    const { user } = renderApp('/erros');
    await screen.findByRole('region', { name: 'Direito Administrativo' });

    await user.type(screen.getByLabelText('Pesquisar registros'), 'moda');
    await waitFor(() => expect(articles()).toHaveLength(1));
    expect(screen.getByText('Crase antes de palavra masculina')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Pesquisar registros'));

    const priorityGroup = screen.getByRole('group', { name: 'Filtrar por prioridade' });
    await user.click(within(priorityGroup).getByRole('button', { name: 'Prioridade alta' }));
    await user.click(within(priorityGroup).getByRole('button', { name: 'Prioridade média' }));
    await waitFor(() => expect(articles()).toHaveLength(2));
    const originGroup = screen.getByRole('group', { name: 'Filtrar por origem do erro' });
    await user.click(within(originGroup).getByRole('button', { name: 'Esquecimento' }));
    await waitFor(() => expect(articles()).toHaveLength(1));
    expect(screen.getByText('Esqueci o prazo do pregão')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Limpar todos os filtros/ }));
    await waitFor(() => expect(articles()).toHaveLength(3));
  });

  it('altera prioridade e origem rapidamente na listagem', async () => {
    await seed();
    const { user } = renderApp('/erros');
    const card = await screen.findByRole('article', { name: /Confundi anulação/ });
    await user.click(within(card).getByRole('button', { name: /Alterar prioridade/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Superado/ }));
    await waitFor(async () => {
      const e = (await db.errors.toArray()).find((x) => x.description.startsWith('Confundi'))!;
      expect(e.priority).toBe('superado');
    });
    await user.click(within(card).getByRole('button', { name: /Alterar origem/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Desconhecimento/ }));
    await waitFor(async () => {
      const e = (await db.errors.toArray()).find((x) => x.description.startsWith('Confundi'))!;
      expect(e.origin).toBe('desconhecimento');
      expect(e.priority).toBe('superado');
    });
  });

  it('exclui somente após confirmação', async () => {
    await seed();
    const { user } = renderApp('/erros');
    const card = await screen.findByRole('article', { name: /Esqueci o prazo/ });
    await user.click(within(card).getByRole('button', { name: 'Excluir registro' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir este registro?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(await db.errors.count()).toBe(3);

    await user.click(within(card).getByRole('button', { name: 'Excluir registro' }));
    const again = await screen.findByRole('dialog', { name: 'Excluir este registro?' });
    await user.click(within(again).getByRole('button', { name: 'Excluir registro' }));
    await waitFor(async () => expect(await db.errors.count()).toBe(2));
  });
});
