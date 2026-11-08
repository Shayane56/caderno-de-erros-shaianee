import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Flag,
  NotebookPen,
  Play,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { db } from "@/database/db";
import type { Question, QuestionAnswer, Simulado } from "@/types";
import { Button, IconButton } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/Spinner";
import { useToast } from "@/components/common/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { useErrorForm } from "@/components/modals/ErrorFormProvider";
import { Mascot } from "@/components/mimo/Mascot";
import { ProgressRing } from "@/components/mimo/ProgressRing";
import { QuestionFiltersPanel } from "@/components/questions/QuestionFiltersPanel";
import { QuestionView } from "@/components/questions/QuestionView";
import {
  QuestionWorkspace,
  SidePanel,
} from "@/components/questions/QuestionWorkspace";
import { useQuestionData } from "@/hooks/useQuestions";
import { useNow } from "@/hooks/useNow";
import {
  emptyQuestionFilters,
  filterQuestions,
  type QuestionFilters,
} from "@/services/questions/filters";
import { answerLabel, isCorrect } from "@/services/questions/questionModel";
import { errorPrefillFromQuestion } from "@/services/questions/questionService";
import {
  createSimulado,
  deleteSimulado,
  finishSimulado,
  saveSimuladoProgress,
  SIMULADO_SIZES,
  SIMULADO_TIMES,
} from "@/services/study/simuladoService";
import { formatClock } from "@/services/study/focusTimer";
import { errorMessage } from "@/services/errors";
import { formatDateTime } from "@/utils/dates";
import { truncate } from "@/utils/text";
import { cn } from "@/utils/cn";

export default function SimuladoPage() {
  const { id } = useParams();
  return id ? <SimuladoRun key={id} id={id} /> : <SimuladoSetup />;
}

/* ================================================================ Montar simulado */

