import { cn } from '@/utils/cn';

/**
 * Ícones próprios da Proposta C: construídos só com quadrados, círculos e
 * retas, traço de 2 px, pontas e cantos retos — a mesma geometria dos gráficos.
 */
export type BoldIconName = 'home' | 'decks' | 'review' | 'stats' | 'more' | 'plus' | 'arrow' | 'back' | 'undo' | 'edit' | 'close' | 'check' | 'cross' | 'eye' | 'out';

const PATHS: Record<BoldIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10 12 3l9 7v11H3z" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  decks: (
    <>
      <rect x="7" y="3" width="14" height="14" />
      <path d="M3 7v14h14" />
    </>
  ),
  review: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l5.5-3.5z" fill="currentColor" />
    </>
  ),
  stats: <path d="M4 21V12M10 21V4M16 21v-6M22 21H2" />,
  more: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>
  ),
  plus: <path d="M12 3v18M3 12h18" />,
  arrow: <path d="M3 12h17M14 6l6 6-6 6" />,
  back: <path d="M21 12H4M10 6l-6 6 6 6" />,
  undo: <path d="M4 4v6h6M4.5 10A8 8 0 1 1 6 17" />,
  edit: <path d="M14 4l6 6L9 21H3v-6zM12 6l6 6" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  check: <path d="M3 12.5 9 18 21 6" />,
  cross: <path d="M5 5l14 14M19 5 5 19" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <rect x="9.5" y="9.5" width="5" height="5" fill="currentColor" />
    </>
  ),
  out: <path d="M8 4h12v12M20 4 5 19" />,
};

export function BIcon({ name, className, size = 20 }: { name: BoldIconName; className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" className={cn('shrink-0', className)} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
