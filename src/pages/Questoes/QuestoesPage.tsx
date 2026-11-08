import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookCheck, ClipboardPaste, Download, FileQuestion, ListChecks, Pencil, Play, Plus, Target, Trash2, Upload, XCircle } from 'lucide-react';
import type { Question } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/Toast';
import { StatCard } from '@/components/cards/StatCard';
import { QuestionFiltersPanel } from '@/components/questions/QuestionFiltersPanel';
import { QuestionMeta } from '@/components/questions/QuestionView';
import { QuestionFormModal } from '@/components/questions/QuestionFormModal';
import { PasteExamModal } from '@/components/questions/PasteExamModal';
import { useQuestionData } from '@/hooks/useQuestions';
import { filterQuestions, filtersFromParams, filtersToParams, lastAttempts, performanceBySubject, type QuestionFilters } from '@/services/questions/filters';
import { deleteQuestion } from '@/services/questions/questionService';
import { exportMyQuestions, importQuestionsFile } from '@/services/questions/questionShare';
import { errorMessage } from '@/services/errors';
import { downloadText, readFileAsText } from '@/utils/download';
import { THEME } from '@/constants/theme';
import { truncate } from '@/utils/text';
import { cn } from '@/utils/cn';

const PAGE = 30;

export default function QuestoesPage() {
  const data = useQuestionData();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const [limit, setLimit] = useState(PAGE);
  const [form, setForm] = useState<{ question: Question | null } | null>(null);
  const [pasting, setPasting] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const view = useMemo(() => {
    const filtered = filterQuestions(data.questions, data.attempts, filters);
    const last = lastAttempts(data.attempts);
    const answered = data.questions.filter((q) => last.has(q.id)).length;
    const wrong = data.questions.filter((q) => last.get(q.id)?.correct === false).length;
    const total = data.attempts.length;
    const correct = data.attempts.filter((a) => a.correct).length;
    return {
      filtered,
      last,
      answered,
      wrong,
      pct: total ? Math.round((correct / total) * 100) : null,
      bySubject: performanceBySubject(data.attempts),
      mine: data.questions.filter((q) => q.origin === 'minha').length,
    };
  }, [data, filters]);

  if (data.loading) return <PageLoader />;

  const setFilters = (next: QuestionFilters) => {
    setLimit(PAGE);
    setParams(filtersToParams(next), { replace: true });
  };
  const solve = (startId?: string) => {
    const p = filtersToParams(filters);
    if (startId) p.set('inicio', startId);
    navigate(`/questoes/resolver?${p.toString()}`);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importQuestionsFile(await readFileAsText(file));
      toast.success(`${result.created} questão(ões) importada(s)`, result.skipped ? `${result.skipped} já existiam ou eram inválidas.` : undefined);
    } catch (error) {
      toast.error('Não foi possível importar', errorMessage(error));
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const onExport = async () => {
    const { fileName, content, count } = await exportMyQuestions();
    if (!count) {
      toast.info('Você ainda não cadastrou questões próprias', 'As questões do banco do app já estão disponíveis para todo mundo.');
      return;
    }
    downloadText(fileName, content);
    toast.success(`${count} questão(ões) exportada(s)`, 'Envie o arquivo para quem quiser: é só importar no Banco de Questões.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banco de Questões"
        eyebrow="Resolva, erre, aprenda"
        icon={ListChecks}
        subtitle="Questões inéditas no estilo das principais bancas, mais as que você cadastrar. Errou? O registro no caderno já vem preenchido."
        actions={
          <>
            <Button variant="outline" icon={ClipboardPaste} onClick={() => setPasting(true)}>
              Colar prova
            </Button>
            <Button variant="secondary" icon={Plus} onClick={() => setForm({ question: null })}>
              Nova questão
            </Button>
            <Button icon={Play} disabled={view.filtered.length === 0} onClick={() => solve()}>
              Resolver ({view.filtered.length})
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Questões disponíveis" value={data.questions.length} icon={FileQuestion} hint={`${data.questions.length - view.mine} do banco · ${view.mine} minhas`} />
        <StatCard label="Já resolvidas" value={view.answered} icon={BookCheck} accent={THEME.antique} hint={`${data.attempts.length} resposta(s) no total`} />
        <StatCard label="Acerto geral" value={view.pct === null ? '—' : `${view.pct}%`} icon={Target} accent="#15803D" hint="considerando todas as respostas" />
        <StatCard
          label="Para refazer"
          value={view.wrong}
          icon={XCircle}
          accent="#DC2626"
          hint={view.wrong ? 'última resposta errada' : 'nenhuma pendente'}
          to={view.wrong ? '/questoes?situacao=errei' : undefined}
        />
      </div>

      {view.bySubject.length > 0 && (
        <section className="card p-4 sm:p-5" aria-label="Desempenho por matéria">
          <h2 className="section-title mb-3 text-base">Desempenho por matéria</h2>
          <ul className="space-y-2.5">
            {view.bySubject.map((s) => (
              <li key={s.subject} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[14rem_minmax(0,1fr)_7rem]">
                <span className="truncate text-sm font-medium text-ink">{s.subject}</span>
                <span className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-canvas sm:order-none sm:col-span-1">
                  <span className={cn('block h-full rounded-full', s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${s.pct}%` }} />
                </span>
                <span className="text-right text-xs font-semibold text-ink-muted">
                  {s.pct}% · {s.correct}/{s.answered}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <QuestionFiltersPanel filters={filters} onChange={setFilters} questions={data.questions} />

      <section className="card p-4 sm:p-5" aria-label="Questões">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">
            {view.filtered.length} questão(ões) {view.filtered.length !== data.questions.length && <span className="font-normal text-ink-muted">de {data.questions.length}</span>}
          </p>
          <div className="flex gap-1">
            <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Importar arquivo de questões" tabIndex={-1} onChange={(e) => void onImport(e.target.files?.[0])} />
            <Button size="sm" variant="ghost" icon={Upload} onClick={() => importRef.current?.click()}>
              Importar
            </Button>
            <Button size="sm" variant="ghost" icon={Download} onClick={() => void onExport()}>
              Exportar minhas
            </Button>
          </div>
        </div>
        {view.filtered.length === 0 ? (
          <EmptyState compact icon={FileQuestion} title="Nenhuma questão com esses filtros" description="Tente outra combinação ou limpe os filtros." />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {view.filtered.slice(0, limit).map((q) => {
                const last = view.last.get(q.id);
                return (
                  <li key={q.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => solve(q.id)} className="min-w-0 flex-1 rounded-2xl p-1 text-left transition hover:bg-canvas">
                      <QuestionMeta
                        question={q}
                        extra={
                          last ? (
                            <span className={cn('chip', last.correct ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>{last.correct ? 'acertei' : 'errei'}</span>
                          ) : null
                        }
                      />
                      <p className="mt-1.5 text-xs font-semibold text-rose-antique">
                        {q.subject} <span className="text-ink-soft">›</span> {q.topic || 'Geral'}
                      </p>
                      <p className="mt-0.5 text-sm text-ink">{truncate(q.statement, 180)}</p>
                    </button>
                    <div className="flex shrink-0 justify-end gap-0.5">
                      <Button size="sm" variant="secondary" icon={Play} onClick={() => solve(q.id)}>
                        Resolver
                      </Button>
                      {q.origin === 'minha' && (
                        <>
                          <IconButton size="sm" icon={Pencil} label="Editar questão" onClick={() => setForm({ question: q })} />
                          <IconButton size="sm" icon={Trash2} tone="danger" label="Excluir questão" onClick={() => setToDelete(q)} />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {view.filtered.length > limit && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                  Mostrar mais ({view.filtered.length - limit})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <QuestionFormModal open={!!form} question={form?.question ?? null} onClose={() => setForm(null)} />
      <PasteExamModal open={pasting} onClose={() => setPasting(false)} />
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir esta questão?"
        description="A questão e as suas respostas a ela serão apagadas. Erros já registrados no caderno não são afetados."
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteQuestion(toDelete.id);
          toast.success('Questão excluída');
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
