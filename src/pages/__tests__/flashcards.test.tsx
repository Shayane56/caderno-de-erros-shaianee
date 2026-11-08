import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/database/db';
import { renderApp } from '@/test/renderApp';
import { seedError } from '@/test/factories';
import { createDeck } from '@/services/flashcards/deckService';
import { createCard } from '@/services/flashcards/cardService';
import { defaultDeckInput, emptyCardInput } from '@/services/flashcards/cardModel';

async function seedDeck(name = 'Direito Penal') {
  return createDeck(defaultDeckInput({ name }));
}

describe('Flashcards (interface)', () => {
  it('estuda um cartão: esconde a resposta, mostra os intervalos e reagenda', async () => {
    const deck = await seedDeck();
    const card = await createCard({ ...emptyCardInput(deck.id), front: 'Prazo da prescrição da pretensão punitiva?', back: 'Resposta secreta: art. 109 do CP' });
    const { user } = renderApp(`/flashcards/estudar/${deck.id}`);

    await screen.findByText('Prazo da prescrição da pretensão punitiva?');
    expect(screen.queryByText('Resposta secreta: art. 109 do CP')).not.toBeInTheDocument();
    expect(screen.getByLabelText('1 novos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mostrar resposta/ }));
    expect(screen.getByText('Resposta secreta: art. 109 do CP')).toBeInTheDocument();
    const easy = screen.getByRole('button', { name: /Fácil/ });
    expect(easy).toHaveTextContent('4 d');
    expect(screen.getByRole('button', { name: /Errei/ })).toHaveTextContent('1 min');

    await user.click(easy);
    expect(await screen.findByText('Estudo de hoje concluído!')).toBeInTheDocument();
    const stored = await db.cards.get(card.id);
    expect(stored!.srs['0']).toMatchObject({ phase: 'review', interval: 4 });
    expect(await db.cardReviews.count()).toBe(1);
  });

  it('Certo ou Errado: ao errar, só permite "Continuar" (conta como Errei)', async () => {
    const deck = await seedDeck();
    const card = await createCard({ ...emptyCardInput(deck.id, 'truefalse'), front: 'O habeas corpus exige advogado.', answer: 'errado', back: 'Qualquer pessoa pode impetrar.' });
    const { user } = renderApp(`/flashcards/estudar/${deck.id}`);

    await user.click(await screen.findByRole('button', { name: /^Certo/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Você errou');
    expect(screen.getByText('Qualquer pessoa pode impetrar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fácil/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await waitFor(async () => expect((await db.cards.get(card.id))!.srs['0'].phase).toBe('learning'));
  });

  it('lacunas: esconde só a lacuna estudada', async () => {
    const deck = await seedDeck();
    await createCard({ ...emptyCardInput(deck.id, 'cloze'), front: 'O prazo é de {{c1::quinze dias}} e cabe {{c2::recurso hierárquico}}.' });
    const { user } = renderApp(`/flashcards/estudar/${deck.id}`);
    await screen.findByLabelText('lacuna');
    expect(screen.queryByText('quinze dias')).not.toBeInTheDocument();
    expect(screen.getByText(/recurso hierárquico/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mostrar resposta/ }));
    expect(screen.getByText('quinze dias')).toBeInTheDocument();
  });

  it('cria cartão pelo editor com marca-texto e o mostra na lista do baralho', async () => {
    const deck = await seedDeck('Constitucional');
    const { user } = renderApp(`/flashcards/baralho/${deck.id}`);
    await user.click(await screen.findByRole('button', { name: 'Novo cartão' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo flashcard' });
    const front = within(dialog).getByRole('textbox', { name: /^Frente/ });
    await user.type(front, 'Remédio para proteger a liberdade de locomoção?');
    await user.type(within(dialog).getByRole('textbox', { name: /^Verso/ }), 'Habeas corpus');
    // Grifa o verso inteiro com marca-texto verde.
    const back = within(dialog).getByRole('textbox', { name: /^Verso/ }) as HTMLTextAreaElement;
    back.setSelectionRange(0, back.value.length);
    await user.click(within(dialog).getAllByRole('button', { name: 'Marca-texto verde' })[1]);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar cartão' }));

    await waitFor(async () => expect(await db.cards.count()).toBe(1));
    const card = (await db.cards.toArray())[0];
    expect(card).toMatchObject({ deckId: deck.id, type: 'basic', back: '==verde:Habeas corpus==' });
    expect(await screen.findByText('Remédio para proteger a liberdade de locomoção?')).toBeInTheDocument();
  });

  it('transforma um erro do caderno em flashcard a partir da página do erro', async () => {
    const { record, subject } = await seedError();
    const { user } = renderApp(`/erros/${record.id}`);
    await user.click(await screen.findByRole('button', { name: 'Virar flashcard' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo flashcard' });
    expect(within(dialog).getByRole('textbox', { name: /^Frente/ })).toHaveValue(record.description);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar cartão' }));
    await waitFor(async () => expect(await db.cards.count()).toBe(1));
    const deck = (await db.decks.toArray())[0];
    expect(deck).toMatchObject({ name: subject.name, subjectId: subject.id });
    expect(await screen.findByRole('button', { name: 'Ver flashcard' })).toBeInTheDocument();
  });

  it('lista baralhos com as contagens do dia e permite trocar o tema', async () => {
    const deck = await seedDeck('Português');
    await createCard({ ...emptyCardInput(deck.id), front: 'Crase antes de palavra masculina?', back: 'Não, em regra.' });
    const { user } = renderApp('/flashcards');
    expect(await screen.findByRole('link', { name: 'Abrir baralho Português' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estudar tudo \(1\)/ })).toBeEnabled();

    renderApp('/backup');
    const lavanda = await screen.findAllByRole('button', { name: /Lavanda/ });
    await user.click(lavanda[0]);
    expect(document.documentElement.dataset.theme).toBe('lavanda');
    await user.click(screen.getAllByRole('button', { name: /Escuro/ })[0]);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
