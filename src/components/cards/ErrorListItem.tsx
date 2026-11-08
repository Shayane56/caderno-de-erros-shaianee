import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ErrorRecord } from '@/types';
import type { LookupMaps } from '@/utils/filters';
import { OriginBadge, PriorityBadge } from '@/components/common/Badges';
import { formatDate, describeDaysSince } from '@/utils/dates';
import { truncate } from '@/utils/text';

interface ErrorListItemProps {
  record: ErrorRecord;
  lookup: LookupMaps;
  showReview?: boolean;
  meta?: 'created' | 'review';
}

/** Linha compacta de registro (painel, listas resumidas). */
export function ErrorListItem({ record, lookup, meta = 'created' }: ErrorListItemProps) {
  const subject = lookup.subjects.get(record.subjectId)?.name ?? 'Matéria removida';
  const topic = lookup.topics.get(record.topicId)?.name ?? 'Tópico removido';
  return (
    <li>
      <Link to={`/erros/${record.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-canvas sm:px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-rose-antique">
            {subject} <span className="text-ink-soft">›</span> {topic}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium text-ink">{truncate(record.description, 140)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={record.priority} />
            <OriginBadge origin={record.origin} short />
            <span className="text-[11px] text-ink-muted">
              {meta === 'review'
                ? `Última revisão: ${describeDaysSince(record.lastReviewedAt)}`
                : formatDate(record.createdAt)}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-rose-pink" aria-hidden />
      </Link>
    </li>
  );
}
