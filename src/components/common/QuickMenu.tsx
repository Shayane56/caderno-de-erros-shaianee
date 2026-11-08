import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface QuickMenuOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface QuickMenuProps<T extends string> {
  /** Rótulo acessível do botão (ex.: "Alterar prioridade"). */
  label: string;
  value: T | null;
  options: QuickMenuOption<T>[];
  onSelect: (value: T) => void;
  /** Conteúdo exibido no botão (ex.: o badge atual). */
  trigger: ReactNode;
  disabled?: boolean;
  menuTitle?: string;
}

const MENU_WIDTH = 264;

/** Menu suspenso acessível para alterações rápidas (prioridade/origem). */
export function QuickMenu<T extends string>({ label, value, options, onSelect, trigger, disabled, menuTitle }: QuickMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimated = options.length * 56 + 48;
    const up = rect.bottom + estimated > window.innerHeight - 12 && rect.top > estimated;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 12));
    setPos({ top: up ? rect.top - 6 : rect.bottom + 6, left, up });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    const first = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]');
    first?.focus();
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="group inline-flex items-center gap-0.5 rounded-full transition hover:brightness-[0.97] disabled:opacity-60"
      >
        {trigger}
        <ChevronDown className="h-3.5 w-3.5 text-ink-soft transition group-hover:text-rose-pink" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            className="fixed z-[70] animate-scale-in rounded-2xl border border-line bg-white p-1.5 shadow-lift"
            style={{
              width: MENU_WIDTH,
              left: pos.left,
              top: pos.up ? undefined : pos.top,
              bottom: pos.up ? window.innerHeight - pos.top : undefined,
            }}
          >
            {menuTitle && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{menuTitle}</p>}
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    if (!selected) onSelect(option.value);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-blush focus:bg-blush focus:outline-none',
                    selected && 'bg-blush/60',
                  )}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                    {option.description && <span className="block text-xs text-ink-muted">{option.description}</span>}
                  </span>
                  {selected && <Check className="h-4 w-4 text-rose-pink" aria-hidden />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
