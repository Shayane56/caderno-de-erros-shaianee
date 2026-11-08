import { Check, Moon, Palette, RotateCcw, Sun, SunMoon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { SectionCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CardFace } from '@/components/flashcards/CardFace';
import { resolveCardStyle } from '@/components/flashcards/cardStyle';
import { CARD_FONTS, HIGHLIGHTS, PAPER_TINTS, PAPERS, TEXT_SIZES } from '@/constants/cardStyles';
import { COLOR_MODES, THEMES } from '@/constants/theme';
import { resetAppearance, updateAppearance, useAppearance } from '@/services/appearance';
import { cn } from '@/utils/cn';

const MODE_ICONS = { claro: Sun, escuro: Moon, sistema: SunMoon };

const SAMPLE = {
  type: 'basic' as const,
  front: 'Qual a diferença entre **anulação** e **revogação**?',
  back: 'Anulação: ==ilegalidade==, efeitos *ex tunc*.\nRevogação: ==verde:conveniência e oportunidade==, efeitos *ex nunc*.',
  extra: '',
  answer: null,
  frontImage: null,
  backImage: null,
};

function OptionButton({ selected, onClick, children, className, label }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={cn('rounded-2xl border px-3 py-2 text-sm font-semibold transition', selected ? 'border-rose-medium bg-blush/60 text-rose-ink' : 'border-line text-ink hover:border-rose-medium/60', className)}
    >
      {children}
    </button>
  );
}

/** Tema de cores, modo escuro e estilo padrão das folhas dos flashcards. */
export function AppearanceSection() {
  const appearance = useAppearance();
  const style = resolveCardStyle(null, appearance);

  return (
    <SectionCard
      title="Aparência"
      subtitle="Deixe o caderno com a sua cara. As escolhas ficam salvas neste dispositivo."
      icon={Palette}
      action={
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => resetAppearance()}>
          Restaurar
        </Button>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="field-label">Tema de cores</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={appearance.theme === t.id}
                onClick={() => updateAppearance({ theme: t.id })}
                className={cn('flex items-center gap-3 rounded-2xl border p-2.5 text-left transition', appearance.theme === t.id ? 'border-rose-medium bg-blush/50 ring-2 ring-inset ring-rose-medium/30' : 'border-line hover:border-rose-medium/60')}
              >
                <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                  {t.swatches.map((c) => (
                    <span key={c} className="h-6 w-6 rounded-full ring-2 ring-surface" style={{ background: c }} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{t.label}</span>
                  <span className="block truncate text-[11px] text-ink-muted">{t.description}</span>
                </span>
                {appearance.theme === t.id && <Check className="ml-auto h-4 w-4 shrink-0 text-rose-pink" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="field-label">Modo</legend>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_MODES.map((m) => {
              const Icon = MODE_ICONS[m.id];
              return (
                <OptionButton key={m.id} selected={appearance.mode === m.id} onClick={() => updateAppearance({ mode: m.id })} className="flex items-center justify-center gap-1.5">
                  <Icon className="h-4 w-4" aria-hidden /> {m.label}
                </OptionButton>
              );
            })}
          </div>
        </fieldset>

        <div className="border-t border-line pt-5">
          <p className="mb-4 text-sm text-ink-muted">
            <strong className="text-ink">Folhas dos flashcards (padrão).</strong> Cada baralho pode ter o seu próprio estilo em “Personalizar baralho”.
          </p>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <fieldset>
                <legend className="field-label">Papel</legend>
                <div className="grid grid-cols-2 gap-2">
                  {PAPERS.map((p) => (
                    <OptionButton key={p.id} selected={appearance.paper === p.id} onClick={() => updateAppearance({ paper: p.id })}>
                      {p.label}
                    </OptionButton>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Cor do papel</legend>
                <div className="flex flex-wrap gap-2">
                  {PAPER_TINTS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.label}
                      aria-label={`Papel ${t.label.toLowerCase()}`}
                      aria-pressed={appearance.paperTint === t.id}
                      onClick={() => updateAppearance({ paperTint: t.id })}
                      className={cn('h-9 w-9 rounded-full transition', appearance.paperTint === t.id ? 'ring-2 ring-rose-pink ring-offset-2 ring-offset-surface' : 'ring-1 ring-black/10 hover:scale-105')}
                      style={{ background: t.color }}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Letra</legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
                  {CARD_FONTS.map((f) => (
                    <OptionButton key={f.id} selected={appearance.cardFont === f.id} onClick={() => updateAppearance({ cardFont: f.id })} className="px-1.5 text-center">
                      <span className="block leading-7" style={{ fontFamily: f.family, fontSize: `${20 * f.scale}px` } as CSSProperties} aria-hidden>
                        Aa
                      </span>
                      <span className="block text-[11px]">{f.label}</span>
                    </OptionButton>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Tamanho do texto</legend>
                <div className="grid grid-cols-3 gap-2">
                  {TEXT_SIZES.map((t) => (
                    <OptionButton key={t.id} selected={appearance.textSize === t.id} onClick={() => updateAppearance({ textSize: t.id })}>
                      {t.label}
                    </OptionButton>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="field-label">Marca-texto padrão</legend>
                <div className="flex flex-wrap gap-2">
                  {HIGHLIGHTS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      title={h.label}
                      aria-label={`Marca-texto ${h.label.toLowerCase()}`}
                      aria-pressed={appearance.highlight === h.id}
                      onClick={() => updateAppearance({ highlight: h.id })}
                      className={cn('h-9 w-12 rounded-xl transition', appearance.highlight === h.id ? 'ring-2 ring-rose-pink ring-offset-2 ring-offset-surface' : 'ring-1 ring-black/10 hover:scale-105')}
                      style={{ background: h.color }}
                    />
                  ))}
                </div>
                <p className="field-hint">Usado pelo atalho Ctrl+H e pelo marca-texto sem cor definida.</p>
              </fieldset>
            </div>
            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Prévia</p>
              <CardFace card={SAMPLE} ord="0" revealed style={style} minHeight={200} />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
