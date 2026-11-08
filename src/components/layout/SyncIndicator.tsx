import { Link } from 'react-router-dom';
import { CloudAlert, CloudCheck, CloudOff, CloudUpload, HardDrive, RefreshCw, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSync, type SyncStatus } from '@/hooks/useSync';
import { formatTime } from '@/utils/dates';
import { cn } from '@/utils/cn';

interface Visual {
  icon: LucideIcon;
  label: string;
  detail: string;
  tone: string;
  spin?: boolean;
}

export function useSyncVisual(): Visual & { status: SyncStatus } {
  const { status, lastSyncedAt, pendingCount, lastError } = useSync();
  const map: Record<SyncStatus, Visual> = {
    local: {
      icon: HardDrive,
      label: 'Salvo neste dispositivo',
      detail: 'Modo local — sincronização em nuvem não configurada.',
      tone: 'text-ink-muted bg-canvas',
    },
    connecting: { icon: RefreshCw, label: 'Conectando…', detail: 'Conectando ao serviço de sincronização.', tone: 'text-rose-ink bg-blush', spin: true },
    signed_out: {
      icon: CloudOff,
      label: 'Nuvem desconectada',
      detail: 'Entre na sua conta para sincronizar. Os dados continuam salvos localmente.',
      tone: 'text-ink-muted bg-canvas',
    },
    syncing: { icon: RefreshCw, label: 'Sincronizando…', detail: 'Enviando e recebendo alterações.', tone: 'text-rose-ink bg-blush', spin: true },
    synced: {
      icon: CloudCheck,
      label: `Sincronizado às ${formatTime(lastSyncedAt)}`,
      detail: 'Todos os dados deste dispositivo estão na nuvem.',
      tone: 'text-emerald-700 bg-emerald-50',
    },
    pending: {
      icon: CloudUpload,
      label: pendingCount ? `${pendingCount} alteração(ões) a enviar` : 'Aguardando sincronização',
      detail: 'Alterações salvas localmente, ainda não enviadas à nuvem.',
      tone: 'text-amber-800 bg-amber-50',
    },
    offline: {
      icon: WifiOff,
      label: 'Offline',
      detail: 'Sem internet — tudo continua salvo neste dispositivo.',
      tone: 'text-ink-muted bg-canvas',
    },
    error: {
      icon: CloudAlert,
      label: 'Falha na sincronização',
      detail: lastError ?? 'Não foi possível sincronizar.',
      tone: 'text-red-700 bg-red-50',
    },
  };
  return { ...map[status], status };
}

export function SyncIndicator({ compact, className }: { compact?: boolean; className?: string }) {
  const visual = useSyncVisual();
  const Icon = visual.icon;
  return (
    <Link
      to="/backup#sincronizacao"
      title={visual.detail}
      aria-label={`Estado da sincronização: ${visual.label}. ${visual.detail}`}
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full text-xs font-semibold transition hover:brightness-95',
        compact ? 'h-9 w-9 justify-center' : 'px-3 py-1.5',
        visual.tone,
        className,
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', visual.spin && 'animate-spin')} aria-hidden />
      {!compact && <span className="truncate">{visual.label}</span>}
    </Link>
  );
}
