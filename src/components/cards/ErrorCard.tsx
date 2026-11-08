import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Eye, Pencil, Repeat, Trash2 } from 'lucide-react';
import type { ErrorRecord } from '@/types';
import { IconButton } from '@/components/common/Button';
import { OriginQuickMenu, PriorityQuickMenu } from '@/components/common/QuickChangers';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { DeleteErrorDialog } from '@/components/modals/DeleteErrorDialog';
import { formatDate } from '@/utils/dates';

interface ErrorCardProps {
  record: ErrorRecord;
  subjectName: string;
  topicName: string;
  showPath?: boolean;
}

/** Cartão de registro com ações: visualizar, editar, excluir e alterações rápidas. */
export function ErrorCard({ record, subjectName, topicName, showPath }: ErrorCardProps) {
  const { openEdit } = useErrorForm();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="group rounded-2xl border border-line bg-white p-4 transition hover:border-petal hover:shadow-soft" aria-label={`Registro: ${record.description.slice(0, 60)}`}>
      {showPath && (
        <p className="mb-1 truncate text-xs font-semibold text-rose-antique">
          {subjectName} <span className="text-ink-soft">›</span> {topicName}
        </p>
      )}
      <Link to={`/erros/${record.id}`} className="block">
        <p className="line-clamp-3 text-[15px] font-medium leading-relaxed text-ink group-hover:text-rose-ink">{record.description}</p>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityQuickMenu record={record} />
        <OriginQuickMenu record={record} />
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(record.createdAt)}
        </span>
        {record.reviewCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <Repeat className="h-3.5 w-3.5" aria-hidden />
            {record.reviewCount} revis{record.reviewCount === 1 ? 'ão' : 'ões'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton size="sm" icon={Eye} label="Visualizar detalhes" onClick={() => navigate(`/erros/${record.id}`)} />
          <IconButton size="sm" icon={Pencil} label="Editar registro" onClick={() => openEdit(record)} />
          <IconButton size="sm" icon={Trash2} tone="danger" label="Excluir registro" onClick={() => setConfirmDelete(true)} />
        </div>
      </div>
      <DeleteErrorDialog record={record} open={confirmDelete} onClose={() => setConfirmDelete(false)} />
    </article>
  );
}
