import { useEffect, useState } from 'react';
import { HardDrive, MonitorSmartphone, Share, ShieldCheck, Smartphone } from 'lucide-react';
import { SectionCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { requestPersistentStorage } from '@/database/db';
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribeInstall } from '@/services/install';
import { isOfflineReady } from '@/services/pwa';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function DeviceSection() {
  const toast = useToast();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [installable, setInstallable] = useState(canPromptInstall());

  useEffect(() => subscribeInstall(() => setInstallable(canPromptInstall())), []);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    void navigator.storage?.estimate?.().then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => undefined);
  }, []);

  const standalone = isStandalone();
  const offline = isOfflineReady() || (typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller);

  return (
    <SectionCard title="Aplicativo e armazenamento" subtitle="Instalação, funcionamento offline e espaço utilizado." icon={MonitorSmartphone}>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3 rounded-2xl bg-canvas p-3.5">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-rose-pink" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-ink">Banco de dados local (IndexedDB)</p>
            <p className="text-xs text-ink-muted">
              {estimate ? `Em uso: ${formatBytes(estimate.usage)} de ${formatBytes(estimate.quota)} disponíveis.` : 'Seus dados ficam guardados neste navegador.'}
            </p>
          </div>
        </li>
        <li className="flex flex-col gap-3 rounded-2xl bg-canvas p-3.5 sm:flex-row sm:items-center">
          <ShieldCheck className="h-4 w-4 shrink-0 text-rose-pink" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-ink">Armazenamento persistente</p>
            <p className="text-xs text-ink-muted">
              {persisted === true
                ? 'Ativado: o navegador não apagará seus dados automaticamente para liberar espaço.'
                : persisted === false
                  ? 'Ainda não concedido. Instalar o aplicativo costuma ativar esta proteção.'
                  : 'Este navegador não informa o estado do armazenamento.'}
            </p>
          </div>
          {persisted === false && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void requestPersistentStorage().then((ok) => {
                  setPersisted(!!ok);
                  if (ok) toast.success('Armazenamento persistente ativado');
                  else toast.info('O navegador não concedeu agora', 'Instale o aplicativo ou use-o com frequência e tente novamente.');
                })
              }
            >
              Solicitar
            </Button>
          )}
        </li>
        <li className="flex flex-col gap-3 rounded-2xl bg-canvas p-3.5 sm:flex-row sm:items-center">
          <Smartphone className="h-4 w-4 shrink-0 text-rose-pink" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-ink">Instalar como aplicativo</p>
            <p className="text-xs text-ink-muted">
              {standalone
                ? 'O Mimo já está instalado neste dispositivo.'
                : installable
                  ? 'Instale para abrir direto da tela inicial, em tela cheia e sem internet.'
                  : isIos()
                    ? 'No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
                    : 'Use o menu do navegador (⋮) e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Funcionamento offline: <strong className="text-ink">{offline ? 'disponível' : 'será ativado após o primeiro carregamento completo'}</strong>
            </p>
          </div>
          {installable && !standalone && (
            <Button size="sm" icon={isIos() ? Share : Smartphone} onClick={() => void promptInstall()}>
              Instalar
            </Button>
          )}
        </li>
      </ul>
    </SectionCard>
  );
}
