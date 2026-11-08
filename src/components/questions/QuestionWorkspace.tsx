import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, NotebookPen, Timer } from 'lucide-react';
import type { Question, QuestionAnswer } from '@/types';
import { useQuestionNote } from '@/services/study/notesService';
import { DIFFICULTY_LABELS } from '@/services/questions/questionModel';
import { cn } from '@/utils/cn';
import { QuestionView } from './QuestionView';
import { CalculatorDialog, MimoTip, NotesDialog, tipSeed } from './QuestionTools';

interface Props {
  backTo: string;
  backLabel: string;
  index: number;
  total: number;
  progressPct: number;
  clock: string | null;
  clockWarn?: boolean;
  question: Question;
  chosen: QuestionAnswer | null;
  onChoose: (value: QuestionAnswer) => void;
  answered: boolean;
  footer: ReactNode;
  side: ReactNode;
  extraTools?: ReactNode;
  headerExtra?: ReactNode;
}

function ToolButton({ icon: Icon, label, onClick, active }: { icon: typeof Timer; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition',
        active ? 'bg-blush text-rose-ink' : 'bg-surface text-ink-muted shadow-soft ring-1 ring-line/80 hover:text-rose-ink',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </button>
  );
}

/** Tela de questão no estilo Mimo: ferramentas, questão e painel lateral. */
export function QuestionWorkspace(props: Props) {
  const { question } = props;
  const [notesOpen, setNotesOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const note = useQuestionNote(question.id);

  const tools = (
    <>
      <ToolButton icon={NotebookPen} label={note ? 'Anotações •' : 'Anotações'} active={!!note} onClick={() => setNotesOpen(true)} />
      <ToolButton icon={Calculator} label="Calculadora" onClick={() => setCalcOpen(true)} />
      {props.extraTools}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="card flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <Link to={props.backTo} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-blush hover:text-rose-ink" aria-label={`Voltar para ${props.backLabel}`}>
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <p className="shrink-0 text-sm font-bold text-ink">
          <span className="hidden sm:inline">Questão </span>
          {props.index + 1} de {props.total}
        </p>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-lilac" role="progressbar" aria-valuenow={props.index + 1} aria-valuemin={1} aria-valuemax={props.total} aria-label="Progresso">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-medium to-rose-pink transition-all duration-500" style={{ width: `${props.progressPct}%` }} />
        </div>
        {props.clock && (
          <p className={cn('flex shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums', props.clockWarn ? 'text-red-600' : 'text-ink')} aria-label="Tempo">
            <Timer className="h-4 w-4" aria-hidden /> {props.clock}
          </p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">{tools}</div>

      <div className="grid gap-4 lg:grid-cols-[76px_minmax(0,1fr)] xl:grid-cols-[76px_minmax(0,1fr)_250px]">
        <div className="hidden flex-col gap-2 lg:flex">{tools}</div>

        <article className="card min-w-0 overflow-hidden" aria-label="Questão">
          <div className="p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="chip bg-blush px-3 py-1 text-rose-ink ring-petal">{question.subject}</span>
              <span className="chip bg-lilac px-3 py-1 text-lilac-deep ring-lilac">{DIFFICULTY_LABELS[question.difficulty]}</span>
              <span className="chip bg-canvas px-3 py-1 text-ink-muted ring-line">
                {question.origin === 'banco' ? `inédita · estilo ${question.banca}` : [question.banca, question.year, question.orgao].filter(Boolean).join(' · ')}
              </span>
              {question.topic && <span className="text-xs font-semibold text-ink-muted">› {question.topic}</span>}
              {props.headerExtra}
            </div>
            <QuestionView question={question} chosen={props.chosen} onChoose={props.onChoose} answered={props.answered} number={props.index + 1} />
          </div>
          <footer className="border-t border-line bg-canvas/40 p-4 sm:px-7">{props.footer}</footer>
        </article>

        <div className="space-y-4 lg:col-start-2 xl:col-start-auto">
          {props.side}
          <MimoTip seed={tipSeed(question.id)} />
        </div>
      </div>

      <NotesDialog open={notesOpen} onClose={() => setNotesOpen(false)} questionId={question.id} />
      <CalculatorDialog open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}

export function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4" aria-label={title}>
      <h2 className="font-display text-[15px] font-extrabold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
