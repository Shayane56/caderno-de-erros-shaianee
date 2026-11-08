import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, FolderPlus, Plus } from 'lucide-react';
import type { ErrorInput } from '@/types';
import { useCatalog } from '@/hooks/useData';
import { createSubject } from '@/services/subjectService';
import { createTopic } from '@/services/topicService';
import { DuplicateError } from '@/services/errors';
import { hasValidationErrors, validateErrorInput, type ErrorInputField, type ValidationErrors } from '@/utils/validation';
import { sameName } from '@/utils/text';
import { formatDate, formatDateTime } from '@/utils/dates';
import { FieldWrapper, Select, TextArea, TextInput } from './Fields';
import { InlineCreator } from './InlineCreator';
import { OriginPicker, PriorityPicker } from './ClassificationPickers';

export const FIELD_ORDER: ErrorInputField[] = [
  'subjectId',
  'topicId',
  'description',
  'correction',
  'prevention',
  'priority',
  'origin',
  'reference',
  'notes',
];

interface ErrorFormProps {
  formId: string;
  initial: ErrorInput;
  /** Data de registro (edição). Em novos registros a data é automática. */
  createdAt?: string;
  onSubmit: (values: ErrorInput) => Promise<'reset' | 'close' | void>;
  onDirtyChange?: (dirty: boolean) => void;
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-rose-antique">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blush text-xs text-rose-pink">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ErrorForm({ formId, initial, createdAt, onSubmit, onDirtyChange }: ErrorFormProps) {
  const { subjects, topics } = useCatalog();
  const [values, setValues] = useState<ErrorInput>(initial);
  const [errors, setErrors] = useState<ValidationErrors<ErrorInputField>>({});
  const [creating, setCreating] = useState<'subject' | 'topic' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const subjectTopics = useMemo(() => topics.filter((t) => t.subjectId === values.subjectId), [topics, values.subjectId]);
  const dirty = useMemo(() => FIELD_ORDER.some((f) => values[f] !== initial[f]), [values, initial]);

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const set = <K extends ErrorInputField>(field: K, value: ErrorInput[K]) => {
    setValues((v) => {
      const next = { ...v, [field]: value };
      if (field === 'subjectId' && v.subjectId !== value) next.topicId = '';
      return next;
    });
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const handleCreateSubject = async (name: string) => {
    try {
      const subject = await createSubject(name);
      set('subjectId', subject.id);
      setNotice(`Matéria "${subject.name}" criada.`);
    } catch (error) {
      const existing = subjects.find((s) => sameName(s.name, name));
      if (error instanceof DuplicateError && existing) {
        set('subjectId', existing.id);
        setNotice(`A matéria "${existing.name}" já existia e foi selecionada.`);
      } else throw error;
    }
    setCreating(null);
  };

  const handleCreateTopic = async (name: string) => {
    try {
      const topic = await createTopic(values.subjectId, name);
      set('topicId', topic.id);
      setNotice(`Tópico "${topic.name}" criado.`);
    } catch (error) {
      const existing = subjectTopics.find((t) => sameName(t.name, name));
      if (error instanceof DuplicateError && existing) {
        set('topicId', existing.id);
        setNotice(`O tópico "${existing.name}" já existia e foi selecionado.`);
      } else throw error;
    }
    setCreating(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateErrorInput(values);
    if (hasValidationErrors(validation)) {
      setErrors(validation);
      const first = FIELD_ORDER.find((f) => validation[f]);
      if (first) {
        const el = document.getElementById(`field-${first}`);
        el?.focus();
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    const outcome = await onSubmit(values);
    if (outcome === 'reset') {
      setValues({ ...initial, subjectId: values.subjectId, topicId: values.topicId });
      setErrors({});
      setNotice(null);
      requestAnimationFrame(() => document.getElementById('field-description')?.focus());
    }
  };

  return (
    <form id={formId} noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <Step number={1} title="Onde foi o erro">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper
            id="field-subjectId"
            label="Matéria"
            required
            error={errors.subjectId}
            aside={
              creating !== 'subject' && (
                <button type="button" onClick={() => setCreating('subject')} className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-pink hover:text-rose-deep">
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden /> Nova matéria
                </button>
              )
            }
          >
            {creating === 'subject' ? (
              <InlineCreator label="Nome da nova matéria" placeholder="Ex.: Direito Constitucional" onCreate={handleCreateSubject} onCancel={() => setCreating(null)} />
            ) : (
              <Select
                id="field-subjectId"
                data-autofocus={!initial.subjectId || undefined}
                value={values.subjectId}
                invalid={!!errors.subjectId}
                onChange={(e) => set('subjectId', e.target.value)}
              >
                <option value="">{subjects.length ? 'Selecione a matéria' : 'Crie sua primeira matéria →'}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </FieldWrapper>

          <FieldWrapper
            id="field-topicId"
            label="Tópico"
            required
            error={errors.topicId}
            hint={!values.subjectId ? 'Selecione a matéria primeiro.' : undefined}
            aside={
              creating !== 'topic' &&
              values.subjectId && (
                <button type="button" onClick={() => setCreating('topic')} className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-pink hover:text-rose-deep">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Novo tópico
                </button>
              )
            }
          >
            {creating === 'topic' && values.subjectId ? (
              <InlineCreator label="Nome do novo tópico" placeholder="Ex.: Atos administrativos" onCreate={handleCreateTopic} onCancel={() => setCreating(null)} />
            ) : (
              <Select
                id="field-topicId"
                value={values.topicId}
                invalid={!!errors.topicId}
                disabled={!values.subjectId}
                onChange={(e) => set('topicId', e.target.value)}
              >
                <option value="">{subjectTopics.length || !values.subjectId ? 'Selecione o tópico' : 'Crie um tópico para esta matéria →'}</option>
                {subjectTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </FieldWrapper>
        </div>
        {notice && <p className="rounded-xl bg-blush/60 px-3 py-2 text-xs font-medium text-rose-ink" role="status">{notice}</p>}
      </Step>

      <Step number={2} title="O que aconteceu">
        <FieldWrapper id="field-description" label="Descrição do erro" required error={errors.description}>
          <TextArea
            id="field-description"
            data-autofocus={!!initial.subjectId || undefined}
            value={values.description}
            invalid={!!errors.description}
            placeholder="O que você marcou ou pensou que estava certo?"
            onChange={(e) => set('description', e.target.value)}
          />
        </FieldWrapper>
        <FieldWrapper id="field-correction" label="Correção ou entendimento correto" required error={errors.correction}>
          <TextArea
            id="field-correction"
            value={values.correction}
            invalid={!!errors.correction}
            placeholder="Qual é a regra, o conceito ou a resposta correta?"
            onChange={(e) => set('correction', e.target.value)}
          />
        </FieldWrapper>
        <FieldWrapper id="field-prevention" label="Como evitar esse erro novamente?" required error={errors.prevention}>
          <TextArea
            id="field-prevention"
            className="min-h-[76px]"
            value={values.prevention}
            invalid={!!errors.prevention}
            placeholder="Ex.: revisar a lei seca, criar um quadro comparativo, ler o comando da questão com atenção…"
            onChange={(e) => set('prevention', e.target.value)}
          />
        </FieldWrapper>
      </Step>

      <Step number={3} title="Classificação">
        <PriorityPicker value={values.priority} onChange={(v) => set('priority', v)} error={errors.priority} />
        <OriginPicker value={values.origin} onChange={(v) => set('origin', v)} error={errors.origin} />
      </Step>

      <Step number={4} title="Referência">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper id="field-reference" label="Questão de referência" optional error={errors.reference} hint="Banca, ano, número da questão ou link.">
            <TextInput
              id="field-reference"
              value={values.reference}
              placeholder="Ex.: CEBRASPE 2024 — Q. 37"
              onChange={(e) => set('reference', e.target.value)}
            />
          </FieldWrapper>
          <div>
            <span className="field-label">Data do registro</span>
            <p className="flex h-[46px] items-center gap-2 rounded-2xl border border-line bg-canvas px-4 text-sm text-ink-muted">
              <CalendarDays className="h-4 w-4 text-rose-antique" aria-hidden />
              {createdAt ? formatDateTime(createdAt) : `${formatDate(new Date().toISOString())} (automática)`}
            </p>
          </div>
        </div>
        <FieldWrapper id="field-notes" label="Observações" optional error={errors.notes}>
          <TextArea
            id="field-notes"
            className="min-h-[64px]"
            value={values.notes}
            placeholder="Anotações extras, artigos de lei, macetes…"
            onChange={(e) => set('notes', e.target.value)}
          />
        </FieldWrapper>
      </Step>
    </form>
  );
}
