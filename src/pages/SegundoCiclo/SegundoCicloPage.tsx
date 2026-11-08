import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarClock, CircleCheckBig, Flame, Hourglass, Play, Repeat, RotateCcw, Target } from 'lucide-react';
import type { ErrorRecord, Priority } from '@/types';
import { useAppData } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/common/Button';
import { SectionCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { OriginBadge } from '@/components/common/Badges';
import { Select } from '@/components/forms/Fields';
import { StatCard } from '@/components/cards/StatCard';
import { DifficultyList } from '@/components/dashboard/DifficultyList';
import { PRIORITIES } from '@/constants/priorities';
import { buildReviewQueue, countBySubject, countByTopic, lastTouch, rankDifficulties, staleErrors } from '@/utils/statistics';
import { describeDaysSince, daysSince } from '@/utils/dates';
import type { LookupMaps } from '@/utils/filters';
import { truncate } from '@/utils/text';
import type { ReviewSessionState } from './ReviewPage';

function QueueItem({ record, lookup, onReview }: { record: ErrorRecord; lookup: LookupMaps; onReview: () => void }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-rose-antique">
          {lookup.subjects.get(record.subjectId)?.name ?? '—'} <span className="text-ink-soft">›</span> {lookup.topics.get(record.topicId)?.name ?? '—'}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-ink">{truncate(record.description, 160)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
          <OriginBadge origin={record.origin} short />
          <span className="inline-flex items-center gap-1">
            <Hourglass className="h-3 w-3" aria-hidden />
            {record.lastReviewedAt ? `Revisado ${describeDaysSince(record.lastReviewedAt)}` : `Nunca revisado · registrado ${describeDaysSince(record.createdAt)}`}
          </span>
        </div>
      </div>
      <Button size="sm" variant="secondary" icon={Repeat} onClick={onReview} className="self-start sm:self-center">
        Revisar erro
      </Button>
    </li>
  );
}

export default function SegundoCicloPage() {
  const data = useAppData();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState('');

  const view = useMemo(() => {
    const scoped = subjectId ? data.errors.filter((e) => e.subjectId === subjectId) : data.errors;
    const queue = buildReviewQueue(scoped);
    const weekAgo = Date.now() - 7 * 86_400_000;
    return {
      queue,
      alta: queue.filter((e) => e.priority === 'alta'),
      media: queue.filter((e) => e.priority === 'media'),
      stale: staleErrors(scoped, 5),
      hardSubjects: rankDifficulties(countBySubject(data.errors, data.subjects), 5),
      hardTopics: rankDifficulties(countByTopic(scoped, data.topics, data.subjects), 5),
      reviewsWeek: data.reviews.filter((r) => new Date(r.reviewedAt).getTime() >= weekAgo).length,
    };
  }, [data, subjectId]);

  if (data.loading) return <PageLoader />;

  const start = (records: ErrorRecord[], index = 0) => {
    if (!records.length) return;
    const state: ReviewSessionState = { queue: records.map((r) => r.id), index, results: [] };
    navigate(`/segundo-ciclo/revisar/${records[index].id}`, { state });
  };

  const oldest = view.stale[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Segundo Ciclo"
        eyebrow="Revisão inteligente"
        icon={Repeat}
        subtitle="Revise os erros ainda não superados: tente lembrar a resposta antes de revelar a correção e reclassifique com honestidade."
        actions={
          <Button icon={Play} onClick={() => start(view.queue)} disabled={!view.queue.length}>
            Iniciar revisão ({view.queue.length})
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Prioridade alta" value={view.alta.length} icon={Flame} accent={PRIORITIES.alta.color} hint="revisar primeiro" />
        <StatCard label="Prioridade média" value={view.media.length} icon={RotateCcw} accent="#B7791F" hint="reforço" />
        <StatCard label="Revisões realizadas" value={data.reviews.length} icon={CircleCheckBig} accent="#DB2777" hint={`${view.reviewsWeek} nos últimos 7 dias`} />
        <StatCard
          label="Mais tempo sem revisão"
          value={oldest ? `${daysSince(lastTouch(oldest))} d` : '—'}
          icon={CalendarClock}
          accent="#D98BAE"
          hint={oldest ? (oldest.lastReviewedAt ? 'desde a última revisão' : 'desde o registro') : 'nada pendente'}
        />
      </div>

      {data.subjects.length > 1 && (
        <div className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <label htmlFor="cycle-subject" className="text-sm font-semibold text-ink">
            Revisar apenas a matéria:
          </label>
          <Select id="cycle-subject" wrapperClassName="sm:w-80" className="h-10 py-2 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Todas as matérias</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {view.queue.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CircleCheckBig}
            title={data.errors.length ? 'Nenhum erro pendente de revisão' : 'Nada para revisar ainda'}
            description={
              data.errors.length
                ? 'Todos os erros desta seleção estão superados. Continue resolvendo questões e registrando novas dificuldades.'
                : 'Registre seus erros para montar o seu Segundo Ciclo.'
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="min-w-0 space-y-6 xl:col-span-2">
            {(['alta', 'media'] as Priority[]).map((p) => {
              const list = p === 'alta' ? view.alta : view.media;
              return (
                <SectionCard
                  key={p}
                  title={PRIORITIES[p].label}
                  subtitle={p === 'alta' ? 'Erros persistentes e conteúdos ainda não dominados' : 'Compreendidos, mas que merecem reforço'}
                  icon={p === 'alta' ? Flame : RotateCcw}
                  action={
                    list.length > 0 && (
                      <Button size="sm" variant="outline" icon={Play} onClick={() => start(list)}>
                        Revisar {list.length}
                      </Button>
                    )
                  }
                >
                  {list.length ? (
                    <ul className="space-y-2.5">
                      {list.map((record, i) => (
                        <QueueItem key={record.id} record={record} lookup={data.lookup} onReview={() => start(list, i)} />
                      ))}
                    </ul>
                  ) : (
                    <EmptyState compact icon={CircleCheckBig} title="Nenhum erro nesta classificação" />
                  )}
                </SectionCard>
              );
            })}
          </div>

          <div className="min-w-0 space-y-6">
            <SectionCard title="Há mais tempo sem revisão" icon={Hourglass}>
              <ul className="space-y-2">
                {view.stale.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => start([record])}
                      className="w-full rounded-2xl px-2 py-2 text-left transition hover:bg-canvas"
                    >
                      <p className="line-clamp-1 text-sm font-medium text-ink">{record.description}</p>
                      <p className="text-[11px] text-ink-muted">
                        {PRIORITIES[record.priority].label} · {record.lastReviewedAt ? `revisado ${describeDaysSince(record.lastReviewedAt)}` : `nunca revisado (${daysSince(record.createdAt)} d)`}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Matérias com mais dificuldades" icon={BookOpen}>
              <DifficultyList groups={view.hardSubjects} linkFor={(g) => `/erros?materia=${g.id}&prioridade=alta,media`} />
            </SectionCard>
            <SectionCard title="Tópicos que precisam de atenção" icon={Target}>
              <DifficultyList showSubject groups={view.hardTopics} linkFor={(g) => `/erros?topico=${g.id}&prioridade=alta,media`} />
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