function SimuladoSetup() {
  const data = useQuestionData();
  const navigate = useNavigate();
  const toast = useToast();
  const [filters, setFilters] = useState<QuestionFilters>(
    emptyQuestionFilters(),
  );
  const [size, setSize] = useState(20);
  const [time, setTime] = useState<number | null>(60);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Simulado | null>(null);
  const history =
    useLiveQuery(
      () => db.simulados.orderBy("createdAt").reverse().toArray(),
      [],
    ) ?? [];
  const pool = useMemo(
    () => filterQuestions(data.questions, data.attempts, filters),
    [data, filters],
  );

  if (data.loading) return <PageLoader />;

  const create = async () => {
    setCreating(true);
    try {
      const auto =
        filters.subject ||
        (filters.bancas.length === 1 ? filters.bancas[0] : "Geral");
      const sim = await createSimulado(pool, {
        size,
        timeLimitMin: time,
        title: title || `Simulado ${auto}`,
      });
      navigate(`/questoes/simulado/${sim.id}`);
    } catch (error) {
      toast.error("Não foi possível criar o simulado", errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Criar simulado"
        eyebrow="Treino de prova"
        icon={Target}
        subtitle="Questões sorteadas, cronômetro correndo e gabarito só no final, como no dia da prova."
      />

      <section
        className="card space-y-5 p-5 sm:p-6"
        aria-label="Configurar simulado"
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div>
            <label htmlFor="sim-title" className="field-label">
              Nome{" "}
              <span className="text-xs font-normal text-ink-soft">
                (opcional)
              </span>
            </label>
            <input
              id="sim-title"
              className="input"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Simulado de domingo"
            />
          </div>
          <fieldset>
            <legend className="field-label">Questões</legend>
            <div className="flex flex-wrap gap-1.5">
              {SIMULADO_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={size === n}
                  onClick={() => setSize(n)}
                  className={cn(
                    "h-11 min-w-11 rounded-2xl border px-3 text-sm font-bold transition",
                    size === n
                      ? "border-rose-medium bg-blush/60 text-rose-ink"
                      : "border-line text-ink hover:border-rose-medium/60",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="sim-time" className="field-label">
              Tempo
            </label>
            <select
              id="sim-time"
              className="input h-11 py-2"
              value={time ?? ""}
              onChange={(e) =>
                setTime(e.target.value ? Number(e.target.value) : null)
              }
            >
              {SIMULADO_TIMES.map((t) => (
                <option key={t.label} value={t.min ?? ""}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-ink-muted">
          Escolha abaixo de quais matérias, assuntos e bancas sortear:{" "}
          <strong className="text-ink">{pool.length}</strong> questão(ões)
          disponível(is)
          {pool.length < size ? ` — o simulado terá ${pool.length}.` : "."}
        </p>
        <div className="flex justify-end">
          <Button
            size="lg"
            icon={Play}
            loading={creating}
            disabled={pool.length === 0}
            onClick={() => void create()}
          >
            Começar simulado
          </Button>
        </div>
      </section>

      <QuestionFiltersPanel
        filters={filters}
        onChange={setFilters}
        questions={data.questions}
      />

      {history.length > 0 && (
        <section className="card p-5 sm:p-6" aria-label="Meus simulados">
          <h2 className="section-title mb-3 text-base">Meus simulados</h2>
          <ul className="divide-y divide-line">
            {history.map((s) => {
              const pct = s.finishedAt
                ? Math.round((s.correct / s.questionIds.length) * 100)
                : null;
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <Link
                    to={`/questoes/simulado/${s.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-bold text-ink">
                      {s.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDateTime(s.createdAt)} · {s.questionIds.length}{" "}
                      questões · {formatClock(s.elapsedMs)}
                    </p>
                  </Link>
                  {pct === null ? (
                    <span className="chip bg-lilac text-lilac-deep ring-lilac">
                      em andamento
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "chip",
                        pct >= 70
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : pct >= 50
                            ? "bg-amber-50 text-amber-800 ring-amber-200"
                            : "bg-red-50 text-red-700 ring-red-200",
                      )}
                    >
                      {pct}%
                    </span>
                  )}
                  <IconButton
                    size="sm"
                    icon={Trash2}
                    tone="danger"
                    label={`Excluir ${s.title}`}
                    onClick={() => setToDelete(s)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir este simulado?"
        description="O resultado sai da lista. As respostas continuam contando nas suas estatísticas."
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (toDelete) await deleteSimulado(toDelete.id);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ================================================================ Fazer o simulado */

function SimuladoRun({ id }: { id: string }) {
  const data = useQuestionData();
  const simulado = useLiveQuery(
    async () => (await db.simulados.get(id)) ?? null,
    [id],
  );
  const byId = useMemo(
    () => new Map(data.questions.map((q) => [q.id, q])),
    [data.questions],
  );

  if (simulado === undefined || data.loading) return <PageLoader />;
  if (simulado === null) {
    return (
      <div className="card">
        <EmptyState
          icon={Target}
          title="Simulado não encontrado"
          action={
            <Link
              to="/questoes/simulado"
              className="font-semibold text-rose-pink"
            >
              Criar um simulado
            </Link>
          }
        />
      </div>
    );
  }
  return simulado.finishedAt ? (
    <SimuladoResult simulado={simulado} byId={byId} />
  ) : (
    <SimuladoInProgress simulado={simulado} byId={byId} />
  );
}

function SimuladoInProgress({
  simulado,
  byId,
}: {
  simulado: Simulado;
  byId: Map<string, Question>;
}) {
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(
    simulado.answers,
  );
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      simulado.questionIds.findIndex((q) => simulado.answers[q] === undefined),
    ),
  );
  const [openedAt] = useState(() => Date.now());
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const now = useNow(1000).getTime();
  const elapsed = simulado.elapsedMs + (now - openedAt);
  const limitMs = simulado.timeLimitMin ? simulado.timeLimitMin * 60_000 : null;
  const remaining = limitMs ? Math.max(0, limitMs - elapsed) : null;
  const ids = simulado.questionIds;
  const question = byId.get(ids[index]);
  const answeredCount = ids.filter((q) => answers[q] !== undefined).length;
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      await finishSimulado(
        simulado.id,
        answers,
        simulado.elapsedMs + (Date.now() - openedAt),
        byId,
      );
    } catch (error) {
      finishedRef.current = false;
      toast.error("Não foi possível finalizar", errorMessage(error));
    } finally {
      setFinishing(false);
    }
  }, [simulado, answers, openedAt, byId, toast]);

  // Tempo esgotado: encerra sozinho.
  useEffect(() => {
    if (remaining === 0) {
      toast.info("Tempo esgotado!", "O simulado foi encerrado e corrigido.");
      void finish();
    }
  }, [remaining, finish, toast]);

  // Guarda o andamento (respostas e tempo) para poder continuar depois.
  useEffect(() => {
    const id = window.setTimeout(
      () =>
        void saveSimuladoProgress(
          simulado.id,
          answers,
          simulado.elapsedMs + (Date.now() - openedAt),
        ),
      400,
    );
    return () => window.clearTimeout(id);
  }, [answers, simulado.id, simulado.elapsedMs, openedAt]);
  useEffect(() => {
    const save = () =>
      void saveSimuladoProgress(
        simulado.id,
        answers,
        simulado.elapsedMs + (Date.now() - openedAt),
      );
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [answers, simulado.id, simulado.elapsedMs, openedAt]);

  if (!question) {
    return (
      <div className="card">
        <EmptyState
          icon={Target}
          title="Questão indisponível"
          description="Ela pode ter sido excluída."
          action={
            <Button
              onClick={() => setIndex((i) => Math.min(ids.length - 1, i + 1))}
            >
              Próxima
            </Button>
          }
        />
      </div>
    );
  }

  const choose = (value: QuestionAnswer) =>
    setAnswers((a) => ({ ...a, [question.id]: value }));

  return (
    <>
      <QuestionWorkspace
        backTo="/questoes/simulado"
        backLabel="Simulados"
        index={index}
        total={ids.length}
        progressPct={(answeredCount / ids.length) * 100}
        clock={
          remaining !== null ? formatClock(remaining) : formatClock(elapsed)
        }
        clockWarn={remaining !== null && remaining < 5 * 60_000}
        question={question}
        chosen={answers[question.id] ?? null}
        onChoose={choose}
        answered={false}
        headerExtra={
          <span className="chip bg-lilac text-lilac-deep ring-lilac">
            {simulado.title}
          </span>
        }
        side={
          <SidePanel title="Progresso">
            <p className="text-sm font-bold text-ink">
              {answeredCount} / {ids.length} marcadas
            </p>
            <ul
              className="mt-3 grid grid-cols-6 gap-1.5"
              aria-label="Questões do simulado"
            >
              {ids.map((qid, i) => (
                <li key={qid}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ir para a questão ${i + 1}${answers[qid] !== undefined ? " (marcada)" : ""}`}
                    className={cn(
                      "h-8 w-full rounded-xl text-xs font-bold transition",
                      i === index
                        ? "bg-rose-pink text-white"
                        : answers[qid] !== undefined
                          ? "bg-lilac text-lilac-deep"
                          : "bg-canvas text-ink-muted hover:bg-blush",
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ul>
            <Button
              block
              variant="secondary"
              icon={Flag}
              className="mt-4"
              onClick={() => setConfirmFinish(true)}
            >
              Finalizar simulado
            </Button>
          </SidePanel>
        }
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              icon={ArrowLeft}
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              Anterior
            </Button>
            {index + 1 < ids.length ? (
              <Button
                iconRight={ArrowRight}
                onClick={() => setIndex(index + 1)}
              >
                Próxima
              </Button>
            ) : (
              <Button icon={Flag} onClick={() => setConfirmFinish(true)}>
                Finalizar
              </Button>
            )}
          </div>
        }
      />
      <ConfirmDialog
        open={confirmFinish}
        title="Finalizar o simulado?"
        description={
          answeredCount < ids.length
            ? `Você deixou ${ids.length - answeredCount} questão(ões) em branco: elas contam como erradas. Depois de finalizar, o gabarito é revelado.`
            : "Depois de finalizar, o gabarito comentado é revelado."
        }
        confirmLabel="Finalizar e ver resultado"
        tone="primary"
        loading={finishing}
        onConfirm={async () => {
          await finish();
          setConfirmFinish(false);
        }}
        onCancel={() => setConfirmFinish(false)}
      />
    </>
  );
}

/* ================================================================ Resultado */

function SimuladoResult({
  simulado,
  byId,
}: {
  simulado: Simulado;
  byId: Map<string, Question>;
}) {
  const { openCreate } = useErrorForm();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const total = simulado.questionIds.length;
  const pct = Math.round((simulado.correct / total) * 100);
  const blank = simulado.questionIds.filter(
    (q) => simulado.answers[q] === undefined,
  ).length;

  const bySubject = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const qid of simulado.questionIds) {
      const q = byId.get(qid);
      if (!q) continue;
      const entry = map.get(q.subject) ?? { total: 0, correct: 0 };
      entry.total++;
      const a = simulado.answers[qid];
      if (a !== undefined && isCorrect(q, a)) entry.correct++;
      map.set(q.subject, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [simulado, byId]);

  const registerError = async (q: Question, chosen: QuestionAnswer | null) => {
    try {
      openCreate(await errorPrefillFromQuestion(q, chosen));
    } catch (error) {
      toast.error("Não foi possível preparar o registro", errorMessage(error));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/questoes/simulado"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Simulados
      </Link>
      <section
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lilac via-surface to-blush p-6 shadow-soft ring-1 ring-line/80 sm:p-8"
        aria-label="Resultado"
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <ProgressRing
            value={pct}
            size={150}
            stroke={14}
            label={`${pct}% de acertos`}
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-antique">
              {simulado.title}
            </p>
            <h1 className="mt-1 font-display text-[28px] font-extrabold leading-tight text-ink">
              {pct >= 70
                ? "Mandou muito bem!"
                : pct >= 50
                  ? "Bom resultado, dá pra subir!"
                  : "Cada erro aqui é um acerto na prova!"}
            </h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              {simulado.correct} de {total} acertos ·{" "}
              {blank ? `${blank} em branco · ` : ""}tempo{" "}
              {formatClock(simulado.elapsedMs)}
            </p>
          </div>
          <Mascot
            pose={pct >= 70 ? "cheer" : "heart"}
            className="h-32 w-32 shrink-0"
          />
        </div>
      </section>

      {bySubject.length > 1 && (
        <section className="card p-5" aria-label="Desempenho por matéria">
          <h2 className="section-title mb-3 flex items-center gap-2 text-base">
            <Trophy className="h-[18px] w-[18px] text-rose-pink" aria-hidden />{" "}
            Por matéria
          </h2>
          <ul className="space-y-2">
            {bySubject.map(([subject, v]) => (
              <li
                key={subject}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-semibold text-ink">{subject}</span>
                <span className="text-ink-muted">
                  {v.correct}/{v.total} ·{" "}
                  {Math.round((v.correct / v.total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4 sm:p-5" aria-label="Gabarito comentado">
        <h2 className="section-title mb-2 text-base">Gabarito comentado</h2>
        <ul className="divide-y divide-line">
          {simulado.questionIds.map((qid, i) => {
            const q = byId.get(qid);
            if (!q) return null;
            const chosen = simulado.answers[qid];
            const ok = chosen !== undefined && isCorrect(q, chosen);
            const expanded = open === qid;
            return (
              <li key={qid} className="py-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : qid)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-canvas"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      ok
                        ? "bg-emerald-600"
                        : chosen === undefined
                          ? "bg-ink-soft"
                          : "bg-red-600",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {truncate(q.statement, 120)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      Você:{" "}
                      {chosen === undefined ? "em branco" : answerLabel(chosen)}{" "}
                      · gabarito {answerLabel(q.answer)}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-soft transition",
                      expanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {expanded && (
                  <div className="space-y-3 px-2 pb-3 pt-2">
                    <QuestionView
                      question={q}
                      chosen={chosen ?? null}
                      onChoose={() => {}}
                      answered
                    />
                    {!ok && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={NotebookPen}
                        onClick={() => void registerError(q, chosen ?? null)}
                      >
                        Registrar no caderno de erros
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
