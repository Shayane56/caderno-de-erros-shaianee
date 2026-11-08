import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Impede fechar clicando fora (ex.: formulário com dados). */
  dismissible?: boolean;
  icon?: ReactNode;
}

const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true, icon }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    openCount += 1;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const body = panel?.querySelector<HTMLElement>('[data-modal-body]');
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ?? body?.querySelector<HTMLElement>(FOCUSABLE) ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    // Em telas de toque, evita abrir o teclado automaticamente.
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    (coarse ? panel : (first ?? panel))?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (items.length === 0) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    panel?.addEventListener('keydown', onKey);
    return () => {
      panel?.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (openCount <= 0) {
        openCount = 0;
        document.body.style.overflow = '';
      }
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-[#51434B]/30 backdrop-blur-[2px]"
        aria-hidden
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-lift outline-none',
          'animate-sheet-up sm:animate-scale-in sm:rounded-[28px]',
          sizes[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-petal sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-4 sm:px-7 sm:pt-6">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition hover:bg-blush hover:text-rose-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div data-modal-body className="scrollbar-soft flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-5 py-4 pb-[calc(1rem+var(--safe-bottom))] sm:flex-row sm:justify-end sm:px-7 sm:pb-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
