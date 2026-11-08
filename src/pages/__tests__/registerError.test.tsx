import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';
import { seedSubjectTopic } from '@/test/factories';

describe('formulário de registro de erros (interface)', () => {
  it('valida campos obrigatórios e não salva formulário incompleto', async () => {
    const { user } = renderApp('/');
    await user.click((await screen.findAllByRole('button', { name: 'Registrar novo erro' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Registrar novo erro' });
    await user.click(within(dialog).getByRole('button', { name: 'Salvar registro' }));
    for (const msg of [
      'Selecione ou crie a matéria.',
      'Selecione ou crie o tópico.',
      'Descreva o erro cometido.',
      'Informe a correção ou o entendimento correto.',
      'Explique como evitar esse erro novamente.',
      'Escolha a prioridade.',
      'Escolha a origem do erro.',
    ]) {
      expect(within(dialog).getByText(msg)).toBeInTheDocument();
    }
    expect(await db.errors.count()).toBe(0);
  });

  it('cria matéria e tópico sem sair do formulário, salva e atualiza os indicadores', async () => {
    const { user } = renderApp('/');
    await user.click((await screen.findAllByRole('button', { name: 'Registrar novo erro' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Registrar novo erro' });

    await user.click(within(dialog).getByRole('button', { name: 'Nova matéria' }));
    await user.type(within(dialog).getByLabelText('Nome da nova matéria'), 'Direito Constitucional');
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }));
    await within(dialog).findByText('Matéria "Direito Constitucional" criada.');

    await user.click(within(dialog).getByRole('button', { name: 'Novo tópico' }));
    await user.type(within(dialog).getByLabelText('Nome do novo tópico'), 'Direitos fundamentais');
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }));
    await within(dialog).findByText('Tópico "Direitos fundamentais" criado.');

    await user.type(within(dialog).getByLabelText(/Descrição do erro/), 'Achei que direitos fundamentais eram absolutos.');
    await user.type(within(dialog).getByLabelText(/Correção ou entendimento correto/), 'Direitos fundamentais são relativos.');
    await user.type(within(dialog).getByLabelText(/Como evitar esse erro novamente/), 'Lembrar da relatividade.');
    await user.click(within(dialog).getByRole('radio', { name: /Prioridade média/ }));
    await user.click(within(dialog).getByRole('radio', { name: /Desconhecimento/ }));
    await user.type(within(dialog).getByLabelText(/Questão de referência/), 'CEBRASPE 2023 — Q12');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar registro' }));

    expect(await screen.findByText('Erro registrado com sucesso!')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Registrar novo erro' })).not.toBeInTheDocument());
    const [stored] = await db.errors.toArray();
    expect(stored).toMatchObject({ priority: 'media', origin: 'desconhecimento', reference: 'CEBRASPE 2023 — Q12' });
    const totalCard = await screen.findByRole('link', { name: /Erros registrados/ });
    await waitFor(() => expect(within(totalCard).getByText('1')).toBeInTheDocument());
  });

  it('"Salvar e registrar outro" mantém matéria e tópico para registro rápido', async () => {
    await seedSubjectTopic('Língua Portuguesa', 'Crase');
    const { user } = renderApp('/erros');
    await user.click((await screen.findAllByRole('button', { name: 'Registrar novo erro' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Registrar novo erro' });
    await user.selectOptions(within(dialog).getByLabelText(/^Matéria/), 'Língua Portuguesa');
    await user.selectOptions(within(dialog).getByLabelText(/^Tópico/), 'Crase');
    await user.type(within(dialog).getByLabelText(/Descrição do erro/), 'Crase antes de verbo.');
    await user.type(within(dialog).getByLabelText(/Correção ou entendimento correto/), 'Não ocorre crase antes de verbo.');
    await user.type(within(dialog).getByLabelText(/Como evitar esse erro novamente/), 'Verificar a classe da palavra.');
    await user.click(within(dialog).getByRole('radio', { name: /Prioridade alta/ }));
    await user.click(within(dialog).getByRole('radio', { name: /Esquecimento/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar e registrar outro' }));

    await waitFor(async () => expect(await db.errors.count()).toBe(1));
    expect(screen.getByRole('dialog', { name: 'Registrar novo erro' })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText(/Descrição do erro/)).toHaveValue(''));
    expect((within(dialog).getByLabelText(/^Tópico/) as HTMLSelectElement).selectedOptions[0].textContent).toBe('Crase');
  });
});
