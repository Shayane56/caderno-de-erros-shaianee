import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Layers, Plus } from 'lucide-react';
import type { CardInput, Flashcard } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { useDecks } from '@/hooks/useFlashcards';
import { emptyCardInput, inputFromCard } from '@/services/flashcards/cardModel';
import { createCard, updateCard } from '@/services/flashcards/cardService';
import { readPreference, writePreference } from '@/services/preferences';
import { errorMessage } from '@/services/errors';
import { CardForm } from './CardForm';

interface OpenCreateOptions {
  deckId?: string;
  prefill?: Partial<CardInput>;
  /** Chamado com o cartão criado. */
  onCreated?: (card: Flashcard) => void;
}

interface CardEditorApi {
  openCreate: (options?: OpenCreateOptions) => void;
  openEdit: (card: Flashcard) => void;
}

const CardEditorContext = createContext<CardEditorApi | null>(null);
const FORM_ID = 'card-form';
const LAST_DECK = 'last-deck';
const LAST_TYPE = 'last-card-type';

interface EditorState {
  key: number;
  mode: 'create' | 'edit';
  initial: CardInput;
  card?: Flashcard;
  onCreated?: (card: Flashcard) => void;
}

export function CardEditorProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const liveDecks = useDecks();
  const decks = useMemo(() => liveDecks ?? [], [liveDecks]);
  const [state, setState] = useState<EditorState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const intent = useRef<'close' | 'another'>('close');
  const counter = useRef(0);

  const openCreate = useCallback((options: OpenCreateOptions = {}) => {
    const lastDeck = readPreference<string>(LAST_DECK, '');
    const lastType = readPreference<CardInput['type']>(LAST_TYPE, 'basic');
    const base = emptyCardInput(options.deckId ?? lastDeck, ['basic', 'cloze', 'truefalse'].includes(lastType) ? lastType : 'basic');
    setDirty(false);
    setState({ key: ++counter.current, mode: 'create', initial: { ...base, ...options.prefill }, onCreated: options.onCreated });
  }, []);

  const openEdit = useCallback((card: Flashcard) => {
    setDirty(false);
    setState({ key: ++counter.current, mode: 'edit', initial: inputFromCard(card), card });
  }, []);

  const close = useCallback(() => {
    setState(null);
    setDirty(false);
    setConfirmDiscard(false);
  }, []);

  const requestClose = useCallback(() => (dirty ? setConfirmDiscard(true) : close()), [dirty, close]);

  // Baralho escolhido que não existe mais (ex.: excluído em outro aparelho) → nenhum.
  const initial = useMemo(() => {
    if (!state) return null;
    if (state.initial.deckId && decks.length && !decks.some((d) => d.id === state.initial.deckId)) return { ...state.initial, deckId: '' };
    return state.initial;
  }, [state, decks]);

  const handleSubmit = async (values: CardInput): Promise<'reset' | 'close' | void> => {
    if (!state) return;
    setSaving(true);
    try {
      if (state.mode === 'create') {
        const card = await createCard(values);
        writePreference(LAST_DECK, values.deckId);
        writePreference(LAST_TYPE, values.type);
        state.onCreated?.(card);
        toast.success('Cartão criado!', 'Ele já entra na fila de estudo de hoje.');
        if (intent.current === 'another') {
          setDirty(false);
          return 'reset';
        }
      } else if (state.card) {
        await updateCard(state.card.id, values);
        toast.success('Cartão atualizado', 'O progresso de estudo foi mantido.');
      }
      close();
      return 'close';
    } catch (error) {
      toast.error('Não foi possível salvar o cartão', errorMessage(error));
    } finally {
      setSaving(false);
      intent.current = 'close';
    }
  };

  const api = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <CardEditorContext.Provider value={api}>
      {children}
      <Modal
        open={!!state}
        onClose={requestClose}
        dismissible={!dirty}
        size="xl"
        title={state?.mode === 'edit' ? 'Editar cartão' : 'Novo flashcard'}
        description="Escreva como se fosse no seu caderno: grife, esconda trechos e cole prints de questões."
        icon={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
        }
        footer={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={requestClose} disabled={saving} className="hidden sm:inline-flex">
              Cancelar
            </Button>
            <div className={state?.mode === 'create' ? 'grid grid-cols-2 gap-2 sm:flex' : 'grid sm:flex'}>
              {state?.mode === 'create' && (
                <Button variant="secondary" type="submit" form={FORM_ID} icon={Plus} disabled={saving} onClick={() => (intent.current = 'another')} className="px-3" aria-label="Salvar e criar outro">
                  <span className="sm:hidden">Salvar e novo</span>
                  <span className="hidden sm:inline">Salvar e criar outro</span>
                </Button>
              )}
              <Button type="submit" form={FORM_ID} icon={Check} loading={saving} onClick={() => (intent.current = 'close')} className="px-3 sm:px-5">
                {state?.mode === 'edit' ? 'Salvar alterações' : 'Salvar cartão'}
              </Button>
            </div>
          </div>
        }
      >
        {state && initial && <CardForm key={state.key} formId={FORM_ID} initial={initial} decks={decks} onSubmit={handleSubmit} onDirtyChange={setDirty} />}
      </Modal>
      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar o cartão?"
        description="O que você escreveu ainda não foi salvo."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={close}
        onCancel={() => setConfirmDiscard(false)}
      />
    </CardEditorContext.Provider>
  );
}

export function useCardEditor(): CardEditorApi {
  const ctx = useContext(CardEditorContext);
  if (!ctx) throw new Error('useCardEditor deve ser usado dentro de CardEditorProvider');
  return ctx;
}
