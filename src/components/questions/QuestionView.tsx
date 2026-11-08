import type { ReactNode } from 'react';
import { CircleCheck, CircleX, Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Question, QuestionAnswer } from '@/types';
import { DIFFICULTY_LABELS, LETTERS, answerLabel } from '@/services/questions/questionModel';
import { cn } from '@/utils/cn';

export function QuestionMeta({ question, extra }: { question: Question; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
      <span className="chip bg-blush text-rose-ink ring-petal">{question.banca}</span>
      {question.origin === 'banco' ? (
        <span className="chip bg-canvas text-ink-muted ring-line" title="Questão inédita escrita no estilo da banca">
          inédita · estilo {question.banca}
        </span>
      ) : (
        <span className="chip bg-sky-50 text-sky-700 ring-sky-200">
          minha{question.year ? ` · ${question.year}` : ''}
          {question.orgao ? ` · ${question.orgao}` : ''}
        </span>
      )}
      <span className="chip bg-canvas text-ink-muted ring-line">{DIFFICULTY_LABELS[question.difficulty]}</span>
      {extra}
    </div>
  );
}

interface QuestionViewProps {
  question: Question;
  /** Resposta escolhida (antes ou depois de responder). */
  chosen: QuestionAnswer | null;
  onChoose: (value: QuestionAnswer) => void;
  /** Já respondida: mostra gabarito e comentário. */
  answered: boolean;
  number?: number;
}

/** Enunciado, alternativas e, depois de responder, o gabarito comentado. */
export function QuestionView({ question, chosen, onChoose, answered, number }: QuestionViewProps) {
  const correct = answered && chosen === question.answer;
  return (
    <div className="space-y-4">
      {question.support && (
        <blockquote className="whitespace-pre-wrap break-words rounded-2xl border-l-4 border-rose-antique/60 bg-canvas p-4 text-[15px] leading-relaxed text-ink">{question.support}</blockquote>
      )}
      <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed text-ink sm:text-[17px]">
        {number !== undefined && <strong className="mr-1.5 text-rose-pink">{number}.</strong>}
        {question.statement}
      </p>

      {question.format === 'multipla' ? (
        <fieldset disabled={answered}>
          <legend className="sr-only">Alternativas</legend>
          <ul className="space-y-2">
            {question.options.map((option, i) => {
              const isAnswer = answered && question.answer === i;
              const isWrongChoice = answered && chosen === i && question.answer !== i;
              return (
                <li key={i}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition',
                      !answered && (chosen === i ? 'border-rose-medium bg-blush/50 ring-2 ring-inset ring-rose-medium/30' : 'border-line hover:border-rose-medium/60'),
                      isAnswer && 'border-emerald-300 bg-emerald-50/70',
                      isWrongChoice && 'border-red-300 bg-red-50/70',
                      answered && !isAnswer && !isWrongChoice && 'border-line opacity-70',
                      answered && 'cursor-default',
                    )}
                  >
                    <input type="radio" name={`q-${question.id}`} className="sr-only" checked={chosen === i} onChange={() => onChoose(i)} />
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        isAnswer ? 'bg-emerald-600 text-white' : isWrongChoice ? 'bg-red-600 text-white' : chosen === i ? 'bg-rose-pink text-white' : 'bg-canvas text-ink-muted',
                      )}
                      aria-hidden
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-[15px] leading-relaxed text-ink">{option}</span>
                    {isAnswer && <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="alternativa correta" />}
                    {isWrongChoice && <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="sua resposta" />}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Certo ou errado">
          {(
            [
              ['C', 'Certo', ThumbsUp],
              ['E', 'Errado', ThumbsDown],
            ] as const
          ).map(([value, label, Icon]) => {
            const isAnswer = answered && question.answer === value;
            const isWrongChoice = answered && chosen === value && question.answer !== value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={chosen === value}
                disabled={answered}
                onClick={() => onChoose(value)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl border text-[15px] font-bold transition',
                  !answered && (chosen === value ? 'border-rose-medium bg-blush/60 text-rose-ink ring-2 ring-inset ring-rose-medium/30' : 'border-line text-ink hover:border-rose-medium/60'),
                  isAnswer && 'border-emerald-300 bg-emerald-50/70 text-emerald-800',
                  isWrongChoice && 'border-red-300 bg-red-50/70 text-red-800',
                  answered && !isAnswer && !isWrongChoice && 'border-line text-ink-muted opacity-70',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <section className={cn('animate-slide-up rounded-3xl p-4 ring-1 sm:p-5', correct ? 'bg-emerald-50/70 ring-emerald-100' : 'bg-red-50/60 ring-red-200')} aria-live="polite">
          <p className={cn('flex items-center gap-2 font-bold', correct ? 'text-emerald-800' : 'text-red-800')}>
            {correct ? <CircleCheck className="h-5 w-5" aria-hidden /> : <CircleX className="h-5 w-5" aria-hidden />}
            {correct ? 'Você acertou!' : `Resposta errada. Gabarito: ${answerLabel(question.answer)}`}
          </p>
          {question.explanation && (
            <p className="mt-2 flex gap-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
              <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-rose-antique" aria-hidden />
              <span>{question.explanation}</span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
