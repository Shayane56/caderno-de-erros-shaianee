import { useState } from 'react';
import { ArchiveRestore, Download, History, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionCard } from '@/components/common/Card';
import { IconButton, Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { deleteSnapshot, listSnapshots } from '@/services/snapshotService';
import { restoreSnapshot, serializeBackup } from '@/services/backupService';
import { errorMessage } from '@/services/errors';
import { BACKUP_FORMAT_VERSION, MAX_SNAPSHOTS } from '@/constants/app';
import { notebookTitle } from '@/services/profile';
import type { Snapshot } from '@/types';
import { downloadText } from '@/utils/download';
import { formatDateTime } from '@/utils/dates';

export function SnapshotsSection() {
  const toast = useToast();
  const snapshots = useLiveQuery(() => listSnapshots(), []);
  const [restoring, setRestoring] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const download = (s: Snapshot) => {
    const content = serializeBackup({
      app: 'caderno-de-erros',
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: s.createdAt,
      owner: notebookTitle(),
      ...s.data,
    });
    downloadText(`caderno-de-erros-ponto-restauracao-${s.createdAt.slice(0, 10)}.json`, content);
  };

  const confirmRestore = async () => {
    if (!restoring) return;
    setLoading(true);
    try {
      await restoreSnapshot(restoring.id);
      toast.success('Dados restaurados', `Situação de ${formatDateTime(restoring.createdAt)} recuperada.`);
      setRestoring(null);
    } catch (error) {
      toast.error('Não foi possível restaurar', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Pontos de restauração"
      subtitle={`Criados automaticamente antes de operações que removem dados (mantemos os ${MAX_SNAPSHOTS} mais recentes).`}
      icon={History}
    >
      {!snapshots?.length ? (
        <p className="rounded-2xl bg-canvas p-4 text-sm text-ink-muted">Nenhum ponto de restauração até o momento.</p>
      ) : (
        <ul className="divide-y divide-line">
          {snapshots.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{s.reason}</p>
                <p className="text-xs text-ink-muted">
                  {formatDateTime(s.createdAt)} · {s.counts.subjects} matéria(s), {s.counts.topics} tópico(s), {s.counts.errors} erro(s)
                  {s.counts.cards ? `, ${s.counts.cards} flashcard(s)` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="secondary" icon={ArchiveRestore} onClick={() => setRestoring(s)}>
                  Restaurar
                </Button>
                <IconButton size="sm" icon={Download} label="Baixar como JSON" onClick={() => download(s)} />
                <IconButton size="sm" icon={Trash2} tone="danger" label="Excluir ponto de restauração" onClick={() => void deleteSnapshot(s.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!restoring}
        tone="primary"
        title="Restaurar este ponto?"
        description="Os dados atuais serão substituídos pela situação salva neste ponto. Antes disso, um novo ponto de restauração com a situação atual é criado."
        confirmLabel="Restaurar"
        loading={loading}
        onConfirm={confirmRestore}
        onCancel={() => setRestoring(null)}
      />
    </SectionCard>
  );
}
