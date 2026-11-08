import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';
import { createQuestion } from '@/services/questions/questionService';
import { emptyQuestionInput } from '@/services/questions/questionModel';

async function seedMine() {
  return createQuestion({
    ...emptyQuestionInput('multipla'),
    banca: 'FGV',
    subject: 'Saúde Pública',
    topic: 'Epidemiologia',
    statement: 'Pergunta de teste sobre incidência?',
    options: ['Casos existentes', 'Casos novos no período', 'Óbitos', 'Curas'],
    answer: 1,
    explanation: 'Incidência mede casos novos.',
  });
}

describe('Banco de Questões (interface)', () => {
  it('lista o banco do app com filtros e estatísticas', async () => {
    const { user } = renderApp('/questoes');
    expect(await screen.findByRole('heading', { name: 'Banco de Questões' })).toBeInTheDocument();
    const list = await screen.findByRole('region', { name: 'Questões' });
    await waitFor(() => expect(within(list).getByText(/^\d+ questão\(ões\)/)).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Matéria'), 'Informática');
    await waitFor(() => expect(within(list).getAllByText((_, el) => el?.tagName === 'P' && /^Informática ›/.test(el.textContent ?? '')).length).toBeGreaterThan(0));
    expect(within(list).queryAllByText((_, el) => el?.tagName === 'P' && /^Saúde Pública ›/.test(el.textContent ?? ''))).toHaveLength(0);
  });

  it('resolve uma questão, mostra o gabarito comentado e abre o registro de erro preenchido', async () => {
    const q = await seedMine();
    const { user } = renderApp(`/questoes/resolver?origem=minha`);
    await screen.findByText('Pergunta de teste sobre incidência?');
    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled();
    await user.click(screen.getByText('Casos existentes'));
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    expect(await screen.findByText('Resposta errada. Gabarito: B')).toBeInTheDocument();
    expect(screen.getByText('Incidência mede casos novos.')).toBeInTheDocument();
    expect((await db.questionAttempts.toArray())[0]).toMatchObject({ questionId: q.id, correct: false, chosen: 0 });

    await user.click(screen.getByRole('button', { name: 'Registrar no caderno de erros' }));
    const dialog = await screen.findByRole('dialog', { name: 'Registrar novo erro' });
    expect((within(dialog).getByLabelText(/Descrição do erro/) as HTMLTextAreaElement).value).toContain('Pergunta de teste sobre incidência?');
    expect(await db.subjects.count()).toBe(1);
  });

  it('itens Certo/Errado e resultado final da lista', async () => {
    await createQuestion({ ...emptyQuestionInput('certo_errado'), banca: 'Cebraspe', subject: 'Saúde Pública', topic: 'SUS', statement: 'Item de teste C/E.', answer: 'E' });
    const { user } = renderApp(`/questoes/resolver?origem=minha`);
    await screen.findByText('Item de teste C/E.');
    await user.click(screen.getByRole('radio', { name: /Errado/ }));
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    expect(await screen.findByText('Você acertou!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(await screen.findByText('Lista concluída!')).toBeInTheDocument();
    expect(screen.getByText(/acertou 1 \(100%\)/)).toBeInTheDocument();
  });
});
