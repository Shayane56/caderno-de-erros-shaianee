import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { onUpdateAvailable, applyUpdate } from '@/services/pwa';

/** Aviso discreto quando uma nova versão do aplicativo está disponível. */
export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  useEffect(() => onUpdateAvailable(() => setVisible(true)), []);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+var(--safe-bottom))] z-50 mx-auto flex max-w-md animate-slide-up items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-lift lg:bottom-6 lg:left-auto lg:right-6"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush text-rose-pink">
        <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="flex-1 text-sm font-medium text-ink">Nova versão disponível.</p>
      <Button size="sm" onClick={() => void applyUpdate()}>
        Atualizar
      </Button>
      <button type="button" onClick={() => setVisible(false)} className="rounded-lg p-1 text-ink-soft hover:text-rose-ink" aria-label="Dispensar">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
