import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ImagePlus, Palette, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Deck, DeckInput } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { FieldWrapper, Select, TextArea, TextInput } from '@/components/forms/Fields';
import { useSubjects } from '@/hooks/useData';
import { CARD_FONTS, COVER_PATTERNS, DECK_COLORS, DECK_EMOJIS, PAPER_TINTS, PAPERS, getDeckColor } from '@/constants/cardStyles';
import { defaultDeckInput, inputFromDeck } from '@/services/flashcards/cardModel';
import { createDeck, updateDeck } from '@/services/flashcards/deckService';
import { imageFileToDataUrl } from '@/services/imageService';
import { errorMessage, ValidationError } from '@/services/errors';
import { useAppearance } from '@/services/appearance';
import { cn } from '@/utils/cn';
import { DeckCover } from './DeckCover';
import { CardFace } from './CardFace';
import { resolveCardStyle } from './cardStyle';

interface DeckFormModalProps {
  open: boolean;
  deck?: Deck | null;
  /** Valores iniciais para um baralho novo (ex.: vinculado a uma matéria). */
  preset?: Partial<DeckInput>;
  onClose: () => void;
  onSaved?: (deck: Deck) => void;
}

const SAMPLE = {
  type: 'cloze' as const,
  front: 'A anulação opera efeitos {{c1::ex tunc}}; a revogação, efeitos ==ex nunc==.',
  back: '',
  extra: '',
  answer: null,
  frontImage: null,
  backImage: null,
};

function Swatch({ selected, label, onClick, style, className, children }: { selected: boolean; label: string; onClick: () => void; style?: CSSProperties; className?: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      style={style}
      className={cn('relative transition focus-visible:shadow-ring', selected ? 'ring-2 ring-rose-pink ring-offset-2 ring-offset-surface' : 'ring-1 ring-black/10 hover:scale-105', className)}
    >
      {children}
    </button>
  );
}

