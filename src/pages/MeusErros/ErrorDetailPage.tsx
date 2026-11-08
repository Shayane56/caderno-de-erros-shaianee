import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  CircleCheckBig,
  FilePlus2,
  FileQuestion,
  History,
  Import,
  Lightbulb,
  Pencil,
  Repeat,
  ShieldCheck,
  StickyNote,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { HistoryEventType } from '@/types';
import { useCatalog, useErrorHistory, useErrorRecord } from '@/hooks/useData';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { OriginIcon } from '@/components/common/Badges';
import { OriginQuickMenu, PriorityQuickMenu } from '@/components/common/QuickChangers';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { DeleteErrorDialog } from '@/components/modals/DeleteErrorDialog';
import { getOriginMeta } from '@/constants/origins';
import { describeDaysSince, formatDateTime } from '@/utils/dates';

const HISTORY_ICONS: Record<HistoryEventType, LucideIcon> = {
  created: FilePlus2,
  updated: Pencil,
  priority_changed: Tag,
  origin_changed: Lightbulb,
  reviewed: Repeat,
  imported: Import,
  moved: ArrowRightLeft,
};

function Block({ icon: Icon, title, children, tone = 'default' }: { icon: LucideIcon; title: string; children: React.ReactNode; tone?: 'default' | 'pink' | 'green' }) {
  const tones = {
    default: 'bg-surface',
    pink: 'bg-blush/50 ring-1 ring-petal',
    green: 'bg-emerald-50/60 ring-1 ring-emerald-100',
  };
  return (
    <section className={`rounded-3xl p-5 ${tones[tone]}`}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rose-antique">
        <Icon className="h-4 w-4" aria-hidden />
        {title}
      </h2>
      <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function ErrorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useErrorRecord(id);
  const history = useErrorHistory(id);
  const { lookup } = useCatalog();
  const { openEdit } = useErrorForm();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (record === undefined) return <PageLoader />;
  if (record === null) {
    return (
      <div className="card">
        <EmptyState
          icon={FileQuestion}
          title="Registro não encontrado"
          description="Ele pode ter sido excluído."
          action={
            <Link to="/erros" className="font-semibold text-rose-pink">
              Voltar para Meus Erros
            </Link>
          }
        />
      </div>
    );
  }

  const subject = lookup.subjects.get(record.subjectId)?.name ?? 'Matéria removida';
  const topic = lookup.topics.get(record.topicId)?.name ?? 'Tópico removido';
  const origin = getOriginMeta(record.origin);
  const isUrl = /^https?:\/\//i.test(record.reference.trim());

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
      </button>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <header className="card p-5 sm:p-6">
            <p className="text-sm font-semibold text-rose-antique">
              <Link to={`/erros?materia=${record.subjectId}`} className="hover:text-rose-pink">
                {subject}
              </Link>{' '}
              <span className="text-ink-soft">›</span>{' '}
              <Link to={`/erros?materia=${record.subjectId}&topico=${record.topicId}`} className="hover:text-rose-pink">
                {topic}
              </Link>
            </p>
            <h1 className="mt-2 whitespace-pre-wrap break-words font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">{record.description}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PriorityQuickMenu record={record} />
              <OriginQuickMenu record={record} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon={Repeat} onClick={() => navigate(`/segundo-ciclo/revisar/${record.id}`)}>
                Revisar erro
              </Button>
              <Button variant="outline" icon={Pencil} onClick={() => openEdit(record)}>
                Editar
              </Button>
              <Button variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            </div>
          </header>

          <Block icon={CircleCheckBig} title="Correção ou entendimento correto" tone="green">
            {record.correction || <span className="text-ink-soft">Não informado.</span>}
          </Block>
          <Block icon={ShieldCheck} title="Como evitar esse erro novamente" tone="pink">
            {record.prevention || <span className="text-ink-soft">Não informado.</span>}
          </Block>
          {(record.reference || record.notes) && (
            <div className="card divide-y divide-line">
              {record.reference && (
                <Block icon={FileQuestion} title="Questão de referência">
                  {isUrl ? (
                    <a href={record.reference.trim()} target="_blank" rel="noreferrer noopener" className="text-rose-pink underline underline-offset-2">
                      {record.reference}
                    </a>
                  ) : (
                    record.reference
                  )}
                </Block>
              )}
              {record.notes && (
                <Block icon={StickyNote} title="Observações">
                  {record.notes}
                </Block>
              )}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="card p-5">
            <h2 className="section-title mb-3 text-base">Origem do erro</h2>
            <div className="flex items-start gap-3">
              <OriginIcon origin={record.origin} size="lg" />
              <div>
                <p className="font-semibold text-ink">{origin.label}</p>
                <p className="text-sm text-ink-muted">{origin.description}</p>
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-canvas p-3 text-xs leading-relaxed text-ink-muted">
              <strong className="text-ink">Estratégia:</strong> {origin.strategy}
            </p>
          </section>

          <section className="card p-5">
            <h2 className="section-title mb-3 text-base">Informações</h2>
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ['Registrado em', formatDateTime(record.createdAt)],
                  ['Última alteração', formatDateTime(record.updatedAt)],
                  ['Última revisão', record.lastReviewedAt ? `${formatDateTime(record.lastReviewedAt)} (${describeDaysSince(record.lastReviewedAt)})` : 'Nunca revisado'],
                  ['Revisões realizadas', String(record.reviewCount)],
                  ...(record.resolvedAt ? [['Superado em', formatDateTime(record.resolvedAt)]] : []),
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-muted">
                    <CalendarDays className="h-3.5 w-3.5 text-rose-antique" aria-hidden />
                    {label}
                  </dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="section-title mb-4 flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-rose-pink" aria-hidden /> Histórico de alterações
            </h2>
            {history && history.length > 0 ? (
              <ol className="relative space-y-4 border-l border-petal pl-5">
                {history.map((h) => {
                  const Icon = HISTORY_ICONS[h.type] ?? History;
                  return (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-surface text-rose-pink ring-2 ring-petal">
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <p className="text-sm text-ink">{h.summary}</p>
                      <p className="text-xs text-ink-muted">{formatDateTime(h.timestamp)}</p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">Nenhuma alteração registrada.</p>
            )}
          </section>
        </aside>
      </div>
      <DeleteErrorDialog record={record} open={confirmDelete} onClose={() => setConfirmDelete(false)} onDeleted={() => navigate('/erros', { replace: true })} />
    </div>
  );
}
