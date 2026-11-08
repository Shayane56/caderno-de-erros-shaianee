import { useState } from 'react';
import type { ErrorRecord } from '@/types';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { deleteError } from '@/services/errorService';
import { errorMessage } from '@/services/errors';
import { truncate } from '@/utils/text';

interface DeleteErrorDialogProps {
  record: ErrorRecord;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteErrorDialog({ record, open, onClose, onDeleted }: DeleteErrorDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true);
    try {
      await deleteError(record.id);
      toast.success('Registro excluído');
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error('Não foi possível excluir', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  return (
    <ConfirmDialog
      open={open}
      title="Excluir este registro?"
      description="Esta ação não pode ser desfeita. O histórico de alterações e de revisões deste registro também será removido."
      confirmLabel="Excluir registro"
      loading={loading}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <blockquote className="rounded-2xl bg-canvas p-3 text-sm italic text-ink-muted">“{truncate(record.description, 160)}”</blockquote>
      {record.priority === 'superado' && (
        <p className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">
          Este erro está marcado como <strong>superado</strong>. Erros superados não precisam ser excluídos — eles ficam guardados como
          histórico da sua evolução.
        </p>
      )}
    </ConfirmDialog>
  );
}
