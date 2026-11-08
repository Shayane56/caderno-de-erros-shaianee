import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCheck, Eye, Layers, Plus, TextCursorInput, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import type { CardInput, CardType, Deck } from '@/types';
import { FieldWrapper, Select, TextInput } from '@/components/forms/Fields';
import { InlineCreator } from '@/components/forms/InlineCreator';
import { useToast } from '@/components/common/Toast';
import { CARD_TYPES, cardOrds, validateCardInput, type CardInputErrors } from '@/services/flashcards/cardModel';
import { createDeck } from '@/services/flashcards/deckService';
import { defaultDeckInput } from '@/services/flashcards/cardModel';
import { imageFileToDataUrl } from '@/services/imageService';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';
import { CardFace } from './CardFace';
import { RichTextArea } from './RichTextArea';
import { ImageField } from './ImageField';
import { useCardStyle } from './cardStyle';

const TYPE_ICONS: Record<CardType, LucideIcon> = { basic: Layers, cloze: TextCursorInput, truefalse: CheckCheck };

interface CardFormProps {
  formId: string;
  initial: CardInput;
  decks: Deck[];
  onSubmit: (values: CardInput) => Promise<'reset' | 'close' | void>;
  onDirtyChange: (dirty: boolean) => void;
}

export function CardForm({ formId, initial, decks, onSubmit, onDirtyChange }: CardFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<CardInput>(initial);
  const [errors, setErrors] = useState<CardInputErrors>({});
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [previewBack, setPreviewBack] = useState(false);
  const [tagsText, setTagsText] = useState(initial.tags.join(', '));
  const deck = decks.find((d) => d.id === values.deckId) ?? null;
  const style = useCardStyle(deck);

  useEffect(() => {
    onDirtyChange(JSON.stringify({ ...values, tags: [] }) !== JSON.stringify({ ...initial, tags: [] }) || tagsText !== initial.tags.join(', '));
  }, [values, tagsText, initial, onDirtyChange]);

  const set = <K extends keyof CardInput>(key: K, value: CardInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as keyof CardInputErrors]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pasteImage = (side: 'frontImage' | 'backImage') => async (file: File) => {
    try {
      set(side, await imageFileToDataUrl(file));
      toast.success('Imagem adicionada ao cartão');
    } catch (error) {
      toast.error('Não foi possível usar esta imagem', errorMessage(error));
    }
  };

  const ords = useMemo(() => cardOrds({ type: values.type, front: values.front, reverse: values.reverse }), [values.type, values.front, values.reverse]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { ...values, tags: tagsText.split(/[,;]/) };
    const found = validateCardInput(input);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(`card-${first}`)?.focus();
      return;
    }
    const result = await onSubmit(input);
    if (result === 'reset') {
      // "Salvar e criar outro": mantém baralho, tipo e etiquetas.
      setValues((v) => ({ ...v, front: '', back: '', extra: '', answer: '', frontImage: null, backImage: null, sourceErrorId: null }));
      setPreviewBack(false);
      requestAnimationFrame(() => document.getElementById('card-front')?.focus());
    }
  };

  const labels =
    values.type === 'cloze'
      ? { front: 'Texto com lacunas', back: 'Verso extra', backHint: 'Aparece depois de revelar (opcional).' }
      : values.type === 'truefalse'
        ? { front: 'Afirmação', back: 'Justificativa', backHint: 'Por que está certo ou errado? (opcional, mas ajuda muito).' }
        : { front: 'Frente', back: 'Verso', backHint: undefined };

  return (
    <form id={formId} onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="min-w-0 space-y-5">
        <fieldset>
          <legend className="field-label">Tipo de cartão</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {CARD_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t.id];
              return (
                <label key={t.id} className="relative cursor-pointer">
                  <input type="radio" name="card-type" value={t.id} checked={values.type === t.id} onChange={() => set('type', t.id)} className="peer sr-only" />
                  <span className="flex h-full items-start gap-2.5 rounded-2xl border border-line bg-surface p-3 transition hover:border-rose-medium/60 peer-checked:border-rose-medium peer-checked:bg-blush/50 peer-checked:ring-2 peer-checked:ring-inset peer-checked:ring-rose-medium/40 peer-focus-visible:shadow-ring">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-pink" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{t.label}</span>
                      <span className="block text-xs leading-snug text-ink-muted">{t.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <FieldWrapper
          id="card-deckId"
          label="Baralho"
          required
          error={errors.deckId}
          aside={
            !creatingDeck && (
              <button type="button" className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-pink hover:text-rose-deep" onClick={() => setCreatingDeck(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Novo baralho
              </button>
            )
          }
        >
          {creatingDeck ? (
            <InlineCreator
              label="Nome do novo baralho"
              placeholder="Ex.: Direito Administrativo"
              onCancel={() => setCreatingDeck(false)}
              onCreate={async (name) => {
                const created = await createDeck(defaultDeckInput({ name }));
                set('deckId', created.id);
                setCreatingDeck(false);
                toast.success(`Baralho "${created.name}" criado`);
              }}
            />
          ) : (
            <Select id="card-deckId" value={values.deckId} invalid={!!errors.deckId} onChange={(e) => set('deckId', e.target.value)}>
              <option value="">Selecione…</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.name}
                </option>
              ))}
            </Select>
          )}
        </FieldWrapper>

        <FieldWrapper
          id="card-front"
          label={labels.front}
          required
          error={errors.front}
          hint={
            values.type === 'cloze'
              ? `Selecione um trecho e toque em "Lacuna". Use "Mesma" para esconder vários trechos juntos. ${ords.length ? `→ ${ords.length} face(s) de estudo.` : ''}`
              : 'Dica: selecione um trecho e use a barra para grifar com marca-texto.'
          }
        >
          <RichTextArea
            id="card-front"
            value={values.front}
            onChange={(v) => set('front', v)}
            invalid={!!errors.front}
            cloze={values.type === 'cloze'}
            rows={values.type === 'cloze' ? 5 : 3}
            defaultHighlight={style.highlight}
            onPasteImage={pasteImage('frontImage')}
            placeholder={
              values.type === 'cloze'
                ? 'Ex.: O servidor tem {{c1::30 dias}} para entrar em exercício.'
                : values.type === 'truefalse'
                  ? 'Ex.: A revogação de ato administrativo produz efeitos ex tunc.'
                  : 'Ex.: Qual a diferença entre anulação e revogação?'
            }
            describedBy="card-front-hint"
          />
          <div className="mt-2">
            <ImageField label="Imagem na frente" value={values.frontImage} onChange={(v) => set('frontImage', v)} />
          </div>
        </FieldWrapper>

        {values.type === 'truefalse' && (
          <fieldset id="card-answer" tabIndex={-1} className="outline-none">
            <legend className="field-label">
              Gabarito<span className="ml-0.5 text-rose-pink" aria-hidden>*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['certo', 'Certo', ThumbsUp, 'peer-checked:border-emerald-300 peer-checked:bg-emerald-50/70 peer-checked:text-emerald-800'],
                  ['errado', 'Errado', ThumbsDown, 'peer-checked:border-red-300 peer-checked:bg-red-50/70 peer-checked:text-red-800'],
                ] as const
              ).map(([value, label, Icon, checked]) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name="card-answer" className="peer sr-only" checked={values.answer === value} onChange={() => set('answer', value)} />
                  <span className={cn('flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-3 text-sm font-bold text-ink-muted transition peer-focus-visible:shadow-ring', checked)}>
                    <Icon className="h-4 w-4" aria-hidden /> {label}
                  </span>
                </label>
              ))}
            </div>
            {errors.answer && <p className="field-error">{errors.answer}</p>}
          </fieldset>
        )}

        <FieldWrapper id="card-back" label={labels.back} required={values.type === 'basic'} optional={values.type !== 'basic'} error={errors.back} hint={labels.backHint}>
          <RichTextArea
            id="card-back"
            value={values.back}
            onChange={(v) => set('back', v)}
            invalid={!!errors.back}
            rows={3}
            defaultHighlight={style.highlight}
            onPasteImage={pasteImage('backImage')}
            placeholder={values.type === 'truefalse' ? 'Ex.: Errado — a revogação produz efeitos ex nunc.' : 'Resposta…'}
          />
          <div className="mt-2">
            <ImageField label="Imagem no verso" value={values.backImage} onChange={(v) => set('backImage', v)} />
          </div>
        </FieldWrapper>

        {values.type === 'basic' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-canvas p-3.5">
            <input type="checkbox" checked={values.reverse} onChange={(e) => set('reverse', e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-pink" />
            <span>
              <span className="block text-sm font-semibold text-ink">Também estudar ao contrário</span>
              <span className="block text-xs text-ink-muted">Cria a face inversa (verso → frente). Ótimo para conceitos e definições.</span>
            </span>
          </label>
        )}

        <FieldWrapper id="card-extra" label="Anotação" optional hint="Fundamento legal, macete, “como evitar”… aparece no verso.">
          <RichTextArea id="card-extra" value={values.extra} onChange={(v) => set('extra', v)} rows={2} defaultHighlight={style.highlight} placeholder="Ex.: Art. 53 da Lei 9.784/99." />
        </FieldWrapper>

        <FieldWrapper id="card-tags" label="Etiquetas" optional hint="Separe por vírgulas. Ex.: lei-8112, prazos, revisar-antes-da-prova">
          <TextInput id="card-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="prazos, súmulas" />
        </FieldWrapper>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start" aria-label="Pré-visualização do cartão">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Eye className="h-4 w-4 text-rose-pink" aria-hidden /> Pré-visualização
          </p>
          <div className="inline-flex rounded-xl bg-canvas p-1 text-xs font-semibold" role="group" aria-label="Lado exibido">
            {(
              [
                [false, 'Frente'],
                [true, 'Verso'],
              ] as const
            ).map(([back, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={previewBack === back}
                onClick={() => setPreviewBack(back)}
                className={cn('rounded-lg px-3 py-1.5 transition', previewBack === back ? 'bg-surface text-rose-ink shadow-soft' : 'text-ink-muted hover:text-ink')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {values.front.trim() || values.frontImage ? (
          <CardFace
            card={{ ...values, answer: values.answer || null }}
            ord={ords[0] ?? '0'}
            revealed={previewBack}
            style={style}
            caption={deck ? `${deck.emoji} ${deck.name}` : undefined}
          />
        ) : (
          <div className="paper paper-pautado flex min-h-[220px] items-center justify-center p-6 text-center" style={{ '--paper-line': '32px' } as React.CSSProperties}>
            <p className="paper-muted max-w-[16rem] text-sm">Comece a escrever e veja aqui como o cartão vai ficar na folha do seu caderno.</p>
          </div>
        )}
        <p className="mt-2 text-xs text-ink-muted">Papel, fonte e cores seguem o estilo do baralho (dá para mudar em “Personalizar baralho”).</p>
      </aside>
    </form>
  );
}
