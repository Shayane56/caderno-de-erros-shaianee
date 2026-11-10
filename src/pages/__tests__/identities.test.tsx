import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';
import { createDeck } from '@/services/flashcards/deckService';
import { createCard } from '@/services/flashcards/cardService';
import { defaultDeckInput, emptyCardInput } from '@/services/flashcards/cardModel';
import { createDemoLibrary, readDemo, removeDemoLibrary } from '@/identity/demoData';
import { switchIdentityPath, type IdentityId } from '@/identity/registry';

async function seed() {
  const deck = await createDeck(defaultDeckInput({ name: 'Direito Administrativo' }));
  const card = await createCard({ ...emptyCardInput(deck.id), front: 'Quais são os atributos do ato administrativo?', back: 'Presunção de legitimidade, imperatividade e autoexecutoriedade' });
  return { deck, card };
}

const REVEAL: Record<IdentityId, RegExp> = { editorial: /Mostrar a resposta/, soft: /Mostrar resposta/, bold: /Revelar/ };

describe('Identidades visuais', () => {
  it('troca de identidade mantendo a mesma tela', () => {
    expect(switchIdentityPath('/identidades/editorial/baralhos/abc', '', 'bold')).toBe('/identidades/bold/baralhos/abc');
    expect(switchIdentityPath('/identidades/soft', '?x=1', 'editorial')).toBe('/identidades/editorial?x=1');
  });

  it('a página de comparação apresenta as três propostas', async () => {
    renderApp('/identidades');
    expect(await screen.findByRole('heading', { name: 'Explorar identidades do Mimo' })).toBeInTheDocument();
    for (const name of ['Editorial', 'Soft Modern', 'Bold Minimal']) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Entrar na demonstração/ })).toHaveLength(3);
  });

  it.each(['editorial', 'soft', 'bold'] as IdentityId[])('%s: revisa um cartão com o mesmo agendamento do aplicativo', async (id) => {
    const { card } = await seed();
    const { user } = renderApp(`/identidades/${id}/revisar/todos`);
    await screen.findByText('Quais são os atributos do ato administrativo?');
    expect(screen.queryByText(/Presunção de legitimidade/)).not.toBeInTheDocument();
    expect(document.documentElement.dataset.identity).toBe(id);

    await user.click(screen.getByRole('button', { name: REVEAL[id] }));
    expect(screen.getByText(/Presunção de legitimidade/)).toBeInTheDocument();
    const easy = screen.getByRole('button', { name: /Fácil/ });
    expect(easy).toHaveTextContent('4 d');
    await user.click(easy);

    await waitFor(async () => expect((await db.cards.get(card.id))!.srs['0']).toMatchObject({ phase: 'review', interval: 4 }));
    expect(await db.cardReviews.count()).toBe(1);
  });

  it.each(['editorial', 'soft', 'bold'] as IdentityId[])('%s: início, baralhos e estatísticas mostram os dados reais', async (id) => {
    const { deck } = await seed();
    const { unmount } = renderApp(`/identidades/${id}/baralhos`);
    expect((await screen.findAllByText('Direito Administrativo')).length).toBeGreaterThan(0);
    unmount();
    const r2 = renderApp(`/identidades/${id}/baralhos/${deck.id}`);
    expect(await screen.findByText('Quais são os atributos do ato administrativo?')).toBeInTheDocument();
    r2.unmount();
    renderApp(`/identidades/${id}/estatisticas`);
    expect(await screen.findByRole('group', { name: 'Período' })).toBeInTheDocument();
  });

  it('o seletor A · B · C troca a identidade sem sair da tela', async () => {
    await seed();
    const { user } = renderApp('/identidades/editorial/baralhos');
    expect((await screen.findAllByText('Direito Administrativo')).length).toBeGreaterThan(0);
    const group = screen.getAllByRole('group', { name: 'Identidade visual' })[0];
    await user.click(group.querySelector('button[title^="Proposta C"]')!);
    await waitFor(() => expect(document.documentElement.dataset.identity).toBe('bold'));
    expect(await screen.findByRole('heading', { name: 'Baralhos' })).toBeInTheDocument();
  });

  it('baralhos de exemplo: cria com histórico real e remove sem deixar rastros', async () => {
    const mine = await createDeck(defaultDeckInput({ name: 'Meu baralho' }));
    await createDemoLibrary();
    const record = readDemo()!;
    expect(record.deckIds).toHaveLength(4);
    expect(await db.cards.where('deckId').anyOf(record.deckIds).count()).toBeGreaterThan(25);
    expect(await db.cardReviews.count()).toBeGreaterThan(20);

    await removeDemoLibrary();
    expect(readDemo()).toBeNull();
    expect(await db.decks.toArray()).toEqual([mine]);
    expect(await db.cardReviews.count()).toBe(0);
    expect(await db.subjects.count()).toBe(0);
  }, 30_000);
});