export function DeckFormModal({ open, deck, preset, onClose, onSaved }: DeckFormModalProps) {
  const toast = useToast();
  const appearance = useAppearance();
  const subjects = useSubjects() ?? [];
  const [values, setValues] = useState<DeckInput>(() => (deck ? inputFromDeck(deck) : defaultDeckInput(preset)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues(deck ? inputFromDeck(deck) : defaultDeckInput(preset));
      setError(null);
    }
  }, [open, deck?.id]);

  const set = <K extends keyof DeckInput>(key: K, value: DeckInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = deck ? await updateDeck(deck.id, values) : await createDeck(values);
      toast.success(deck ? 'Baralho atualizado' : `Baralho "${saved.name}" criado`, deck ? undefined : 'Agora é só adicionar cartões.');
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onCover = async (file: File | undefined) => {
    if (!file) return;
    try {
      set('coverImage', await imageFileToDataUrl(file, 700, 0.84));
    } catch (e) {
      toast.error('Não foi possível usar esta imagem', errorMessage(e));
    } finally {
      if (coverInput.current) coverInput.current.value = '';
    }
  };

  const cardStyle = resolveCardStyle(values, appearance);
  const formId = 'deck-form';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={deck ? 'Personalizar baralho' : 'Novo baralho'}
      description="Monte a capa do seu caderno e escolha como as folhas dos cartões vão ficar."
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-medium to-rose-pink text-white">
          <Palette className="h-5 w-5" aria-hidden />
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} icon={Check} loading={saving}>
            {deck ? 'Salvar baralho' : 'Criar baralho'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <FieldWrapper id="deck-name" label="Nome" required error={error ?? undefined}>
              <TextInput id="deck-name" value={values.name} maxLength={120} invalid={!!error} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Lei 8.112 — prazos" data-autofocus />
            </FieldWrapper>
            <FieldWrapper id="deck-subject" label="Matéria do caderno" optional hint="Permite gerar cartões a partir dos seus erros.">
              <Select id="deck-subject" value={values.subjectId ?? ''} onChange={(e) => set('subjectId', e.target.value || null)}>
                <option value="">Nenhuma</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
          </div>
          <FieldWrapper id="deck-description" label="Descrição" optional>
            <TextArea id="deck-description" rows={2} className="min-h-0" value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="Para que serve este baralho?" />
          </FieldWrapper>

          <fieldset>
            <legend className="field-label">Adesivo da capa</legend>
            <div className="flex flex-wrap gap-1.5">
              {DECK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={values.emoji === emoji}
                  aria-label={`Adesivo ${emoji}`}
                  onClick={() => set('emoji', emoji)}
                  className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xl transition', values.emoji === emoji ? 'bg-blush ring-2 ring-rose-pink' : 'bg-canvas hover:bg-blush')}
                >
                  {emoji}
                </button>
              ))}
              <input
                aria-label="Outro emoji"
                value={DECK_EMOJIS.includes(values.emoji) ? '' : values.emoji}
                onChange={(e) => set('emoji', e.target.value.slice(0, 8) || '📒')}
                placeholder="✍️"
                className="input h-10 w-20 px-2 text-center text-lg"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Cor da capa</legend>
            <div className="flex flex-wrap gap-2.5">
              {DECK_COLORS.map((c) => (
                <Swatch key={c.id} label={c.label} selected={values.color === c.id && !values.coverImage} onClick={() => setValues((v) => ({ ...v, color: c.id, coverImage: null }))} className="h-9 w-9 rounded-full" style={{ background: c.color }} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Estampa</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {COVER_PATTERNS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={values.pattern === p.id && !values.coverImage}
                  onClick={() => setValues((v) => ({ ...v, pattern: p.id, coverImage: null }))}
                  className={cn('overflow-hidden rounded-xl text-center transition', values.pattern === p.id && !values.coverImage ? 'ring-2 ring-rose-pink' : 'ring-1 ring-line hover:ring-rose-medium')}
                >
                  <span className={cn('deck-cover block h-10 rounded-none', `cover-${p.id}`)} style={{ '--cover': getDeckColor(values.color).color, borderRadius: 0 } as CSSProperties} aria-hidden />
                  <span className="block bg-surface py-1 text-[11px] font-semibold text-ink-muted">{p.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input ref={coverInput} type="file" accept="image/*" className="sr-only" aria-label="Foto de capa" tabIndex={-1} onChange={(e) => void onCover(e.target.files?.[0])} />
              <Button size="sm" variant="outline" icon={ImagePlus} onClick={() => coverInput.current?.click()}>
                {values.coverImage ? 'Trocar foto da capa' : 'Usar uma foto como capa'}
              </Button>
              {values.coverImage && (
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => set('coverImage', null)}>
                  Remover foto
                </Button>
              )}
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={values.elastic} onChange={(e) => set('elastic', e.target.checked)} className="h-4 w-4 accent-rose-pink" />
                Elástico na capa
              </label>
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="field-label">Folha dos cartões</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: null, label: 'Padrão' }, ...PAPERS].map((p) => (
                  <button
                    key={p.id ?? 'padrao'}
                    type="button"
                    aria-pressed={values.paper === p.id}
                    onClick={() => set('paper', p.id as DeckInput['paper'])}
                    className={cn('rounded-xl border px-3 py-2 text-left text-sm font-semibold transition', values.paper === p.id ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Cor do papel</legend>
              <div className="flex flex-wrap gap-2">
                <Swatch label="Padrão" selected={values.paperTint === null} onClick={() => set('paperTint', null)} className="h-9 rounded-full bg-surface px-3 text-xs font-semibold text-ink-muted">
                  Padrão
                </Swatch>
                {PAPER_TINTS.map((t) => (
                  <Swatch key={t.id} label={t.label} selected={values.paperTint === t.id} onClick={() => set('paperTint', t.id)} className="h-9 w-9 rounded-full" style={{ background: t.color }} />
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset>
            <legend className="field-label">Letra dos cartões</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[{ id: null, label: 'Padrão', family: undefined, scale: 1 }, ...CARD_FONTS].map((f) => (
                <button
                  key={f.id ?? 'padrao'}
                  type="button"
                  aria-pressed={values.font === f.id}
                  onClick={() => set('font', f.id as DeckInput['font'])}
                  className={cn('rounded-xl border px-2 py-2 text-center transition', values.font === f.id ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60')}
                >
                  <span className="block text-xl leading-7" style={{ fontFamily: f.family, fontSize: f.family ? `${20 * f.scale}px` : undefined }} aria-hidden>
                    Aa
                  </span>
                  <span className="block text-[11px] font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper id="deck-new" label="Cartões novos por dia" hint="O Anki usa 20. Diminua em semanas puxadas.">
              <TextInput id="deck-new" type="number" min={0} max={9999} inputMode="numeric" value={values.newPerDay} onChange={(e) => set('newPerDay', Number(e.target.value))} />
            </FieldWrapper>
            <FieldWrapper id="deck-reviews" label="Revisões por dia (máximo)">
              <TextInput id="deck-reviews" type="number" min={0} max={9999} inputMode="numeric" value={values.reviewsPerDay} onChange={(e) => set('reviewsPerDay', Number(e.target.value))} />
            </FieldWrapper>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:self-start" aria-label="Pré-visualização">
          <div className="mx-auto max-w-[13rem] pl-2">
            <DeckCover {...values} subtitle="pré-visualização" />
          </div>
          <CardFace card={SAMPLE} ord="1" revealed style={cardStyle} minHeight={150} />
        </aside>
      </form>
    </Modal>
  );
}
