import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DatabaseBackup, RotateCw } from 'lucide-react';
import { openDatabase, requestPersistentStorage, type DatabaseOpenError } from '@/database/db';
import { Button } from '@/components/common/Button';
import { PageLoader } from '@/components/common/Spinner';
import { BrandTitle } from './BrandMark';

/** Garante que o banco local esteja aberto (e migrado) antes de exibir a aplicação. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | DatabaseOpenError>('loading');

  const open = useCallback(async () => {
    setState('loading');
    try {
      await openDatabase();
      setState('ready');
      void requestPersistentStorage();
    } catch (error) {
      setState(error as DatabaseOpenError);
    }
  }, []);

  useEffect(() => {
    void open();
  }, [open]);

  if (state === 'ready') return <>{children}</>;
  if (state === 'loading') return <PageLoader label="Abrindo seu caderno…" />;

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="card w-full max-w-md p-7 text-center">
        <div className="mb-6 flex justify-center">
          <BrandTitle />
        </div>
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <DatabaseBackup className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-semibold">Não foi possível abrir o banco de dados</h1>
        <p className="mt-2 text-sm text-ink-muted">{state.message}</p>
        <p className="mt-3 text-xs text-ink-soft">Nenhum dado foi apagado. Se o problema persistir, restaure um backup JSON após reabrir o aplicativo.</p>
        <Button className="mt-6" icon={RotateCw} onClick={() => void open()}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
