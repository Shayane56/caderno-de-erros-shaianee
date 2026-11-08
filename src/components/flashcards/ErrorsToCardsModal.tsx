import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Deck, Priority } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { useAppData } from '@/hooks/useData';
import { useCards } from '@/hooks/useFlashcards';
import { PRIORITIES, PRIORITY_ORDER } from '@/constants/priorities';
import { createCardsFromErrors } from '@/services/flashcards/cardService';
import { findOrCreateDeckForSubject } from '@/services/flashcards/deckService';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';

interface ErrorsToCardsModalProps {
  open: boolean;
  onClose: () => void;
  /** Baralho de destino. Sem ele, cada matéria vai para o seu próprio baralho. */
  deck?: Deck | null;
}

/** Transforma erros registrados no caderno em flashcards frente-e-verso. */
export function ErrorsToCardsModal({ open, onClose, deck }: ErrorsToCardsModalProps) {
  const toast = useToast();
  const data = useAppData();
  const cards = useCards();
  const [priorities, setPriorities] = useState<Priority[]>(['alta', 'media']);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const carded = useMemo(() => new Set((cards ?? []).map((c) => c.sourceErrorId).filter(Boolean)), [cards]);
  const eligible = useMemo(() => data.errors.filter((e) => !carded.has(e.id) && priorities.includes(e.priority)), [data.errors, carded, priorities]);
  const bySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of eligible) map.set(e.subjectId, (map.get(e.subjectId) ?? 0) + 1);
    return map;
  }, [eligible]);

  useEffect(() => {
    if (!open) return;
    setPriorities(['alta', 'media']);
    setSubjectIds(deck?.subjectId ? [deck.subjectId] : data.subjects.map((s) => s.id));
    // Recalcula ao abrir.
  }, [open, deck?.subjectId, data.subjects]);

  const selected = eligible.filter((e) => subjectIds.includes(e.subjectId));

  const run = async () => {
    setRunning(true);
    try {
      let created = 0;
      const groups = new Map<string, string[]>();
      for (const e of selected) groups.set(e.subjectId, [...(groups.get(e.subjectId) ?? []), e.id]);
      for (const [subjectId, ids] of groups) {
        const target = deck ?? (await findOrCreateDeckForSubject(subjectId));
        created += (await createCardsFromErrors(target.id, ids)).created;
      }
      toast.success(`${created} flashcard(s) criado(s)`, deck ? `No baralho "${deck.name}".` : 'Cada matéria ganhou o seu baralho.');
      onClose();
    } catch (error) {
      toast.error('Não foi possível criar os flashcards', errorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Transformar erros em flashcards"
      description="Cada erro vira um cartão: a descrição na frente, a correção no verso e o “como evitar” como anotação."
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={running}>
            Cancelar
          </Button>
          <Button icon={Sparkles} onClick={() => void run()} loading={running} disabled={selected.length === 0}>
            Criar {selected.length} {selected.length === 1 ? 'cartão' : 'cartões'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="field-label">Quais erros?</legend>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_ORDER.map((p) => (
              <label key={p} className={cn('chip cursor-pointer select-none px-3 py-1.5 text-sm', priorities.includes(p) ? PRIORITIES[p].badgeClass : 'bg-surface text-ink-muted ring-line')}>
                <input type="checkbox" className="sr-only" checked={priorities.includes(p)} onChange={() => setPriorities((l) => toggle(l, p))} />
                <span className={cn('h-2 w-2 rounded-full', PRIORITIES[p].dotClass)} aria-hidden />
                {PRIORITIES[p].label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="field-label">Matérias</legend>
          {data.subjects.length === 0 ? (
            <p className="text-sm text-ink-muted">Você ainda não registrou erros.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {data.subjects.map((s) => {
                const count = bySubject.get(s.id) ?? 0;
                const locked = !!deck?.subjectId && deck.subjectId !== s.id;
                return (
                  <li key={s.id}>
                    <label className={cn('flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 transition', locked ? 'opacity-50' : 'cursor-pointer hover:border-rose-medium/60')}>
                      <input type="checkbox" className="h-4 w-4 accent-rose-pink" disabled={locked} checked={subjectIds.includes(s.id)} onChange={() => setSubjectIds((l) => toggle(l, s.id))} />
                      <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
                      <span className="text-xs font-semibold text-ink-muted">{count} novo(s)</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
        <p className="rounded-2xl bg-canvas p-3 text-xs text-ink-muted">
          Erros que já viraram cartão são ignorados, então pode repetir sem medo de duplicar. Os erros continuam no caderno normalmente.
        </p>
      </div>
    </Modal>
  );
}
