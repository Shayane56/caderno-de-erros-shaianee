import { useEffect, useState, type FormEvent } from 'react';
import { Check, FilePlus2, Plus, Trash2 } from 'lucide-react';
import type { Question, QuestionFormat } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button, IconButton } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { FieldWrapper, Select, TextArea, TextInput } from '@/components/forms/Fields';
import { BANCAS, DIFFICULTY_LABELS, emptyQuestionInput, inputFromQuestion, LETTERS, MAX_OPTIONS, validateQuestionInput, type QuestionInput, type QuestionInputErrors } from '@/services/questions/questionModel';
import { createQuestion, updateQuestion } from '@/services/questions/questionService';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  question: Question | null;
  onClose: () => void;
}

/** Cadastro/edição de uma questão própria (de prova real ou criada por você). */
export function QuestionFormModal({ open, question, onClose }: Props) {
  const toast = useToast();
  const [values, setValues] = useState<QuestionInput>(emptyQuestionInput());
  const [errors, setErrors] = useState<QuestionInputErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(question ? inputFromQuestion(question) : emptyQuestionInput());
      setErrors({});
    }
  }, [open, question]);

  const set = <K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setFormat = (format: QuestionFormat) =>
    setValues((v) => ({ ...v, format, answer: null, options: format === 'multipla' ? (v.options.length ? v.options : ['', '', '', '', '']) : [] }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateQuestionInput(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      if (question) await updateQuestion(question.id, values);
      else await createQuestion(values);
      toast.success(question ? 'Questão atualizada' : 'Questão cadastrada', 'Ela já aparece no Banco de Questões.');
      onClose();
    } catch (error) {
      toast.error('Não foi possível salvar', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={question ? 'Editar questão' : 'Nova questão'}
      description="Cadastre questões de provas que você resolveu ou que você mesma criou."
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
          <FilePlus2 className="h-5 w-5" aria-hidden />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="question-form" icon={Check} loading={saving}>
            Salvar questão
          </Button>
        </>
      }
    >
      <form id="question-form" onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="field-label">Formato</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['multipla', 'Múltipla escolha'],
                ['certo_errado', 'Certo ou Errado'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={values.format === id}
                onClick={() => setFormat(id)}
                className={cn('rounded-2xl border p-3 text-sm font-semibold transition', values.format === id ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60')}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldWrapper id="q-banca" label="Banca" required error={errors.banca}>
            <TextInput id="q-banca" list="q-bancas" value={values.banca} invalid={!!errors.banca} onChange={(e) => set('banca', e.target.value)} placeholder="Ex.: FGV" />
            <datalist id="q-bancas">
              {BANCAS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </FieldWrapper>
          <FieldWrapper id="q-subject" label="Matéria" required error={errors.subject}>
            <TextInput id="q-subject" value={values.subject} invalid={!!errors.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Ex.: Saúde Pública" />
          </FieldWrapper>
          <FieldWrapper id="q-topic" label="Assunto" optional>
            <TextInput id="q-topic" value={values.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Ex.: Lei 8.080/1990" />
          </FieldWrapper>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <FieldWrapper id="q-year" label="Ano" optional error={errors.year}>
            <TextInput id="q-year" type="number" inputMode="numeric" value={values.year ?? ''} invalid={!!errors.year} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)} placeholder="2024" />
          </FieldWrapper>
          <FieldWrapper id="q-orgao" label="Órgão" optional>
            <TextInput id="q-orgao" value={values.orgao} onChange={(e) => set('orgao', e.target.value)} placeholder="Ex.: Prefeitura de X" />
          </FieldWrapper>
          <FieldWrapper id="q-cargo" label="Cargo" optional>
            <TextInput id="q-cargo" value={values.cargo} onChange={(e) => set('cargo', e.target.value)} placeholder="Ex.: Técnico" />
          </FieldWrapper>
          <FieldWrapper id="q-difficulty" label="Dificuldade">
            <Select id="q-difficulty" value={values.difficulty} onChange={(e) => set('difficulty', Number(e.target.value) as QuestionInput['difficulty'])}>
              {([1, 2, 3] as const).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <FieldWrapper id="q-support" label="Texto de apoio" optional hint="Texto, tabela ou situação-problema que acompanha a questão.">
          <TextArea id="q-support" rows={3} value={values.support} onChange={(e) => set('support', e.target.value)} />
        </FieldWrapper>
        <FieldWrapper id="q-statement" label={values.format === 'multipla' ? 'Enunciado' : 'Item (afirmação)'} required error={errors.statement}>
          <TextArea id="q-statement" rows={3} value={values.statement} invalid={!!errors.statement} onChange={(e) => set('statement', e.target.value)} />
        </FieldWrapper>

        {values.format === 'multipla' ? (
          <fieldset id="q-answer" tabIndex={-1} className="outline-none">
            <legend className="field-label">
              Alternativas e gabarito<span className="ml-0.5 text-rose-pink" aria-hidden>*</span>
              <span className="ml-1.5 text-xs font-normal text-ink-muted">— marque a correta</span>
            </legend>
            <ul className="space-y-2">
              {values.options.map((option, i) => (
                <li key={i} className="flex items-start gap-2">
                  <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-sm font-bold text-ink">
                    <input type="radio" name="q-correct" className="h-4 w-4 accent-rose-pink" checked={values.answer === i} onChange={() => set('answer', i)} aria-label={`Alternativa ${LETTERS[i]} é a correta`} />
                    {LETTERS[i]}
                  </label>
                  <TextArea
                    rows={1}
                    className="min-h-0"
                    aria-label={`Texto da alternativa ${LETTERS[i]}`}
                    value={option}
                    onChange={(e) => set('options', values.options.map((o, j) => (j === i ? e.target.value : o)))}
                  />
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    label={`Remover alternativa ${LETTERS[i]}`}
                    disabled={values.options.length <= 2}
                    onClick={() =>
                      setValues((v) => ({
                        ...v,
                        options: v.options.filter((_, j) => j !== i),
                        answer: typeof v.answer === 'number' ? (v.answer === i ? null : v.answer > i ? v.answer - 1 : v.answer) : v.answer,
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
            {values.options.length < MAX_OPTIONS && (
              <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => set('options', [...values.options, ''])}>
                Adicionar alternativa
              </Button>
            )}
            {(errors.options || errors.answer) && <p className="field-error">{errors.options ?? errors.answer}</p>}
          </fieldset>
        ) : (
          <fieldset id="q-answer" tabIndex={-1} className="outline-none">
            <legend className="field-label">
              Gabarito<span className="ml-0.5 text-rose-pink" aria-hidden>*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['C', 'Certo'],
                  ['E', 'Errado'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={values.answer === value}
                  onClick={() => set('answer', value)}
                  className={cn('rounded-2xl border p-3 text-sm font-bold transition', values.answer === value ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60')}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.answer && <p className="field-error">{errors.answer}</p>}
          </fieldset>
        )}

        <FieldWrapper id="q-explanation" label="Comentário / justificativa" optional hint="Por que o gabarito é esse? Aparece depois que você responde.">
          <TextArea id="q-explanation" rows={3} value={values.explanation} onChange={(e) => set('explanation', e.target.value)} />
        </FieldWrapper>
      </form>
    </Modal>
  );
}
