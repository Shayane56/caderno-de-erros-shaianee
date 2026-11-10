import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Deck } from '@/types';
import { DeckFormModal } from '@/components/flashcards/DeckFormModal';
import { useCardEditor } from '@/components/flashcards/CardEditorProvider';
import type { IdentityId } from '../registry';
import { identityPath } from '../registry';

/**
 * Ações de biblioteca usadas pelas três identidades: criar cartão, criar e editar
 * baralho. Reaproveitam os mesmos formulários e serviços do aplicativo — as janelas
 * herdam os tokens da identidade ativa (paleta, fontes e raios).
 */
export function useLibraryActions(identity: IdentityId) {
  const navigate = useNavigate();
  const { openCreate } = useCardEditor();
  const [deckForm, setDeckForm] = useState<{ deck: Deck | null } | null>(null);

  const newCard = useCallback((deckId?: string) => openCreate(deckId ? { deckId } : {}), [openCreate]);
  const newDeck = useCallback(() => setDeckForm({ deck: null }), []);
  const editDeck = useCallback((deck: Deck) => setDeckForm({ deck }), []);

  const modal = (
    <DeckFormModal
      open={!!deckForm}
      deck={deckForm?.deck ?? null}
      onClose={() => setDeckForm(null)}
      onSaved={(deck) => {
        // O formulário já avisa e fecha; um baralho novo abre na própria identidade.
        if (!deckForm?.deck) navigate(identityPath(identity, `baralhos/${deck.id}`));
      }}
    />
  );

  return { newCard, newDeck, editDeck, modal };
}
