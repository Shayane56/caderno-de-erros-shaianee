import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, NotebookPen, Plus } from 'lucide-react';
import type { ErrorInput, ErrorRecord } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { ErrorForm } from '@/components/forms/ErrorForm';
import { createError, emptyErrorInput, inputFromRecord, updateError } from '@/services/errorService';
import { errorMessage, ValidationError } from '@/services/errors';

interface ErrorFormApi {
  openCreate: (prefill?: Partial<ErrorInput>) => void;
  openEdit: (record: ErrorRecord) => void;
}

const ErrorFormContext = createContext<ErrorFormApi | null>(null);

interface FormState {
  key: number;
  mode: 'create' | 'edit';
  initial: ErrorInput;
  record?: ErrorRecord;
}

const FORM_ID = 'error-form';

export function ErrorFormProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const intent = useRef<'close' | 'another'>('close');
  const counter = useRef(0);

  const openCreate = useCallback((prefill?: Partial<ErrorInput>) => {
    setDirty(false);
    setState({ key: ++counter.current, mode: 'create', initial: { ...emptyErrorInput(), ...prefill } });
  }, []);

  const openEdit = useCallback((record: ErrorRecord) => {
    setDirty(false);
    setState({ key: ++counter.current, mode: 'edit', initial: inputFromRecord(record), record });
  }, []);

  const close = useCallback(() => {
    setState(null);
    setDirty(false);
    setConfirmDiscard(false);
  }, []);

  const requestClose = useCallback(() => {
    if (dirty) setConfirmDiscard(true);
    else close();
  }, [dirty, close]);

  const handleSubmit = async (values: ErrorInput): Promise<'reset' | 'close' | void> => {
    if (!state) return;
    setSaving(true);
    try {
      if (state.mode === 'create') {
        await createError(values);
        toast.success('Erro registrado com sucesso!', 'Indicadores e listagens já foram atualizados.');
        if (intent.current === 'another') {
          setDirty(false);
          return 'reset';
        }
      } else if (state.record) {
        await updateError(state.record.id, values);
        toast.success('Registro atualizado', 'As alterações foram salvas no histórico.');
      }
      close();
      return 'close';
    } catch (error) {
      toast.error(
        state.mode === 'create' ? 'Não foi possível registrar o erro' : 'Não foi possível salvar as alterações',
        error instanceof ValidationError ? error.message : errorMessage(error),
      );
    } finally {
      setSaving(false);
      intent.current = 'close';
    }
  };

  const api = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <ErrorFormContext.Provider value={api}>
      {children}
      <Modal
        open={!!state}
        onClose={requestClose}
        dismissible={!dirty}
        size="lg"
        title={state?.mode === 'edit' ? 'Editar registro' : 'Registrar novo erro'}
        description="Campos marcados com * são obrigatórios."
        icon={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
            <NotebookPen className="h-5 w-5" aria-hidden />
          </span>
        }
        footer={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={requestClose} disabled={saving} className="hidden sm:inline-flex">
              Cancelar
            </Button>
            <div className={state?.mode === 'create' ? 'grid grid-cols-2 gap-2 sm:flex' : 'grid sm:flex'}>
              {state?.mode === 'create' && (
                <Button variant="secondary" type="submit" form={FORM_ID} icon={Plus} disabled={saving} onClick={() => (intent.current = 'another')} className="px-3" aria-label="Salvar e registrar outro">
                  <span className="sm:hidden">Salvar e novo</span>
                  <span className="hidden sm:inline">Salvar e registrar outro</span>
                </Button>
              )}
              <Button type="submit" form={FORM_ID} icon={Check} loading={saving} onClick={() => (intent.current = 'close')} className="px-3 sm:px-5">
                {state?.mode === 'edit' ? 'Salvar alterações' : 'Salvar registro'}
              </Button>
            </div>
          </div>
        }
      >
        {state && (
          <ErrorForm
            key={state.key}
            formId={FORM_ID}
            initial={state.initial}
            createdAt={state.record?.createdAt}
            onSubmit={handleSubmit}
            onDirtyChange={setDirty}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar alterações?"
        description="As informações preenchidas ainda não foram salvas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={close}
        onCancel={() => setConfirmDiscard(false)}
      />
    </ErrorFormContext.Provider>
  );
}

export function useErrorForm(): ErrorFormApi {
  const ctx = useContext(ErrorFormContext);
  if (!ctx) throw new Error('useErrorForm deve ser usado dentro de ErrorFormProvider');
  return ctx;
}
