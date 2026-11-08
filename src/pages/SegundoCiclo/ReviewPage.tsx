import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheckBig, Eye, FileQuestion, Flame, PartyPopper, RotateCcw, ShieldCheck, SkipForward, StickyNote } from 'lucide-react';
import type { Priority } from '@/types';
import { useCatalog, useErrorRecord } from '@/hooks/useData';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { OriginBadge, PriorityBadge } from '@/components/common/Badges';
import { useToast } from '@/components/common/Toast';
import { PRIORITIES } from '@/constants/priorities';
import { registerReview } from '@/services/errorService';
import { errorMessage } from '@/services/errors';
import { describeDaysSince } from '@/utils/dates';

export interface ReviewSessionState {
  queue: string[];
  index: number;
  results: Array<{ id: string; after: Priority }>;
}

function SessionSummary({ results, onBack }: { results: ReviewSessionState['results']; onBack: () => void }) {
  const count = (p: Priority) => results.filter((r) => r.after === p).length;
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal text-rose-pink">
          <PartyPopper className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold">Revisão concluída!</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Você revisou {results.length} erro{results.length === 1 ? '' : 's'} nesta sessão. Cada revisão fortalece a memória para o dia da prova.
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-2">
          {(['alta', 'media', 'superado'] as Priority[]).map((p) => (
            <div key={p} className="rounded-2xl bg-canvas p-3">
              <dt className="text-[11px] font-semibold text-ink-muted">{PRIORITIES[p].shortLabel}</dt>
              <dd className="text-2xl font-bold text-ink">{count(p)}</dd>
            </div>
          ))}
        </dl>
        <Button className="mt-6" onClick={onBack}>
          Voltar ao Segundo Ciclo
        </Button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const record = useErrorRecord(id);
  const { lookup } = useCatalog();
  const session = (location.state as ReviewSessionState | null) ?? (id ? { queue: [id], index: 0, results: [] } : null);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState<ReviewSessionState['results'] | null>(null);
  const [lastId, setLastId] = useState(id);

  if (id !== lastId) {
    setLastId(id);
    setRevealed(false);
  }

  if (finished) return <SessionSummary results={finished} onBack={() => navigate('/segundo-ciclo')} />;
  if (record === undefined) return <PageLoader />;
  if (record === null || !session) {
    return (
      <div className="card">
        <EmptyState
          icon={FileQuestion}
          title="Registro não encontrado"
          action={
            <Link to="/segundo-ciclo" className="font-semibold text-rose-pink">
              Voltar ao Segundo Ciclo
            </Link>
          }
        />
      </div>
    );
  }

  const goNext = (results: ReviewSessionState['results']) => {
    const nextIndex = session.index + 1;
    if (nextIndex >= session.queue.length) {
      if (results.length) setFinished(results);
      else navigate('/segundo-ciclo');
      return;
    }
    const state: ReviewSessionState = { queue: session.queue, index: nextIndex, results };
    navigate(`/segundo-ciclo/revisar/${session.queue[nextIndex]}`, { state, replace: true });
  };

  const decide = async (after: Priority) => {
    setSaving(true);
    try {
      await registerReview(record.id, after);
      toast.success(
        after === 'superado' ? 'Erro marcado como superado 🎉' : 'Revisão registrada',
        after === 'superado' ? 'Ele continua salvo no seu histórico.' : `Classificação: ${PRIORITIES[after].label}.`,
      );
      goNext([...session.results, { id: record.id, after }]);
    } catch (error) {
      toast.error('Não foi possível registrar a revisão', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const subject = lookup.subjects.get(record.subjectId)?.name ?? 'Matéria removida';
  const topic = lookup.topics.get(record.topicId)?.name ?? 'Tópico removido';
  const total = session.queue.length;
  const progress = ((session.index + (revealed ? 0.5 : 0)) / total) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/segundo-ciclo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Segundo Ciclo
        </Link>
        {total > 1 && (
          <p className="text-sm font-semibold text-ink-muted">
            Erro <span className="text-ink">{session.index + 1}</span> de {total}
          </p>
        )}
      </div>
      {total > 1 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-line" role="progressbar" aria-valuenow={session.index + 1} aria-valuemin={1} aria-valuemax={total} aria-label="Progresso da revisão">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-medium to-rose-pink transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      <article className="card overflow-hidden" aria-label="Revisão do erro">
        <header className="border-b border-line bg-gradient-to-br from-white to-blush/60 p-5 sm:p-7">
          <p className="text-sm font-semibold text-rose-antique">
            {subject} <span className="text-ink-soft">›</span> {topic}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={record.priority} />
            <OriginBadge origin={record.origin} />
            <span className="text-xs text-ink-muted">
              {record.lastReviewedAt ? `Última revisão ${describeDaysSince(record.lastReviewedAt)}` : 'Primeira revisão'} · {record.reviewCount} revis
              {record.reviewCount === 1 ? 'ão' : 'ões'}
            </span>
          </div>
        </header>
        <div className="space-y-5 p-5 sm:p-7">
          <section>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-rose-antique">Descrição do erro</h2>
            <p className="whitespace-pre-wrap break-words font-display text-xl leading-snug text-ink sm:text-[22px]">{record.description}</p>
          </section>
          {record.reference && (
            <section className="rounded-2xl bg-canvas p-4">
              <h2 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-antique">
                <FileQuestion className="h-3.5 w-3.5" aria-hidden /> Questão de referência
              </h2>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{record.reference}</p>
            </section>
          )}

          {!revealed ? (
            <div className="rounded-3xl border-2 border-dashed border-petal bg-blush/30 p-6 text-center">
              <p className="text-sm text-ink-muted">Antes de ver a resposta, tente lembrar a correção e como evitar este erro.</p>
              <Button size="lg" className="mt-4" icon={Eye} onClick={() => setRevealed(true)}>
                Revelar correção
              </Button>
            </div>
          ) : (
            <div className="animate-slide-up space-y-4">
              <section className="rounded-3xl bg-emerald-50/70 p-5 ring-1 ring-emerald-100" aria-label="Correção">
                <h2 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <CircleCheckBig className="h-3.5 w-3.5" aria-hidden /> Correção ou entendimento correto
                </h2>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{record.correction || '—'}</p>
              </section>
              <section className="rounded-3xl bg-blush/50 p-5 ring-1 ring-petal">
                <h2 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-ink">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Como evitar
                </h2>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{record.prevention || '—'}</p>
              </section>
              {record.notes && (
                <section className="rounded-3xl bg-canvas p-5">
                  <h2 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-antique">
                    <StickyNote className="h-3.5 w-3.5" aria-hidden /> Observações
                  </h2>
                  <p className="whitespace-pre-wrap break-words text-sm text-ink">{record.notes}</p>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-line bg-canvas/50 p-5 sm:p-7">
          {revealed ? (
            <>
              <p className="mb-3 text-sm font-semibold text-ink">Como você se saiu nesta revisão?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="outline" className="h-auto min-h-12 whitespace-normal border-red-200 py-2.5 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700" icon={Flame} disabled={saving} onClick={() => void decide('alta')}>
                  {record.priority === 'alta' ? 'Manter como prioridade alta' : 'Voltar para prioridade alta'}
                </Button>
                <Button variant="outline" className="h-auto min-h-12 whitespace-normal border-amber-200 py-2.5 text-amber-800 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800" icon={RotateCcw} disabled={saving} onClick={() => void decide('media')}>
                  {record.priority === 'media' ? 'Manter como prioridade média' : 'Alterar para prioridade média'}
                </Button>
                <Button variant="success" className="h-auto min-h-12 whitespace-normal py-2.5" icon={CircleCheckBig} disabled={saving} onClick={() => void decide('superado')}>
                  Marcar como superado
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              {total > 1 && (
                <Button variant="ghost" icon={SkipForward} onClick={() => goNext(session.results)}>
                  Pular este erro
                </Button>
              )}
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}
