import { useMemo, useState } from 'react';
import { ClipboardPaste, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { FieldWrapper, TextArea, TextInput } from '@/components/forms/Fields';
import { applyAnswerKey, parseAnswerKey, parseExamText } from '@/services/questions/examParser';
import { answerLabel, BANCAS, emptyQuestionInput, LETTERS, type QuestionInput } from '@/services/questions/questionModel';
import { createQuestions } from '@/services/questions/questionService';
import { errorMessage } from '@/services/errors';
import { truncate } from '@/utils/text';
import { cn } from '@/utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Cola o texto de uma prova (copiado do PDF) e o gabarito: o app separa as questões. */
export function PasteExamModal({ open, onClose }: Props) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [meta, setMeta] = useState({ banca: '', subject: '', topic: '', orgao: '', cargo: '', year: '' });
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => applyAnswerKey(parseExamText(text), parseAnswerKey(key)), [text, key]);
  const ready = parsed.filter((q) => q.answer !== null);
  const missing = parsed.filter((q) => q.answer === null && !q.annulled);
  const annulled = parsed.filter((q) => q.annulled).length;
  const metaOk = meta.banca.trim() && meta.subject.trim();

  const reset = () => {
    setText('');
    setKey('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const year = Number(meta.year);
      const inputs: QuestionInput[] = ready.map((q) => ({
        ...emptyQuestionInput(q.format),
        banca: meta.banca,
        subject: meta.subject,
        topic: meta.topic,
        orgao: meta.orgao,
        cargo: meta.cargo,
        year: Number.isInteger(year) && year > 1950 ? year : null,
        statement: q.statement,
        options: q.options,
        answer: q.answer,
      }));
      const created = await createQuestions(inputs);
      toast.success(`${created} questão(ões) adicionada(s) ao seu banco`, 'Você pode editar o assunto e incluir comentários em cada uma.');
      reset();
      onClose();
    } catch (error) {
      toast.error('Não foi possível salvar as questões', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const setM = (k: keyof typeof meta, v: string) => setMeta((m) => ({ ...m, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Colar prova inteira"
      description="Copie o texto da prova (PDF) e o gabarito oficial: o app separa as questões e as alternativas para você revisar."
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
          <ClipboardPaste className="h-5 w-5" aria-hidden />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button icon={ClipboardPaste} loading={saving} disabled={!ready.length || !metaOk} onClick={() => void save()}>
            Adicionar {ready.length} questão(ões)
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldWrapper id="pe-banca" label="Banca" required>
            <TextInput id="pe-banca" list="pe-bancas" value={meta.banca} onChange={(e) => setM('banca', e.target.value)} placeholder="Ex.: Cebraspe" />
            <datalist id="pe-bancas">
              {BANCAS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </FieldWrapper>
          <FieldWrapper id="pe-subject" label="Matéria" required>
            <TextInput id="pe-subject" value={meta.subject} onChange={(e) => setM('subject', e.target.value)} placeholder="Ex.: Língua Portuguesa" />
          </FieldWrapper>
          <FieldWrapper id="pe-topic" label="Assunto" optional>
            <TextInput id="pe-topic" value={meta.topic} onChange={(e) => setM('topic', e.target.value)} placeholder="Ex.: Interpretação" />
          </FieldWrapper>
          <FieldWrapper id="pe-orgao" label="Órgão" optional>
            <TextInput id="pe-orgao" value={meta.orgao} onChange={(e) => setM('orgao', e.target.value)} />
          </FieldWrapper>
          <FieldWrapper id="pe-cargo" label="Cargo" optional>
            <TextInput id="pe-cargo" value={meta.cargo} onChange={(e) => setM('cargo', e.target.value)} />
          </FieldWrapper>
          <FieldWrapper id="pe-year" label="Ano" optional>
            <TextInput id="pe-year" type="number" inputMode="numeric" value={meta.year} onChange={(e) => setM('year', e.target.value)} />
          </FieldWrapper>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FieldWrapper id="pe-text" label="Texto da prova" hint="As questões devem começar com o número (ex.: “12.”, “Questão 12”). Alternativas como “(A)” ou “A)”. Itens Certo/Errado também funcionam.">
            <TextArea id="pe-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. Assinale a alternativa correta…\n(A) …\n(B) …\n\n2. …'} />
          </FieldWrapper>
          <FieldWrapper id="pe-key" label="Gabarito" hint="Um número por resposta: “1-C 2-E 3-A”, “1 A, 2 B”… Use X para anulada.">
            <TextArea id="pe-key" rows={10} value={key} onChange={(e) => setKey(e.target.value)} placeholder={'1-B\n2-D\n3-C'} />
          </FieldWrapper>
        </div>

        {parsed.length > 0 && (
          <section aria-label="Pré-visualização" className="space-y-2">
            <p className="text-sm font-semibold text-ink">
              {parsed.length} questão(ões) encontrada(s) · {ready.length} com gabarito
              {annulled ? ` · ${annulled} anulada(s), ignorada(s)` : ''}
            </p>
            {missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Sem gabarito (não serão salvas): {missing.map((q) => q.number).join(', ')}
              </p>
            )}
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {parsed.map((q) => (
                <li key={q.number} className={cn('rounded-2xl border p-3 text-sm', q.answer === null ? 'border-amber-200 bg-amber-50/40' : 'border-line')}>
                  <p className="font-semibold text-ink">
                    {q.number}. {truncate(q.statement, 160)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {q.format === 'multipla' ? `${q.options.length} alternativas (${LETTERS.slice(0, q.options.length).join(', ')})` : 'Certo ou Errado'} · gabarito:{' '}
                    <strong className="text-ink">{q.annulled ? 'anulada' : q.answer === null ? '—' : answerLabel(q.answer)}</strong>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
