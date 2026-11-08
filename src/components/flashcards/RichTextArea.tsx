import { useRef, type KeyboardEvent } from 'react';
import { Bold, Brackets, Highlighter, Italic, Underline, type LucideIcon } from 'lucide-react';
import type { HighlightColor } from '@/types';
import { HIGHLIGHTS } from '@/constants/cardStyles';
import { insertCloze } from '@/utils/cloze';
import { wrapSelection, type WrapResult } from '@/utils/richText';
import { cn } from '@/utils/cn';

interface RichTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
  /** Mostra os botões de lacuna (cartões do tipo Lacunas). */
  cloze?: boolean;
  defaultHighlight: HighlightColor;
  onPasteImage?: (file: File) => void;
  describedBy?: string;
}

function ToolButton({ icon: Icon, label, onClick, children, className }: { icon?: LucideIcon; label: string; onClick: () => void; children?: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Mantém a seleção do texto ao clicar no botão.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-ink-muted transition hover:bg-blush hover:text-rose-ink', className)}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

/** Campo de texto com barra de formatação: negrito, itálico, sublinhado, marca-texto e lacunas. */
export function RichTextArea({ id, value, onChange, placeholder, rows = 4, invalid, cloze, defaultHighlight, onPasteImage, describedBy }: RichTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (transform: (value: string, start: number, end: number) => WrapResult) => {
    const el = ref.current;
    if (!el) return;
    const result = transform(el.value, el.selectionStart, el.selectionEnd);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const wrap = (before: string, after = before) => apply((v, s, e) => wrapSelection(v, s, e, before, after));
  const highlight = (color: HighlightColor) => wrap(color === 'amarelo' ? '==' : `==${color}:`, '==');
  const addCloze = (same = false) => apply((v, s, e) => insertCloze(v, s, e, same));

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') wrap('**');
    else if (key === 'i') wrap('*');
    else if (key === 'u') wrap('__');
    else if (key === 'h' || (e.shiftKey && key === 'm')) highlight(defaultHighlight);
    else if (cloze && e.shiftKey && key === 'c') addCloze(e.altKey);
    else return;
    e.preventDefault();
  };

  return (
    <div className={cn('rounded-2xl border bg-surface transition focus-within:border-rose-medium focus-within:shadow-ring', invalid ? 'border-red-300' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1" role="toolbar" aria-label="Formatação do texto" aria-controls={id}>
        <ToolButton icon={Bold} label="Negrito (Ctrl+B)" onClick={() => wrap('**')} />
        <ToolButton icon={Italic} label="Itálico (Ctrl+I)" onClick={() => wrap('*')} />
        <ToolButton icon={Underline} label="Sublinhado (Ctrl+U)" onClick={() => wrap('__')} />
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <Highlighter className="ml-0.5 h-4 w-4 text-ink-soft" aria-hidden />
        {HIGHLIGHTS.map((h) => (
          <ToolButton key={h.id} label={`Marca-texto ${h.label.toLowerCase()}`} onClick={() => highlight(h.id)} className="min-w-7 px-1">
            <span className="h-4 w-4 rounded-[5px] ring-1 ring-black/10" style={{ background: h.color }} aria-hidden />
          </ToolButton>
        ))}
        {cloze && (
          <>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <ToolButton icon={Brackets} label="Nova lacuna (Ctrl+Shift+C)" onClick={() => addCloze(false)} className="px-2 font-semibold text-rose-ink">
              <span className="text-xs">Lacuna</span>
            </ToolButton>
            <ToolButton label="Mesma lacuna — estudadas juntas (Ctrl+Shift+Alt+C)" onClick={() => addCloze(true)} className="px-2 text-xs font-semibold">
              Mesma
            </ToolButton>
          </>
        )}
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          if (!onPasteImage) return;
          const file = Array.from(e.clipboardData.items).find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile();
          if (file) {
            e.preventDefault();
            onPasteImage(file);
          }
        }}
        className="block w-full resize-y rounded-b-2xl bg-transparent px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft focus:outline-none"
      />
    </div>
  );
}
