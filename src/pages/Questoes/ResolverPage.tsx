import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCheck, NotebookPen, PartyPopper, RotateCcw, Shuffle } from 'lucide-react';
import type { Question, QuestionAnswer } from '@/types';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { useToast } from '@/components/common/Toast';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { QuestionMeta, QuestionView } from '@/components/questions/QuestionView';
import { useQuestionData } from '@/hooks/useQuestions';
import { filterQuestions, filtersFromParams } from '@/services/questions/filters';
import { answerQuestion, errorPrefillFromQuestion } from '@/services/questions/questionService';
import { answerLabel } from '@/services/questions/questionModel';
import { errorMessage } from '@/services/errors';
import { truncate } from '@/utils/text';
import { cn } from '@/utils/cn';

interface Result {
  chosen: QuestionAnswer;
  correct: boolean;
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable || !!document.querySelector('[role="dialog"]'));
}

/** Cada nova lista (filtros na URL) começa uma sessão nova. */
export default function ResolverRoute() {
  const { search } = useLocation();
  return <ResolverPage key={search} />;
}

function ResolverPage() {
  const data = useQuestionData();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { openCreate } = useErrorForm();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const shuffled = params.get('embaralhar') === '1';
  // A lista é "congelada" ao abrir: responder não tira questões da sessão (ex.: filtro "nunca resolvidas").
  const [ids, setIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<QuestionAnswer | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (data.loading || ids) return;
    let list = filterQuestions(data.questions, data.attempts, filters).map((q) => q.id);
    if (shuffled) list = shuffle(list);
    const start = params.get('inicio');
    const at = start ? list.indexOf(start) : -1;
    setIds(list);
    setIndex(at > 0 ? at : 0);
  }, [data, ids, filters, shuffled, params]);

  const byId = useMemo(() => new Map(data.questions.map((q) => [q.id, q])), [data.questions]);
  const question: Question | undefined = ids ? byId.get(ids[index]) : undefined;
  const result = question ? results[question.id] : undefined;
  const answered = !!result;

  useEffect(() => setChosen(result?.chosen ?? null), [question?.id, result?.chosen]);

  const respond = useCallback(async () => {
    if (!question || chosen === null || answered || saving) return;
    setSaving(true);
    try {
      const attempt = await answerQuestion(question, chosen);
      setResults((r) => ({ ...r, [question.id]: { chosen, correct: attempt.correct } }));
    } catch (error) {
      toast.error('Não foi possível registrar a resposta', errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [question, chosen, answered, saving, toast]);

  const next = useCallback(() => {
    if (!ids) return;
    if (index + 1 >= ids.length) setFinished(true);
    else setIndex(index + 1);
  }, [ids, index]);

  const registerError = useCallback(
    async (q: Question, choice: QuestionAnswer) => {
      try {
        openCreate(await errorPrefillFromQuestion(q, choice));
      } catch (error) {
        toast.error('Não foi possível preparar o registro', errorMessage(error));
      }
    },
    [openCreate, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || !question || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (answered) next();
        else void respond();
      } else if (!answered && question.format === 'multipla') {
        const i = 'ABCDEF'.indexOf(key);
        const n = Number(e.key) - 1;
        const pick = i >= 0 ? i : n >= 0 && n < 9 ? n : -1;
        if (pick >= 0 && pick < question.options.length) setChosen(pick);
      } else if (!answered && (key === 'C' || key === 'E')) setChosen(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, answered, next, respond]);

  if (data.loading || !ids) return <PageLoader />;

  const backTo = `/questoes?${(() => {
    const p = new URLSearchParams(params);
    p.delete('inicio');
    p.delete('embaralhar');
    return p.toString();
  })()}`;

  if (ids.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={CheckCheck} title="Nenhuma questão para resolver" description="Mude os filtros para montar uma nova lista." action={<Link to="/questoes" className="font-semibold text-rose-pink">Voltar ao Banco de Questões</Link>} />
      </div>
    );
  }

  const done = Object.keys(results).length;
  const correct = Object.values(results).filter((r) => r.correct).length;

  if (finished) {
    const wrong = ids.map((id) => byId.get(id)).filter((q): q is Question => !!q && results[q.id]?.correct === false);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blush to-petal text-rose-pink">
            <PartyPopper className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-semibold">Lista concluída!</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Você respondeu {done} de {ids.length} questão(ões) e acertou {correct}
            {done ? ` (${Math.round((correct / done) * 100)}%)` : ''}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate(backTo)}>Voltar ao Banco de Questões</Button>
            {wrong.length > 0 && (
              <Button variant="outline" icon={RotateCcw} onClick={() => navigate('/questoes/resolver?situacao=errei')}>
                Refazer as que errei
              </Button>
            )}
          </div>
        </div>
        {wrong.length > 0 && (
          <section className="card p-5" aria-label="Questões erradas">
            <h2 className="section-title mb-1 text-base">Leve os erros para o caderno</h2>
            <p className="mb-3 text-sm text-ink-muted">Registrar o porquê do erro é o que faz você não errar de novo.</p>
            <ul className="divide-y divide-line">
              {wrong.map((q) => (
                <li key={q.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-rose-antique">
                      {q.subject} › {q.topic || 'Geral'} · {q.banca}
                    </p>
                    <p className="text-sm text-ink">{truncate(q.statement, 140)}</p>
                  </div>
                  <Button size="sm" variant="secondary" icon={NotebookPen} onClick={() => void registerError(q, results[q.id].chosen)}>
                    Registrar erro
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (!question) {
    // Questão removida durante a sessão.
    return (
      <div className="card">
        <EmptyState icon={CheckCheck} title="Questão não encontrada" action={<Button onClick={next}>Próxima</Button>} />
      </div>
    );
  }

  const progress = ((index + (answered ? 1 : 0)) / ids.length) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-rose-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="sm:hidden">Voltar</span>
          <span className="hidden sm:inline">Banco de Questões</span>
        </Link>
        <div className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink-muted sm:gap-3">
          <span>
            <span className="hidden sm:inline">Questão </span>
            <span className="text-ink">{index + 1}</span> de {ids.length}
          </span>
          {done > 0 && (
            <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
              {correct}/{done} certas
            </span>
          )}
          {!shuffled && ids.length > 1 && (
            <button
              type="button"
              title="Embaralhar a ordem das questões"
              aria-label="Embaralhar a ordem das questões"
              className="rounded-xl p-2 text-ink-muted transition hover:bg-blush hover:text-rose-ink"
              onClick={() => {
                const p = new URLSearchParams(params);
                p.set('embaralhar', '1');
                p.delete('inicio');
                setParams(p, { replace: true });
              }}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-line" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={ids.length} aria-label="Progresso da lista">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-medium to-rose-pink transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <article className="card overflow-hidden" aria-label="Questão">
        <header className="border-b border-line bg-gradient-to-br from-surface to-blush/50 p-5 sm:px-7">
          <QuestionMeta question={question} />
          <p className="mt-2 text-sm font-semibold text-rose-antique">
            {question.subject} <span className="text-ink-soft">›</span> {question.topic || 'Geral'}
          </p>
        </header>
        <div className="p-5 sm:p-7">
          <QuestionView question={question} chosen={chosen} onChoose={setChosen} answered={answered} number={index + 1} />
        </div>
        <footer className="flex flex-col gap-2 border-t border-line bg-canvas/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Button variant="ghost" icon={ArrowLeft} disabled={index === 0} onClick={() => setIndex(index - 1)} className="hidden sm:inline-flex">
            Anterior
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {answered && !result.correct && (
              <Button variant="secondary" icon={NotebookPen} onClick={() => void registerError(question, result.chosen)}>
                Registrar no caderno de erros
              </Button>
            )}
            {answered ? (
              <Button iconRight={ArrowRight} onClick={next}>
                {index + 1 >= ids.length ? 'Ver resultado' : 'Próxima'}
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={next} className={cn(index + 1 >= ids.length && 'hidden')}>
                  Pular
                </Button>
                <Button icon={CheckCheck} disabled={chosen === null} loading={saving} onClick={() => void respond()}>
                  Responder
                </Button>
              </>
            )}
          </div>
        </footer>
      </article>
      <p className="text-center text-[11px] text-ink-soft">
        Atalhos: letras A–E (ou 1–5) escolhem · C/E nos itens Certo ou Errado · Enter responde e avança
        {answered && !result.correct ? ` · gabarito ${answerLabel(question.answer)}` : ''}
      </p>
    </div>
  );
}
